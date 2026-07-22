# Node.js examples

Build PDFCraft, then run an example from the package root:

```sh
npm run build
node examples/basics.js
node examples/recent-features.js
```

Generated documents are written to `pdfs/`. The shared setup restricts local
resource reads to this repository and disables remote downloads, so the examples
remain reproducible offline.
