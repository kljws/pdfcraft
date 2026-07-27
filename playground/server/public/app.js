import { AnnotationLayer, AnnotationMode, getDocument, GlobalWorkerOptions } from "/pdfjs/pdf.mjs";

GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.mjs";

const editor = document.querySelector("#editor");
const sample = document.querySelector("#sample");
const generateButton = document.querySelector("#generate");
const downloadButton = document.querySelector("#download");
const pdfContainer = document.querySelector("#pdf-container");
const status = document.querySelector("#status");

let timer;
let generation = 0;
let pdfBlob = null;
const sampleSourceBases = new Map();

const downloadBlob = (blob, filename) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
};

const setStatus = (message, isError = false) => {
	status.textContent = message;
	status.title = message;
	status.classList.toggle("error", isError);
};

const reportError = (context, error, fallbackMessage) => {
	const message = error instanceof Error ? error.message : fallbackMessage;
	console.error(`[PDFCraft server playground] ${context}: ${message}`, error);
	setStatus(message, true);
};

const renderPdf = async (blob, currentGeneration) => {
	const loadingTask = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
	const pdf = await loadingTask.promise;

	try {
		const pages = [];
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
			const page = await pdf.getPage(pageNumber);
			const baseViewport = page.getViewport({ scale: 1 });
			const availableWidth = Math.max(1, pdfContainer.clientWidth - 32);
			const scale = Math.min(1.5, availableWidth / baseViewport.width);
			const viewport = page.getViewport({ scale });
			const outputScale = Math.min(window.devicePixelRatio || 1, 2);
			const pageElement = document.createElement("div");
			pageElement.className = "pdf-page";
			pageElement.style.width = `${viewport.width}px`;
			pageElement.style.height = `${viewport.height}px`;
			pageElement.style.setProperty("--scale-factor", String(viewport.scale));
			pageElement.style.setProperty("--user-unit", String(viewport.userUnit));
			const canvas = document.createElement("canvas");
			canvas.className = "pdf-page-canvas";
			canvas.width = Math.ceil(viewport.width * outputScale);
			canvas.height = Math.ceil(viewport.height * outputScale);
			canvas.style.width = `${viewport.width}px`;
			canvas.style.height = `${viewport.height}px`;
			pageElement.append(canvas);
			await page.render({
				canvas,
				canvasContext: canvas.getContext("2d"),
				viewport,
				transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
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

		if (currentGeneration === generation) {
			pdfContainer.replaceChildren(...pages);
		}
	} finally {
		await loadingTask.destroy();
	}
};

const generate = async () => {
	const currentGeneration = ++generation;
	const startedAt = performance.now();
	setStatus("Generating…");

	try {
		const response = await fetch("/pdf", {
			method: "POST",
			headers: { "Content-Type": "text/plain; charset=utf-8" },
			body: editor.value,
		});
		if (!response.ok) {
			throw new Error(await response.text());
		}

		const blob = await response.blob();
		if (currentGeneration !== generation) {
			return;
		}

		await renderPdf(blob, currentGeneration);
		if (currentGeneration !== generation) {
			return;
		}

		pdfBlob = blob;
		downloadButton.disabled = false;
		const serverTime = response.headers.get("X-Generation-Time");
		const totalTime = (performance.now() - startedAt).toFixed(1);
		setStatus(`Server ${serverTime} ms · total ${totalTime} ms`);
	} catch (error) {
		if (currentGeneration === generation) {
			pdfBlob = null;
			downloadButton.disabled = true;
			reportError("PDF generation failed", error, "PDF generation failed");
		}
	}
};

const scheduleGeneration = () => {
	window.clearTimeout(timer);
	localStorage.setItem("pdfcraft.server.sample", sample.value);
	localStorage.setItem("pdfcraft.server.source", editor.value);
	localStorage.setItem("pdfcraft.server.source-base", sampleSourceBases.get(sample.value) ?? "");
	timer = window.setTimeout(() => void generate(), 400);
};

const loadSample = async (name) => {
	const response = await fetch(`/samples/${encodeURIComponent(name)}`);
	if (!response.ok) {
		throw new Error(await response.text());
	}
	sample.value = name;
	const source = await response.text();
	sampleSourceBases.set(name, source);
	editor.value = source;
	scheduleGeneration();
};

const sampleEvents = new EventSource("/sample-events");
sampleEvents.addEventListener("message", (event) => {
	const { sample: changedSample } = JSON.parse(event.data);
	if (changedSample === sample.value) {
		void loadSample(changedSample).catch((error) => {
			reportError("Sample reload failed", error, "Sample reload failed");
		});
	}
});

const initialize = async () => {
	try {
		const response = await fetch("/samples");
		if (!response.ok) {
			throw new Error(await response.text());
		}
		const names = await response.json();
		for (const name of names) {
			sample.add(new Option(name, name));
		}

		const storedSample = localStorage.getItem("pdfcraft.server.sample");
		const storedSource = localStorage.getItem("pdfcraft.server.source");
		const storedSourceBase = localStorage.getItem("pdfcraft.server.source-base");

		if (storedSample && names.includes(storedSample) && storedSource) {
			const response = await fetch(`/samples/${encodeURIComponent(storedSample)}`);
			if (!response.ok) {
				throw new Error(await response.text());
			}
			const sampleSource = await response.text();
			sampleSourceBases.set(storedSample, sampleSource);
			sample.value = storedSample;
			editor.value = storedSourceBase === sampleSource ? storedSource : sampleSource;
			scheduleGeneration();
		} else {
			await loadSample(names[0]);
		}
	} catch (error) {
		reportError("Playground initialization failed", error, "Playground initialization failed");
	}
};

editor.addEventListener("input", scheduleGeneration);
sample.addEventListener("change", () => void loadSample(sample.value));
generateButton.addEventListener("click", () => void generate());
downloadButton.addEventListener("click", () => {
	if (pdfBlob) {
		downloadBlob(pdfBlob, `${sample.value || "document"}.pdf`);
	}
});

void initialize();
