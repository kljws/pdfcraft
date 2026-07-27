# Manual visual checks

Generate the PDFs from the package root:

```sh
npm run visual:generate
```

The files are written to `private/pdfs/visual/`, which is ignored by Git. A different
directory can be selected without editing the script:

```sh
npm run visual:generate -- --output=/tmp/pdfcraft-visual
```

Open the seven PDFs in Preview, Acrobat or a browser. The red dashed rectangle
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

### `06-table-pagination-borders.pdf`

- In part A, every non-final table page ends with one 2 pt bottom border; it must not look doubled.
- The repeated blue header has its complete top and bottom borders on every page.
- The `Open edge` body cells retain no bottom or right border, including at page breaks; only the shared separator under a repeated header may cross that column.
- In part B, intermediate pages have no 3 pt closing border because `hLineWhenBroken` is disabled.
- Part B's single 3 pt bottom border appears only at the actual end of the table.

### `07-rounded-table-borders.pdf`

- The first table has four smooth outer corners while its internal separators remain straight.
- The blue header and green body fills stop cleanly at the rounded contour without square overflow.
- The native purple `stack` block has padding, one continuous rounded border and a matching background.
- Every paginated table fragment has four smooth corners, especially the bottom corners on the first page and top corners on the following page.

## Recording the result

Review each file at 100% and 200% zoom. Record the viewer and result, for
example:

```text
Preview 26.x — 7/7 pass
Chrome PDF viewer — 7/7 pass
Acrobat — 7/7 pass
```

If a check fails, include the PDF filename, viewer, zoom level and a screenshot.
This makes renderer bugs distinguishable from viewer-specific anti-aliasing.
