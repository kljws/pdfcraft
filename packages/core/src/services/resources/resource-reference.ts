import type { PrinterResourceReference } from "../../core/printer.types";

export function isResourceReference(resource: unknown): resource is PrinterResourceReference {
	return (
		typeof resource === "string" ||
		(resource !== null &&
			typeof resource === "object" &&
			"url" in resource &&
			typeof resource.url === "string")
	);
}
