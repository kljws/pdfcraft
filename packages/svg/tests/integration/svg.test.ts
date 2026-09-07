import { assert, describe, it } from "vitest";
import { SVGMeasure, svgExtension } from "../../src/index.ts";
import IntegrationTestHelper from "../../../core/tests/integration/integration-test.helpers.ts";
import pdfcraft from "../../../core/src/index.ts";

// NOTE: more tests for SVGMeasure in src/__tests__/svg-measure.test.ts

describe("Integration Test: svg's", function () {
	var testHelper = new IntegrationTestHelper([svgExtension]);
	var instance = pdfcraft.createPdfCraft({
		fonts: {
			Roboto: {
				normal: "fonts/Roboto/Roboto-Regular.ttf",
				bold: "fonts/Roboto/Roboto-Medium.ttf",
			},
		},
		localAccessPolicy: () => true,
		urlAccessPolicy: () => true,
		extensions: [svgExtension],
	});
	var renderSvgBuffer = (svg: string) => instance.createPdf({ content: [{ svg }] }).getBuffer();

	var INLINE_TEST_SVG =
		'<svg viewBox="0 0 500 500"><circle cx="250" cy="250" r="100" stroke="black" stroke-width="3" fill="red" /></svg>';

	describe("basics", function () {
		it("renders SVG elements selected by a CSS class", async function () {
			var svg =
				'<svg width="100" height="100"><style>.accent { fill: red; }</style><rect class="accent" width="50" height="50"/></svg>';

			var buffer = await renderSvgBuffer(svg);

			assert.ok(buffer.length > 0);
		});

		it("renders every basic shape and path transformations", async function () {
			var svg = `<svg width="240" height="160" viewBox="0 0 240 160">
				<g transform="translate(5 5) rotate(3 100 70)">
					<rect x="0" y="0" width="30" height="20" rx="4"/>
					<circle cx="55" cy="10" r="10"/>
					<ellipse cx="90" cy="10" rx="16" ry="8"/>
					<line x1="115" y1="0" x2="145" y2="20" stroke="black"/>
					<polyline points="0,45 15,30 30,45" fill="none" stroke="black"/>
					<polygon points="45,45 60,30 75,45"/>
					<path d="M90 45 C105 20 120 70 140 45 A12 8 0 0 1 165 45"/>
				</g>
			</svg>`;

			var buffer = await renderSvgBuffer(svg);

			assert.ok(buffer.length > 0);
		});

		it("renders nested containers, symbols and use references", async function () {
			var svg = `<svg width="160" height="100" viewBox="0 0 160 100">
				<defs><symbol id="badge" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9"/></symbol></defs>
				<g transform="translate(10 10)"><use href="#badge" width="40" height="40"/></g>
				<svg x="70" y="10" width="60" height="60" viewBox="0 0 20 20">
					<use href="#badge"/>
				</svg>
			</svg>`;

			var buffer = await renderSvgBuffer(svg);

			assert.ok(buffer.length > 0);
		});

		it("renders embedded raster images", async function () {
			var image =
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			var svg = `<svg width="40" height="40"><image href="${image}" width="40" height="40"/></svg>`;

			var buffer = await renderSvgBuffer(svg);

			assert.ok(buffer.length > 0);
		});

		it("renders gradients, patterns, clipping, masks and markers", async function () {
			var svg = `<svg width="220" height="120" viewBox="0 0 220 120">
				<defs>
					<linearGradient id="gradient"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient>
					<pattern id="pattern" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" fill="black"/></pattern>
					<clipPath id="clip"><circle cx="45" cy="45" r="35"/></clipPath>
					<mask id="mask"><rect width="90" height="90" fill="white"/><circle cx="45" cy="45" r="18" fill="black"/></mask>
					<marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z"/></marker>
				</defs>
				<rect x="5" y="5" width="80" height="80" fill="url(#gradient)" clip-path="url(#clip)"/>
				<rect x="100" y="5" width="80" height="80" fill="url(#pattern)" mask="url(#mask)"/>
				<path d="M20 105 L190 105" stroke="black" marker-end="url(#arrow)"/>
			</svg>`;

			var buffer = await renderSvgBuffer(svg);

			assert.ok(buffer.length > 0);
		});

		it("renders text, tspans and text on a path", async function () {
			var svg = `<svg width="240" height="100" viewBox="0 0 240 100">
				<defs><path id="text-line" d="M10 70 C70 20 160 120 230 55"/></defs>
				<text x="10" y="25" font-family="Roboto" font-size="14">Hello <tspan font-weight="bold">PDFCraft</tspan></text>
				<text font-family="Roboto" font-size="12"><textPath href="#text-line">Text along path</textPath></text>
			</svg>`;

			var buffer = await renderSvgBuffer(svg);

			assert.ok(buffer.length > 0);
		});

		it("keeps concurrent renderer state isolated", async function () {
			var red = '<svg width="40" height="40"><rect width="40" height="40" fill="red"/></svg>';
			var blue = '<svg width="40" height="40"><circle cx="20" cy="20" r="20" fill="blue"/></svg>';

			var buffers = await Promise.all([renderSvgBuffer(red), renderSvgBuffer(blue)]);

			assert.ok(buffers.every((buffer) => buffer.length > 0));
		});

		it("renders next element below svg", function () {
			var svgHeight = 150;
			var dd = {
				content: [
					{
						svg: INLINE_TEST_SVG,
						height: svgHeight,
					},
					"some Text",
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			assert.equal(pages.length, 1);

			var svg = pages[0].items[0].item;
			var someElementAfterSvg = pages[0].items[1].item;

			assert.equal(svg.x, testHelper.MARGINS.left);
			assert.equal(svg.y, testHelper.MARGINS.top);
			assert.equal(someElementAfterSvg.x, testHelper.MARGINS.left);
			assert.equal(someElementAfterSvg.y, testHelper.MARGINS.top + svgHeight);
		});

		it("renders svg below text", function () {
			var svgHeight = 150;
			var dd = {
				content: [
					"some Text",
					{
						svg: INLINE_TEST_SVG,
						height: svgHeight,
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			assert.equal(pages.length, 1);

			var someElementBeforeSvg = pages[0].items[0].item;
			var image = pages[0].items[1].item;

			assert.equal(someElementBeforeSvg.x, testHelper.MARGINS.left);
			assert.equal(someElementBeforeSvg.y, testHelper.MARGINS.top);

			assert.equal(image.x, testHelper.MARGINS.left);
			assert.equal(image.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
		});
	});

	describe("dimensions", function () {
		var svgMeasure = new SVGMeasure();

		it("reads height and width from svg", function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(svgNode._width, 200);
			assert.equal(svgNode._height, 100);
		});

		it("reads height and width from svg (decimals)", function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200.15" height="100.35" viewBox="0 0 600 300"></svg>',
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(Number(svgNode._width).toFixed(2), "200.15");
			assert.equal(Number(svgNode._height).toFixed(2), "100.35");
		});

		it("reads height and width from viewBox", function () {
			var dd = {
				content: [
					{
						svg: '<svg viewBox="0 0 600 300"></svg>',
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(svgNode._width, 600);
			assert.equal(svgNode._height, 300);
		});

		it("reads height and width from viewBox (decimals)", function () {
			var dd = {
				content: [
					{
						svg: '<svg viewBox="0 0 600.10 300.20"></svg>',
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(Number(svgNode._width).toFixed(2), "600.10");
			assert.equal(Number(svgNode._height).toFixed(2), "300.20");
		});

		it("writes width and height from definition to svg", function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
						width: 400,
						height: 800,
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var svgNode = pages[0].items[0].item;
			var svgDimensions = svgMeasure.measureSVG(svgNode.svg);

			assert.equal(svgDimensions.width, 400);
			assert.equal(svgDimensions.height, 800);
		});

		it("writes width and height from definition to svg (decimals)", function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
						width: 400.15,
						height: 800.35,
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var svgNode = pages[0].items[0].item;
			var svgDimensions = svgMeasure.measureSVG(svgNode.svg);

			assert.equal(svgDimensions.width, 400.15);
			assert.equal(svgDimensions.height, 800.35);
		});

		it("writes svg in header", function () {
			var dd = {
				content: [],
				header: function () {
					return {
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
					};
				},
			};

			var pages = testHelper.renderPages("A6", dd);
			assert.equal(pages[0].items[0].type, "extension");
		});

		it("writes svg in table", function () {
			var dd = {
				content: [
					{
						table: {
							body: {
								groups: [
									{
										rows: [[{ svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>' }]],
									},
								],
							},
						},
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			var types = pages[0].items.map((item) => item.type);
			assert.ok(types.includes("extension"));
		});
	});
});
