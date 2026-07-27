import type {
	Inline,
	LayoutPdfNode,
	MeasuredPdfNode,
	OutlineDefinition,
	Position,
} from "../types/internal";

class Line {
	maxWidth: number;
	leadingCut = 0;
	trailingCut = 0;
	inlineWidths = 0;
	inlines: Inline[] = [];
	newLineForced = false;
	lastLineInParagraph = false;
	x = 0;
	y = 0;
	id?: string;
	_node?: LayoutPdfNode;
	_position?: Position;
	_outline?: OutlineDefinition;
	_pageNodeRef?: MeasuredPdfNode | LayoutPdfNode;

	/**
	 * @param maxWidth Maximum width this line can have
	 */
	constructor(maxWidth: number) {
		this.maxWidth = maxWidth;
	}

	addInline(inline: Inline): void {
		if (this.inlines.length === 0) {
			this.leadingCut = inline.leadingCut || 0;
		}
		this.trailingCut = inline.trailingCut || 0;

		inline.x = this.inlineWidths - this.leadingCut;

		this.inlines.push(inline);
		this.inlineWidths += inline.width;

		if (inline.lineEnd) {
			this.newLineForced = true;
		}
	}

	getHeight(): number {
		let max = 0;

		this.inlines.forEach((item) => {
			max = Math.max(max, item.height || 0);
		});

		return max;
	}

	getAscenderHeight(): number {
		let y = 0;

		this.inlines.forEach((inline) => {
			y = Math.max(
				y,
				inline.image !== undefined || inline.acroform !== undefined
					? (inline._imageHeight ?? inline.height)
					: (inline.font.ascender / 1000) * inline.fontSize,
			);
		});

		return y;
	}

	getWidth(): number {
		return this.inlineWidths - this.leadingCut - this.trailingCut;
	}

	getAvailableWidth(): number {
		return this.maxWidth - this.getWidth();
	}

	hasEnoughSpaceForInline(
		inline: Inline,
		nextInlines: readonly Inline[] = [],
		nextInlineIndex: number = 0,
	): boolean {
		if (this.inlines.length === 0) {
			return true;
		}
		if (this.newLineForced) {
			return false;
		}

		let inlineWidth = inline.width;
		let inlineTrailingCut = inline.trailingCut || 0;
		if (inline.noNewLine) {
			for (let i = nextInlineIndex, l = nextInlines.length; i < l; i++) {
				let nextInline = nextInlines[i];
				inlineWidth += nextInline.width;
				inlineTrailingCut = nextInline.trailingCut || 0;
				if (!nextInline.noNewLine) {
					break;
				}
			}
		}

		return this.inlineWidths + inlineWidth - this.leadingCut - inlineTrailingCut <= this.maxWidth;
	}

	clone(): Line {
		return Object.assign(new Line(this.maxWidth), this);
	}
}

export default Line;
