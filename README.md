# pdfcraft

Modern PDF document generation for Node.js and browsers, written in TypeScript.

`pdfcraft` 0.4.0 starts from the [pdfmake 0.3.11](https://github.com/bpampuch/pdfmake) codebase. It preserves the familiar document-definition model while delivering a cleaner package, first-class TypeScript declarations, explicit ESM and CommonJS exports, isolated instances, a modern browser entry, and a Vitest test suite.

## Highlights

- TypeScript source and public declarations
- ESM-first package with CommonJS compatibility
- Dedicated modern browser entry
- Independent instances through `createPdfCraft()`
- Promise-based document output methods
- Tables, columns, lists, images, SVG, vectors, sections and attachments
- Headers, footers, backgrounds, page breaks and page metadata
- Table of contents, outlines and bookmarks
- Configurable local-file and URL access policies
- Node and React playgrounds with live PDF previews
- Tested in Node.js and Chromium

## Requirements

- Node.js 22 or newer
- A modern browser and bundler for client-side usage

Fonts are not bundled with the npm package. Applications must provide their own font descriptors and font files.

## Installation

```sh
npm install pdfcraft
```

## Node.js

### Default instance

```ts
import pdfcraft from "pdfcraft";

pdfcraft.addFonts({
	Roboto: {
		normal: "./fonts/Roboto-Regular.ttf",
		bold: "./fonts/Roboto-Medium.ttf",
		italics: "./fonts/Roboto-Italic.ttf",
		bolditalics: "./fonts/Roboto-MediumItalic.ttf",
	},
});

const documentDefinition = {
	content: [
		{ text: "Hello from pdfcraft", style: "title" },
		"This PDF was generated from a TypeScript application.",
	],
	styles: {
		title: {
			fontSize: 20,
			bold: true,
			margin: [0, 0, 0, 12],
		},
	},
};

const pdf = pdfcraft.createPdf(documentDefinition);
await pdf.write("document.pdf");
```

### Independent instances

Use `createPdfCraft()` when separate parts of an application require different fonts or access policies.

```ts
import pdfcraft from "pdfcraft";

const reports = pdfcraft.createPdfCraft({
	fonts: {
		Roboto: {
			normal: "./fonts/Roboto-Regular.ttf",
			bold: "./fonts/Roboto-Medium.ttf",
			italics: "./fonts/Roboto-Italic.ttf",
			bolditalics: "./fonts/Roboto-MediumItalic.ttf",
		},
	},
	localAccessPolicy: (filename) => filename.startsWith("/srv/reports/"),
	urlAccessPolicy: (url) => url.startsWith("https://assets.example.com/"),
});

const pdf = reports.createPdf({
	content: ["Isolated pdfcraft instance"],
});

const buffer = await pdf.getBuffer();
```

The default export remains available for compatibility. Every instance exposes the same document-generation API.

### CommonJS

```js
const pdfcraft = require("pdfcraft");
```

## Browser

The browser entry is ESM-only and intended for modern bundlers.

```ts
import pdfcraft from "pdfcraft/browser";

pdfcraft.addFonts({
	Roboto: {
		normal: new URL("./fonts/Roboto-Regular.ttf", import.meta.url).href,
		bold: new URL("./fonts/Roboto-Medium.ttf", import.meta.url).href,
		italics: new URL("./fonts/Roboto-Italic.ttf", import.meta.url).href,
		bolditalics: new URL("./fonts/Roboto-MediumItalic.ttf", import.meta.url).href,
	},
});

const pdf = pdfcraft.createPdf({
	content: ["Generated entirely in the browser"],
});

await pdf.download("document.pdf");
```

Font files and images can be supplied through URLs or the browser virtual file system.

## TypeScript

Public contracts are available from the package and from the dedicated types export.

```ts
import type { DocumentDefinition } from "pdfcraft/types";

const documentDefinition: DocumentDefinition = {
	content: ["Typed document definition"],
};
```

## Access policies

Server applications should restrict local files and external URLs when document definitions can contain untrusted input.

```ts
pdfcraft.setLocalAccessPolicy((filename) => filename.startsWith("/srv/pdf-assets/"));

pdfcraft.setUrlAccessPolicy((url) => {
	const parsed = new URL(url);
	return parsed.protocol === "https:" && parsed.hostname === "assets.example.com";
});
```

URL policies are checked around redirects where the runtime permits it.

## Development

```sh
npm install
npm run build
npm test
```

Useful validation commands include TypeScript checks, ESLint, Prettier, Node tests, browser tests and package verification. See `package.json` for the exact scripts available in the current repository.

Unit tests are colocated as `src/**/__tests__/*.test.ts`. Integration, browser, consumer and public type-contract tests remain under `tests/`.

### Performance benchmarks

Run the quick smoke profile or the complete reproducible benchmark suite:

```sh
npm run benchmark:quick
npm run benchmark
```

The suite measures 100–1,000-page documents, large tables, media-heavy PDFs and concurrent generation. See [benchmarks/README.md](./benchmarks/README.md) for the workloads, JSON output and comparison methodology.

## Playgrounds

The repository contains two development playgrounds:

- a Node.js playground that generates PDFs on the server;
- a Vite and React playground that generates PDFs entirely in the browser.

Both provide a live editor, shared examples and a PDF.js canvas preview.

## Package architecture

The package is built from one TypeScript source tree:

- `pdfcraft` — Node.js ESM entry;
- `pdfcraft` through `require()` — generated CommonJS compatibility output;
- `pdfcraft/browser` — modern browser ESM entry;
- `pdfcraft/types` — public TypeScript contracts.

The Node.js bundles and declarations are produced with `tsdown`. Browser-specific output is kept separate from the core document-generation code.

## Credits

**pdfcraft 0.4.0** is a fork and substantial modernization of [pdfmake 0.3.11](https://github.com/bpampuch/pdfmake), originally created by [@bpampuch](https://github.com/bpampuch) and maintained by [@liborm85](https://github.com/liborm85).

pdfcraft retains pdfmake's document-definition model while introducing a rewritten TypeScript codebase, modern package exports, isolated instances, updated browser support, new APIs, tests, tooling and other architectural improvements.

pdfmake is itself built on top of [PDFKit](https://github.com/foliojs/pdfkit), originally created by [@devongovett](https://github.com/devongovett).

Thanks to all upstream pdfmake and PDFKit contributors, as well as everyone contributing to pdfcraft.

## License

pdfcraft is distributed under the MIT License.

This project includes code derived from pdfmake. The original pdfmake copyright notices and MIT License are preserved in [LICENSE](./LICENSE).
