# Playgrounds

Both playgrounds use the shared document definition in `shared/` and the root
Roboto font files.

## Server

```sh
npm run playground:server
```

Open <http://localhost:1234>. The editor posts the document definition to `/pdf`,
where Node.js generates the preview.

## React browser

```sh
npm run playground:react
```

Open <http://localhost:1235>. React imports `pdfcraft/browser`; PDF generation
runs entirely in the browser.
