# Benchmark fixtures

This folder contains markdown fixtures for benchmarking the renderer.

Files:
- `complex.md` — a single document containing many Markdown features (tables, math, code blocks, nested lists, inline HTML, details, images). Good for feature-completeness tests.
- `long-medium.md` — a medium-length document (~few KB) with repeated sections and small code blocks.
- `long-large.md` — a large document (many repeated sections, code, lists) to stress parsing and rendering.

Usage:

1. Open `benchmark/benchmark.html` in the browser or via the dev server (e.g. `http://localhost:5173/benchmark/benchmark.html`).
2. In the UI, you can replace the input text with the contents of one of these fixtures to test different sizes and shapes.
3. To automate, modify `benchmark/runner.cjs` to fetch and load one of these fixture files before calling `window.runBenchmark(mode)`, or run the runner from the repo root and it will load the page which you can programmatically set to one of the fixtures.

Notes:
- These fixtures are intentionally synthetic and include repeated blocks to reach target sizes. They are meant for performance testing, not for semantic correctness tests.
