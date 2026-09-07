import { assert, describe, expect, it, vi } from "vitest";
import type { ExtensionMeasureContext } from "@pdfcraft/core/types";
import { svgExtension } from "../extension/svg-extension.ts";
import { SVGMeasure } from "../measurement/svg-measure.ts";

// NOTE: more tests for SVGMeasure in integration/svgs.js

var inputBasic =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	"</svg>\n";

var inputWithoutViewBox =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<svg width="105pt" height="222pt" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	"</svg>\n";

var inputWithNewline =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg"\n' +
	'    xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	"</svg>\n";

var inputWithComment1 =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	"<!-- <svg -->\n" +
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	"</svg>\n";

var inputWithComment2 =
	'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
	'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
	'<!-- <svg width="123" height="456"> -->\n' + // [ evil laughter intensifies ]
	'<svg width="105pt" height="222pt" viewBox="0.00 0.00 105.43 222.00" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
	'    <rect width="105" height="222" fill="none" stroke="black"/>\n' +
	"</svg>\n";

describe("SVGMeasure", function () {
	var svgMeasure = new SVGMeasure();

	describe("measureSVG()", function () {
		it("returns correct dimensions for pts", function () {
			var dimensions = svgMeasure.measureSVG(inputBasic);

			assert.equal(typeof dimensions, "object");
			assert.equal(typeof dimensions.width, "number");
			assert.equal(typeof dimensions.height, "number");

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});

		it("correctly handles multi-line svg tags", function () {
			var dimensions = svgMeasure.measureSVG(inputWithNewline);

			assert.equal(typeof dimensions, "object");
			assert.equal(typeof dimensions.width, "number");
			assert.equal(typeof dimensions.height, "number");

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});

		it('ignores "svg tags" in comments (1)', function () {
			var dimensions = svgMeasure.measureSVG(inputWithComment1);

			assert.equal(typeof dimensions, "object");
			assert.equal(typeof dimensions.width, "number");
			assert.equal(typeof dimensions.height, "number");

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});

		it('ignores "svg tags" in comments (2)', function () {
			var dimensions = svgMeasure.measureSVG(inputWithComment2);

			assert.equal(typeof dimensions, "object");
			assert.equal(typeof dimensions.width, "number");
			assert.equal(typeof dimensions.height, "number");

			assert.equal(dimensions.width, 105);
			assert.equal(dimensions.height, 222);
		});
	});

	describe("writeDimensions()", function () {
		var replacementDimensions = {
			width: 1984,
			height: 2001,
		};

		it("updates dimensions", function () {
			var updatedSVGString = svgMeasure.writeDimensions(inputBasic, replacementDimensions);
			var updatedDimensions = svgMeasure.measureSVG(updatedSVGString);

			assert.equal(updatedDimensions.width, 1984);
			assert.equal(updatedDimensions.height, 2001);
		});

		it("correctly ignores comments", function () {
			var updatedSVGString = svgMeasure.writeDimensions(inputWithComment2, replacementDimensions);
			var updatedDimensions = svgMeasure.measureSVG(updatedSVGString);

			assert.equal(updatedDimensions.width, 1984);
			assert.equal(updatedDimensions.height, 2001);
		});

		it("add viewBox svg property", function () {
			var updatedSVGString = svgMeasure.writeDimensions(inputWithoutViewBox, replacementDimensions);

			assert.equal(typeof updatedSVGString, "string");
			if (typeof updatedSVGString !== "string") {
				throw new Error("Expected an SVG string");
			}
			assert.ok(updatedSVGString.includes('viewBox="0 0 105 222"'));
		});
	});
});

describe("svgExtension", () => {
	it("recognizes SVG nodes without requiring browser globals", () => {
		expect(svgExtension.test({})).toBe(false);
		expect(svgExtension.test({ svg: inputBasic })).toBe(true);
	});

	it("owns named SVG resource resolution and measurement", () => {
		const node: Record<string, unknown> = { svg: "logo" };
		const measureBox = vi.fn((dimensions: { width: number; height: number }) => {
			node._width = dimensions.width;
			node._height = dimensions.height;
		});
		const context: ExtensionMeasureContext = {
			documentDefinition: { svgs: { logo: inputBasic } },
			virtualFileSystem: null,
			getStyle: () => "Roboto",
			measureBox,
		};

		svgExtension.measure(node, context);

		expect(measureBox).toHaveBeenCalledWith({ width: 105, height: 222 });
		expect(node.font).toBe("Roboto");
		expect(node.svg).toContain('width="105"');
	});

	it("delegates only SVG resource references", () => {
		const definition = { svgs: { logo: "https://example.com/logo.svg" } };
		const resolve = vi.fn((source: string | { url: string }) => `resolved:${String(source)}`);

		svgExtension.resolveResources?.(definition, resolve);

		expect(resolve).toHaveBeenCalledOnce();
		expect(definition.svgs.logo).toBe("resolved:https://example.com/logo.svg");
	});
});
