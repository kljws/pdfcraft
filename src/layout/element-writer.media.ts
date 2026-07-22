import type DocumentContext from "../document/document-context";
import type { CurrentPosition, LayoutPdfNode, Vector } from "../types/internal";
import { addPageItem, alignCanvas, alignImage } from "./element-writer.helpers";

interface MediaWriter {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
	addVector(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
		index?: number,
		forcePage?: number,
	): CurrentPosition | undefined;
}

function mediaFitsCurrentPage(writer: MediaWriter, node: LayoutPdfNode, height: number): boolean {
	const context = writer.context();
	const page = context.getCurrentPage();

	return Boolean(
		page &&
		(node.absolutePosition !== undefined ||
			context.availableHeight >= height ||
			page.items.length === 0),
	);
}

export function addImage(
	writer: MediaWriter,
	image: LayoutPdfNode,
	index?: number,
): CurrentPosition | false {
	const height = image._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (!mediaFitsCurrentPage(writer, image, height)) return false;

	image._x ??= image.x || 0;
	image.x = context.x + image._x;
	image.y = context.y;
	alignImage(image, context.availableWidth);
	addPageItem(page, { type: "image", item: image }, index);
	context.moveDown(height);
	return position;
}

export function addCanvas(
	writer: MediaWriter,
	node: LayoutPdfNode,
	index?: number,
): false | Array<CurrentPosition | undefined> {
	const context = writer.context();
	const page = context.getCurrentPage();
	const height = node._minHeight ?? 0;

	if (
		!page ||
		(node.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	alignCanvas(node, context.availableWidth);
	const positions: Array<CurrentPosition | undefined> = [];
	for (const vector of node.canvas ?? []) {
		positions.push(writer.addVector(vector, false, false, index));
		if (index !== undefined) index++;
	}
	context.moveDown(height);
	return positions;
}

export function addSVG(
	writer: MediaWriter,
	image: LayoutPdfNode,
	index?: number,
): CurrentPosition | false {
	const height = image._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (!mediaFitsCurrentPage(writer, image, height)) return false;

	image._x ??= image.x || 0;
	image.x = context.x + image._x;
	image.y = context.y;
	alignImage(image, context.availableWidth);
	addPageItem(page, { type: "svg", item: image }, index);
	context.moveDown(height);
	return position;
}

export function addQr(
	writer: MediaWriter,
	qr: LayoutPdfNode,
	index?: number,
): CurrentPosition | false {
	const height = qr._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (!page || (qr.absolutePosition === undefined && context.availableHeight < height))
		return false;

	qr._x ??= qr.x || 0;
	qr.x = context.x + qr._x;
	qr.y = context.y;
	alignImage(qr, context.availableWidth);
	for (const vector of qr._canvas ?? []) {
		vector.x = (vector.x ?? 0) + qr.x;
		vector.y = (vector.y ?? 0) + qr.y;
		writer.addVector(vector, true, true, index);
	}
	context.moveDown(height);
	return position;
}

export function addAttachment(
	writer: MediaWriter,
	attachment: LayoutPdfNode,
	index?: number,
): CurrentPosition | false {
	const height = attachment._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (
		!page ||
		(attachment.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	attachment._x ??= attachment.x || 0;
	attachment.x = context.x + attachment._x;
	attachment.y = context.y;
	addPageItem(page, { type: "attachment", item: attachment }, index);
	context.moveDown(height);
	return position;
}
