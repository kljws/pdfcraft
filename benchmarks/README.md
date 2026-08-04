# Benchmarks

The benchmark suite generates real PDFs through the built Node.js package. Each scenario runs in a separate process so memory retained by a previous workload does not affect the next one.

## Workloads

- Explicit 100, 500 and 1,000-page documents.
- A 2,000-row × 6-column table with a repeating header.
- A media-heavy document containing 40 JPEG placements and 20 SVGs with 500 shapes each.
- Eight concurrently generated 100-page documents using isolated PDFCraft instances.
- The real `playground/shared/samples/quote.js` document generated 1, 10 and 100 times concurrently in one Node.js process. This includes its PDF/A-3 metadata, embedded Figtree font subsets, image and Factur-X attachment.

The quick profile uses smaller workloads and one iteration. It verifies the runner; it is not a performance baseline.

## Commands

```sh
npm run benchmark
npm run benchmark:quick
npm run benchmark:quote
```

The standard profile performs one warmup and three measured iterations per scenario. Override these values or select one workload when investigating a change:

```sh
node benchmarks/run.mjs --iterations=5 --warmup=1 --scenario=pages-1000
node benchmarks/run.mjs --quick --output=/tmp/pdfcraft-benchmark.json
node benchmarks/run.mjs --scenario=quote-concurrent-1,quote-concurrent-10
```

`--scenario` accepts one name or a comma-separated list. `--report` can write the Markdown table to a dedicated path instead of replacing `benchmarks/REPORT.md`. The quote command uses `benchmarks/QUOTE-REPORT.md`.

Concurrent scenarios use `Promise.all()` inside one process. They measure multiple in-flight generations and shared-process memory pressure, not parallel execution across worker threads or CPU cores.

Use the same Node.js version, machine, power mode and background workload when comparing results. Compare the median duration and peak-memory deltas; absolute numbers from different machines are not directly comparable.

Peak memory is sampled every 5 ms and reported as the increase over the process baseline. The JSON report includes every raw sample and runtime metadata for later comparison.
