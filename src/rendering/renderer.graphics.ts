import { isNumber, isString } from "../utils/variable-type";
import SVGtoPDF from "svg-to-pdfkit";
import type { LayoutPdfNode, Vector } from "../types/internal";
import { findFont } from "./renderer.helpers";
import type PDFDocument from "./pdf-document";
import type {
	ClipRectangle,
	EmbeddedFont,
	FileAnnotationOptions,
	RenderablePage,
	VerticalAlignmentItem,
} from "./renderer.types";

class RendererGraphics {
	protected readonly pdfDocument: PDFDocument;
	private vectorState: {
		lineWidth?: number;
		dash?: string;
		lineJoin?: string;
		lineCap?: string;
	} = {};
	private clipDepth = 0;

	constructor(pdfDocument: PDFDocument) {
		this.pdfDocument = pdfDocument;
	}

	beginPage(): void {
		this.resetVectorState();
	}

	prepareNonVectorItem(): void {
		this.resetVectorState();
	}

	endPage(): void {
		this.assertClippingBalanced();
	}

	private resetVectorState(): void {
		this.vectorState = {};
	}

	private assertClippingBalanced(): void {
		if (this.clipDepth !== 0) {
			throw new Error(
				`Unbalanced clipping operations: ${this.clipDepth} clip region(s) not closed`,
			);
		}
	}

	renderVector(vector: Vector): void {
		const translatedPath =
			vector.type === "path" && ((vector.x ?? 0) !== 0 || (vector.y ?? 0) !== 0);
		if (translatedPath) {
			this.pdfDocument.save();
			this.pdfDocument.translate(vector.x ?? 0, vector.y ?? 0);
		}

		const lineWidth = vector.lineWidth || 1;
		if (this.vectorState.lineWidth !== lineWidth) {
			this.pdfDocument.lineWidth(lineWidth);
			this.vectorState.lineWidth = lineWidth;
		}

		if (vector.dash) {
			const space = vector.dash.space || vector.dash.length;
			const phase = vector.dash.phase || 0;
			const dash = `${vector.dash.length}:${space}:${phase}`;
			if (this.vectorState.dash !== dash) {
				this.pdfDocument.dash(vector.dash.length, { space, phase });
				this.vectorState.dash = dash;
			}
		} else if (this.vectorState.dash !== "none") {
			this.pdfDocument.undash();
			this.vectorState.dash = "none";
		}

		const lineJoin = vector.lineJoin || "miter";
		if (this.vectorState.lineJoin !== lineJoin) {
			this.pdfDocument.lineJoin(lineJoin);
			this.vectorState.lineJoin = lineJoin;
		}

		const lineCap = vector.lineCap || "butt";
		if (this.vectorState.lineCap !== lineCap) {
			this.pdfDocument.lineCap(lineCap);
			this.vectorState.lineCap = lineCap;
		}

		let gradient = null;

		switch (vector.type) {
			case "ellipse":
				this.pdfDocument.ellipse(vector.x!, vector.y!, vector.r1!, vector.r2);

				if (vector.linearGradient) {
					gradient = this.pdfDocument.linearGradient(
						vector.x! - vector.r1!,
						vector.y!,
						vector.x! + vector.r1!,
						vector.y!,
					);
				}
				break;
			case "rect":
				if (vector.r) {
					this.pdfDocument.roundedRect(vector.x!, vector.y!, vector.w!, vector.h!, vector.r);
				} else {
					this.pdfDocument.rect(vector.x!, vector.y!, vector.w!, vector.h!);
				}

				if (vector.linearGradient) {
					gradient = this.pdfDocument.linearGradient(
						vector.x!,
						vector.y!,
						vector.x! + vector.w!,
						vector.y!,
					);
				}
				break;
			case "line":
				this.pdfDocument.moveTo(vector.x1!, vector.y1!);
				this.pdfDocument.lineTo(vector.x2!, vector.y2!);
				break;
			case "polyline": {
				const points = vector.points ?? [];
				if (points.length === 0) {
					break;
				}

				this.pdfDocument.moveTo(points[0].x, points[0].y);
				for (let i = 1, l = points.length; i < l; i++) {
					this.pdfDocument.lineTo(points[i].x, points[i].y);
				}

				if (points.length > 1) {
					const p1 = points[0];
					const pn = points[points.length - 1];

					if (vector.closePath || (p1.x === pn.x && p1.y === pn.y)) {
						this.pdfDocument.closePath();
					}
				}
				break;
			}
			case "path":
				this.pdfDocument.path(vector.d!);
				break;
		}

		if (vector.linearGradient && gradient) {
			const step = vector.linearGradient.length > 1 ? 1 / (vector.linearGradient.length - 1) : 0;

			for (let i = 0; i < vector.linearGradient.length; i++) {
				gradient.stop(i * step, vector.linearGradient[i]);
			}

			vector.color = gradient;
		}

		const patternColor = this.pdfDocument.providePattern(vector.color);
		if (patternColor !== null) {
			vector.color = patternColor;
		}

		const fillOpacity = isNumber(vector.fillOpacity) ? vector.fillOpacity : 1;
		const strokeOpacity = isNumber(vector.strokeOpacity)
			? vector.strokeOpacity
			: isNumber(vector.lineOpacity)
				? vector.lineOpacity
				: 1;

		if (vector.color && vector.lineColor) {
			this.pdfDocument.fillColor(this.pdfDocument.resolveColor(vector.color, "black"), fillOpacity);
			this.pdfDocument.strokeColor(
				this.pdfDocument.resolveColor(vector.lineColor, "black"),
				strokeOpacity,
			);
			this.pdfDocument.fillAndStroke();
		} else if (vector.color) {
			this.pdfDocument.fillColor(this.pdfDocument.resolveColor(vector.color, "black"), fillOpacity);
			this.pdfDocument.fill();
		} else {
			this.pdfDocument.strokeColor(
				this.pdfDocument.resolveColor(vector.lineColor, "black"),
				strokeOpacity,
			);
			this.pdfDocument.stroke();
		}

		if (translatedPath) {
			this.pdfDocument.restore();
			this.resetVectorState();
		}
	}

	renderImage(image: LayoutPdfNode): void {
		const opacity = isNumber(image.opacity) ? image.opacity : 1;
		const width = image.cover?.width ?? image._width!;
		const height = image.cover?.height ?? image._height!;
		const borderRadius =
			Number.isFinite(image.borderRadius) && image.borderRadius! > 0
				? Math.min(image.borderRadius!, width / 2, height / 2)
				: 0;
		this.pdfDocument.opacity(opacity);
		if (image.cover || borderRadius > 0) {
			this.pdfDocument.save();
			if (borderRadius > 0) {
				this.pdfDocument.roundedRect(image.x!, image.y!, width, height, borderRadius).clip();
			} else {
				this.pdfDocument.rect(image.x!, image.y!, width, height).clip();
			}
		}
		if (image.cover) {
			const align = image.cover.align;
			const valign = image.cover.valign;
			this.pdfDocument.image(image.image as PDFKit.Mixins.ImageSrc, image.x!, image.y!, {
				cover: [width, height],
				align: align === "left" ? undefined : align,
				valign: valign === "top" ? undefined : valign,
			});
		} else {
			this.pdfDocument.image(image.image as PDFKit.Mixins.ImageSrc, image.x!, image.y!, {
				width: image._width,
				height: image._height,
			});
		}
		if (image.cover || borderRadius > 0) {
			this.pdfDocument.restore();
		}

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
			this.pdfDocument.lineWidth(borderWidth);
			this.pdfDocument.strokeColor(this.pdfDocument.resolveColor(image._imageBorderColor, "black"));
			if (borderPathRadius > 0) {
				this.pdfDocument.roundedRect(
					image.x! + inset,
					image.y! + inset,
					borderPathWidth,
					borderPathHeight,
					borderPathRadius,
				);
			} else {
				this.pdfDocument.rect(
					image.x! + inset,
					image.y! + inset,
					borderPathWidth,
					borderPathHeight,
				);
			}
			this.pdfDocument.stroke();
			this.resetVectorState();
		}
		if (image.link) {
			this.pdfDocument.link(image.x!, image.y!, image._width!, image._height!, image.link);
		}
		if (image.linkToPage) {
			const action = this.pdfDocument.ref({
				Type: "Action",
				S: "GoTo",
				D: [image.linkToPage, 0, 0],
			});
			(action.end as () => void)();
			this.pdfDocument.annotate(image.x!, image.y!, image._width!, image._height!, {
				Subtype: "Link",
				Dest: [image.linkToPage - 1, "XYZ", null, null, null],
			} as PDFKit.Mixins.AnnotationOption);
		}
		if (image.linkToDestination) {
			this.pdfDocument.goTo(
				image.x!,
				image.y!,
				image._width!,
				image._height!,
				image.linkToDestination,
			);
		}
		if (image.linkToFile) {
			const attachment = this.pdfDocument.provideAttachment(image.linkToFile);
			this.pdfDocument.fileAnnotation(
				image.x!,
				image.y!,
				image._width!,
				image._height!,
				attachment,
				// add empty rectangle as file annotation appearance with the same size as the rendered image
				{
					AP: {
						N: {
							Type: "XObject",
							Subtype: "Form",
							FormType: 1,
							BBox: [image.x!, image.y!, image._width!, image._height!],
						},
					},
				},
			);
		}
	}

	renderSVG(svg: LayoutPdfNode): void {
		const options: SVGtoPDF.Options = {
			width: svg._width,
			height: svg._height,
			assumePt: true,
			useCSS: !isString(svg.svg),
			...svg.options,
		};
		options.fontCallback = (family: string, bold: boolean, italic: boolean) => {
			const fontsFamily = family
				.split(",")
				.map((fontName) => fontName.trim().replace(/('|")/g, ""));
			const font = findFont(this.pdfDocument.fonts, fontsFamily, svg.font || "Roboto");

			const fontFile = this.pdfDocument.getFontFile(font, bold, italic);
			if (fontFile === null) {
				const type = this.pdfDocument.getFontType(bold, italic);
				throw new Error(
					`Font '${font}' in style '${type}' is not defined in the font section of the document definition.`,
				);
			}

			return (Array.isArray(fontFile) ? fontFile[0] : fontFile) as string;
		};

		SVGtoPDF(this.pdfDocument, svg.svg!, svg.x!, svg.y!, options);

		if (svg.link) {
			this.pdfDocument.link(svg.x!, svg.y!, svg._width!, svg._height!, svg.link);
		}
		if (svg.linkToPage) {
			const action = this.pdfDocument.ref({
				Type: "Action",
				S: "GoTo",
				D: [svg.linkToPage, 0, 0],
			});
			(action.end as () => void)();
			this.pdfDocument.annotate(svg.x!, svg.y!, svg._width!, svg._height!, {
				Subtype: "Link",
				Dest: [svg.linkToPage - 1, "XYZ", null, null, null],
			} as PDFKit.Mixins.AnnotationOption);
		}
		if (svg.linkToDestination) {
			this.pdfDocument.goTo(svg.x!, svg.y!, svg._width!, svg._height!, svg.linkToDestination);
		}
	}

	renderAttachment(attachment: LayoutPdfNode): void {
		const file = this.pdfDocument.provideAttachment(attachment.attachment!);

		const options: FileAnnotationOptions = {};
		if (attachment.icon) {
			options.Name = attachment.icon;
		}

		this.pdfDocument.fileAnnotation(
			attachment.x!,
			attachment.y!,
			attachment._width!,
			attachment._height!,
			file,
			options,
		);
	}

	beginClip(rect: ClipRectangle): void {
		if (
			![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
			rect.width < 0 ||
			rect.height < 0
		) {
			throw new RangeError(
				"Clip rectangle must contain finite coordinates and non-negative dimensions",
			);
		}

		this.pdfDocument.save();
		this.pdfDocument.rect(rect.x, rect.y, rect.width, rect.height).clip();
		this.clipDepth++;
		this.resetVectorState();
	}

	endClip(): void {
		if (this.clipDepth === 0) {
			throw new Error("Cannot end clipping: no clip region is active");
		}

		this.pdfDocument.restore();
		this.clipDepth--;
		this.resetVectorState();
	}

	beginVerticalAlignment(item: VerticalAlignmentItem): void {
		if (item.isCellContentMultiPage) {
			return;
		}

		switch (item.verticalAlignment) {
			case "middle":
				this.pdfDocument.save();
				this.pdfDocument.translate(0, -(item.getNodeHeight() - item.getViewHeight()) / 2);
				break;
			case "bottom":
				this.pdfDocument.save();
				this.pdfDocument.translate(0, -(item.getNodeHeight() - item.getViewHeight()));
				break;
		}
	}

	endVerticalAlignment(item: VerticalAlignmentItem): void {
		if (item.isCellContentMultiPage) {
			return;
		}

		switch (item.verticalAlignment) {
			case "middle":
			case "bottom":
				this.pdfDocument.restore();
				break;
		}
	}

	renderWatermark(page: RenderablePage): void {
		const watermark = page.watermark;
		if (!watermark) {
			return;
		}

		this.pdfDocument.fill(this.pdfDocument.resolveColor(watermark.color, "black"));
		this.pdfDocument.opacity(watermark.opacity);

		this.pdfDocument.save();

		this.pdfDocument.rotate(watermark.angle, {
			origin: [this.pdfDocument.page.width / 2, this.pdfDocument.page.height / 2],
		});

		const x = this.pdfDocument.page.width / 2 - watermark._size.size.width / 2;
		const y = this.pdfDocument.page.height / 2 - watermark._size.size.height / 2;

		this.pdfDocument._font = watermark.font as EmbeddedFont;
		this.pdfDocument.fontSize(watermark.fontSize);
		this.pdfDocument.text(watermark.text, x, y, { lineBreak: false });

		this.pdfDocument.restore();
	}
}

export default RendererGraphics;
