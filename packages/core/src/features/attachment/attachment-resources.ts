import type { AttachmentDefinition as ResolvedAttachmentDefinition } from "../../rendering/renderer.types";
import type { Dictionary } from "../../types";
import { isResourceReference } from "../../services/resources/resource-reference";
import type { PrinterDocumentDefinition, PrinterResourceReference } from "../../core/printer.types";

export function resolveAttachmentReferences(
	document: PrinterDocumentDefinition,
	resolve: (resource: PrinterResourceReference) => string,
): void {
	if (!document.attachments) return;

	for (const [name, attachment] of Object.entries(document.attachments)) {
		if (isResourceReference(attachment)) {
			document.attachments[name] = { src: resolve(attachment) };
		} else if (
			typeof attachment === "object" &&
			"src" in attachment &&
			isResourceReference(attachment.src)
		) {
			attachment.src = resolve(attachment.src);
		}
	}
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
