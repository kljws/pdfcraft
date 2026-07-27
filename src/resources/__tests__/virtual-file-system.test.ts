import { describe, expect, it } from "vitest";

import { VirtualFileSystem } from "../virtual-file-system";

describe("VirtualFileSystem", () => {
	it("stores empty files", () => {
		const fileSystem = new VirtualFileSystem();

		fileSystem.writeFileSync("empty.txt", "");

		expect(fileSystem.existsSync("empty.txt")).toBe(true);
		expect(fileSystem.readFileSync("empty.txt", "utf8")).toBe("");
	});

	it("keeps instances isolated", () => {
		const first = new VirtualFileSystem();
		const second = new VirtualFileSystem();
		first.writeFileSync("first.txt", "first");

		expect(first.existsSync("first.txt")).toBe(true);
		expect(second.existsSync("first.txt")).toBe(false);
	});

	it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
		"stores prototype-like filename %s as an ordinary file",
		(filename) => {
			const fileSystem = new VirtualFileSystem();

			expect(fileSystem.existsSync(filename)).toBe(false);
			expect(() => fileSystem.readFileSync(filename)).toThrow(
				`File '${filename}' not found in virtual file system`,
			);

			fileSystem.writeFileSync(filename, filename);

			expect(fileSystem.existsSync(filename)).toBe(true);
			expect(fileSystem.readFileSync(filename, "utf8")).toBe(filename);
		},
	);

	it("removes only one virtual-root slash from filenames", () => {
		const fileSystem = new VirtualFileSystem();
		fileSystem.writeFileSync("//nested.txt", "nested");

		expect(fileSystem.existsSync("//nested.txt")).toBe(true);
		expect(fileSystem.existsSync("/nested.txt")).toBe(false);
		expect(fileSystem.readFileSync("//nested.txt", "utf8")).toBe("nested");
	});

	it.each([
		["utf8", "héllo"],
		["utf16le", "héllo"],
		["latin1", "héllo"],
		["hex", "00ff10"],
		["base64", "AP8Q"],
		["base64url", "AP8Q"],
	] as const)("round-trips %s encoded strings", (encoding, value) => {
		const fileSystem = new VirtualFileSystem();
		fileSystem.writeFileSync("encoded.bin", value, encoding);

		expect(fileSystem.readFileSync("encoded.bin", encoding)).toBe(value);
	});

	it("copies typed-array views without including surrounding bytes", () => {
		const fileSystem = new VirtualFileSystem();
		const source = Uint8Array.from([0, 1, 2, 3]);
		fileSystem.writeFileSync("slice.bin", source.subarray(1, 3));

		expect(fileSystem.readFileSync("slice.bin")).toEqual(Uint8Array.from([1, 2]));
	});
});
