import sizes from "./page-size.constants";
import { isString, isNumber } from "../utils/variable-type";
import type { PageOrientation } from "../types";
import type { Dimensions, PageMarginDefinition, PageMargins, PageSize } from "../types/internal";

export type PageSizeDefinition = string | { width: number; height: number | "auto" };

/**
 * Rejects a landscape page whose height is automatic: swapping the dimensions would turn the
 * automatic height into an infinite width. Portrait orientation keeps the automatic height.
 */
export function assertOrientationSupported(height: number, orientation: unknown): void {
	if (height === Infinity && orientation === "landscape") {
		throw new Error(
			"Invalid pageOrientation: 'landscape' cannot be combined with pageSize.height 'auto'; set pageSize.width to the landscape width instead",
		);
	}
}

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

		if (!isValidDimension(definition.width)) {
			throw new Error(
				`Invalid pageSize.width: expected a finite positive number, received ${describe(definition.width)}`,
			);
		}
		// An already normalized automatic height is Infinity.
		const isAutomaticHeight = definition.height === "auto" || definition.height === Infinity;
		if (!isAutomaticHeight && !isValidDimension(definition.height)) {
			throw new Error(
				`Invalid pageSize.height: expected a finite positive number or 'auto', received ${describe(definition.height)}`,
			);
		}
		return {
			width: definition.width,
			height: definition.height === "auto" ? Infinity : definition.height,
		};
	}

	let size: PageSize = { ...pageSizeToWidthAndHeight(pageSize || "A4"), orientation: "portrait" };
	assertOrientationSupported(size.height, pageOrientation);
	if (isNeedSwapPageSizes(pageOrientation)) {
		// swap page sizes
		size = { width: size.height, height: size.width, orientation: size.orientation };
	}
	if (
		!isValidDimension(size.width) ||
		!(size.height === Infinity || isValidDimension(size.height))
	) {
		throw new Error(
			`Invalid page size after applying pageOrientation: ${describe(size.width)} x ${describe(size.height)}`,
		);
	}
	size.orientation = size.width > size.height ? "landscape" : "portrait";
	return size;
}

const isValidDimension = (value: unknown): value is number =>
	isNumber(value) && Number.isFinite(value) && value > 0;

const describe = (value: unknown): string =>
	typeof value === "string" ? `'${value}'` : String(value);

const marginSides = ["left", "top", "right", "bottom"] as const;

function assertValidMargins(margins: PageMargins, path: string): PageMargins {
	for (const side of marginSides) {
		const value = margins[side];
		if (!isNumber(value) || !Number.isFinite(value) || value < 0) {
			throw new Error(
				`Invalid ${path}.${side}: expected a finite non-negative number, received ${describe(value)}`,
			);
		}
	}
	return margins;
}

/**
 * Rejects margins that leave no usable content area on a page. `path` names the input that
 * produced the margins, so the error points at the definition to fix.
 */
export function assertUsableContentArea(
	pageSize: PageSize,
	margins: PageMargins,
	path: string,
): void {
	const width = pageSize.width - margins.left - margins.right;
	if (!(width > 0)) {
		throw new Error(
			`Invalid ${path}: left (${margins.left}) and right (${margins.right}) margins leave no usable width on a page ${pageSize.width} wide`,
		);
	}
	const height = pageSize.height - margins.top - margins.bottom;
	if (!(height > 0)) {
		throw new Error(
			`Invalid ${path}: top (${margins.top}) and bottom (${margins.bottom}) margins leave no usable height on a page ${pageSize.height} high`,
		);
	}
}

export function normalizePageMargin(
	margin: PageMarginDefinition,
	path = "pageMargins",
): PageMargins {
	if (isNumber(margin)) {
		margin = { left: margin, right: margin, top: margin, bottom: margin };
	} else if (Array.isArray(margin)) {
		if (margin.length === 2) {
			margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
		} else if (margin.length === 4) {
			margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
		} else {
			throw new Error(
				`Invalid ${path}: expected a number, an array of 2 or 4 numbers, or an object, received an array of ${(margin as unknown[]).length}`,
			);
		}
	} else if (margin === null || typeof margin !== "object") {
		throw new Error(
			`Invalid ${path}: expected a number, an array of 2 or 4 numbers, or an object, received ${describe(margin)}`,
		);
	}

	return assertValidMargins(margin as PageMargins, path);
}
