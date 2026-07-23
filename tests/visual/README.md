# Manual visual checks

Generate the PDFs from the package root:

```sh
npm run visual:generate
```

The files are written to `pdfs/visual/`, which is ignored by Git. A different
directory can be selected without editing the script:

```sh
npm run visual:generate -- --output=/tmp/pdfcraft-visual
```

Open the five PDFs in Preview, Acrobat or a browser. The red dashed rectangle
marks the usable content area. No table, border, text or canvas vector should
cross it unless the document explicitly says otherwise.

## Checklist

### `01-column-sizing.pdf`

- `AUTO LABEL` stays on one line and does not become needlessly narrow.
- Green star content receives the remaining width.
- The long bracket sequence wraps inside the purple cell.
- The table with three 130 pt columns remains inside the right red guide.
- The final two star cells have equal widths despite asymmetric content.
- No text is clipped, lost or drawn on top of another cell.

### `02-colspan-sizing.pdf`

- The blue `Units` column remains compact.
- The long green spanning row grows through the flexible provider area instead
  of widening `Units`.
- All eight header columns stay aligned with the data row.
- The spanning row and right table border remain inside the red guide.

### `03-compact-spans.pdf`

- `SUM` covers exactly the first four columns and `1.20` remains in column 5.
- The blue row-spanned cell covers column A across two rows.
- The green cell covers B–C and `3` remains visible in D.
- The orange cell covers B–D on the last row.
- There are no missing cells, duplicated borders or malformed blank columns.

### `04-row-heights.pdf`

- The document contains two pages.
- Rows 1 and 2 remain on page 1.
- Row 3 starts on page 2.
- No row border or fill crosses the bottom red guide.
- Page 2 does not start with an unexplained blank table fragment.

### `05-canvas-path-offset.pdf`

- One thin red line is centered inside one thick blue line.
- The blue path and red line start and end at exactly the same coordinates.
- No detached copy appears near the top-left page margin or page origin.

## Recording the result

Review each file at 100% and 200% zoom. Record the viewer and result, for
example:

```text
Preview 26.x — 5/5 pass
Chrome PDF viewer — 5/5 pass
Acrobat — 5/5 pass
```

If a check fails, include the PDF filename, viewer, zoom level and a screenshot.
This makes renderer bugs distinguishable from viewer-specific anti-aliasing.
