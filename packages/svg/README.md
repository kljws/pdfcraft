# @pdfcraft/svg

SVG extension for PDFCraft.

Installing this package adds the `svg` document-node type and document-level `svgs` resources.
Register the extension before generating documents containing SVG nodes.

```typescript
import { svgExtension } from "@pdfcraft/svg";

pdfcraft.addExtensions(svgExtension);
```
