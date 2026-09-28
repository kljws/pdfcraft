# @pdfcraft/browser

Browser package for PDFCraft. It is one self-contained ESM bundle with no runtime dependencies:
the PDFCraft core, the browser output and PDFKit's standalone build.

```typescript
import pdfcraft from "@pdfcraft/browser";
```

Output documents add `getBlob()`, `download(filename)`, `open(window)` and `print(window)` to the
common `getBuffer()`, `getBase64()`, `getDataUrl()` and `getPageInfo()`.

## Bundled PDFKit

The shared core code imports `pdfkit`; this package's build aliases that import to
`pdfkit/js/pdfkit.standalone.js` (see `tsdown.config.mts`). That keeps the large standalone build
out of `@pdfcraft/core`, so Node.js applications never load it. The minified bundle has a byte
budget in `size-budget.json`, checked by the repository test suite.

Install and register `@pdfcraft/qr` or `@pdfcraft/svg` only when those document nodes are needed.

See the [PDFCraft repository](https://github.com/kljws/pdfcraft) for documentation, the
[styling guide](https://github.com/kljws/pdfcraft/blob/main/docs/STYLING-GUIDE.md) and the
[changelog](./CHANGELOG.md).
