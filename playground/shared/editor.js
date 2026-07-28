export const createSampleSource = (sample) => {
	return `${sample.trim()}\n`;
};

export const parseDocumentDefinition = (source) => {
	const trimmedSource = source.trim();
	if (trimmedSource.startsWith("export default")) {
		const expression = trimmedSource.slice("export default".length).trim().replace(/;$/, "");
		// The playground intentionally executes locally edited document definitions.
		return new Function(`"use strict";\nreturn (${expression});`)();
	}

	// Support source saved by playground versions older than the module-based samples.
	return new Function(`"use strict";\n${source}\nreturn dd;`)();
};

export const resolveDocumentResources = (value, resources, seen = new WeakSet()) => {
	if (typeof value === "string") {
		return resources.get(value) ?? value;
	}
	if (value === null || typeof value !== "object" || seen.has(value)) {
		return value;
	}
	if (
		value instanceof Date ||
		value instanceof ArrayBuffer ||
		ArrayBuffer.isView(value) ||
		(!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
	) {
		return value;
	}

	seen.add(value);
	for (const key of Object.keys(value)) {
		value[key] = resolveDocumentResources(value[key], resources, seen);
	}
	return value;
};
