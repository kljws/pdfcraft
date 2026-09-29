# @pdfcraft/factur-x

Factur-X helper for PDFCraft. It turns a document definition into a Factur-X invoice: PDF/A-3, the
CII XML embedded as `factur-x.xml`, and the Factur-X XMP metadata (`fx:` properties and their PDF/A
extension schema).

```typescript
import pdfcraft from "@pdfcraft/core";
import { withFacturX } from "@pdfcraft/factur-x";

const pdf = pdfcraft.createPdf(
	withFacturX({ content: ["Invoice F-2026-0042"] }, { xml: invoiceXml }),
);
```

`xml` is the CII invoice as a string or bytes, or a resource PDFCraft resolves like any other file
(`{ src: "./factur-x.xml" }`). The profile is read from the XML
(`GuidelineSpecifiedDocumentContextParameter/ID`); it can also be given as `profile`, and must be
when the XML is a resource.

| Profile | Attachment relationship |
|---|---|
| `MINIMUM`, `BASIC WL` | `Data` |
| `BASIC`, `EN 16931`, `EXTENDED` | `Alternative` |

`withFacturX` keeps the definition's own files and `xmpMetadata`, keeps a later PDF version and any
PDF/A-3 level, and rejects a non PDF/A-3 subset, an existing `factur-x.xml` file or an XML whose
profile differs from `profile`. It does not modify the definition.

This package does not generate the XML and does not validate it against the XSD or the EN 16931
Schematron: validate invoices with an external validator.

`facturXMetadata(profile)` and `detectFacturXProfile(xml)` are also exported. Requires
`@pdfcraft/core` 0.10 or later, which added `xmpMetadata`.
