# mio-previewer

一个针对流式更新优化的小型 Vue 3 Markdown 预览器。渲染流程为：Markdown -> HTML -> htmlparser2 AST，然后将 AST 渲染为 Vue VNode。项目提供可选的模块 Worker（`public/parser.worker.js`）以将 Markdown 解析卸载到主线程之外。

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

## 插件 API（如何扩展渲染）

`RecursiveRenderer` 接受一个 `plugins` 数组。每个插件是一个对象，包含两个函数：

- `test(node) => boolean` — 当插件应处理该节点时返回 `true`。
- `render(node, renderChildren, h) => VNode` — 返回节点对应的 VNode（或 string）。`renderChildren()` 返回已渲染的子节点数组。

示例（在 `MdRenderer.vue` 中的 CursorPlugin）：

```js
const CursorPlugin = {
  test: node => node.type === 'component' && node.name === 'cursor',
  render: (node, renderChildren, h) => h(BlinkingCursor, node.attribs || {})
}
```

如需支持 mermaid、plantuml 或自定义组件渲染，可以实现相应插件并通过 `:plugins="[MyPlugin]"` 传入 `RecursiveRenderer`。

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

如需我继续：
- 添加示例插件（例如 mermaid）、
- 用真实 `@types/*` 替换临时 shim 并运行 `vue-tsc`，或
- 添加单元测试。

告诉我你希望下一步做什么，我会继续并更新 todo 状态。
