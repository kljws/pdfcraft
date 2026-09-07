# SVG-to-PDFKit fork

This directory contains the MIT-licensed SVG-to-PDFKit 0.1.8 renderer maintained locally by
PDFCraft. The original `source.js` had SHA-256
`35a3a8ca96712459f3d9ee0878cb40f7e50c679161f39963202714b6cf7c8ea6` before its mechanical
module split.

The rendering algorithms remain grouped by their original responsibilities:

- `renderer/context.ts` creates isolated state for each render and installs renderer modules.
- `renderer/pdfkit` owns low-level PDFKit operations.
- `renderer/parsing`, `renderer/xml`, `renderer/css`, `renderer/geometry` and `renderer/text` own reusable helpers.
- `renderer/elements` owns base, container, shape, paint and text SVG elements.
- `svg-to-pdfkit.ts` normalizes options and orchestrates one render.

All renderer modules use TypeScript and ESM. Public inputs, per-render state and the shared string
parser are strictly typed. Legacy rendering algorithms retain file-level type-check suppression so
their JavaScript-to-TypeScript migration does not silently change upstream behavior; these modules
remain isolated behind the typed renderer context.

The module split replaces closure captures with properties on a per-render context. Do not move
mutable colors, caches, links, style rules or PDFKit state to module-level singletons: concurrent
documents must remain isolated.

Upstream: <https://github.com/alafr/SVG-to-PDFKit>
