import sizes from "./page-size.constants";
import { isString, isNumber } from "../utils/variable-type";
import type { PageOrientation } from "../types";
import type { Dimensions, PageMarginDefinition, PageMargins, PageSize } from "../types/internal";

export type PageSizeDefinition = string | { width: number; height: number | "auto" };

export function normalizePageSize(
	pageSize?: PageSizeDefinition,
	pageOrientation?: PageOrientation,
): PageSize {
	function isNeedSwapPageSizes(orientation?: PageOrientation): boolean {
		if (isString(orientation)) {
			return (
				(orientation === "portrait" && size.width > size.height) ||
				(orientation === "landscape" && size.width < size.height)
			);
		}
		return false;
	}

	function pageSizeToWidthAndHeight(definition: PageSizeDefinition): Dimensions {
		if (isString(definition)) {
			const size = sizes[definition.toUpperCase() as keyof typeof sizes];
			if (!size) {
				throw new Error(`Page size ${definition} not recognized`);
			}
			return { width: size[0], height: size[1] };
		}

		return {
			width: definition.width,
			height: definition.height === "auto" ? Infinity : definition.height,
		};
	}

	let size: PageSize = { ...pageSizeToWidthAndHeight(pageSize || "A4"), orientation: "portrait" };
	if (isNeedSwapPageSizes(pageOrientation)) {
		// swap page sizes
		size = { width: size.height, height: size.width, orientation: size.orientation };
	}
	size.orientation = size.width > size.height ? "landscape" : "portrait";
	return size;
}

export function normalizePageMargin(margin: PageMarginDefinition): PageMargins {
	if (isNumber(margin)) {
		margin = { left: margin, right: margin, top: margin, bottom: margin };
	} else if (Array.isArray(margin)) {
		if (margin.length === 2) {
			margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
		} else if (margin.length === 4) {
			margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
		} else {
			throw new Error("Invalid pageMargins definition");
		}
	}

	return margin as PageMargins;
}
