import { markNodeKind } from "../../utils/node";
import type { PdfNode } from "../../types/internal";
import { isNumber, isObject } from "../../utils/variable-type";
import type { PreprocessedAcroFormNode } from "./acroform.types";

const SUPPORTED_TYPES: ReadonlySet<unknown> = new Set([
	"text",
	"button",
	"list",
	"combo",
	"checkbox",
]);

export function preprocessAcroForm(node: PdfNode): PreprocessedAcroFormNode {
	const form = node.acroform;
	if (!isObject(form)) {
		throw new Error("Invalid AcroForm node: 'acroform' must be an object");
	}
	if (typeof form.id !== "string" || form.id.trim().length === 0) {
		throw new Error("Invalid AcroForm node: 'acroform.id' must be a non-empty string");
	}
	if (!SUPPORTED_TYPES.has(form.type)) {
		throw new Error(`Invalid AcroForm node: unsupported field type '${String(form.type)}'`);
	}
	if (node.width !== undefined && node.width !== "*" && !(isNumber(node.width) && node.width > 0)) {
		throw new Error("Invalid AcroForm node: 'width' must be a positive number or '*'");
	}
	if (node.height !== undefined && !(isNumber(node.height) && node.height > 0)) {
		throw new Error("Invalid AcroForm node: 'height' must be a positive number");
	}
	return markNodeKind(node, "acroform");
}
