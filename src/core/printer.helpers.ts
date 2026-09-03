import type PDFDocument from "../rendering/pdf-document";
import type { AttachmentDefinition as ResolvedAttachmentDefinition } from "../rendering/renderer.types";
import type { Dictionary } from "../types";
import type { PrinterDocumentDefinition } from "./printer.types";

export function getResolvedImages(images: PrinterDocumentDefinition["images"]): Dictionary<string> {
	const result: Dictionary<string> = {};
	for (const [name, image] of Object.entries(images ?? {})) {
		if (typeof image !== "string") {
			throw new Error(`Image '${name}' contains an unresolved URL`);
		}
		result[name] = image;
	}
	return result;
}

export function getResolvedSvgs(svgs: PrinterDocumentDefinition["svgs"]): Dictionary<string> {
	const result: Dictionary<string> = {};
	for (const [name, svg] of Object.entries(svgs ?? {})) {
		if (typeof svg !== "string") {
			throw new Error(`SVG '${name}' contains an unresolved URL`);
		}
		result[name] = svg;
	}
	return result;
}

export function getResolvedAttachments(
	attachments: PrinterDocumentDefinition["attachments"],
): Dictionary<ResolvedAttachmentDefinition> {
	const result: Dictionary<ResolvedAttachmentDefinition> = {};
	for (const [name, attachment] of Object.entries(attachments ?? {})) {
		if (typeof attachment === "string") {
			result[name] = { src: attachment };
			continue;
		}
		if (
			!("src" in attachment) ||
			(typeof attachment.src === "object" && !(attachment.src instanceof Uint8Array))
		) {
			throw new Error(`Attachment '${name}' contains an unresolved URL`);
		}
		result[name] = { ...attachment, src: attachment.src };
	}
	return result;
}

export function createMetadata(
	docDefinition: PrinterDocumentDefinition,
): Record<string, string | Date> {
	const standardProperties = new Set([
		"Title",
		"Author",
		"Subject",
		"Keywords",
		"Creator",
		"Producer",
		"CreationDate",
		"ModDate",
		"Trapped",
	]);
	const info: Record<string, string | Date> = {
		Producer: "PDFCraft",
		Creator: "PDFCraft",
	};

	for (const [originalKey, value] of Object.entries(docDefinition.info ?? {})) {
		if (!value) continue;
		const standardKey = originalKey.charAt(0).toUpperCase() + originalKey.slice(1);
		const key = standardProperties.has(standardKey) ? standardKey : originalKey.replace(/\s+/g, "");
		info[key] = value;
	}
	return info;
}

export function embedFiles(docDefinition: PrinterDocumentDefinition, pdfKitDoc: PDFDocument): void {
	for (const [key, file] of Object.entries(docDefinition.files ?? {})) {
		if (!file.src) throw new Error(`File '${key}' is missing a source`);
		if (typeof file.src === "object" && !(file.src instanceof Uint8Array)) {
			throw new Error(`File '${key}' contains an unresolved URL`);
		}
		if (
			typeof file.src === "string" &&
			pdfKitDoc.virtualfs &&
			pdfKitDoc.virtualfs.existsSync(file.src)
		) {
			file.src = pdfKitDoc.virtualfs.readFileSync(file.src);
		}
		file.name ||= key;
		pdfKitDoc.file(file.src, file);
	}
}
