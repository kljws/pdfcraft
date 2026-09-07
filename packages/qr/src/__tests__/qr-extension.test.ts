import { describe, expect, it, vi } from "vitest";
import type { ExtensionMeasureContext } from "@pdfcraft/core/types";
import { qrExtension } from "../index";

describe("qrExtension", () => {
	it("recognizes and measures QR nodes as core canvas content", () => {
		const node: Record<string, unknown> = { qr: "pdfcraft", padding: 2 };
		const measureBox = vi.fn();
		const context: ExtensionMeasureContext = {
			documentDefinition: {},
			virtualFileSystem: null,
			getStyle: vi.fn(),
			measureBox,
		};

		expect(qrExtension.test(node)).toBe(true);
		qrExtension.measure(node, context);

		expect(node.canvas).toBeInstanceOf(Array);
		expect(measureBox).toHaveBeenCalledOnce();
		const dimensions = measureBox.mock.calls[0][0];
		expect(dimensions.width).toBeGreaterThan(0);
		expect(dimensions.height).toBe(dimensions.width);
		expect(node._minHeight).toBe(dimensions.height);
		expect(node._maxHeight).toBe(dimensions.height);
	});
});
