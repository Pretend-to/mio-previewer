# mio-previewer

A small Vue 3 markdown previewer optimized for streaming updates. It
converts Markdown -> HTML -> htmlparser2 AST and renders the AST to Vue
VNode with a tiny recursive renderer. There's an optional module Worker
(`public/parser.worker.js`) that can handle Markdown parsing off the main

This project is also configured to be published as an npm library (see
`package.json` scripts). The library exposes a named export `MdRenderer`
from the package root (import { MdRenderer } from 'mio-previewer').
## Quick start

Prerequisites: Node 18+ recommended, pnpm (or npm/yarn).

Install dependencies:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Open http://localhost:5173/ to view the live preview.

Build for production:

```bash
pnpm build
pnpm preview
```

Install the package (after publishing or using a local install):

```bash
# from npm (when published)
pnpm add mio-previewer

# or install from a local folder
pnpm add /path/to/mio-previewer
```

Usage example (consumer project with Vue 3):

```js
import { createApp } from 'vue'
import { MdRenderer } from 'mio-previewer'
import 'github-markdown-css/github-markdown.css'

const app = createApp({})
app.component('MdRenderer', MdRenderer)
app.mount('#app')
```

Notes for bundlers and consumers
- `vue` is marked as external in the library bundle. Add `vue@^3` to
	your project's dependencies (or peerDependencies) when publishing.
- Types are emitted to `dist/types` during build; the package `types`
	field points to the generated declaration file.

Publishing checklist
- Ensure `package.json` has `name`, `version`, `description`, `repository`,
	and `peerDependencies: { "vue": "^3" }` (recommended).
- Run `pnpm run build` (this runs the lib build and emits types).
- Publish with `pnpm publish --access public` (or use CI automation).
## Project overview

- `src/MdRenderer.vue` — core component. Accepts props `md` (string),
	`isStreaming` (boolean) and `useWorker` (boolean). Handles parsing,
	streaming-friendly incremental updates, and manages a special cursor
	component node while streaming.
- `src/components/RecursiveRenderer.vue` — recursively renders the
	htmlparser2 AST to Vue VNodes. Supports a `plugins` array where each
	plugin is `{ test, render }`.
- `src/components/BlinkingCursor.vue` — small visual cursor used during
	streaming.
- `public/parser.worker.js` — (optional) module Worker. When enabled
	(`useWorker`), `MdRenderer` posts `{ markdownText }` and expects a
	response `{ ast }` where `ast` matches `parseDocument(html).children`.

## Streaming behavior and cursor management

This project supports two modes:

- Non-streaming: `isStreaming=false` — Markdown is fully re-parsed on
	each update.
- Streaming: `isStreaming=true` — updates are treated as incremental
	chunks. `MdRenderer` will try a cheap append-to-last-text-node
	optimization for simple text chunks, otherwise it falls back to
	re-parsing the entire Markdown.

While streaming, a special AST node `{ type: 'component', name: 'cursor' }
` is inserted at the end of the AST to render the `BlinkingCursor`. The
helper `manageCursor(ast, 'add'|'remove')` handles insertion/removal.

## Plugin System

mio-previewer provides a powerful two-tier plugin system:

### 1. Markdown-it Plugins (Syntax Extension)

Extend Markdown syntax by using standard markdown-it plugins:

```js
import { MdRenderer } from 'mio-previewer'
import markdownItSub from 'markdown-it-sub'
import markdownItSup from 'markdown-it-sup'

const markdownItPlugins = [
  { plugin: markdownItSub },
  { plugin: markdownItSup, options: { /* plugin options */ } }
]

// Use in component
<MdRenderer 
  :md="text"
  :markdownItPlugins="markdownItPlugins"
  :markdownItOptions="{ html: true, linkify: true }"
/>
```

### 2. Custom Plugins (Rendering Extension)

Create custom renderers for specific AST nodes:

```js
import { AlertPlugin, EmojiPlugin } from 'mio-previewer'

// Built-in plugins
const customPlugins = [AlertPlugin, EmojiPlugin]

// Or create your own
const MyPlugin = {
  name: 'my-plugin',
  priority: 50,  // Higher priority executes first
  test: (node) => node.type === 'tag' && node.name === 'custom',
  render: (node, renderChildren, h) => {
    return h('div', { class: 'my-custom' }, renderChildren())
  }
}

<MdRenderer :md="text" :customPlugins="[MyPlugin, ...customPlugins]" />
```

### Built-in Plugins

- **AlertPlugin**: Renders custom alert boxes with types (info, warning, error, success)
- **EmojiPlugin**: Converts emoji codes like `:smile:` → 😊

### Plugin Priority

Plugins are executed in priority order (higher first). Built-in CursorPlugin has priority 100.

**Recommended ranges:**
- 100+: System plugins
- 50-99: High priority (containers, alerts)
- 10-49: Medium priority (icons, badges)
- 0-9: Low priority (text processing, emoji)

### Documentation

See [Plugin Guide](./docs/PLUGIN_GUIDE.md) for detailed documentation, examples, and best practices.

### Demo

Run the plugin demo:
```bash
pnpm dev
# Open http://localhost:5173/plugin-demo.html
```

## Plugin API (Legacy - for backwards compatibility)

`RecursiveRenderer` accepts a `plugins` array. Each plugin must be an
object with two properties:

- `test(node) => boolean` — return `true` when the plugin should handle
	this node.
- `render(node, renderChildren, h) => VNode` — return a VNode (or
	string) for the node. `renderChildren()` returns an array of rendered
	children.

Example (cursor plugin in `MdRenderer.vue`):

```js
const CursorPlugin = {
	test: node => node.type === 'component' && node.name === 'cursor',
	render: (node, renderChildren, h) => h(BlinkingCursor, node.attribs || {})
}
```

To add custom component rendering (mermaid, custom tags, etc.), create
a plugin and pass it to `RecursiveRenderer` via `:plugins="[MyPlugin]"`.

## Worker contract

When `useWorker` is `true`, `MdRenderer` creates a module Worker with:

```js
worker = new Worker(new URL('/parser.worker.js', import.meta.url), { type: 'module' })
worker.postMessage({ markdownText: newMd })
// worker should respond with: postMessage({ ast })
```

The `ast` must be the same shape as `parseDocument(html).children` so
that `RecursiveRenderer` can consume it directly.

## TypeScript migration notes

This repo was migrated progressively to TypeScript. To keep the
conversion low-risk, a temporary `src/types-shims.d.ts` provides minimal
module declarations. Recommended next steps to tighten types:

```bash
pnpm add -D vue-tsc @types/htmlparser2 @types/markdown-it
npx vue-tsc --noEmit
```

Then replace the shim declarations with real types from the installed
packages.

## Development tips

- To debug AST output, add a `console.log(parseDocument(html).children)`
	in `MdRenderer.vue` before assigning `ast` — this helps inspect node
	shapes for plugin writing.
- If you change streaming logic, ensure `manageCursor` is called to
	preserve cursor visibility during incremental updates.

## Files of interest

- `src/MdRenderer.vue` — main parsing & streaming logic
- `src/components/RecursiveRenderer.vue` — renderer & plugin system
- `src/components/BlinkingCursor.vue` — streaming cursor
- `public/parser.worker.js` — optional worker parsing contract

If you want, I can:
- add example plugins (e.g. mermaid integration),
- replace the temporary type shims with real `@types/*` packages and
	run `vue-tsc`, or
- add unit tests for the renderer.

Feedback or preferences? Tell me which of the next steps you'd like
me to take.
