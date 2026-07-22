# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Upstream pdfmake PR review

#### Already covered

- [bpampuch/pdfmake#1069 — Add word breaking to columns](https://github.com/bpampuch/pdfmake/pull/1069): already covered through the explicit `wordBreak: "break-all"` style and character-level measurement. PDFCraft keeps normal column minimum widths unless callers opt into breaking inside words, avoiding the PR's unconditional shrinking of star columns.
- [bpampuch/pdfmake#1732 — Check for table body length](https://github.com/bpampuch/pdfmake/pull/1732): already fixed with stricter preprocessing errors for a missing table object, a missing or empty `table.body`, and non-array rows.
- [bpampuch/pdfmake#2289 — Throw an error when content doesn't fit to page](https://github.com/bpampuch/pdfmake/pull/2289): already fixed with safer behavior: oversized images, SVGs and canvases render once on an otherwise empty page instead of causing repeated blank pages or an unconditional exception.
- [bpampuch/pdfmake#2939 — Support `application/octet-stream` for base64 images](https://github.com/bpampuch/pdfmake/pull/2939): already supported by inline-image data URL detection and covered by typed binary-image resource tests.

#### Ported

- [bpampuch/pdfmake#2940 — Fix rowSpan header verticalAlignment on repeated tables](https://github.com/bpampuch/pdfmake/pull/2940): use the table cell's final page metadata when calculating a repeated row-spanned header's vertical alignment, preventing negative view heights and displaced header text.
- [bpampuch/pdfmake#2927 — Fix pageBreakBefore with unbreakable blocks](https://github.com/bpampuch/pdfmake/pull/2927): track every text, image, SVG, canvas, QR and attachment node moved out of an unbreakable block, update all of its page positions, and exclude backgrounds, headers and footers from `pageBreakBefore` navigation. PDFCraft already retained attachments inside fragments; the remaining stale-position and repeatable-node issues are now fixed.
- [bpampuch/pdfmake#2497 — Border and borderColor in styles](https://github.com/bpampuch/pdfmake/pull/2497): table cells now inherit `border`, `borderColor`, `fillColor` and `fillOpacity` from named styles, with matching public TypeScript properties and precedence for cell-level overrides.
- [bpampuch/pdfmake#2231 — Partially fix dontBreakRows not fitting on single page #1159](https://github.com/bpampuch/pdfmake/pull/2231): oversized unbreakable table rows are now committed across every temporary layout page instead of silently discarding all pages after the first; per-item position tracking also preserves correct page numbers when moved content spans several pages.
- [bpampuch/pdfmake#2228 — Better SVG handling](https://github.com/bpampuch/pdfmake/pull/2228): the missing-`viewBox` scaling fix was already present; named SVG resources can now be declared through `documentDefinition.svgs`, including resolved URLs and VFS files, while base64 and percent-encoded SVG data URLs are decoded explicitly without changing raster `image` semantics.
- [bpampuch/pdfmake#2866 — Fix for MacOS Preview rendering issue](https://github.com/bpampuch/pdfmake/pull/2866): table cell fills and overlay patterns now overlap their neighboring borders by 0.5 pt, preventing anti-aliasing seams in macOS Preview and similarly sensitive PDF viewers.
- [bpampuch/pdfmake#1287 — Add support for inline images](https://github.com/bpampuch/pdfmake/pull/1287): text arrays can now contain typed image fragments; inline images are resolved through the existing image registry, measured as part of line wrapping and baseline layout, and rendered with their configured dimensions, opacity and links.
- [bpampuch/pdfmake#2922 — Dynamic Page Margin](https://github.com/bpampuch/pdfmake/pull/2922): `pageMargins` can now be a callback receiving the current page, total page count and resolved page size. Layout is repeated with a bounded convergence strategy when margins depend on the final page count, page-local geometry follows each resolved margin, and columns plus repeated table headers are rebased correctly across pages with different horizontal margins. Non-convergent definitions emit one warning instead of looping indefinitely.
- [bpampuch/pdfmake#2843 — Acroforms](https://github.com/bpampuch/pdfmake/pull/2843): added typed block-level and inline AcroForm fields backed by PDFKit, with text, push-button, list, combo-box and checkbox controls; fields participate in measurement, wrapping, columns, page breaks and unbreakable fragments. Definitions are validated before layout, form initialization is shared across the document, and each field uses its resolved document font. The PR's radio-button example and `subsetFonts` workaround were intentionally not carried over because the upstream patch itself removed the unsupported radio flow and current PDFKit manages form font dictionaries directly.
- [bpampuch/pdfmake#1087 — Fix issue 72](https://github.com/bpampuch/pdfmake/pull/1087): added typed `tableAlignment` support for left-, center- and right-aligned tables. The alignment offset is applied consistently to cell content, borders, fills, nested tables and repeated headers, while full-width tables remain unchanged. PDFCraft reimplements the feature without the original patch's debug output and geometry/indexing regressions.

## [0.4.4] - 2026-07-22

### Added

- Binary image resources can now be supplied as `Uint8Array` or `ArrayBuffer` values in addition to strings.
- Playground document parsing now resolves sample resources through a shared resource map, allowing images and attachments to remain portable between the Node.js and React playgrounds.
- Regression tests cover binary resource resolution, reusable in-memory attachments, functional document-context helpers and robust cloning of dynamic content.

### Changed

- Replaced the remaining inheritance chains in `Renderer`, `DocMeasure`, `ElementWriter`, `DocumentContext` and `LayoutBuilder` with explicit composition while preserving their existing responsibilities.
- Split renderer graphics, document measurement, element writing, document context and layout-builder operations into focused collaborators.
- Simplified stateless collaborators further: document-column, snaking-column and media-writing operations are now functions instead of one-owner class instances.
- Consolidated small event, fragment and writer-type modules into their owning modules and removed redundant event forwarding.
- Made layout-builder host contracts private implementation details.
- Replaced JSON serialization used for repeating static headers and footers with the shared document clone utility. Plain objects are still deeply copied, while cycles and non-JSON values are handled safely.
- Renamed the Node-specific local resource callback contract from the overly broad `AccessPolicy` type to `LocalAccessPolicy` throughout the public and internal Node APIs.
- Split CI into named quality, contract, coverage, unit, integration, browser and package jobs. Node.js 22 and 24 remain covered where relevant.
- Removed the repository-specific Cursor rule file and ignored local `.cursor` and pdfmake working directories.
- Replaced the invoice playground sample with new fictional company, customer, invoice, service and payment data.

### Fixed

- Preserved attachment metadata when an attachment source is loaded from the virtual file system instead of returning only the raw file bytes.
- Allowed in-memory attachment objects to be reused safely across PDF generations.
- Assigned a deterministic creation date to in-memory attachments when none is supplied, improving reproducibility.
- Made data-URL detection case-insensitive.
- Restricted attachment and embedded-file URL resolution to valid string or `{ url }` resource references, preventing binary sources from being misinterpreted as URLs.
- Corrected image resource typing and conversion so binary resources reach PDFKit in a supported form.
- Updated the playground server and browser generator to resolve document resources consistently after the resource-loading refactor.
- Kept `PageElementWriter.emit()` as the observable event boundary after removing writer inheritance and redundant event buses.

### Tests and validation

- Expanded renderer coverage for vector state, clipping, paths, gradients, patterns, images, SVGs, QR codes, attachments, links, outlines and page lifecycle behavior.
- Added coverage for table-layout callbacks, server output reuse, PDF document resources and browser entry generation.
- The release passes 466 unit tests, 102 integration tests, 5 browser tests and 2 generated-package consumer tests.
- Combined unit and integration coverage is 86.08% for statements, 73.45% for branches, 91.77% for functions and 86.23% for lines.
- Node and browser type contracts, ESLint, Prettier, production builds and package-size limits are validated.

## [0.4.3] - 2026-07-22

### Added

- Added `npm run analyze:dependencies` to measure the installed size and browser-bundle contribution of PDFKit, Fontkit and `svg-to-pdfkit`.
- Reports raw, gzip and Brotli sizes and distinguishes package installation weight from marginal browser-bundle weight.
- Documents that PDFKit and its dependencies remain external to the Node.js builds, while the browser build uses PDFKit's standalone bundle.

## [0.4.2] - 2026-07-22

### Tests

- Added comprehensive unit coverage for built-in and custom table layouts.
- Added server-output tests for buffer, Base64, data-URL and file generation, including reuse of a single generated document.
- Expanded PDF-document tests for resources, attachments, local access policies and PDFKit integration.
- Added renderer-graphics tests covering vectors, clipping, images, SVGs, QR codes, links, attachments, patterns and graphics-state reuse.
- Expanded browser-entry coverage with real browser PDF generation and Blob output.

## [0.4.1] - 2026-07-22

### Added

- Added reproducible benchmark scenarios for explicit multi-page documents, large tables, image/SVG-heavy documents and concurrent generation.
- Added isolated worker-based measurements for generation time, peak RSS, peak heap and output size.
- Added full and quick benchmark commands, benchmark documentation and README usage instructions.
- Included benchmark sources in ESLint validation.

## [0.4.0] - 2026-07-22

### Origin and scope

- PDFCraft starts from the **pdfmake 0.3.11** codebase. Version 0.4.0 is the first release under the PDFCraft name and contains the complete modernization performed since that baseline.
- The pdfmake document-definition model and its major rendering capabilities remain the functional foundation, while the source, public API, build, package boundaries, tests, playgrounds and security controls have been rebuilt for PDFCraft.
- Upstream authors and contributors remain credited in the README and license notices.

### Migration notes

- The package name and public runtime names are now `pdfcraft`, `PdfCraft` and `createPdfCraft()` rather than pdfmake-specific names.
- Node.js 22 or newer is required.
- The package is ESM-first. CommonJS remains available through the `require` export.
- Browser consumers must import `pdfcraft/browser`.
- Public TypeScript contracts are exported by `pdfcraft/types`; the primary document type is `DocumentDefinition`.
- Roboto and other fonts are no longer bundled in the npm package. Applications must configure and provide their own fonts.
- Standard-font compatibility modules, generated VFS/font modules and legacy browser globals are no longer published.
- Unknown or misspelled properties on public document definitions are now rejected by TypeScript instead of being silently accepted.

### Added

#### Public API and types

- Full TypeScript source code with generated ESM, CommonJS and browser declarations.
- Explicit package exports for the Node.js ESM entry, Node.js CommonJS entry, browser entry, public types and `package.json`.
- `createPdfCraft()` and the `PdfCraft` constructor for independently configured instances, while retaining a ready-to-use default instance.
- Instance configuration for fonts, table layouts, progress callbacks, a custom virtual file system, local-file access policy and URL access policy.
- Public contracts split into common, configuration, content, document-definition, output and resource domains behind a stable types barrel.
- Public structural browser output types that do not leak DOM globals into Node.js declarations.
- Public resource-header types that do not require `HeadersInit` or another DOM declaration.
- Public definitions for document permissions, PDF subsets, patterns, attachments, files, metadata and PDF version options.
- Typed content support for sections, TOCs, outlines, page and text references, list counters, nested styles and file links.
- Typed image and SVG minimum/maximum dimensions, SVG rendering options and unified overflow constraints.
- Typed table row heights including `auto`, fill color/opacity callbacks, broken horizontal-line handling and line dash styles.
- Typed QR mask and padding options.
- Typed vector stroke opacity, legacy `lineOpacity`, dash phase, gradients, caps, joins and clipping-related geometry.
- Per-document `progressCallback` and `tableLayouts` options, with per-document values taking priority over instance defaults and layouts merged without mutation.

#### Runtime and resources

- Isolated virtual file systems for every PDFCraft instance.
- Native `Uint8Array` virtual-file storage with UTF-8, UTF-16LE, ASCII, Latin-1, binary, hexadecimal, base64 and base64url codecs.
- URL resolution for fonts, images, attachments and embedded files.
- Header-aware URL cache keys so the same URL requested with different credentials or headers remains isolated.
- Redirect-aware URL policy validation where supported by the runtime.
- Reusable output documents whose underlying byte stream is collected only once.
- Native browser `Blob`, data URL, download, open and print operations.
- Promise-based Node.js buffer, base64, data URL and file-writing output methods.

#### Development experience

- Node.js and Vite/React playgrounds backed by shared examples and a live PDF.js canvas preview.
- Off-screen browser preview generation followed by atomic page replacement.
- Download actions for PDFs generated by both playgrounds.
- Portable invoice and PDF/A samples whose attachments are loaded through the virtual file system.
- A clean-build TypeScript configuration that can build the package when `dist/` does not exist.
- Automated raw, gzip and unpacked package-size budgets.
- A controlled npm `files` list and a rebuild during `prepack`.

#### Tests and CI

- Vitest unit, integration, consumer, type-contract and Playwright/Chromium browser suites.
- Strict Node-only declaration tests without DOM libraries.
- Separate browser declaration tests with DOM libraries.
- ESM and CommonJS package-consumer tests against the generated exports.
- Real PDF generation tests in Chromium, including `blob:` preview creation.
- Regression coverage for SVG class selectors, URL policies and redirects, isolated instances, resource headers, VFS encodings, reusable outputs and PDF/A attachments.
- Regression coverage for clipping, gradients, decorations, vectors, watermarks, sections, tables, margins, paragraph gaps, page height, vertical alignment and oversized canvases.
- Colocated unit tests under `src/**/__tests__`, with integration, browser, consumer and type-contract tests retained under `tests/`.
- Enforced coverage thresholds for statements, branches, functions and lines.
- Consolidated CI jobs for code quality, Node.js 22/24, Chromium and npm-package validation.
- CI concurrency cancellation for superseded runs.

### Changed

#### Architecture

- Migrated all maintained runtime modules and tests from JavaScript to strict TypeScript.
- Reorganized the source around `core`, `configuration`, `document`, `layout`, `measurement`, `output`, `preprocessing`, `rendering`, `resources`, `text`, `types`, `utils` and `vendor` responsibilities.
- Moved measurement, SVG measurement, preprocessing and output implementations into dedicated domains.
- Split large printer, layout builder, element writer, table processor, document context, renderer and measurement modules into smaller focused units.
- Extracted shared page-item and vector geometry instead of maintaining separate height calculations.
- Extracted section-page property resolution into a pure, non-mutating helper.
- Centralized text-style resolution so inline and direct text measurements use the same font, size, features, spacing and line-height rules.
- Centralized column min/max measurement and reused it during table measurement.
- Removed the global VFS singleton from production code; each instance now owns its resource state.
- Cloned caller-owned document definitions, font descriptors and creation options before internal preprocessing or resource resolution.

#### Build and package

- Replaced the legacy Babel/Webpack/custom-script pipeline with `tsdown`.
- Added ESM-first Node.js output, generated CommonJS compatibility output and a dedicated browser bundle.
- Bundled PDFKit's standalone browser build through the normal `tsdown` configuration.
- Replaced shared browser-side `Buffer` usage with native byte utilities, eliminating the duplicate Buffer implementation from the browser path.
- Removed browser source maps from the published package.
- Marked the package as side-effect free for bundler tree-shaking.
- Added the package manager declaration and complete repository, homepage and issue metadata.
- Minified the browser bundle. During this modernization pass it decreased from approximately 2.73 MB to 1.58 MB raw and about 449 KiB gzip.
- Reduced the dry-run npm tarball from approximately 700 KiB to 575 KiB and its unpacked size from approximately 3.23 MB to 2.09 MB.
- Restricted build type-checking to production sources while resolving package self-imports directly to source during development.
- Made public declarations autonomous from PDFKit ambient namespaces and browser globals.

#### Rendering and layout

- Unified overflow handling for images and SVGs, including minimum/maximum constraints and clipping.
- Balanced clipping with explicit PDF save/clip/restore operations and validation of invalid clip rectangles.
- Reduced repeated vector graphics-state instructions for line width, dash, cap and join values.
- Made public `lineOpacity` affect vector strokes and added `strokeOpacity` as the explicit equivalent.
- Improved vector and fragment bottom-bound calculations for rectangles, ellipses, lines, polylines, paths and clipping regions.
- Reused the same geometry calculation for fragments, repeatables and infinite-height page finalization.
- Refactored watermark normalization, automatic sizing, angle calculation and font resolution into a tested unit.
- Resolved section page size, orientation, margins, header, footer, background and watermark inheritance without mutating section definitions.
- Preserved explicit zero values for watermark angle and opacity.
- Unified nested text-style inheritance and measurement behavior.
- Preserved paragraph gaps between stacked text nodes and margins across page or column breaks.
- Improved snaking-column page-break behavior, including nested non-snaking groups and repeatable table headers.
- Improved table row and row-span measurement across page boundaries.
- Improved vertical alignment calculations for table cells spanning pages.
- Allowed an oversized canvas to render once on an otherwise empty page instead of repeatedly failing to fit.

#### Tooling and repository

- Replaced Mocha and custom runners with Vitest and Playwright.
- Standardized maintained tests on strict TypeScript and kebab-case `*.test.ts` filenames.
- Removed placeholder skipped tests and implemented the remaining meaningful TODO tests.
- Expanded ESLint to maintained TypeScript, JavaScript and JSX with explicit Node.js and browser globals.
- Added Prettier validation and whitespace checks to the release pipeline.
- Replaced the legacy AngularJS playground with a small static Node.js server and a Vite/React browser application.
- Converted examples needing functions or comments to JSON5.
- Centralized repository font assets and removed duplicate example copies.

### Fixed

#### Correctness

- SVG rendering crashes caused by CSS class selectors.
- Image and SVG overflow behavior differing from each other.
- Invalid SVG dimensions and malformed SVG documents failing unclearly.
- Incorrect wavy-decoration clipping and grouping of adjacent decorations.
- Single-stop linear gradients producing an invalid stop position.
- Public vector `lineOpacity` being ignored by the renderer.
- Repeated vector state commands increasing output size unnecessarily.
- Unbalanced or invalid clipping sequences.
- Fragment and repeatable heights ignoring vector bounds or stroke widths.
- Infinite-height pages calculating vector positions twice or omitting non-text geometry.
- `maxPagesNumber: 0` being treated as unlimited output.
- Incorrect table height reservation after a row crossed a page boundary.
- Negative vertical-alignment measurements when cell content crossed pages.
- Lost top/bottom margins across page breaks.
- Missing `paragraphGap` spacing between stacked paragraphs.
- Parent styles being discarded from nested text definitions.
- Direct text measurement diverging from normal inline measurement.
- Section inheritance mutating the original document definition.
- Oversized canvases repeatedly triggering page breaks.
- Invalid embedded-file entries preventing later valid files from being processed.
- Node output reuse failing when both buffer and file output were requested.
- Caller-owned document definitions, font descriptors and creation options being mutated.
- Per-document callbacks and table layouts being silently overwritten by instance defaults.

#### Preprocessing and diagnostics

- Invalid text values reaching late layout stages instead of failing during preprocessing.
- Invalid `columns`, `stack`, unordered-list, ordered-list and table structures producing unclear errors.
- Serialized Node.js Buffer image values not being normalized to portable byte arrays.
- Misspelled and unknown public document properties being accepted by overly broad declarations.

#### Resources and security

- Shared VFS state leaking fonts or downloaded resources between independent instances and tests.
- URL caching only by URL and therefore conflating requests with different authorization headers.
- External redirects bypassing the final URL access-policy check in supported runtimes.
- Local-file paths being accepted without consulting the configured local access policy.
- Non-portable absolute attachment paths in the invoice sample.
- Unsafe directory traversal in the playground static server.

#### Browser and playgrounds

- Browser bundle failures caused by incompatible `assert`, `zlib`, stream and Buffer compatibility shims.
- Silent failures in PDFKit-specific bundle transformations.
- Incorrect browser entry, image and font paths.
- Preview requests completing out of order and replacing newer PDFs.
- Unresponsive tablet preview layout.
- Preview flickering caused by iframe reloads or partial canvas replacement.
- Object URLs not being revoked after downloads or preview replacement.

### Removed

- The obsolete `examples2` tree and its dependency on a separately published pdfmake version.
- Generated example PDFs and the legacy `build-examples.js` workflow.
- AngularJS, jQuery, Bootstrap, Ace, Express and `body-parser` playground infrastructure.
- Babel, `core-js`, `brfs`, `shx`, `npm-run-all`, `rewire` and `file-saver`.
- Webpack, obsolete loaders and browser source-map publication.
- Direct browser polyfill dependencies for `assert`, zlib, Buffer, events, process, streams and util.
- The vendored `svg-to-pdfkit` source, local wrapper and custom patch; PDFCraft now uses the pinned package dependency.
- JavaScript compilation support from the TypeScript configuration.
- Standard-font compatibility modules and exports.
- Bundled font files from the npm artifact.
- Legacy VFS/font generation scripts and `build-vfs.js`.
- The temporary custom Node build script after migration to `tsdown`.
- CommonJS interop source modules and all maintained `require()`/`module.exports` code under `src/`.
- Mocha, custom runners, Blanket metadata, `.npmignore` and obsolete package metadata.
- Empty TODO test declarations and the parallel root unit-test tree.
- The production default VFS singleton.

### Security

- Added opt-in local-file and external-URL access policies to every independently configured instance.
- Applied URL policy checks before requests and around redirects where the runtime exposes the destination.
- Isolated downloaded resources by normalized request headers.
- Validated local filesystem access before fonts, images and attachments are opened.
- Replaced the playground server with a minimal traversal-protected static server.
- Prevented caller mutation from changing resources or options during asynchronous generation.
- Limited npm publication to `dist`, README, changelog and license files.
- Added build, declaration, consumer and size checks before package publication.

### Validation

The 0.4.0 release is validated by:

- clean production builds without a pre-existing `dist/` directory;
- Node.js ESM and CommonJS generation;
- browser ESM generation;
- strict production and test type-checking;
- autonomous Node.js declarations without DOM or PDFKit ambient requirements;
- ESLint and Prettier;
- unit and integration tests;
- package-consumer tests;
- Playwright/Chromium tests with real PDF generation;
- coverage thresholds enforced in CI;
- raw, gzip and unpacked size budgets;
- npm tarball content inspection;
- `git diff --check`.

### pdfmake 0.3.11 capabilities retained

The starting baseline already included, and PDFCraft 0.4.0 retains, the following major pdfmake 0.3.11 capabilities:

- PDFKit 0.19.1 integration;
- text, styles, columns, ordered and unordered lists;
- tables, headers, row spans, column spans and configurable layouts;
- images, SVG, QR codes, vectors, patterns and gradients;
- headers, footers, backgrounds, watermarks and page-break callbacks;
- snaking columns and vertical table-cell alignment;
- table of contents, page references, text references, outlines and bookmarks;
- document sections with inheritable page properties;
- attachments, embedded files and PDF/A-related options;
- permissions, encryption, metadata, language and tagged PDF options;
- local-file and URL resource loading;
- browser `SVGElement` support and SVG validation;
- promise-based output methods.

[Unreleased]: https://github.com/kevinljws/pdfcraft/compare/v0.4.4...HEAD
[0.4.4]: https://github.com/kevinljws/pdfcraft/compare/38fde05...v0.4.4
[0.4.3]: https://github.com/kevinljws/pdfcraft/compare/2ad9737...38fde05
[0.4.2]: https://github.com/kevinljws/pdfcraft/compare/9988960...2ad9737
[0.4.1]: https://github.com/kevinljws/pdfcraft/compare/v0.4.0...9988960
[0.4.0]: https://github.com/kevinljws/pdfcraft/releases/tag/v0.4.0
