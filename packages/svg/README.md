# @pdfcraft/svg

SVG extension for PDFCraft.

Installing this package adds the `svg` document-node type and document-level `svgs` resources.
Register the extension before generating documents containing SVG nodes.

```typescript
import { svgExtension, type SvgToPdfOptions } from "@pdfcraft/svg";

pdfcraft.addExtensions(svgExtension);

const options: SvgToPdfOptions = {
	preserveAspectRatio: "xMidYMid meet",
	precision: 3,
};
```

The package embeds the MIT-licensed SVG-to-PDFKit 0.1.8 renderer and its TypeScript declarations.
Consumers do not need separate `svg-to-pdfkit` or `@types/svg-to-pdfkit` dependencies.

Upstream implementation: [alafr/SVG-to-PDFKit](https://github.com/alafr/SVG-to-PDFKit).
