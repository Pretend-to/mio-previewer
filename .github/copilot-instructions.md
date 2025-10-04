<!-- .github/copilot-instructions.md
Guidance for AI coding agents working on the `mio-previewer` repository.
Keep this file short (20–50 lines). Include only discoverable, actionable patterns.
-->

# Copilot / AI agent instructions — mio-previewer (concise)

Short goal: this repository is a small Vue 3 markdown previewer optimized for streaming updates. The renderer converts markdown -> HTML -> AST (via htmlparser2) and renders with a small recursive renderer. A Worker (`public/parser.worker.js`) can be used to offload parsing.

Key files
- `src/MdRenderer.vue`: core of markdown parsing, streaming incremental updates, cursor management, and optional Worker usage.
- `src/components/RecursiveRenderer.vue`: renders the htmlparser2 AST to Vue VNodes; supports `plugins` array with {test, render} plugin objects.
- `src/components/BlinkingCursor.vue`: used as the streaming cursor component via the Cursor plugin in `MdRenderer.vue`.
- `public/parser.worker.js`: optional module worker that accepts `{ markdownText }` and posts `{ ast }` (when used). (Worker URL created with `new URL('/parser.worker.js', import.meta.url)`.)
- `src/main.js`, `App.vue`: app bootstrap and a streaming demo that appends characters to `markdownStream`.
- `package.json`: project scripts (`dev`, `build`, `preview`) and dependencies (vue, markdown-it, htmlparser2).

Important project-specific patterns
- Streaming mode vs non-streaming: `MdRenderer` accepts `md` (string) and `isStreaming` (bool). In streaming mode, updates should be treated as incremental chunks. The code prefers to try cheap append-to-last-text-node optimizations but falls back to re-parsing the whole markdown when chunks contain markdown syntax.
- Cursor management: `manageCursor(ast, 'add'|'remove')` ensures a special component node `{type:'component', name:'cursor'}` is appended or removed. When `isStreaming` is true, add the cursor after parsing; remove it when stream ends.
- Plugin rendering API (used by `RecursiveRenderer`): plugins are objects { test: (node)=>boolean, render: (node, renderChildren, h)=>VNode }. `MdRenderer` provides a `CursorPlugin` example that renders `BlinkingCursor` when a component node has `name==='cursor'`.
- Worker contract: if `useWorker` is true, `MdRenderer` will create a module Worker and send `{ markdownText }`. The worker must respond with `{ ast }` where `ast` matches htmlparser2 `parseDocument(...).children` structure used by `RecursiveRenderer`.

Build / dev commands
- Start dev server: `pnpm dev` or `npm run dev` (package.json uses `vite`).
- Build production: `pnpm build` or `npm run build`.
- Preview build: `pnpm preview` or `npm run preview`.

Examples and implementation notes for agents
- To add a new streaming feature, prefer updating `MdRenderer.vue` parsing logic and `manageCursor` handling. See `watch(() => props.md, ...)` to follow streaming-friendly update flow.
- To add custom rendering (e.g., mermaid, custom components), implement a plugin and pass it to `RecursiveRenderer` via `:plugins="[MyPlugin]"`. Example test function: `node.type === 'component' && node.name === 'mycomp'` and render using `h(MyComp, node.attribs || {})`.
- To enable worker parsing by default, ensure `public/parser.worker.js` exports a module worker that listens for `onmessage` and posts `{ ast }` back; use same AST shape as `parseDocument(html).children`.

Do not make assumptions not present in code
- There is no server-side API or database in this repo. Focus changes on client-side components and the worker.

If anything in this file is unclear or you need more examples (worker message shape, AST samples, or tests), ask and I will add them.
