# mio-previewer

[English](./README.md) | 中文文档

一个针对流式更新优化的小型 Vue 3 Markd## 流式行为与光标管理

`isStreaming` prop 控制是否在渲染内容末尾显示闪烁的光标：

- `isStreaming=false` — 不显示光标。用于静态内容或流式更新已结束的情况。
- `isStreaming=true` — 在末尾显示闪烁光标，表示内容正在流式更新中。

当 `isStreaming` 为 `true` 时，会在 AST 末尾插入一个特殊节点 `{ type: 'component', name: 'cursor' }` 来渲染 `BlinkingCursor` 组件。辅助函数 `manageCursor(ast, 'add'|'remove')` 负责插入与移除该光标节点。渲染流程为：Markdown -> HTML -> htmlparser2 AST，然后将 AST 渲染为 Vue VNode。项目提供可选的模块 Worker（`public/parser.worker.js`）以将 Markdown 解析卸载到主线程之外。

本项目已配置为可发布的 npm 库（见 `package.json` 的脚本）。库从包根导出命名导出 `MdRenderer`（可通过 `import { MdRenderer } from 'mio-previewer'` 使用）。

## 快速开始

先决条件：建议使用 Node 18+，以及 pnpm（或 npm/yarn）。

安装依赖：

```bash
pnpm install
```

本项目已配置为可发布的 npm 库（见 `package.json` 的脚本）。库从包根导出命名导出 `MdRenderer`（可通过 `import { MdRenderer } from 'mio-previewer'` 使用）。

启动开发服务器：

```bash
pnpm dev
```

在浏览器打开 http://localhost:5173/ 以查看实时预览。

生产构建：

```bash
pnpm build
pnpm preview
```

安装库（发布后或本地安装）：

```bash
# 从 npm 安装（发布后）
pnpm add mio-previewer

# 或从本地目录安装
pnpm add /path/to/mio-previewer
```

使用示例（在 Vue 3 项目中）：

```js
import { createApp } from 'vue'
import { MdRenderer } from 'mio-previewer'
import 'github-markdown-css/github-markdown.css'

const app = createApp({})
app.component('MdRenderer', MdRenderer)
app.mount('#app')
```

注意事项
- 库打包时将 `vue` 标记为 external。发布时建议在你的 `package.json` 中加入 `peerDependencies: { "vue": "^3" }`，或在宿主项目中安装兼容的 Vue。
- 类型声明会输出到 `dist/types`，顶级 `types` 字段已指向生成的声明文件。

发布清单
- 确保 `package.json` 中包含 `name`、`version`、`description`、`repository` 等字段，并建议添加 `peerDependencies: { "vue": "^3" }`。
- 运行 `pnpm run build`（会生成 bundle 和类型声明）。
- 使用 `pnpm publish --access public` 发布，或在 CI 中自动化发布流程。

## 项目概览

- `src/MdRenderer.vue` — 核心组件。接收 `md`（字符串）、`isStreaming`（布尔）和 `useWorker`（布尔）三个 prop。负责解析、流式增量更新，以及在流式模式下管理特殊的光标组件节点。
- `src/components/RecursiveRenderer.vue` — 将 htmlparser2 的 AST 递归渲染为 Vue VNode。支持 `plugins` 数组（每个 plugin 为 `{ test, render }`）。
- `src/components/BlinkingCursor.vue` — 流式渲染时显示的光标组件。
- `public/parser.worker.js` —（可选）模块 Worker。当 `useWorker` 为 true 时，`MdRenderer` 会向 Worker 发送 `{ markdownText }` 并期望收到 `{ ast }`，其中 `ast` 的结构应与 `parseDocument(html).children` 一致。

## 流式行为与光标管理

该项目支持两种模式：

- 非流式（`isStreaming=false`）：每次更新都会对 Markdown 进行全量解析。
- 流式（`isStreaming=true`）：对更新按增量块处理。`MdRenderer` 对简单纯文本块会尝试“追加到最后文本节点”的快速路径优化；若发现新块包含 Markdown 语法（例如 `#`, `` ` ``, `*` 等），则退回到重解析整串的安全路径。

在流式模式下，代码会在 AST 末尾插入一个特殊节点 `{ type: 'component', name: 'cursor' }`，用于渲染 `BlinkingCursor`。辅助函数 `manageCursor(ast, 'add'|'remove')` 负责插入与移除该节点。

## 插件系统

mio-previewer 提供强大的双层插件系统：

### 1. Markdown-it 插件（语法扩展）

通过标准 markdown-it 插件扩展 Markdown 语法：

```js
import { MdRenderer } from 'mio-previewer'
import markdownItSub from 'markdown-it-sub'
import markdownItSup from 'markdown-it-sup'

const markdownItPlugins = [
  { plugin: markdownItSub },
  { plugin: markdownItSup, options: { /* 插件选项 */ } }
]

// 在组件中使用
<MdRenderer 
  :md="text"
  :markdownItPlugins="markdownItPlugins"
  :markdownItOptions="{ html: true, linkify: true }"
/>
```

### 2. 自定义插件（渲染扩展）

为特定 AST 节点创建自定义渲染器：

```js
import { AlertPlugin, EmojiPlugin } from 'mio-previewer'

// 内置插件
const customPlugins = [AlertPlugin, EmojiPlugin]

// 或创建自己的插件
const MyPlugin = {
  name: 'my-plugin',
  priority: 50,  // 更高优先级先执行
  test: (node) => node.type === 'tag' && node.name === 'custom',
  render: (node, renderChildren, h) => {
    return h('div', { class: 'my-custom' }, renderChildren())
  }
}

<MdRenderer :md="text" :customPlugins="[MyPlugin, ...customPlugins]" />
```

### 内置插件

- **AlertPlugin**：渲染自定义警告框，支持类型（info、warning、error、success）
- **EmojiPlugin**：将表情代码如 `:smile:` 转换为 😊
- **CodeBlockPlugin**：使用 Prism 语法高亮，支持复制和 HTML 预览按钮（20+ 种语言）
- **katexPlugin**：使用 KaTeX 渲染数学公式（支持 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 定界符）
- **mermaidPlugin**：使用 Mermaid 渲染图表（流程图、时序图、状态图、类图等），支持深色/浅色主题

### 插件优先级

插件按优先级顺序执行（优先级高的先执行）。内置 CursorPlugin 优先级为 100。

**推荐范围：**
- 100+：系统插件
- 50-99：高优先级（容器、警告框）
- 10-49：中优先级（图标、徽章）
- 0-9：低优先级（文本处理、表情）

### 文档

详细文档、示例和最佳实践请参见 [插件指南](./docs/PLUGIN_GUIDE.md)。

### 演示

运行插件演示：
```bash
pnpm dev
# 打开 http://localhost:5173/plugin-demo.html
```

## Worker 合约

当 `useWorker` 为 `true` 时，`MdRenderer` 会创建一个模块 Worker：

```js
worker = new Worker(new URL('/parser.worker.js', import.meta.url), { type: 'module' })
worker.postMessage({ markdownText: newMd })
// worker 应返回: postMessage({ ast })
```

返回的 `ast` 必须与 `parseDocument(html).children` 的结构保持一致，`RecursiveRenderer` 将直接消费该 AST。

## TypeScript 迁移说明

项目已逐步迁移为 TypeScript 风格。为降低迁移风险，仓库中添加了临时的 `src/types-shims.d.ts` 用于最小化类型声明噪声。建议的下一步：

```bash
pnpm add -D vue-tsc @types/htmlparser2 @types/markdown-it
npx vue-tsc --noEmit
```

安装真实类型后，可删除临时 shim 并进行更严格的类型检查。

## 开发建议

- 如需调试 AST 输出，可在 `MdRenderer.vue` 中分配 `ast` 前打印 `parseDocument(html).children`，方便为插件设计节点匹配器。
- 在更改流式逻辑时，注意调用 `manageCursor` 以在增量更新期间保持光标显示一致性。

## 关注文件

- `src/MdRenderer.vue` — 解析与流式逻辑
- `src/components/RecursiveRenderer.vue` — 渲染器与插件系统
- `src/components/BlinkingCursor.vue` — 用于流式的光标
- `public/parser.worker.js` — 可选的 worker 解析契约

## License

MIT
