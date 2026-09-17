import type PDFDocument from "../../rendering/pdf-document";
import type { EmbeddedFont } from "../../rendering/renderer.types";
import type { Inline } from "../../types/internal";
import type { LayoutAcroFormNode } from "./acroform.types";

const collectFormStrings = (value: unknown, strings: string[]): void => {
	if (typeof value === "string") strings.push(value);
	else if (Array.isArray(value)) {
		for (const item of value) collectFormStrings(item, strings);
	}
};

export class AcroFormRenderer {
	private initialized = false;

	constructor(private readonly document: PDFDocument) {}

	render(node: LayoutAcroFormNode | Inline, x: number, y: number): void {
		const form = node.acroform;
		if (!form) throw new Error("Cannot render an AcroForm node without a field definition");
		const font = "_formFont" in node ? (node._formFont ?? node.font) : node.font;
		if (!font) throw new Error(`AcroForm field '${form.id}' has no resolved font`);
		const embeddedFont = font as EmbeddedFont;
		this.document._font = embeddedFont;
		if (!this.initialized) {
			this.document.initForm();
			this.initialized = true;
		}

		const width = "_width" in node && node._width !== undefined ? node._width : node.width;
		const height = "_height" in node && node._height !== undefined ? node._height : node.height;
		const resolvedWidth = typeof width === "number" ? width : 25;
		const resolvedHeight = typeof height === "number" ? height : 15;
		const options = { ...form.options };
		const formStrings: string[] = [];
		for (const key of ["value", "defaultValue", "label", "select", "Opt"] as const) {
			collectFormStrings(options[key], formStrings);
		}
		for (const value of formStrings) embeddedFont.encode?.(value);

		switch (form.type) {
			case "text":
				this.document.formText(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "button":
				this.document.formPushButton(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "list":
				this.document.formList(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "combo":
				this.document.formCombo(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "checkbox":
				this.document.formCheckbox(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
		}
	}
}
