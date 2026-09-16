import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import type { ElementPlacementAdapter } from "../layout/element-writer";

export function createBuiltInElementPlacement(): ElementPlacementAdapter {
	return {
		placeImage: (writer, node, index) => imageFeature.place(writer, node, index),
		placeCanvas: (writer, node, index) => canvasFeature.place(writer, node, index),
		placeExtension: (writer, node, index) => extensionFeature.place(writer, node, index),
		placeAttachment: (writer, node, index) => attachmentFeature.place(writer, node, index),
		placeAcroForm: (writer, node, index) => acroFormFeature.place(writer, node, index),
	};
}
