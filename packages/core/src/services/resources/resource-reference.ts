import type { ResourceSource } from "../../types";

export function isResourceReference(resource: unknown): resource is ResourceSource {
	return (
		typeof resource === "string" ||
		(resource !== null &&
			typeof resource === "object" &&
			"url" in resource &&
			typeof resource.url === "string")
	);
}
