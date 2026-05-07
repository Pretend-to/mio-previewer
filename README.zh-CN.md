### mio-previewer

[English](./README.md) | 中文文档

一个专门为 **AI 流式对话 (Streaming Responses)** 设计的 Vue 3 Markdown 渲染引擎。它将标准的 Markdown 文本转换为可响应的 Vue VNode 树，利用 Vue 的 Diff 算法实现丝滑的增量 DOM 更新，彻底规避 `v-html` 带来的性能抖动和状态丢失。

✨ **核心价值：**

- ⚡️ **基于 VNode 的增量渲染**：打破了 `v-html` “全量销毁再重建”的魔咒。通过将 AST 映射为 VNode，在流式更新时仅更新末尾变化的文本节点，实现 O(1) 级的局部 DOM 操作。
- 🧩 **组件化拦截 (Component Interception)**：能够精准拦截 Markdown 标记（如代码块、数学公式、图表），并将其替换为功能完备的交互式 Vue 组件，而非死板的静态 HTML。
- 🌊 **极致流式体验**：内置智能光标追踪和防抖渲染算法，确保 AI 在逐字吐出内容时，页面视觉稳定、不抖动、不闪烁。
- 🛡 **内核级安全**：由于采用 AST 转换而非直接字符串注入，天然物理隔离了 XSS 攻击风险。

## 安装

```bash
npm install mio-previewer
# 或
pnpm add mio-previewer
# 或
yarn add mio-previewer
```

## 快速开始

### 基础用法

```vue
<template>
  <MdRenderer :md="markdown" />
</template>

<script setup>
impor## 浏览器支持

- Chrome/Edge: 最新 2 个版本
- Firefox: 最新 2 个版本
- Safari: 最新 2 个版本

## 文档

📚 **[完整文档 →](./docs/README.md)**

### 快速链接
- [内置插件配置指南](./PLUGINS.zh-CN.md) - 所有内置插件的配置 Schema
- [插件系统指南](./docs/PLUGINS.md) - 完整的插件系统开发文档
- [自定义代码块样式](./docs/CUSTOMIZE_CODEBLOCK_STYLE.md) - 代码块主题定制
- [KaTeX 配置](./docs/KATEX_DELIMITERS.md) - 数学公式设置
- [更新日志](./CHANGELOG.md) - 版本历史

## 许可证

MIT

## 链接

- [GitHub 仓库](https://github.com/Pretend-to/mio-previewer)
- [npm 包](https://www.npmjs.com/package/mio-previewer)
- [文档中心](./docs/README.md)
vue'
import { MdRenderer } from 'mio-previewer'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = ref('# Hello World\n\n这是 **Markdown** 渲染!')
</script>
```

### 流式模式

适用于 AI 聊天机器人或实时内容展示：

```vue
<template>
  <MdRenderer :md="streamContent" :isStreaming="isStreaming" />
</template>

<script setup>
import { ref } from "vue";
import { MdRenderer } from "mio-previewer";
import "mio-previewer/dist/mio-previewer.css";

const streamContent = ref("");
const isStreaming = ref(true);

// 模拟流式输出
const text = "# 流式演示\n\n内容**逐步**出现...";
let index = 0;

const interval = setInterval(() => {
  if (index < text.length) {
    streamContent.value += text[index++];
  } else {
    isStreaming.value = false;
    clearInterval(interval);
  }
}, 50);
</script>
```

## 插件系统

### 使用内置插件

#### 数学公式（KaTeX）

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { katexPlugin } from 'mio-previewer/plugins/markdown-it'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = \`
# 数学示例

行内公式：$E = mc^2$

块级公式：
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
\`

const markdownItPlugins = [
  { plugin: katexPlugin }
]
</script>

<template>
  <MdRenderer :md="markdown" :markdownItPlugins="markdownItPlugins" />
</template>
```

#### 警告框

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { AlertPlugin } from 'mio-previewer/plugins/markdown-it'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = \`
::: info
这是一个支持 **Markdown** 的 **info** 警告框！
:::

::: warning
⚠️ 警告信息
:::

::: error
❌ 错误信息
:::

::: success
✅ 成功信息
:::
\`

const markdownItPlugins = [
  { plugin: AlertPlugin }
]
</script>

<template>
  <MdRenderer :md="markdown" :markdownItPlugins="markdownItPlugins" />
</template>
```

#### 代码高亮

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { CodeBlockPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = \`
\\\`\\\`\\\`javascript
function hello() {
  console.log('Hello World!')
}
\\\`\\\`\\\`

\\\`\\\`\\\`python
def greet():
    print("你好，世界！")
\\\`\\\`\\\`
\`

const customPlugins = [CodeBlockPlugin]
</script>

<template>
  <MdRenderer :md="markdown" :customPlugins="customPlugins" />
</template>
```

#### Mermaid 图表

```vue
<script setup>
import { MdRenderer } from 'mio-previewer'
import { mermaidPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = \`
\\\`\\\`\\\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[继续]
    B -->|否| D[停止]
\\\`\\\`\\\`
\`

const customPlugins = [mermaidPlugin]
</script>

<template>
  <MdRenderer :md="markdown" :customPlugins="customPlugins" />
</template>
```

#### Emoji 表情

```vue
<script setup>
import { MdRenderer } from "mio-previewer";
import { EmojiPlugin } from "mio-previewer/plugins/custom";
import "mio-previewer/dist/mio-previewer.css";

const markdown = "你好 :smile: 欢迎！ :tada: :rocket:";

const customPlugins = [EmojiPlugin];
</script>

<template>
  <MdRenderer :md="markdown" :customPlugins="customPlugins" />
</template>
```

### 完整示例（使用所有插件）

```vue
<script setup>
import { ref } from 'vue'
import { MdRenderer } from 'mio-previewer'
import { AlertPlugin, katexPlugin } from 'mio-previewer/plugins/markdown-it'
import { mermaidPlugin, CodeBlockPlugin, EmojiPlugin } from 'mio-previewer/plugins/custom'
import 'mio-previewer/dist/mio-previewer.css'

const markdown = ref(\`# 完整演示 :rocket:

## 警告框
::: info
这是**重要**信息！
:::

## 数学公式
行内：$E = mc^2$

块级：$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

## 代码
\\\`\\\`\\\`javascript
console.log('你好，世界！')
\\\`\\\`\\\`

## 图表
\\\`\\\`\\\`mermaid
graph LR
    A --> B --> C
\\\`\\\`\\\`

做得好！ :thumbsup: :100:
\`)

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

### 创建自定义插件

#### 自定义渲染插件

```javascript
const HighlightPlugin = {
  name: "highlight",
  priority: 50,
  test: (node) => {
    return node.type === "tag" && node.name === "mark";
  },
  render: (node, renderChildren, h) => {
    return h(
      "mark",
      {
        style: {
          backgroundColor: "#ffeb3b",
          padding: "2px 4px",
          borderRadius: "2px",
        },
      },
      renderChildren(),
    );
  },
};

// 使用插件
const customPlugins = [HighlightPlugin];
```

#### 自定义 Markdown-it 插件

```javascript
function customContainerPlugin(md) {
  md.use(require("markdown-it-container"), "note", {
    render: (tokens, idx) => {
      if (tokens[idx].nesting === 1) {
        return '<div class="note">\n';
      } else {
        return "</div>\n";
      }
    },
  });
}

const markdownItPlugins = [{ plugin: customContainerPlugin }];
```

## API 参考

### MdRenderer 属性

| 属性                  | 类型                         | 默认值    | 说明                   |
| --------------------- | ---------------------------- | --------- | ---------------------- |
| \`md\`                | \`string\`                   | \`''\`    | 要渲染的 Markdown 内容 |
| \`isStreaming\`       | \`boolean\`                  | \`false\` | 流式模式时显示光标     |
| \`useWorker\`         | \`boolean\`                  | \`false\` | 使用 Web Worker 解析   |
| \`customPlugins\`     | \`CustomPlugin[]\`           | \`[]\`    | 自定义渲染插件         |
| \`markdownItPlugins\` | \`MarkdownItPluginConfig[]\` | \`[]\`    | Markdown-it 插件       |
| \`markdownItOptions\` | \`object\`                   | \`{}\`    | Markdown-it 配置选项   |

### 插件类型

#### CustomPlugin

```typescript
interface CustomPlugin {
  name?: string;
  priority?: number; // 数字越大优先级越高
  test: (node: ASTNode) => boolean;
  render: (
    node: ASTNode,
    renderChildren: () => VNode[],
    h: typeof import("vue").h,
  ) => VNode | string | null;
}
```

#### MarkdownItPluginConfig

```typescript
interface MarkdownItPluginConfig {
  plugin: (md: MarkdownIt, options?: any) => void;
  options?: any;
}
```

## 内置插件

### Markdown-it 插件（语法）

| 插件            | 导入路径                              | 说明                                    |
| --------------- | ------------------------------------- | --------------------------------------- |
| \`AlertPlugin\` | \`mio-previewer/plugins/markdown-it\` | 警告框（info、warning、error、success） |
| \`katexPlugin\` | \`mio-previewer/plugins/markdown-it\` | KaTeX 数学公式                          |

### 自定义插件（渲染）

| 插件                | 导入路径                         | 说明             |
| ------------------- | -------------------------------- | ---------------- |
| \`mermaidPlugin\`   | \`mio-previewer/plugins/custom\` | Mermaid 图表渲染 |
| \`CodeBlockPlugin\` | \`mio-previewer/plugins/custom\` | Prism 语法高亮   |
| \`EmojiPlugin\`     | \`mio-previewer/plugins/custom\` | Emoji 代码替换   |

## 高级用法

### Markdown-it 配置

```vue
<script setup>
const markdownItOptions = {
  html: true, // 启用 HTML 标签
  linkify: true, // 自动转换 URL
  typographer: true, // 智能引号、破折号
  breaks: false, // 将 \n 转换为 <br>
};
</script>

<template>
  <MdRenderer :md="markdown" :markdownItOptions="markdownItOptions" />
</template>
```

### Web Worker 模式

处理大文档时获得更好的性能：

```vue
<template>
  <MdRenderer :md="largeMarkdown" :useWorker="true" />
</template>
```

**注意：** Worker 模式需要 \`public/parser.worker.js\` 文件可访问。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建库
pnpm build

# 运行基准测试
pnpm benchmark
```

## 项目结构

```
mio-previewer/
├── src/
│   ├── MdRenderer.vue           # 主渲染器组件
│   ├── components/
│   │   ├── RecursiveRenderer.vue # AST 到 VNode 渲染器
│   │   ├── BlinkingCursor.vue   # 流式光标
│   │   └── CodeBlock.vue        # 代码高亮
│   ├── plugins/
│   │   ├── AlertPlugin.ts       # 警告框
│   │   ├── katexPlugin.ts       # 数学公式
│   │   ├── mermaidPlugin.ts     # 图表
│   │   ├── CodeBlockPlugin.ts   # 语法高亮
│   │   └── EmojiPlugin.ts       # Emoji 支持
│   └── index.ts                 # 库入口
├── public/
│   └── parser.worker.js         # 可选 Web Worker
└── docs/                        # 文档
```

## 浏览器支持

- Chrome/Edge：最新 2 个版本
- Firefox：最新 2 个版本
- Safari：最新 2 个版本

## 许可证

MIT

## 相关链接

- [GitHub 仓库](https://github.com/Pretend-to/mio-previewer)
- [npm 包](https://www.npmjs.com/package/mio-previewer)
- [插件指南](./docs/PLUGIN_GUIDE.md)
- [更新日志](./CHANGELOG.md)
