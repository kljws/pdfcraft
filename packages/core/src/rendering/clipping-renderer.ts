import type PDFDocument from "./pdf-document";
import type { ClipRectangle } from "./renderer.types";

class ClippingRenderer {
	private depth = 0;

	constructor(
		private readonly document: PDFDocument,
		private readonly resetVectorState: () => void,
	) {}

	assertBalanced(): void {
		if (this.depth !== 0) {
			throw new Error(`Unbalanced clipping operations: ${this.depth} clip region(s) not closed`);
		}
	}

	begin(rect: ClipRectangle): void {
		if (
			![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
			rect.width < 0 ||
			rect.height < 0
		) {
			throw new RangeError(
				"Clip rectangle must contain finite coordinates and non-negative dimensions",
			);
		}

		this.document.save();
		this.document.rect(rect.x, rect.y, rect.width, rect.height).clip();
		this.depth++;
		this.resetVectorState();
	}

	end(): void {
		if (this.depth === 0) {
			throw new Error("Cannot end clipping: no clip region is active");
		}

		this.document.restore();
		this.depth--;
		this.resetVectorState();
	}
}

export default ClippingRenderer;
