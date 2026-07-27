import type { VfsEncoding, VirtualFileSystem as VirtualFileSystemContract } from "../types";
import { decodeBytes, encodeBytes } from "../utils/bytes";

const normalizeFilename = (filename: string): string => {
	if (filename.indexOf("/") === 0) {
		filename = filename.substring(1);
	}

	return filename;
};

class VirtualFileSystem implements VirtualFileSystemContract {
	private readonly storage = new Map<string, Uint8Array>();

	existsSync(filename: string): boolean {
		const normalizedFilename = normalizeFilename(filename);
		return this.storage.has(normalizedFilename);
	}

	readFileSync(
		filename: string,
		options?: VfsEncoding | { encoding?: VfsEncoding },
	): string | Uint8Array {
		const normalizedFilename = normalizeFilename(filename);
		const encoding = typeof options === "object" ? options.encoding : options;

		const buffer = this.storage.get(normalizedFilename);
		if (buffer === undefined) {
			throw new Error(`File '${normalizedFilename}' not found in virtual file system`);
		}

		if (encoding) {
			return decodeBytes(buffer, encoding);
		}

		return buffer;
	}

	writeFileSync(
		filename: string,
		content: string | ArrayBuffer | ArrayBufferView,
		options?: VfsEncoding | { encoding?: VfsEncoding },
	): void {
		const normalizedFilename = normalizeFilename(filename);
		const encoding = typeof options === "object" ? options.encoding : options;

		if (typeof content === "string") {
			this.storage.set(normalizedFilename, encodeBytes(content, encoding));
		} else if (ArrayBuffer.isView(content)) {
			this.storage.set(
				normalizedFilename,
				new Uint8Array(
					content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
				),
			);
		} else {
			this.storage.set(normalizedFilename, new Uint8Array(content.slice(0)));
		}
	}
}

export { VirtualFileSystem };
