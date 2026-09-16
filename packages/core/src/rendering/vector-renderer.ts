import type { Vector } from "../types/internal";
import { isNumber } from "../utils/variable-type";
import type PDFDocument from "./pdf-document";

interface VectorState {
	lineWidth?: number;
	dash?: string;
	lineJoin?: string;
	lineCap?: string;
}

class VectorRenderer {
	private state: VectorState = {};

	constructor(private readonly document: PDFDocument) {}

	reset(): void {
		this.state = {};
	}

	render(vector: Vector): void {
		const translatedPath =
			vector.type === "path" && ((vector.x ?? 0) !== 0 || (vector.y ?? 0) !== 0);
		if (translatedPath) {
			this.document.save();
			this.document.translate(vector.x ?? 0, vector.y ?? 0);
		}

		const lineWidth = vector.lineWidth || 1;
		if (this.state.lineWidth !== lineWidth) {
			this.document.lineWidth(lineWidth);
			this.state.lineWidth = lineWidth;
		}

		if (vector.dash) {
			const space = vector.dash.space || vector.dash.length;
			const phase = vector.dash.phase || 0;
			const dash = `${vector.dash.length}:${space}:${phase}`;
			if (this.state.dash !== dash) {
				this.document.dash(vector.dash.length, { space, phase });
				this.state.dash = dash;
			}
		} else if (this.state.dash !== "none") {
			this.document.undash();
			this.state.dash = "none";
		}

		const lineJoin = vector.lineJoin || "miter";
		if (this.state.lineJoin !== lineJoin) {
			this.document.lineJoin(lineJoin);
			this.state.lineJoin = lineJoin;
		}

		const lineCap = vector.lineCap || "butt";
		if (this.state.lineCap !== lineCap) {
			this.document.lineCap(lineCap);
			this.state.lineCap = lineCap;
		}

		let gradient = null;
		switch (vector.type) {
			case "ellipse":
				this.document.ellipse(vector.x!, vector.y!, vector.r1!, vector.r2);
				if (vector.linearGradient) {
					gradient = this.document.linearGradient(
						vector.x! - vector.r1!,
						vector.y!,
						vector.x! + vector.r1!,
						vector.y!,
					);
				}
				break;
			case "rect":
				if (vector.r) {
					this.document.roundedRect(vector.x!, vector.y!, vector.w!, vector.h!, vector.r);
				} else {
					this.document.rect(vector.x!, vector.y!, vector.w!, vector.h!);
				}
				if (vector.linearGradient) {
					gradient = this.document.linearGradient(
						vector.x!,
						vector.y!,
						vector.x! + vector.w!,
						vector.y!,
					);
				}
				break;
			case "line":
				this.document.moveTo(vector.x1!, vector.y1!);
				this.document.lineTo(vector.x2!, vector.y2!);
				break;
			case "polyline": {
				const points = vector.points ?? [];
				if (points.length === 0) break;
				this.document.moveTo(points[0].x, points[0].y);
				for (let index = 1; index < points.length; index++) {
					this.document.lineTo(points[index].x, points[index].y);
				}
				if (points.length > 1) {
					const first = points[0];
					const last = points[points.length - 1];
					if (vector.closePath || (first.x === last.x && first.y === last.y)) {
						this.document.closePath();
					}
				}
				break;
			}
			case "path":
				this.document.path(vector.d!);
				break;
		}

		if (vector.linearGradient && gradient) {
			const step = vector.linearGradient.length > 1 ? 1 / (vector.linearGradient.length - 1) : 0;
			for (let index = 0; index < vector.linearGradient.length; index++) {
				gradient.stop(index * step, vector.linearGradient[index]);
			}
			vector.color = gradient;
		}

		const patternColor = this.document.providePattern(vector.color);
		if (patternColor !== null) vector.color = patternColor;

		const fillOpacity = isNumber(vector.fillOpacity) ? vector.fillOpacity : 1;
		const strokeOpacity = isNumber(vector.strokeOpacity)
			? vector.strokeOpacity
			: isNumber(vector.lineOpacity)
				? vector.lineOpacity
				: 1;

		if (vector.color && vector.lineColor) {
			this.document.fillColor(this.document.resolveColor(vector.color, "black"), fillOpacity);
			this.document.strokeColor(
				this.document.resolveColor(vector.lineColor, "black"),
				strokeOpacity,
			);
			this.document.fillAndStroke();
		} else if (vector.color) {
			this.document.fillColor(this.document.resolveColor(vector.color, "black"), fillOpacity);
			this.document.fill();
		} else {
			this.document.strokeColor(
				this.document.resolveColor(vector.lineColor, "black"),
				strokeOpacity,
			);
			this.document.stroke();
		}

		if (translatedPath) {
			this.document.restore();
			this.reset();
		}
	}
}

export default VectorRenderer;
