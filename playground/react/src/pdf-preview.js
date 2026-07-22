import { AnnotationLayer, AnnotationMode, getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import "../../shared/pdf-annotation-layer.css";

GlobalWorkerOptions.workerSrc = pdfWorker;

export const renderPdf = async ({ blob, container, isCurrent }) => {
	const loadingTask = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
	const pdf = await loadingTask.promise;

	try {
		const pages = [];
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
			if (!isCurrent()) {
				return false;
			}

			const page = await pdf.getPage(pageNumber);
			const baseViewport = page.getViewport({ scale: 1 });
			const availableWidth = Math.max(1, (container?.clientWidth ?? baseViewport.width) - 32);
			const scale = Math.min(1.5, availableWidth / baseViewport.width);
			const viewport = page.getViewport({ scale });
			const pageElement = document.createElement("div");
			pageElement.className = "pdf-page";
			pageElement.style.width = `${viewport.width}px`;
			pageElement.style.height = `${viewport.height}px`;
			pageElement.style.setProperty("--scale-factor", String(viewport.scale));
			pageElement.style.setProperty("--user-unit", String(viewport.userUnit));
			const canvas = document.createElement("canvas");
			canvas.className = "pdf-page-canvas";
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			pageElement.append(canvas);
			await page.render({
				canvas,
				canvasContext: canvas.getContext("2d"),
				viewport,
				annotationMode: AnnotationMode.ENABLE_FORMS,
			}).promise;

			const annotations = (await page.getAnnotations({ intent: "display" })).filter(
				(annotation) => annotation.subtype === "Widget",
			);
			if (annotations.length > 0) {
				const annotationElement = document.createElement("div");
				annotationElement.className = "annotationLayer";
				pageElement.append(annotationElement);
				const annotationLayer = new AnnotationLayer({
					div: annotationElement,
					page,
					viewport: viewport.clone({ dontFlip: true }),
					annotationStorage: pdf.annotationStorage,
				});
				await annotationLayer.render({
					annotations,
					renderForms: true,
					hasJSActions: false,
					fieldObjects: null,
				});
			}

			pages.push(pageElement);
		}

		if (!isCurrent()) {
			return false;
		}

		container?.replaceChildren(...pages);
		return true;
	} finally {
		await loadingTask.destroy();
	}
};
