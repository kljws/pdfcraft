declare const svgToPdf: (
	document: object,
	source: unknown,
	x?: number,
	y?: number,
	options?: Record<string, unknown>,
) => void;

export = svgToPdf;
