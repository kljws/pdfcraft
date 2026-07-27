import { useCallback, useEffect, useRef, useState } from "react";
import { generatePdf } from "./pdf-generator";
import { renderPdf } from "./pdf-preview";
import SampleSelect from "./SampleSelect";
import {
	getInitialSample,
	getInitialSource,
	getSampleSource,
	saveState,
	subscribeToSampleChanges,
} from "./samples";

const downloadBlob = (blob, filename) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
};

const reportError = (setStatus, context, error, fallbackMessage) => {
	const message = error instanceof Error ? error.message : fallbackMessage;
	console.error(`[PDFCraft React playground] ${context}: ${message}`, error);
	setStatus(message);
};

export default function App() {
	const [sample, setSample] = useState(getInitialSample);
	const [source, setSource] = useState(getInitialSource);
	const [status, setStatus] = useState("Ready");
	const [pdfBlob, setPdfBlob] = useState(null);
	const generation = useRef(0);
	const pdfContainer = useRef(null);

	const generate = useCallback(async () => {
		const currentGeneration = ++generation.current;
		const startedAt = performance.now();
		setStatus("Generating…");

		try {
			const blob = await generatePdf(source);
			if (currentGeneration !== generation.current) {
				return;
			}

			const rendered = await renderPdf({
				blob,
				container: pdfContainer.current,
				isCurrent: () => currentGeneration === generation.current,
			});
			if (!rendered) {
				return;
			}

			setPdfBlob(blob);
			setStatus(`Generated in ${(performance.now() - startedAt).toFixed(1)} ms`);
		} catch (error) {
			if (currentGeneration === generation.current) {
				setPdfBlob(null);
				reportError(setStatus, "PDF generation failed", error, "PDF generation failed");
			}
		}
	}, [source]);

	useEffect(() => {
		saveState(sample, source);
		const timer = window.setTimeout(() => void generate(), 400);
		return () => window.clearTimeout(timer);
	}, [generate, sample, source]);

	useEffect(
		() =>
			subscribeToSampleChanges((getUpdatedSampleSource) => {
				setSource(getUpdatedSampleSource(sample));
			}),
		[sample],
	);

	return (
		<div className="app">
			<header>
				<div className="flex flex-row items-center justify-between">
					<div className="identity">
						<strong>React playground</strong>
						<span>Runs entirely in the browser</span>
					</div>
					<output title={status}>{status}</output>
				</div>
				<SampleSelect
					value={sample}
					onChange={(nextSample) => {
						setSample(nextSample);
						setSource(getSampleSource(nextSample));
					}}
				/>
				<button type="button" onClick={() => void generate()}>
					Generate
				</button>
				<button
					type="button"
					disabled={!pdfBlob}
					onClick={() => downloadBlob(pdfBlob, `${sample}.pdf`)}
				>
					Download
				</button>
			</header>
			<main>
				<label className="editor-pane">
					<span className="visually-hidden">Document definition</span>
					<textarea
						spellCheck={false}
						value={source}
						onChange={(event) => setSource(event.target.value)}
					/>
				</label>
				<div ref={pdfContainer} id="pdf-container" aria-label="Browser-generated PDF preview" />
			</main>
		</div>
	);
}
