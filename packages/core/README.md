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

## Output and options

All output documents also provide `getPageInfo()` (page counts and whether `maxPagesNumber`
truncated the PDF) and `getStream()`. Data methods finalize the stream themselves; a stream taken
with `getStream()` may be configured first, but collecting after the caller consumed it is rejected.

`createPdf(definition, options)` accepts `resourceLoading: { timeout, maxSize }` and an abort
`signal` to bound or cancel remote resource downloads; the same limits can be set per instance with
`createPdfCraft({ resourceLoading })`.

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
const pdfcraft = new PdfCraftBase<BytesOutput>(createOutput, { fonts });
const bytes = await pdfcraft.createPdf({ content: ["Hello"] }).bytes();
```

The factory is required: it is the only way a platform chooses its output document.

The adapter code imports `pdfkit`. A browser integration must resolve it to PDFKit's standalone
build, as `@pdfcraft/browser` does with a build alias.

## Extensions

Install and register `@pdfcraft/qr` or `@pdfcraft/svg` only when those document nodes are needed.
Core exposes a generic extension lifecycle and contains no QR/SVG-specific contract or behavior.

See the [PDFCraft repository](https://github.com/kljws/pdfcraft) for documentation, the
[styling guide](https://github.com/kljws/pdfcraft/blob/main/docs/STYLING-GUIDE.md) and the
[changelog](./CHANGELOG.md).
