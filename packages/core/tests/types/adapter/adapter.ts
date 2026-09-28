// A browser-style consumer of the platform-neutral entry: DOM library, no Node.js types.
import { OutputDocument, PdfCraftBase, type OutputFactory } from "@pdfcraft/core/adapter";
import type { DocumentDefinition, PdfAbortSignal } from "@pdfcraft/core/types";

class BrowserOutput extends OutputDocument {
	async bytes(): Promise<Uint8Array> {
		return this.getData();
	}
}

const factory: OutputFactory<BrowserOutput> = (document) => new BrowserOutput(document);
const instance = new PdfCraftBase<BrowserOutput>({}, factory);
const signal: PdfAbortSignal = new AbortController().signal;
const definition: DocumentDefinition = { content: ["Browser"] };
const output: BrowserOutput = instance.createPdf(definition, { signal });
void output.bytes();
void output.getPageInfo();
