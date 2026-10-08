/** Corner radii of a rounded rectangle, clockwise from the top-left corner. */
export type CornerRadii = [
	topLeft: number,
	topRight: number,
	bottomRight: number,
	bottomLeft: number,
];

export type RoundedCorner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

/**
 * SVG path of a `width` × `height` rectangle with rounded corners, starting at its top-left corner.
 * Radii that do not fit the rectangle are scaled down together.
 */
export const createRoundedRectanglePath = (
	width: number,
	height: number,
	radii: CornerRadii,
): string => {
	let [topLeft, topRight, bottomRight, bottomLeft] = radii.map((radius) =>
		Math.max(0, radius),
	) as CornerRadii;
	const scales = [
		topLeft + topRight > 0 ? width / (topLeft + topRight) : 1,
		bottomLeft + bottomRight > 0 ? width / (bottomLeft + bottomRight) : 1,
		topLeft + bottomLeft > 0 ? height / (topLeft + bottomLeft) : 1,
		topRight + bottomRight > 0 ? height / (topRight + bottomRight) : 1,
	];
	const scale = Math.min(1, ...scales);
	topLeft *= scale;
	topRight *= scale;
	bottomRight *= scale;
	bottomLeft *= scale;

	return [
		`M ${topLeft} 0`,
		`H ${width - topRight}`,
		`Q ${width} 0 ${width} ${topRight}`,
		`V ${height - bottomRight}`,
		`Q ${width} ${height} ${width - bottomRight} ${height}`,
		`H ${bottomLeft}`,
		`Q 0 ${height} 0 ${height - bottomLeft}`,
		`V ${topLeft}`,
		`Q 0 0 ${topLeft} 0`,
		"Z",
	].join(" ");
};

/** SVG path of one rounded border corner, an arc of `radius` drawn in a `radius` square. */
export const createRoundedCornerPath = (corner: RoundedCorner, radius: number): string => {
	switch (corner) {
		case "topLeft":
			return `M 0 ${radius} Q 0 0 ${radius} 0`;
		case "topRight":
			return `M 0 0 Q ${radius} 0 ${radius} ${radius}`;
		case "bottomRight":
			return `M ${radius} 0 Q ${radius} ${radius} 0 ${radius}`;
		case "bottomLeft":
			return `M ${radius} ${radius} Q 0 ${radius} 0 0`;
	}
};
