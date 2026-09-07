import type {
	ExtensionMeasureContext,
	ExtensionNode,
	ExtensionResourceReference,
} from "@pdfcraft/core/types";

const decodeBytes = (value: Uint8Array): string => new TextDecoder().decode(value);

export const resolveSvgSource = (
	source: unknown,
	context: ExtensionMeasureContext,
): unknown => {
	if (typeof source !== "string") return source;
	const resources = context.documentDefinition.svgs;
	let resolved =
		resources && typeof resources === "object"
			? ((resources as Record<string, unknown>)[source] ?? source)
			: source;
	if (typeof resolved === "string" && context.virtualFileSystem?.existsSync(resolved)) {
		resolved = context.virtualFileSystem.readFileSync(resolved);
	}
	if (resolved instanceof ArrayBuffer) resolved = new Uint8Array(resolved);
	if (resolved instanceof Uint8Array) return decodeBytes(resolved);
	if (typeof resolved !== "string") throw new Error("Invalid SVG resource");

	const dataUrl = resolved.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/is);
	if (!dataUrl) return resolved;
	return dataUrl[1]
		? decodeBytes(Uint8Array.from(atob(dataUrl[2]), (character) => character.charCodeAt(0)))
		: decodeURIComponent(dataUrl[2]);
};

export const resolveSvgResources = (
	documentDefinition: ExtensionNode,
	resolve: (resource: ExtensionResourceReference) => string,
): void => {
	const resources = documentDefinition.svgs;
	if (resources === undefined) return;
	if (!resources || typeof resources !== "object" || Array.isArray(resources)) {
		throw new Error("Invalid SVG resource dictionary");
	}
	for (const [name, resource] of Object.entries(resources)) {
		if (
			typeof resource !== "string" &&
			(!resource || typeof resource !== "object" || typeof resource.url !== "string")
		) {
			throw new Error(`SVG '${name}' contains an invalid resource`);
		}
		(resources as Record<string, unknown>)[name] = resolve(resource);
	}
};
