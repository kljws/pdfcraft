import { describe, expect, it } from "vitest";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfcraft from "../../src/index.ts";

describe("Integration test: JPEG streams", () => {
	it("produces an image stream that a strict PDF consumer can decode", async () => {
		const instance = pdfcraft.createPdfCraft({
			fonts: { Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } },
			localAccessPolicy: () => true,
			urlAccessPolicy: () => false,
		});
		const buffer = await instance
			.createPdf({
				content: ["JPEG image", { image: "sample", fit: [200, 200] }],
				images: { sample: "examples/images/sampleImage.jpg" },
			})
			.getBuffer();

		const loadingTask = getDocument({ data: new Uint8Array(buffer) });
		const document = await loadingTask.promise;
		const operatorList = await (await document.getPage(1)).getOperatorList();

		expect(
			operatorList.fnArray.some(
				(operator) => operator === OPS.paintImageXObject || operator === OPS.paintJpegXObject,
			),
		).toBe(true);
		await loadingTask.destroy();
	});
});
