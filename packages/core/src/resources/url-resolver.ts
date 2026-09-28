import type {
	AccessPolicy,
	PdfAbortSignal,
	ResourceHeaders,
	ResourceLoadingOptions,
	VirtualFileSystem,
} from "../types";

const MAX_REDIRECTS = 30;

const normalizeHeaders = (headers: ResourceHeaders): string => {
	const entries: Array<[string, string]> = [];
	if (Array.isArray(headers)) {
		for (const [key, value] of headers as ReadonlyArray<readonly [string, string]>) {
			entries.push([key.toLowerCase(), value]);
		}
	} else if (typeof (headers as { forEach?: unknown }).forEach === "function") {
		(headers as { forEach(callback: (value: string, key: string) => void): void }).forEach(
			(value, key) => entries.push([key.toLowerCase(), value]),
		);
	} else {
		for (const [key, value] of Object.entries(headers as Record<string, string>)) {
			entries.push([key.toLowerCase(), value]);
		}
	}
	return JSON.stringify(
		entries.sort(
			([leftKey, leftValue], [rightKey, rightValue]) =>
				leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
		),
	);
};

const getResourceKey = (url: string, headers: ResourceHeaders): string => {
	const normalizedHeaders = normalizeHeaders(headers);
	return normalizedHeaders === "[]"
		? url
		: `${url}#pdfcraft-headers=${encodeURIComponent(normalizedHeaders)}`;
};

const fetchNetworkResource = async (
	url: string,
	headers: ResourceHeaders,
	redirect: RequestRedirect,
	signal: AbortSignal,
): Promise<Response> => {
	signal.throwIfAborted();
	try {
		return await fetch(url, { headers: headers as HeadersInit, redirect, signal });
	} catch (error) {
		if (signal.aborted) throw signal.reason;
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Network request failed (url: "${url}", error: ${message})`, {
			cause: error,
		});
	}
};

/** Settles with `promise`, or rejects with the signal's reason as soon as it aborts. */
function untilAborted<T>(promise: Promise<T> | T, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(signal.reason);
		signal.addEventListener("abort", onAbort, { once: true });
		Promise.resolve(promise).then(
			(value) => {
				signal.removeEventListener("abort", onAbort);
				resolve(value);
			},
			(error: unknown) => {
				signal.removeEventListener("abort", onAbort);
				reject(error);
			},
		);
	});
}

const isAllowed = async (
	url: string,
	urlAccessPolicy: AccessPolicy | undefined,
	signal: AbortSignal,
): Promise<boolean> =>
	typeof urlAccessPolicy === "undefined" ||
	(await untilAborted(urlAccessPolicy(url), signal)) === true;

async function fetchUrl(
	url: string,
	headers: ResourceHeaders,
	urlAccessPolicy: AccessPolicy | undefined,
	signal: AbortSignal,
): Promise<Response> {
	let redirectCount = 0;
	while (true) {
		if (!(await isAllowed(url, urlAccessPolicy, signal))) {
			throw new Error(`Access to URL denied by resource access policy: ${url}`);
		}

		let response = await fetchNetworkResource(url, headers, "manual", signal);

		// redirect url
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get("location");
			if (!location) {
				throw new Error("Redirect response missing Location header");
			}
			if (redirectCount >= MAX_REDIRECTS) {
				throw new Error(`Too many redirects (maximum: ${MAX_REDIRECTS})`);
			}
			redirectCount++;
			url = new URL(location, url).href;
			continue;
		}

		// Browsers expose manual redirects as opaqueredirect and do not reveal each hop.
		// The browser-controlled redirect chain therefore cannot contribute to the manual
		// counter above; the final response URL is still checked by URLResolver.queue().
		if (response.type === "opaqueredirect") {
			response = await fetchNetworkResource(url, headers, "follow", signal);
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch (status code: ${response.status})`);
		}

		return response;
	}
}

const sizeError = (url: string, maxSize: number): Error =>
	new Error(`Resource exceeds the maximum size of ${maxSize} bytes (url: "${url}")`);

/** Reads the response body, stopping as soon as it exceeds `maxSize`. */
async function readBody(
	response: Response,
	url: string,
	maxSize: number | undefined,
	signal: AbortSignal,
): Promise<ArrayBuffer> {
	if (maxSize === undefined) return untilAborted(response.arrayBuffer(), signal);

	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > maxSize) {
		await response.body?.cancel().catch(() => undefined);
		throw sizeError(url, maxSize);
	}
	if (!response.body) {
		const buffer = await untilAborted(response.arrayBuffer(), signal);
		if (buffer.byteLength > maxSize) throw sizeError(url, maxSize);
		return buffer;
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await untilAborted(reader.read(), signal);
			if (done) break;
			total += value.byteLength;
			if (total > maxSize) throw sizeError(url, maxSize);
			chunks.push(value);
		}
	} catch (error) {
		await reader.cancel().catch(() => undefined);
		throw error;
	}
	const data = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		data.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return data.buffer;
}

export interface URLResolverOptions extends ResourceLoadingOptions {
	/** Cancels every outstanding download when aborted. */
	signal?: PdfAbortSignal;
}

type ResolvingResource = {
	failed: boolean;
	promise: Promise<void>;
};

class URLResolver {
	private readonly fs: VirtualFileSystem;
	private readonly resolving: Record<string, ResolvingResource> = {};
	private urlAccessPolicy?: AccessPolicy;
	private readonly options: URLResolverOptions;
	/** Aborted by the first failure, so that sibling downloads stop instead of running on. */
	private readonly failure = new AbortController();
	private firstError: unknown;

	constructor(fs: VirtualFileSystem, options: URLResolverOptions = {}) {
		this.fs = fs;
		this.options = options;
	}

	/**
	 * Creates the signal for one download. It aborts with a descriptive error on timeout, on
	 * caller cancellation or when another resource of the document failed. `dispose` releases
	 * the timer and listeners once the download settles.
	 */
	private createDownload(url: string): { signal: AbortSignal; dispose(): void } {
		const { timeout, signal: callerSignal } = this.options;
		const controller = new AbortController();
		const cleanup = new AbortController();
		const abort = (message: string, cause?: unknown) => {
			if (!controller.signal.aborted)
				controller.abort(new Error(`${message} (url: "${url}")`, { cause }));
		};

		const onCancel = () => abort("Resource loading was cancelled", callerSignal?.reason);
		if (callerSignal?.aborted) onCancel();
		callerSignal?.addEventListener("abort", onCancel, { once: true });
		this.failure.signal.addEventListener(
			"abort",
			() => abort("Resource loading was cancelled because another resource failed"),
			{ once: true, signal: cleanup.signal },
		);
		const timer =
			timeout === undefined
				? undefined
				: setTimeout(() => abort(`Resource download timed out after ${timeout} ms`), timeout);

		return {
			signal: controller.signal,
			dispose: () => {
				clearTimeout(timer);
				callerSignal?.removeEventListener("abort", onCancel);
				cleanup.abort();
			},
		};
	}

	setUrlAccessPolicy(callback?: AccessPolicy): void {
		this.urlAccessPolicy = callback;
	}

	private queue(
		url: string,
		headers: ResourceHeaders = {},
	): { key: string; promise: Promise<void> } {
		const key = getResourceKey(url, headers);
		const resolveUrlInternal = async (): Promise<void> => {
			if (url.toLowerCase().startsWith("https://") || url.toLowerCase().startsWith("http://")) {
				if (this.fs.existsSync(key)) {
					return; // url was downloaded earlier
				}

				const { signal, dispose } = this.createDownload(url);
				try {
					const response = await fetchUrl(url, headers, this.urlAccessPolicy, signal);

					// validate access policy on redirected url (in browsers, only the final URL is validated)
					if (
						response.redirected &&
						!(await isAllowed(response.url, this.urlAccessPolicy, signal))
					) {
						await response.body?.cancel().catch(() => undefined);
						throw new Error(`Access to URL denied by resource access policy: ${response.url}`);
					}

					const buffer = await readBody(response, url, this.options.maxSize, signal);
					this.fs.writeFileSync(key, buffer);
				} finally {
					dispose();
				}
			}
			// else cannot be resolved
		};

		let resolving = this.resolving[key];
		if (resolving === undefined || resolving.failed) {
			const nextResolving: ResolvingResource = {
				failed: false,
				promise: Promise.resolve(),
			};
			nextResolving.promise = resolveUrlInternal().catch((error: unknown) => {
				nextResolving.failed = true;
				if (!this.failure.signal.aborted) {
					this.firstError = error;
					this.failure.abort(error);
				}
				throw error;
			});
			this.resolving[key] = nextResolving;
			resolving = nextResolving;
		}
		return { key, promise: resolving.promise };
	}

	private forget(key: string, promise: Promise<void>): void {
		if (this.resolving[key]?.promise === promise) {
			delete this.resolving[key];
		}
	}

	resolve(url: string, headers: ResourceHeaders = {}): Promise<void> {
		const { key, promise } = this.queue(url, headers);
		return promise.finally(() => this.forget(key, promise));
	}

	resolveReference(url: string, headers: ResourceHeaders = {}): string {
		return this.queue(url, headers).key;
	}

	async resolved(): Promise<void> {
		const resolutions = Object.entries(this.resolving);
		const results = await Promise.allSettled(resolutions.map(([, { promise }]) => promise));

		for (const [key, { promise }] of resolutions) {
			this.forget(key, promise);
		}

		const failure = results.find((result) => result.status === "rejected");
		if (failure?.status === "rejected") {
			// Report the failure that cancelled the others, not one of the cancellations.
			throw this.firstError ?? failure.reason;
		}
	}
}

export default URLResolver;
