/** Vite serves `?url` imports as the public URL of the file (used for the pdf.js worker). */
declare module "*?url" {
	const url: string;
	export default url;
}
