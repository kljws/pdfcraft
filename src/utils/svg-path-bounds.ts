export interface PathBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

const PARAMETER_COUNTS: Record<string, number> = {
	A: 7,
	C: 6,
	H: 1,
	L: 2,
	M: 2,
	Q: 4,
	S: 4,
	T: 2,
	V: 1,
	Z: 0,
};

const isCommand = (token: string): boolean => /^[a-z]$/i.test(token);

export function getSvgPathBounds(path: string | undefined): PathBounds | null {
	if (!path) return null;
	const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
	let index = 0;
	let command = "";
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	const include = (pointX: number, pointY: number): void => {
		minX = Math.min(minX, pointX);
		minY = Math.min(minY, pointY);
		maxX = Math.max(maxX, pointX);
		maxY = Math.max(maxY, pointY);
	};
	const numberAt = (offset: number): number => Number(tokens[index + offset]);

	while (index < tokens.length) {
		if (isCommand(tokens[index])) command = tokens[index++];
		if (!command) return null;
		const upper = command.toUpperCase();
		const parameterCount = PARAMETER_COUNTS[upper];
		if (parameterCount === undefined) return null;
		if (upper === "Z") {
			x = startX;
			y = startY;
			include(x, y);
			command = "";
			continue;
		}
		if (index + parameterCount > tokens.length || isCommand(tokens[index])) return null;

		const relative = command === command.toLowerCase();
		const originX = x;
		const originY = y;
		const resolveX = (value: number): number => (relative ? originX + value : value);
		const resolveY = (value: number): number => (relative ? originY + value : value);

		switch (upper) {
			case "M":
			case "L":
			case "T":
				x = resolveX(numberAt(0));
				y = resolveY(numberAt(1));
				include(x, y);
				if (upper === "M") {
					startX = x;
					startY = y;
					command = relative ? "l" : "L";
				}
				break;
			case "H":
				x = resolveX(numberAt(0));
				include(x, y);
				break;
			case "V":
				y = resolveY(numberAt(0));
				include(x, y);
				break;
			case "C":
				include(resolveX(numberAt(0)), resolveY(numberAt(1)));
				include(resolveX(numberAt(2)), resolveY(numberAt(3)));
				x = resolveX(numberAt(4));
				y = resolveY(numberAt(5));
				include(x, y);
				break;
			case "S":
			case "Q":
				include(resolveX(numberAt(0)), resolveY(numberAt(1)));
				x = resolveX(numberAt(2));
				y = resolveY(numberAt(3));
				include(x, y);
				break;
			case "A": {
				const radiusX = Math.abs(numberAt(0));
				const radiusY = Math.abs(numberAt(1));
				const rotation = (numberAt(2) * Math.PI) / 180;
				const extentX = Math.hypot(radiusX * Math.cos(rotation), radiusY * Math.sin(rotation));
				const extentY = Math.hypot(radiusX * Math.sin(rotation), radiusY * Math.cos(rotation));
				const endX = resolveX(numberAt(5));
				const endY = resolveY(numberAt(6));
				include(originX - extentX, originY - extentY);
				include(originX + extentX, originY + extentY);
				include(endX - extentX, endY - extentY);
				include(endX + extentX, endY + extentY);
				x = endX;
				y = endY;
				break;
			}
		}

		index += parameterCount;
	}

	return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}
