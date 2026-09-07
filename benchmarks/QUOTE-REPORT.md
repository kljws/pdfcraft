# PDFCraft benchmark report

- Profile: `standard`
- Node: `v22.23.1`
- Iterations: 3
- Warmup: 1
- Created: 2026-09-07T07:38:49.565Z
- Runtime: Apple M5 Pro · 15 CPUs · darwin/arm64

| Scenario | Workload | Median ms | P95 ms | RSS MiB | Heap MiB | Output MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| quote-concurrent-1 | 1 concurrent quote from quote.js | 18.9 | 23.5 | 2.5 | 10.0 | 0.0 |
| quote-concurrent-10 | 10 concurrent quotes from quote.js | 135.3 | 146.9 | 1.9 | 42.9 | 0.3 |
| quote-concurrent-100 | 100 concurrent quotes from quote.js | 1212.0 | 1215.2 | 1.1 | 348.0 | 3.0 |
