import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import { placeAtomicItem } from "../../layout/element-writer.helpers";
import type { CurrentPosition } from "../../types/internal";
import type { LayoutImageNode } from "./image.types";

export function placeImageItem(
	image: LayoutImageNode,
	context: NodePlaceContext,
): CurrentPosition | false {
	return placeAtomicItem("image", image, image._height ?? 0, context, {
		prepare: ({ availableWidth, availableHeight }) => {
			const height =
				image.shrinkToFit === true
					? shrinkToArea(image, availableWidth, availableHeight)
					: (image._height ?? 0);
			warnIfOversized(image, height, availableHeight, availableWidth);
			return height;
		},
	});
}

/**
 * Scales an accepted image down to the area it is placed in. Placement accepts a non-fitting image
 * only on a fresh page or column, so this area is the full applicable content area.
 */
function shrinkToArea(
	image: LayoutImageNode,
	availableWidth: number,
	availableHeight: number,
): number {
	const width = image._width ?? 0;
	const height = image._height ?? 0;
	if (image.cover || image.absolutePosition !== undefined || width <= 0 || height <= 0)
		return height;

	const factor = Math.min(1, availableWidth / width, availableHeight / height);
	if (!(factor > 0) || factor >= 1) return height;
	image._width = image._minWidth = image._maxWidth = width * factor;
	image._height = height * factor;
	return image._height;
}

const reportedImages = new WeakSet<LayoutImageNode>();

function describeImage(image: LayoutImageNode): string {
	if (typeof image.image !== "string") return "<binary image>";
	if (image.image.startsWith("$$pdfcraft$$")) return "<inline data image>";
	return image.image.length > 80 ? `${image.image.slice(0, 77)}...` : image.image;
}

/**
 * Reports an image that is being placed although it exceeds the area available to it. Placement
 * only accepts a non-fitting image after moving to a fresh page or column (or at the top of an
 * empty one), so an ordinary page transition never warns. Each node is reported once, across
 * all layout passes.
 */
function warnIfOversized(
	image: LayoutImageNode,
	height: number,
	availableHeight: number,
	availableWidth: number,
): void {
	if (image.absolutePosition !== undefined || reportedImages.has(image)) return;
	const width = image._width ?? 0;
	const tooTall = height > availableHeight + 0.01;
	const tooWide = width > availableWidth + 0.01;
	if (!tooTall && !tooWide) return;

	reportedImages.add(image);
	const round = (value: number): number => Math.round(value * 100) / 100;
	console.warn(
		`Image ${describeImage(image)} (${round(width)}x${round(height)} pt) exceeds the available ` +
			`content area (${round(availableWidth)}x${round(availableHeight)} pt) and will overflow.`,
	);
}
