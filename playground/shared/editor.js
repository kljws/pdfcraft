export const sampleNames = [
	"basics",
	"named-styles",
	"inline-styling",
	"style-overrides",
	"columns",
	"tables",
	"lists",
	"margins",
	"images",
	"svgs",
	"attachments",
	"recent-features",
	"invoice",
];

export const createSampleSource = (sample) => {
	return `// Assign the document definition to a variable named dd.

var dd = ${sample.trim()};
`;
};

export const parseDocumentDefinition = (source) => {
	// The playground intentionally executes locally edited document definitions.
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
