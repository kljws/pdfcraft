export interface RenderPdfOptions {
	blob: Blob;
	container: HTMLElement | null;
	isCurrent(): boolean;
}

export function renderPdf(options: RenderPdfOptions): Promise<boolean>;
