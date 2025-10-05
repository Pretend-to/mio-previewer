# mio-previewer

[中文文档](./README.zh-CN.md) | English

A Vue 3 markdown renderer optimized for streaming updates with powerful plugin system. Features real-time rendering, syntax highlighting, math formulas, diagrams, and more.

✨ **Key Features:**
- 🚀 Streaming-friendly real-time rendering
- 🎨 Built-in syntax highlighting (Prism.js, 20+ languages)
- 📐 Math formulas support (KaTeX)
- 📊 Diagram rendering (Mermaid)
- 🔌 Extensible plugin system
- 📦 Tree-shakeable & lightweight
- 🎯 TypeScript support

## Installation

```bash
npm install mio-previewer
# or
pnpm add mio-previewer
# or
yarn add mio-previewer
```

## Quick Start

### Basic Usage

```vue
<template>
  <MdRenderer :md="markdown" />
</template>

<script setup>
import { ref } from 'vue'
import { MdRenderer } from 'mio-previewer'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = ref('# Hello World\n\nThis is **markdown**!')
</script>
```

### Streaming Mode

Perfect for AI chatbots or real-time content:

```vue
<template>
  <MdRenderer 
    :md="streamContent" 
    :isStreaming="isStreaming" 
  />
</template>

<script setup>
import { ref } from 'vue'
import { MdRenderer } from 'mio-previewer'
import 'mio-previewer/dist/mio-previewer.css'

const streamContent = ref('')
const isStreaming = ref(true)

// Simulate streaming
const text = '# Streaming Demo\n\nContent appears **gradually**...'
let index = 0

const interval = setInterval(() => {
  if (index < text.length) {
    streamContent.value += text[index++]
  } else {
    isStreaming.value = false
    clearInterval(interval)
  }
}, 50)
</script>
```

## Plugin System

### Using Built-in Plugins

#### Math Formulas (KaTeX)

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { katexPlugin } from 'mio-previewer/plugins/markdown-it'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = `
# Math Example

Inline: $E = mc^2$

Block:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`

const markdownItPlugins = [
  { plugin: katexPlugin }
]
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :markdownItPlugins="markdownItPlugins" 
  />
</template>
```

#### Alert Boxes

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { AlertPlugin } from 'mio-previewer/plugins/markdown-it'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = `
::: info
This is an **info** alert with markdown support!
:::

::: warning
⚠️ Warning message
:::

::: error
❌ Error message
:::

::: success
✅ Success message
:::
`

const markdownItPlugins = [
  { plugin: AlertPlugin }
]
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :markdownItPlugins="markdownItPlugins" 
  />
</template>
```

#### Syntax Highlighting

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { CodeBlockPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = `
\`\`\`javascript
function hello() {
  console.log('Hello World!')
}
\`\`\`

\`\`\`python
def greet():
    print("Hello from Python!")
\`\`\`
`

const customPlugins = [CodeBlockPlugin]
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :customPlugins="customPlugins" 
  />
</template>
```

#### Mermaid Diagrams

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { mermaidPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = `
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Continue]
    B -->|No| D[Stop]
\`\`\`
`

const customPlugins = [mermaidPlugin]
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :customPlugins="customPlugins" 
  />
</template>
```

#### Emoji Support

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { EmojiPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = 'Hello :smile: Welcome! :tada: :rocket:'

const customPlugins = [EmojiPlugin]
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :customPlugins="customPlugins" 
  />
</template>
```

### Complete Example with All Plugins

```vue
<script setup>
import { ref } from 'vue'
import { MdRenderer } from 'mio-previewer'
import { AlertPlugin, katexPlugin } from 'mio-previewer/plugins/markdown-it'
import { mermaidPlugin, CodeBlockPlugin, EmojiPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = ref(`# Complete Demo :rocket:

## Alerts
::: info
This is **important** information!
:::

## Math
Inline: $E = mc^2$

Block: $$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

## Code
\`\`\`javascript
console.log('Hello World!')
\`\`\`

## Diagram
\`\`\`mermaid
graph LR
    A --> B --> C
\`\`\`

Great work! :thumbsup: :100:
`)

const customPlugins = [
  mermaidPlugin,
  CodeBlockPlugin,
  EmojiPlugin
]

const markdownItPlugins = [
  { plugin: AlertPlugin },
  { plugin: katexPlugin }
]
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :customPlugins="customPlugins"
    :markdownItPlugins="markdownItPlugins"
  />
</template>
```

### Creating Custom Plugins

#### Custom Rendering Plugin

```javascript
const HighlightPlugin = {
  name: 'highlight',
  priority: 50,
  test: (node) => {
    return node.type === 'tag' && 
           node.name === 'mark'
  },
  render: (node, renderChildren, h) => {
    return h('mark', {
      style: {
        backgroundColor: '#ffeb3b',
        padding: '2px 4px',
        borderRadius: '2px'
      }
    }, renderChildren())
  }
}

// Use it
const customPlugins = [HighlightPlugin]
```

#### Custom Markdown-it Plugin

```javascript
function customContainerPlugin(md) {
  md.use(require('markdown-it-container'), 'note', {
    render: (tokens, idx) => {
      if (tokens[idx].nesting === 1) {
        return '<div class="note">\n'
      } else {
        return '</div>\n'
      }
    }
  })
}

const markdownItPlugins = [
  { plugin: customContainerPlugin }
]
```

## API Reference

### MdRenderer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `md` | `string` | `''` | Markdown content to render |
| `isStreaming` | `boolean` | `false` | Show cursor during streaming |
| `useWorker` | `boolean` | `false` | Use Web Worker for parsing |
| `customPlugins` | `CustomPlugin[]` | `[]` | Custom rendering plugins |
| `markdownItPlugins` | `MarkdownItPluginConfig[]` | `[]` | Markdown-it plugins |
| `markdownItOptions` | `object` | `{}` | Markdown-it options |

### Plugin Types

#### CustomPlugin

```typescript
interface CustomPlugin {
  name?: string
  priority?: number  // Higher = earlier execution
  test: (node: ASTNode) => boolean
  render: (
    node: ASTNode,
    renderChildren: () => VNode[],
    h: typeof import('vue').h
  ) => VNode | string | null
}
```

#### MarkdownItPluginConfig

```typescript
interface MarkdownItPluginConfig {
  plugin: (md: MarkdownIt, options?: any) => void
  options?: any
}
```

## Built-in Plugins

### Markdown-it Plugins (Syntax)

| Plugin | Import Path | Description |
|--------|-------------|-------------|
| `AlertPlugin` | `mio-previewer/plugins/markdown-it` | Alert boxes (info, warning, error, success) |
| `katexPlugin` | `mio-previewer/plugins/markdown-it` | Math formulas with KaTeX |

### Custom Plugins (Rendering)

| Plugin | Import Path | Description |
|--------|-------------|-------------|
| `mermaidPlugin` | `mio-previewer/plugins/custom` | Diagram rendering with Mermaid |
| `CodeBlockPlugin` | `mio-previewer/plugins/custom` | Syntax highlighting with Prism |
| `EmojiPlugin` | `mio-previewer/plugins/custom` | Emoji code replacement |

## Advanced Usage

### Markdown-it Options

```vue
<script setup>
const markdownItOptions = {
  html: true,        // Enable HTML tags
  linkify: true,     // Auto-convert URLs
  typographer: true, // Smart quotes, dashes
  breaks: false      // Convert \n to <br>
}
</script>

<template>
  <MdRenderer 
    :md="markdown" 
    :markdownItOptions="markdownItOptions" 
  />
</template>
```

### Web Worker Mode

For better performance with large documents:

```vue
<template>
  <MdRenderer 
    :md="largeMarkdown" 
    :useWorker="true" 
  />
</template>
```

**Note:** Worker mode requires `public/parser.worker.js` to be accessible.

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build library
pnpm build

# Run benchmark
pnpm benchmark
```

## Project Structure

```
mio-previewer/
├── src/
│   ├── MdRenderer.vue           # Main renderer component
│   ├── components/
│   │   ├── RecursiveRenderer.vue # AST to VNode renderer
│   │   ├── BlinkingCursor.vue   # Streaming cursor
│   │   └── CodeBlock.vue        # Code highlighting
│   ├── plugins/
│   │   ├── AlertPlugin.ts       # Alert boxes
│   │   ├── katexPlugin.ts       # Math formulas
│   │   ├── mermaidPlugin.ts     # Diagrams
│   │   ├── CodeBlockPlugin.ts   # Syntax highlighting
│   │   └── EmojiPlugin.ts       # Emoji support
│   └── index.ts                 # Library entry
├── public/
│   └── parser.worker.js         # Optional Web Worker
└── docs/                        # Documentation
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions  
- Safari: Latest 2 versions

## Documentation

📚 **[Complete Documentation →](./docs/README.md)**

### Quick Links
- [Plugin System Guide](./docs/PLUGINS.md) - Complete plugin system documentation
- [Customize Code Block Styles](./docs/CUSTOMIZE_CODEBLOCK_STYLE.md) - Code block theming
- [KaTeX Configuration](./docs/KATEX_DELIMITERS.md) - Math formula setup
- [Changelog](./CHANGELOG.md) - Version history

## License

MIT

## Links

- [GitHub Repository](https://github.com/Pretend-to/mio-previewer)
- [npm Package](https://www.npmjs.com/package/mio-previewer)
- [Documentation Center](./docs/README.md)

