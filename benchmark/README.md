Benchmark instructions

This folder contains a small browser benchmark harness to compare two rendering modes:

- `vhtml`: use `markdown-it` to convert markdown -> HTML and set `innerHTML` (simulates v-html)
- `incremental`: mount `MdRenderer` (mio-previewer) and set the `md` prop to render

How to run

1. Start the dev server in the project root:

   pnpm dev

2. In another terminal, run the runner which launches a headless browser and runs the benchmark:

   pnpm benchmark

Reports will be written to `benchmark/report-*.json` and `benchmark/report-all.json`.

Notes

- The runner attempts to use system Chrome/Chromium if available; otherwise Puppeteer-managed Chromium will be used.
- The benchmark page is `benchmark/benchmark.html` and the page script is `benchmark/bench.js`.
- You can also open the page in a visible browser and manually call `window.__mio_set_md__(text)` and `window.runBenchmark('vhtml')` or `window.runBenchmark('incremental')` from DevTools for ad-hoc testing.
