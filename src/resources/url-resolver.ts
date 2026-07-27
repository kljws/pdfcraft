import type { AccessPolicy, ResourceHeaders, VirtualFileSystem } from "../types";

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
): Promise<Response> => {
	try {
		return await fetch(url, { headers: headers as HeadersInit, redirect });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Network request failed (url: "${url}", error: ${message})`, {
			cause: error,
		});
	}
};

async function fetchUrl(
	url: string,
	headers: ResourceHeaders = {},
	urlAccessPolicy?: AccessPolicy,
): Promise<Response> {
	let redirectCount = 0;
	while (true) {
		if (typeof urlAccessPolicy !== "undefined" && (await urlAccessPolicy(url)) !== true) {
			throw new Error(`Access to URL denied by resource access policy: ${url}`);
		}

		let response = await fetchNetworkResource(url, headers, "manual");

		// redirect url
		if (response.status >= 300 && response.status < 400) {
			let location = response.headers.get("location");
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
			response = await fetchNetworkResource(url, headers, "follow");
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch (status code: ${response.status})`);
		}

		return response;
	}
}

type ResolvingResource = {
	failed: boolean;
	promise: Promise<void>;
};

class URLResolver {
	private readonly fs: VirtualFileSystem;
	private readonly resolving: Record<string, ResolvingResource> = {};
	private urlAccessPolicy?: AccessPolicy;

	constructor(fs: VirtualFileSystem) {
		this.fs = fs;
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

				const response = await fetchUrl(url, headers, this.urlAccessPolicy);

				// validate access policy on redirected url (in browsers, only the final URL is validated)
				if (response.redirected) {
					if (
						typeof this.urlAccessPolicy !== "undefined" &&
						(await this.urlAccessPolicy(response.url)) !== true
					) {
						throw new Error(`Access to URL denied by resource access policy: ${response.url}`);
					}
				}

				const buffer = await response.arrayBuffer();
				this.fs.writeFileSync(key, buffer);
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
			throw failure.reason;
		}
	}
}

export default URLResolver;
