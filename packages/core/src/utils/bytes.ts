import type { VfsEncoding } from "../types";

const normalizeEncoding = (encoding: VfsEncoding = "utf8"): string =>
	encoding.toLowerCase().replaceAll("-", "");

const bytesToBinary = (bytes: Uint8Array): string => {
	let result = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		result += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return result;
};

export const decodeBase64 = (value: string): Uint8Array => {
	const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
	return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

export const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
};

export const encodeBytes = (value: string, encoding: VfsEncoding = "utf8"): Uint8Array => {
	switch (normalizeEncoding(encoding)) {
		case "base64":
		case "base64url":
			return decodeBase64(value);
		case "hex": {
			const pairs = value.match(/[\da-f]{2}/gi) ?? [];
			return Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
		}
		case "ascii":
		case "binary":
		case "latin1":
			return Uint8Array.from(value, (character) => character.charCodeAt(0) & 0xff);
		case "ucs2":
		case "utf16le": {
			const bytes = new Uint8Array(value.length * 2);
			for (let index = 0; index < value.length; index++) {
				const code = value.charCodeAt(index);
				bytes[index * 2] = code & 0xff;
				bytes[index * 2 + 1] = code >>> 8;
			}
			return bytes;
		}
		default:
			return new TextEncoder().encode(value);
	}
};

export const decodeBytes = (bytes: Uint8Array, encoding: VfsEncoding): string => {
	switch (normalizeEncoding(encoding)) {
		case "base64":
			return btoa(bytesToBinary(bytes));
		case "base64url":
			return btoa(bytesToBinary(bytes))
				.replaceAll("+", "-")
				.replaceAll("/", "_")
				.replace(/=+$/, "");
		case "hex":
			return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
		case "ascii":
			return String.fromCharCode(...Array.from(bytes, (byte) => byte & 0x7f));
		case "binary":
		case "latin1":
			return bytesToBinary(bytes);
		case "ucs2":
		case "utf16le": {
			let result = "";
			for (let index = 0; index + 1 < bytes.length; index += 2) {
				result += String.fromCharCode(bytes[index]! | (bytes[index + 1]! << 8));
			}
			return result;
		}
		default:
			return new TextDecoder().decode(bytes);
	}
};
