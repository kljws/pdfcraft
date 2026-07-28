# PDFCraft benchmark report

- Profile: `standard`
- Node: `v22.23.1`
- Iterations: 3
- Warmup: 1
- Created: 2026-07-28T08:26:18.948Z
- Runtime: Apple M5 Pro · 15 CPUs · darwin/arm64

| Scenario | Workload | Median ms | P95 ms | RSS MiB | Heap MiB | Output MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| pages-100 | 100 explicit pages | 55.3 | 64.9 | 1.0 | 21.9 | 0.2 |
| pages-500 | 500 explicit pages | 227.0 | 230.9 | 4.4 | 32.8 | 0.7 |
| pages-1000 | 1,000 explicit pages | 415.9 | 428.8 | 3.5 | 54.9 | 1.4 |
| table-2000-rows | 2,000 rows × 6 columns | 241.2 | 242.3 | 1.4 | 45.8 | 0.4 |
| media-heavy | 40 JPEG placements + 20 SVGs × 500 shapes | 328.3 | 342.4 | 0.1 | 37.0 | 1.3 |
| concurrent-generation | 8 concurrent documents × 100 pages | 391.2 | 392.6 | 4.8 | 61.8 | 1.2 |
| concurrent-10x3 | 10 concurrent documents × 3 pages | 99.7 | 100.2 | 0.6 | 26.4 | 0.2 |
