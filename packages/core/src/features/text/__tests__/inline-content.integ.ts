import { assert, describe, it } from "vitest";
import IntegrationTestHelper from "../../../__tests__/fixtures/integration.helpers.ts";

describe("Integration test: inline content", function () {
	const testHelper = new IntegrationTestHelper();

	const renderedTexts = (fragment: object): string[] => {
		const pages = testHelper.renderPages("A6", {
			content: { text: ["before ", fragment, " after"] },
		});
		const lines = pages[0].items.filter((entry) => entry.type === "line");
		assert.equal(lines.length, 1);
		return lines[0].item.inlines.map((inline: { text: string; content?: unknown }) => {
			assert.isUndefined(inline.content);
			return inline.text;
		});
	};

	it("renders a text fragment with an empty image as ordinary text", function () {
		assert.deepEqual(renderedTexts({ text: "x", image: "" }), ["before ", "x", " ", "after"]);
	});

	it("renders a text fragment with a null form field as ordinary text", function () {
		assert.deepEqual(renderedTexts({ text: "x", acroform: null }), ["before ", "x", " ", "after"]);
	});

	it("keeps rejecting an invalid inline image resource", function () {
		assert.throws(
			() =>
				testHelper.renderPages("A6", { content: { text: ["a ", { image: "not-a-valid-image" }] } }),
			/Invalid image/,
		);
	});

	it("keeps rejecting a malformed inline form field", function () {
		assert.throws(
			() =>
				testHelper.renderPages("A6", {
					content: { text: ["a ", { acroform: { type: "bogus", id: "x" } }] },
				}),
			/unsupported field type 'bogus'/,
		);
		assert.throws(
			() =>
				testHelper.renderPages("A6", { content: { text: ["a ", { acroform: { type: "text" } }] } }),
			/'acroform.id' must be a non-empty string/,
		);
	});
});
