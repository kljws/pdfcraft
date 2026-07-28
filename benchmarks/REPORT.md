# PDFCraft benchmark report

- Profile: `standard`
- Node: `v22.23.1`
- Iterations: 3
- Warmup: 1
- Created: 2026-07-28T08:47:47.006Z
- Runtime: Apple M5 Pro · 15 CPUs · darwin/arm64

| Scenario | Workload | Median ms | P95 ms | RSS MiB | Heap MiB | Output MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| pages-100 | 100 explicit pages | 56.5 | 67.4 | 1.8 | 22.2 | 0.2 |
| pages-500 | 500 explicit pages | 226.7 | 228.5 | 5.0 | 36.7 | 0.7 |
| pages-1000 | 1,000 explicit pages | 415.3 | 417.7 | 3.6 | 56.9 | 1.4 |
| table-2000-rows | 2,000 rows × 6 columns | 234.7 | 258.4 | 1.8 | 42.8 | 0.4 |
| media-heavy | 40 JPEG placements + 20 SVGs × 500 shapes | 327.6 | 332.7 | 8.1 | 34.3 | 1.3 |
| concurrent-generation | 8 concurrent documents × 100 pages | 389.1 | 390.7 | 5.7 | 59.3 | 1.2 |
| concurrent-10x3 | 10 concurrent documents × 3 pages | 99.5 | 99.9 | 0.8 | 26.3 | 0.2 |
