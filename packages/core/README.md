# @pdfcraft/core

Node.js package for PDFCraft. It turns structured document definitions into PDF documents.

```typescript
import pdfcraft from "@pdfcraft/core";
```

## Entry points

- `@pdfcraft/core` — the Node.js entry (ESM and CommonJS). Output documents add `getBuffer()`,
  `getBase64()`, `getDataUrl()` and `write(filename)`. It warns once per `createPdf` call when no
  URL or local access policy is set.
- `@pdfcraft/core/adapter` — the runtime-neutral base for platform integrations, such as
  `@pdfcraft/browser`. It never imports Node.js built-ins.
- `@pdfcraft/core/types` — the public TypeScript contracts.

Browser applications should install `@pdfcraft/browser`, which bundles PDFKit's standalone build.

## Platform integrations

A platform supplies its output document through an output factory:

```typescript
import { OutputDocument, PdfCraftBase, type OutputFactory } from "@pdfcraft/core/adapter";

class BytesOutput extends OutputDocument {
	bytes(): Promise<Uint8Array> {
		return this.getData();
	}
}

const createOutput: OutputFactory<BytesOutput> = (stream) => new BytesOutput(stream);
const pdfcraft = new PdfCraftBase<BytesOutput>({ fonts }, createOutput);
const bytes = await pdfcraft.createPdf({ content: ["Hello"] }).bytes();
```

Without a factory, `createPdf` returns the PDF stream promise. Overriding `_transformToDocument`
in a subclass still works and takes precedence over the factory, but that hook is deprecated.

The adapter code imports `pdfkit`. A browser integration must resolve it to PDFKit's standalone
build, as `@pdfcraft/browser` does with a build alias.

## Extensions

Install and register `@pdfcraft/qr` or `@pdfcraft/svg` only when those document nodes are needed.
Core exposes a generic extension lifecycle and contains no QR/SVG-specific contract or behavior.

See the [PDFCraft repository](https://github.com/kljws/pdfcraft) for documentation.
