# pdfcraft

Modern PDF document generation for Node.js and browsers, written in TypeScript.

PDFCraft starts from the [pdfmake 0.3.11](https://github.com/bpampuch/pdfmake) codebase. It preserves the familiar document-definition model while delivering separate Node.js and browser packages, first-class TypeScript declarations, explicit ESM and CommonJS exports, isolated instances, and a Vitest test suite.

Numerous pull requests and issues from pdfmake have been fixed or incorporated in this package. See the changelogs of [`@pdfcraft/core`](./packages/core/CHANGELOG.md) and [`@pdfcraft/browser`](./packages/browser/CHANGELOG.md) for detailed information.

## Highlights

- TypeScript source and public declarations
- ESM-first package with CommonJS compatibility
- Dedicated modern browser entry
- Independent instances through `createPdfCraft()`
- Promise-based document output methods
- Structured tables with declarative headers and inheritable body/group layouts
- Rounded tables, images and decorated stack blocks
- Columns, lists, optional QR/SVG extensions, vectors, sections, attachments and AcroForm fields
- Headers, footers, backgrounds, page breaks and page metadata
- Table of contents, outlines and bookmarks
- Configurable local-file and URL access policies, with download timeouts, size limits and cancellation
- Early validation of page geometry and document structure, with the input path in every error
- Stable layout: page references, dynamic margins and footers are resolved before rendering, never returned half-converged
- Oversized content is never dropped; images can opt in to `shrinkToFit`
- Node and React playgrounds with live PDF previews
- Tested in Node.js and Chromium

## Requirements

- Node.js 22 or newer
- A modern browser and bundler for client-side usage

Fonts are not bundled with the npm package. Applications must provide their own font descriptors and font files.

## Installation

```sh
pnpm add @pdfcraft/core
```

For browser applications, install `@pdfcraft/browser` instead. It is self-contained and also exports the public TypeScript contracts.

QR and SVG support are optional, separately installed extensions:

```sh
pnpm add @pdfcraft/qr @pdfcraft/svg
```

```ts
import { qrExtension } from "@pdfcraft/qr";
import { svgExtension } from "@pdfcraft/svg";

pdfcraft.addExtensions(qrExtension, svgExtension);
```

The same extensions work with `@pdfcraft/core` and `@pdfcraft/browser`. Documents without QR or
SVG content do not need these packages; core contains no QR/SVG node types or implementations.

## Node.js

### Default instance

```ts
import pdfcraft from "@pdfcraft/core";

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
		{ text: "Hello from PDFCraft", style: "title" },
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
import pdfcraft from "@pdfcraft/core";

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
const pdfcraft = require("@pdfcraft/core");
```

## Browser

The browser entry is ESM-only and intended for modern bundlers.

```ts
import pdfcraft from "@pdfcraft/browser";

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

## Output documents

`createPdf()` returns an output document. The data methods finalize the PDF and can be called any
number of times:

| Package | Methods |
|---|---|
| `@pdfcraft/core` | `getBuffer()`, `getBase64()`, `getDataUrl()`, `write(filename)` |
| `@pdfcraft/browser` | `getBuffer()`, `getBase64()`, `getDataUrl()`, `getBlob()`, `download(filename)`, `open(window)`, `print(window)` |
| both | `getPageInfo()`, `getStream()` |

`getPageInfo()` reports `pageCount`, `totalPageCount` and `truncated`, so an excerpt produced by
`maxPagesNumber` can be told apart from a complete document. Page totals and page references always
describe the complete document.

`getStream()` returns the underlying PDFKit stream. It may be configured and then collected with the
data methods, or consumed and ended by the caller. Collecting data after the caller started reading
the stream, or calling `getStream()` after collection started, rejects with an explicit error instead
of returning an incomplete PDF.

## Validation and errors

Definitions are checked before layout, and errors name the offending input:

- page sizes and margins, including margins returned by a `pageMargins` function
  (`Invalid pageMargins for page 3 (returned by the pageMargins function)`);
- a node that contains itself (`Cyclic document structure`); the same node may still be reused;
- a `pageReference` whose id matches no node (`Unresolved pageReference 'details'`);
- a layout that never stabilizes (`Layout did not converge after 10 layout passes: …`).

Content taller than a page is never silently dropped. An image that cannot fit logs one warning;
set `shrinkToFit: true` on it to scale it down instead:

```ts
{ image: "poster", width: 500, shrinkToFit: true }
```

## TypeScript

Public contracts are available from the package and from the dedicated types export.

```ts
import type { DocumentDefinition } from "@pdfcraft/core/types";

const documentDefinition: DocumentDefinition = {
	content: ["Typed document definition"],
};
```

## Dynamic footers

The configured bottom page margin is a minimum. When a footer needs more height, PDFCraft expands
that page's bottom margin and repeats layout so body and table content move to the next page before
reaching the footer. Different pages may reserve different footer heights.

A footer that is too tall to leave any usable body area is rejected with an explicit error.

## Structured tables and decorated blocks

Tables separate repeated headers from logical body groups. A group can contain several physical
rows and move as one unit when `keepTogether` is enabled.

```ts
const documentDefinition = {
	content: [
		{
			table: {
				borderRadius: 10,
				widths: ["*", "auto"],
				header: {
					rows: [["Product", "Total"]],
					layout: {
						fillColor: "#e0e7ff",
					},
				},
				body: {
					groups: [
						{
							keepTogether: true,
							dontBreakRows: true,
							layout: {
								hLineWidth: () => 0,
								vLineWidth: () => 0,
								paddingLeft: () => 12,
								paddingRight: () => 12,
								paddingTop: (rowIndex) => (rowIndex === 0 ? 8 : 2),
								paddingBottom: (rowIndex, _node, group) =>
									rowIndex === group.rowCount - 1 ? 8 : 2,
							},
							rows: [
								["Platform subscription", "490.00 EUR"],
								[{ text: "Twelve-month service", colSpan: 2 }],
							],
						},
					],
					layout: {
						hLineWidth: () => 0.5,
					},
				},
			},
		},
		{
			stack: [{ text: "Payment information", bold: true }, "IBAN: ..."],
			backgroundColor: "#f8fafc",
			borderColor: "#334155",
			borderWidth: 1,
			borderRadius: 10,
			padding: 12,
		},
	],
};
```

A group layout partially overrides `body.layout`. It can customize all four paddings and the
horizontal or vertical separators inside that group. Omitted callbacks inherit from the body;
the table's outer border, group boundaries, header/body boundary and page-closing borders remain
owned by the body layout.

Images accept `borderRadius`, `borderWidth` and `borderColor` as well. Version 0.7 replaces the
former flat `table.body`, `headerRows`, table-level `dontBreakRows` and node-level table `layout`
properties; see the changelog and current examples when migrating from 0.6.

## Access policies

Server applications should restrict local files and external URLs when document definitions can contain untrusted input.

```ts
pdfcraft.setLocalAccessPolicy((filename) => filename.startsWith("/srv/pdf-assets/"));

pdfcraft.setUrlAccessPolicy((url) => {
	const parsed = new URL(url);
	return parsed.protocol === "https:" && parsed.hostname === "assets.example.com";
});
```

URL policies are checked around redirects where the runtime permits it. In Node.js, each
`createPdf()` call warns when an instance has no URL or local access policy.

### Resource loading limits

Remote fonts, images and files can be bounded per instance or per document, and cancelled:

```ts
const instance = pdfcraft.createPdfCraft({
	resourceLoading: { timeout: 10_000, maxSize: 5_000_000 },
});

const controller = new AbortController();
const pdf = instance.createPdf(documentDefinition, {
	resourceLoading: { timeout: 2_000 },
	signal: controller.signal,
});
```

`timeout` is in milliseconds per resource, including redirects and the body; `maxSize` is in bytes.
The first failed download cancels the others and is the error reported. Without these options,
loading is unbounded.

## Development

```sh
pnpm install
pnpm build
pnpm test
```

`pnpm test` builds the packages and runs every check below. They can also be run separately:

| Command | Checks |
|---|---|
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm test:types` | Public type contracts, including a Node.js-free consumer of `@pdfcraft/core/adapter` |
| `pnpm test:unit` | Unit tests |
| `pnpm test:integration` | Integration tests, including the reference documents |
| `pnpm test:consumer` | Built packages: exports, artifacts, dependencies, bundle size and Node.js output of the cross-platform check (run after `pnpm build`) |
| `pnpm test:browser` | The built browser bundle in Chromium through Playwright |
| `pnpm lint:check` / `pnpm lint:fix` | Oxlint |
| `pnpm format:check` / `pnpm format:fix` | Oxfmt |
| `pnpm visual:generate` | PDFs for manual visual review (see `tests/visual/README.md`) |

Test locations:

- unit tests are colocated under `packages/*/src/**/__tests__/`;
- integration tests (`*.integ.ts`) are colocated under `packages/core/src/**/__tests__/` (other packages still use `packages/*/tests/integration/`), and the shared reference documents and helpers under `packages/core/src/__tests__/fixtures/`;
- browser tests are under `packages/browser/tests/`;
- public type-contract tests are under `packages/*/tests/types/`;
- tests of the built packages are under `tests/consumer/`, and manual visual checks under `tests/visual/`.

### Performance benchmarks

Run the quick smoke profile or the complete reproducible benchmark suite:

```sh
pnpm benchmark:quick
pnpm benchmark
pnpm benchmark:quote
```

The suite measures 100–1,000-page documents, large tables, media-heavy PDFs, concurrent generation and batches of 1, 10 or 100 real `quote.js` documents. See [benchmarks/README.md](./benchmarks/README.md) for the workloads, JSON output and comparison methodology.

## Playgrounds

The repository contains two development playgrounds:

- a Node.js playground that generates PDFs on the server;
- a Vite and React playground that generates PDFs entirely in the browser.

Both provide a live editor, shared examples and a PDF.js canvas preview.

## Package architecture

The repository is a pnpm workspace. Document generation lives in `@pdfcraft/core`; each platform
entry adds only its output and platform setup.

| Entry | For | Contents |
|---|---|---|
| `@pdfcraft/core` | Node.js applications (ESM and CommonJS) | Document engine, server output (`getBuffer`, `write`), local access policy and the missing-policy warnings. Loads the regular Node.js build of PDFKit. |
| `@pdfcraft/core/adapter` | Platform integrations | `PdfCraftBase`, `OutputDocument` and the `OutputFactory` type. Runtime-neutral: no Node.js built-ins, no server output, no environment detection. |
| `@pdfcraft/core/types` | TypeScript | Public contracts only. |
| `@pdfcraft/browser` | Browsers with a modern bundler (ESM) | One self-contained bundle: core, the browser output (`getBlob`, `download`, `open`, `print`) and PDFKit's standalone build. No runtime dependencies. |

The browser package builds on the adapter entry. The shared code imports `pdfkit`, and the
browser build aliases that import to `pdfkit/js/pdfkit.standalone.js`
(`packages/browser/tsdown.config.mts`). This alias is intentional: it is the only place the
standalone build is selected, and Node.js users never load it.

**Runtime bundle size is not installed size.** The browser bundle is kept separate so that
Node.js applications never load the large standalone build. PDFKit's npm package still ships all
of its builds, including the standalone file, so installing `@pdfcraft/core` puts that file on
disk even though nothing loads it.

These boundaries are checked by the test suite:

- the adapter's runtime import graph may reach only `pdfkit` and `linebreak`, never a Node.js
  built-in or the server output (`packages/core/src/__tests__/adapter-boundary.test.ts`);
- the built artifacts, declared dependencies and `npm pack` file lists are verified after the
  build, including which PDFKit build each entry actually loads (`tests/consumer/artifacts.test.ts`);
- the minified browser bundle has a byte budget in `packages/browser/size-budget.json`, raised
  only in a deliberate, reviewed change (`tests/consumer/bundle-size.test.ts`);
- reference documents generated through the Node.js entry and the browser bundle must produce the
  same pages, text layout and drawing operations (`tests/consumer/cross-platform.test.ts` and
  `packages/browser/tests/cross-platform.test.ts`).

## Credits

**pdfcraft 0.4.0** is a fork and substantial modernization of [pdfmake 0.3.11](https://github.com/bpampuch/pdfmake), originally created by [@bpampuch](https://github.com/bpampuch) and maintained by [@liborm85](https://github.com/liborm85).

pdfcraft retains pdfmake's document-definition model while introducing a rewritten TypeScript codebase, modern package exports, isolated instances, updated browser support, new APIs, tests, tooling and other architectural improvements.

pdfmake is itself built on top of [PDFKit](https://github.com/foliojs/pdfkit), originally created by [@devongovett](https://github.com/devongovett).

Thanks to all upstream pdfmake and PDFKit contributors, as well as everyone contributing to pdfcraft.

## License

pdfcraft is distributed under the MIT License.

This project includes code derived from pdfmake. The original pdfmake copyright notices and MIT License are preserved in [LICENSE](./LICENSE).
