import { describe, expect, it } from "vitest";
import { cloneValue } from "../clone-document-definition";
import { convertToDynamicContent } from "../tools";

describe("cloneValue", () => {
	it("deeply clones plain values and supports cycles", () => {
		const source: { nested: { value: number }; self?: unknown } = {
			nested: { value: 1 },
		};
		source.self = source;

		const clone = cloneValue(source);

		expect(clone).not.toBe(source);
		expect(clone.nested).not.toBe(source.nested);
		expect(clone.self).toBe(clone);
	});

	it("preserves values that should not be expanded", () => {
		const date = new Date("2026-01-01T00:00:00Z");
		const bytes = new Uint8Array([1, 2, 3]);

		const clone = cloneValue({ date, bytes });

		expect(clone.date).toBe(date);
		expect(clone.bytes).toBe(bytes);
	});
});

describe("convertToDynamicContent", () => {
	it("returns a fresh deep clone for each page", () => {
		const getContent = convertToDynamicContent({ text: ["header"] });

		const first = getContent();
		const second = getContent();

		expect(first).toEqual(second);
		expect(first).not.toBe(second);
		expect(first.text).not.toBe(second.text);
	});
});
