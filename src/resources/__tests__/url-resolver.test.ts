import { afterEach, describe, expect, it, vi } from "vitest";

import URLResolver from "../url-resolver";
import { VirtualFileSystem } from "../virtual-file-system";

describe("URLResolver", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("downloads each URL once and stores it in the VFS", async () => {
		const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
		vi.stubGlobal("fetch", fetchMock);
		const fileSystem = new VirtualFileSystem();
		const resolver = new URLResolver(fileSystem);
		const url = "https://assets.example.com/font.ttf";

		await Promise.all([resolver.resolve(url), resolver.resolve(url)]);

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fileSystem.readFileSync(url)).toEqual(Uint8Array.from([1, 2, 3]));
	});

	it("checks the access policy before fetching", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const resolver = new URLResolver(new VirtualFileSystem());
		resolver.setUrlAccessPolicy(() => false);

		await expect(resolver.resolve("https://blocked.example.com/file")).rejects.toThrow(
			"Access to URL denied by resource access policy",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("keeps responses with different request headers in separate cache entries", async () => {
		const fetchMock = vi.fn(
			async (_url: string, options?: RequestInit) =>
				new Response(
					new TextEncoder().encode(new Headers(options?.headers).get("authorization") ?? ""),
				),
		);
		vi.stubGlobal("fetch", fetchMock);
		const fileSystem = new VirtualFileSystem();
		const resolver = new URLResolver(fileSystem);
		const url = "https://assets.example.com/private.ttf";

		const first = resolver.resolveReference(url, { Authorization: "Bearer first" });
		const second = resolver.resolveReference(url, { Authorization: "Bearer second" });
		await resolver.resolved();

		expect(first).not.toBe(second);
		expect(fileSystem.readFileSync(first, "utf8")).toBe("Bearer first");
		expect(fileSystem.readFileSync(second, "utf8")).toBe("Bearer second");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("follows at most 30 observable redirects", async () => {
		const fetchMock = vi.fn(async (url: string) => {
			const redirect = Number(new URL(url).pathname.slice(1));
			return redirect < 30
				? new Response(null, { status: 302, headers: { location: `/${redirect + 1}` } })
				: new Response(new Uint8Array([1]));
		});
		vi.stubGlobal("fetch", fetchMock);
		const resolver = new URLResolver(new VirtualFileSystem());

		await resolver.resolve("https://redirect.example.com/0");

		expect(fetchMock).toHaveBeenCalledTimes(31);
	});

	it("rejects a 31st observable redirect without following it", async () => {
		const fetchMock = vi.fn(async (url: string) => {
			const redirect = Number(new URL(url).pathname.slice(1));
			return new Response(null, {
				status: 302,
				headers: { location: `/${redirect + 1}` },
			});
		});
		vi.stubGlobal("fetch", fetchMock);
		const resolver = new URLResolver(new VirtualFileSystem());

		await expect(resolver.resolve("https://redirect.example.com/0")).rejects.toThrow(
			"Too many redirects (maximum: 30)",
		);
		expect(fetchMock).toHaveBeenCalledTimes(31);
	});

	it.each([
		{
			response: new Response(null, { status: 302 }),
			message: "Redirect response missing Location header",
		},
		{
			response: new Response(null, { status: 404 }),
			message: "Failed to fetch (status code: 404)",
		},
	])("does not wrap $message as a network failure", async ({ response, message }) => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => response),
		);
		const resolver = new URLResolver(new VirtualFileSystem());

		const error = await resolver
			.resolve("https://assets.example.com/file")
			.catch((reason) => reason);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe(message);
	});

	it("wraps only errors thrown by fetch as network failures", async () => {
		const cause = new TypeError("socket closed");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Promise.reject(cause)),
		);
		const resolver = new URLResolver(new VirtualFileSystem());

		const error = await resolver
			.resolve("https://assets.example.com/file")
			.catch((reason) => reason);

		expect(error.message).toBe(
			'Network request failed (url: "https://assets.example.com/file", error: socket closed)',
		);
		expect(error.cause).toBe(cause);
	});

	it("retries a URL after its previous resolution failed", async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new TypeError("temporary failure"))
			.mockResolvedValueOnce(new Response(new Uint8Array([4, 5, 6])));
		vi.stubGlobal("fetch", fetchMock);
		const fileSystem = new VirtualFileSystem();
		const resolver = new URLResolver(fileSystem);
		const url = "https://assets.example.com/retry.ttf";

		await expect(resolver.resolve(url)).rejects.toThrow("temporary failure");
		await resolver.resolve(url);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fileSystem.readFileSync(url)).toEqual(Uint8Array.from([4, 5, 6]));
		expect(
			Object.keys((resolver as unknown as { resolving: Record<string, unknown> }).resolving),
		).toHaveLength(0);
	});

	it("releases successful and failed resolveReference entries after resolved", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(new Uint8Array([1])))
			.mockRejectedValueOnce(new TypeError("download failed"));
		vi.stubGlobal("fetch", fetchMock);
		const resolver = new URLResolver(new VirtualFileSystem());
		const resolvingEntries = () =>
			Object.keys((resolver as unknown as { resolving: Record<string, unknown> }).resolving);

		resolver.resolveReference("https://assets.example.com/success");
		await resolver.resolved();
		expect(resolvingEntries()).toHaveLength(0);

		resolver.resolveReference("https://assets.example.com/failure");
		await expect(resolver.resolved()).rejects.toThrow("download failed");
		expect(resolvingEntries()).toHaveLength(0);
	});

	it("uses one browser-controlled follow-up request for opaqueredirect", async () => {
		const opaqueRedirect = {
			headers: new Headers(),
			ok: false,
			redirected: false,
			status: 0,
			type: "opaqueredirect",
			url: "",
		} as Response;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(opaqueRedirect)
			.mockResolvedValueOnce(new Response(new Uint8Array([7])));
		vi.stubGlobal("fetch", fetchMock);
		const resolver = new URLResolver(new VirtualFileSystem());

		await resolver.resolve("https://assets.example.com/browser-redirect");

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ redirect: "follow" });
	});
});
