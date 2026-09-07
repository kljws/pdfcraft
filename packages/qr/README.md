# @pdfcraft/qr

QR code extension for PDFCraft.

Installing this package adds the `qr` document-node type. Register the extension before generating
documents containing QR nodes.

```typescript
import { qrExtension } from "@pdfcraft/qr";

pdfcraft.addExtensions(qrExtension);
```
