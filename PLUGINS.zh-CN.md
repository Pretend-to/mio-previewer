# 内置插件配置指南 (Built-in Plugins Configuration)

本文档详细介绍了 `mio-previewer` 内置插件的配置选项及其 Schema。

## 概览

所有自定义插件都可以在初始化 `RecursiveRenderer` 或使用 `MioPreviewer` 组件时通过 `plugins` 数组进行配置：

```ts
import { 
  codeBlockPlugin, 
  imageViewerPlugin, 
  mermaidPlugin 
} from 'mio-previewer';

const plugins = [
  {
    plugin: codeBlockPlugin,
    options: {
      // 插件配置项
    }
  },
  // ... 其他插件
];
```

---

## 1. 代码块插件 (codeBlockPlugin)

用于渲染代码块，支持语法高亮（Prism）、复制代码和 HTML 预览功能。

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `priority` | `number` | `70` | 插件优先级。 |
| `languageAliases` | `Record<string, string>` | `{}` | 自定义语言别名映射。例如 `{ js: 'javascript' }`。 |
| `publishUrl` | `string` | - | HTML 发布接口 URL，用于代码块的预览功能。 |
| `onPublished` | `(url: string) => void` | - | 代码发布成功后的回调函数。 |
| `cssUrl` | `string` | - | 可选的 Prism CSS 加载地址。 |

---

## 2. 图片查看器插件 (imageViewerPlugin)

为 Markdown 中的图片添加点击放大、旋转、缩放等预览功能（基于 Viewer.js）。

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `priority` | `number` | `50` | 插件优先级。 |
| `viewerOptions` | `any` | `{}` | [Viewer.js](https://github.com/fengyuanchen/viewerjs#options) 的原生配置选项。 |
| `crossOrigin` | `boolean` | `false` | 是否开启跨域支持。开启后，外部图片会添加 `crossorigin="anonymous"` 属性。 |

---

## 3. Mermaid 插件 (mermaidPlugin)

用于渲染 Mermaid 图表（流程图、时序图、甘特图等）。

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `priority` | `number` | `80` | 插件优先级（建议高于 `codeBlockPlugin` 以拦截 mermaid 代码块）。 |
| `theme` | `'default' \| 'dark' \| 'forest' \| 'neutral'` | - | Mermaid 的视觉主题。 |
| `cssUrl` | `string` | - | 可选的 Mermaid CSS 加载地址。 |

---

## 4. 闪烁光标插件 (cursorPlugin)

用于在流式输出（Streaming）过程中显示一个跟随内容的闪烁光标。

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `priority` | `number` | `100` | 插件优先级。 |
| `shape` | `'square' \| 'line' \| 'circle'` | `'square'` | 光标形状：方形、竖线或圆形。 |
| `color` | `string` | - | 光标颜色（CSS 颜色值，如 `#0066ff`）。 |

---

## 5. Emoji 插件 (emojiPlugin)

将文本中的 `:emoji_code:` 转换为对应的 Emoji 图标。

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `priority` | `number` | `10` | 插件优先级。 |
| `customEmojis` | `Record<string, string>` | `{}` | 自定义 Emoji 映射表。例如 `{ ':logo:': '🚀' }`。 |

**内置支持：**
`:smile:`, `:heart:`, `:fire:`, `:rocket:`, `:star:`, `:thumbsup:`, `:tada:`, `:check:`, `:cross:`, `:eyes:`, `:thinking:`, `:100:`。
