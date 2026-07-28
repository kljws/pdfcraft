import { createSampleSource } from "../../shared/editor";

const SAMPLE_KEY = "pdfcraft.react.sample";
const SOURCE_KEY = "pdfcraft.react.source";
const SOURCE_BASE_KEY = "pdfcraft.react.source-base";
const SAMPLE_CHANGE_EVENT = "pdfcraft:sample-change";

const rawSamples = import.meta.glob("../../shared/samples/*.js", {
	eager: true,
	import: "default",
	query: "?raw",
});
const samples = Object.fromEntries(
	Object.entries(rawSamples).map(([filename, sample]) => [
		filename.split("/").pop().replace(/\.js$/, ""),
		sample,
	]),
);

export const initialSample = "basics";
export const availableSamples = Object.keys(samples).sort((left, right) =>
	left.localeCompare(right),
);

export const getSampleSource = (name) => createSampleSource(samples[name]);

export const getInitialSample = () => {
	const stored = localStorage.getItem(SAMPLE_KEY);
	return availableSamples.includes(stored) ? stored : initialSample;
};

export const getInitialSource = () => {
	const sample = getInitialSample();
	const storedSample = localStorage.getItem(SAMPLE_KEY);
	const storedSource = localStorage.getItem(SOURCE_KEY);
	const storedSourceBase = localStorage.getItem(SOURCE_BASE_KEY);
	const sampleSource = getSampleSource(sample);

	if (storedSample === sample && storedSource && storedSourceBase === sampleSource) {
		return storedSource;
	}

	return sampleSource;
};

export const saveState = (sample, source) => {
	localStorage.setItem(SAMPLE_KEY, sample);
	localStorage.setItem(SOURCE_KEY, source);
	localStorage.setItem(SOURCE_BASE_KEY, getSampleSource(sample));
};

export const subscribeToSampleChanges = (listener) => {
	const handleChange = (event) => listener(event.detail.getSampleSource);
	window.addEventListener(SAMPLE_CHANGE_EVENT, handleChange);
	return () => window.removeEventListener(SAMPLE_CHANGE_EVENT, handleChange);
};

if (import.meta.hot) {
	import.meta.hot.accept((updatedModule) => {
		if (!updatedModule) {
			return;
		}
		window.dispatchEvent(
			new CustomEvent(SAMPLE_CHANGE_EVENT, {
				detail: { getSampleSource: updatedModule.getSampleSource },
			}),
		);
	});
}
