import type { ElementPlacementAdapter } from "../layout/element-writer";
import { placeFeatureItem } from "./built-in-feature-registry";

export function createBuiltInElementPlacement(): ElementPlacementAdapter {
	return {
		placeFeatureItem: (featureKind, writer, node, index) =>
			placeFeatureItem(featureKind, node, { writer, index }),
	};
}
