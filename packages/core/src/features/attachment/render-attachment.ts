import type PDFDocument from "../../rendering/pdf-document";
import type { FileAnnotationOptions } from "../../rendering/renderer.types";
import type { LayoutAttachmentNode } from "./attachment.types";

export interface AttachmentRenderContext {
	document: PDFDocument;
}

export function renderAttachment(
	attachment: LayoutAttachmentNode,
	context: AttachmentRenderContext,
): void {
	const file = context.document.provideAttachment(attachment.attachment!);
	const options: FileAnnotationOptions = {};
	if (attachment.icon) options.Name = attachment.icon;

	context.document.fileAnnotation(
		attachment.x!,
		attachment.y!,
		attachment._width!,
		attachment._height!,
		file,
		options,
	);
}
