import type PDFDocument from "../../rendering/pdf-document";
import { addPageLink } from "../../rendering/renderer.helpers";
import { isNumber } from "../../utils/variable-type";
import type { LayoutImageNode } from "./image.types";

export interface ImageRenderContext {
	document: PDFDocument;
	resetVectorState(): void;
}

export function renderImage(image: LayoutImageNode, context: ImageRenderContext): void {
	const document = context.document;
	const opacity = isNumber(image.opacity) ? image.opacity : 1;
	const width = image.cover?.width ?? image._width!;
	const height = image.cover?.height ?? image._height!;
	const borderRadius =
		Number.isFinite(image.borderRadius) && image.borderRadius! > 0
			? Math.min(image.borderRadius!, width / 2, height / 2)
			: 0;
	document.opacity(opacity);
	if (image.cover || borderRadius > 0) {
		document.save();
		if (borderRadius > 0) {
			document.roundedRect(image.x!, image.y!, width, height, borderRadius).clip();
		} else {
			document.rect(image.x!, image.y!, width, height).clip();
		}
	}
	if (image.cover) {
		const align = image.cover.align;
		const valign = image.cover.valign;
		document.image(image.image as PDFKit.Mixins.ImageSrc, image.x!, image.y!, {
			cover: [width, height],
			align: align === "left" ? undefined : align,
			valign: valign === "top" ? undefined : valign,
		});
	} else {
		document.image(image.image as PDFKit.Mixins.ImageSrc, image.x!, image.y!, {
			width: image._width,
			height: image._height,
		});
	}
	if (image.cover || borderRadius > 0) document.restore();

	const requestedBorderWidth =
		Number.isFinite(image.borderWidth) && image.borderWidth! > 0 ? image.borderWidth! : 0;
	const borderWidth = Math.min(requestedBorderWidth, width, height);
	if (borderWidth > 0) {
		const inset = borderWidth / 2;
		const borderPathWidth = Math.max(0, width - borderWidth);
		const borderPathHeight = Math.max(0, height - borderWidth);
		const borderPathRadius = Math.max(
			0,
			Math.min(borderRadius - inset, borderPathWidth / 2, borderPathHeight / 2),
		);
		document.lineWidth(borderWidth);
		document.strokeColor(document.resolveColor(image._imageBorderColor, "black"));
		if (borderPathRadius > 0) {
			document.roundedRect(
				image.x! + inset,
				image.y! + inset,
				borderPathWidth,
				borderPathHeight,
				borderPathRadius,
			);
		} else {
			document.rect(image.x! + inset, image.y! + inset, borderPathWidth, borderPathHeight);
		}
		document.stroke();
		context.resetVectorState();
	}
	if (image.link) {
		document.link(image.x!, image.y!, image._width!, image._height!, image.link);
	}
	if (image.linkToPage) {
		addPageLink(document, image.x!, image.y!, image._width!, image._height!, image.linkToPage);
	}
	if (image.linkToDestination) {
		document.goTo(image.x!, image.y!, image._width!, image._height!, image.linkToDestination);
	}
	if (image.linkToFile) {
		const attachment = document.provideAttachment(image.linkToFile);
		document.fileAnnotation(image.x!, image.y!, image._width!, image._height!, attachment, {
			AP: {
				N: {
					Type: "XObject",
					Subtype: "Form",
					FormType: 1,
					BBox: [image.x!, image.y!, image._width!, image._height!],
				},
			},
		});
	}
}
