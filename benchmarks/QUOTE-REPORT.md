# PDFCraft benchmark report

- Profile: `standard`
- Node: `v22.23.1`
- Iterations: 3
- Warmup: 1
- Created: 2026-08-04T08:02:31.930Z
- Runtime: Apple M5 Pro · 15 CPUs · darwin/arm64

| Scenario | Workload | Median ms | P95 ms | RSS MiB | Heap MiB | Output MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| quote-concurrent-1 | 1 concurrent quote from quote.js | 23.4 | 30.0 | 2.6 | 9.7 | 0.0 |
| quote-concurrent-10 | 10 concurrent quotes from quote.js | 166.7 | 171.7 | 1.3 | 42.8 | 0.3 |
| quote-concurrent-100 | 100 concurrent quotes from quote.js | 1599.4 | 1634.8 | 5.7 | 321.7 | 3.0 |
