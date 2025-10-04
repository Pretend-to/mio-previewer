# Plugin System Guide

mio-previewer 提供了强大的插件系统,支持两种类型的插件:

## 1. Markdown-it 插件 (语法扩展)

这些插件在 markdown 解析阶段工作,用于扩展 markdown 语法。

### 基础使用示例

```typescript
import MarkdownIt from 'markdown-it';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';
import { MdRenderer } from 'mio-previewer';

const markdownItPlugins = [
  { plugin: markdownItSub },
  { plugin: markdownItSup },
  { 
    plugin: somePlugin, 
    options: { /* plugin options */ }
  }
];

// 在组件中使用
<MdRenderer 
  :md="markdownText"
  :markdownItPlugins="markdownItPlugins"
  :markdownItOptions="{ html: true, linkify: true }"
/>
```

### 使用 markdown-it-container 创建自定义容器

**重要**: HTML 标签内的 Markdown 语法默认不会被解析。如果你想在自定义容器中支持 Markdown 语法(如 `**加粗**`、`*斜体*`、链接等),推荐使用 `markdown-it-container` 插件:

```bash
pnpm add markdown-it-container
pnpm add -D @types/markdown-it-container
```

```typescript
import markdownItContainer from 'markdown-it-container';

const markdownItPlugins = [
  {
    plugin: markdownItContainer,
    options: ['warning', {  // 'warning' 是容器类型
      render: (tokens: any[], idx: number) => {
        if (tokens[idx].nesting === 1) {
          // 开始标签
          return '<div class="alert" data-type="warning">\n';
        } else {
          // 结束标签
          return '</div>\n';
        }
      }
    }]
  }
];
```

使用方式:
```markdown
::: warning
这是一个 **警告** 内容，支持 *Markdown* 语法!
- 列表项 1
- 列表项 2
:::
```

这样容器内的 Markdown 语法就会被正确解析和渲染!

## 2. Custom 插件 (渲染扩展)

这些插件在渲染阶段工作,用于自定义特定节点的渲染方式。

### 插件接口

```typescript
interface CustomPlugin {
  name: string;           // 插件名称
  priority?: number;      // 优先级 (数字越大越先执行, 默认 0)
  test: (node: ASTNode) => boolean;  // 判断是否匹配此节点
  render: (
    node: ASTNode,        // 当前节点
    renderChildren: () => any,  // 渲染子节点的函数
    h: typeof import('vue').h   // Vue h 函数
  ) => any;               // 返回 VNode
}
```

### 使用示例

#### 示例 1: 自定义警告框

```typescript
import { h } from 'vue';
import type { CustomPlugin } from 'mio-previewer';

const AlertPlugin: CustomPlugin = {
  name: 'alert',
  priority: 50,
  test: (node) => {
    return node.type === 'tag' && 
           node.name === 'div' && 
           node.attribs?.class?.includes('alert');
  },
  render: (node, renderChildren, h) => {
    const type = node.attribs?.['data-type'] || 'info';
    return h('div', {
      class: `custom-alert alert-${type}`,
      style: {
        padding: '12px 16px',
        borderLeft: `4px solid ${getAlertColor(type)}`,
        backgroundColor: `${getAlertColor(type)}15`,
        margin: '8px 0'
      }
    }, renderChildren());
  }
};

function getAlertColor(type: string) {
  const colors = {
    info: '#0ea5e9',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981'
  };
  return colors[type] || colors.info;
}
```

#### 示例 2: Emoji 渲染

```typescript
const EmojiPlugin: CustomPlugin = {
  name: 'emoji',
  priority: 10,
  test: (node) => {
    return node.type === 'text' && /:\w+:/g.test(node.data);
  },
  render: (node, renderChildren, h) => {
    const text = node.data;
    const emojiMap = {
      ':smile:': '😊',
      ':heart:': '❤️',
      ':fire:': '🔥',
      ':rocket:': '🚀',
      ':star:': '⭐'
    };
    
    let result = text;
    Object.entries(emojiMap).forEach(([code, emoji]) => {
      result = result.replace(new RegExp(code, 'g'), emoji);
    });
    
    return result;
  }
};
```

#### 示例 3: 代码高亮 (使用 Shiki)

```typescript
import { getHighlighter } from 'shiki';

let highlighter: any = null;

const CodeHighlightPlugin: CustomPlugin = {
  name: 'code-highlight',
  priority: 80,
  test: (node) => {
    return node.type === 'tag' && 
           node.name === 'code' && 
           node.parent?.name === 'pre';
  },
  render: async (node, renderChildren, h) => {
    if (!highlighter) {
      highlighter = await getHighlighter({
        themes: ['github-dark'],
        langs: ['javascript', 'typescript', 'python', 'html', 'css']
      });
    }
    
    const code = extractText(node);
    const lang = node.attribs?.class?.replace('language-', '') || 'text';
    
    const html = highlighter.codeToHtml(code, {
      lang,
      theme: 'github-dark'
    });
    
    return h('div', { innerHTML: html });
  }
};

function extractText(node: any): string {
  if (node.type === 'text') return node.data;
  if (node.children) {
    return node.children.map(extractText).join('');
  }
  return '';
}
```

### 完整使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MdRenderer } from 'mio-previewer';
import type { CustomPlugin } from 'mio-previewer';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';

const markdownText = ref(`
# Hello World

This is H~2~O and E=mc^2^

<div class="alert" data-type="warning">
  This is a warning message!
</div>

Have a nice day! :smile: :rocket:

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`
`);

// Custom plugins
const customPlugins: CustomPlugin[] = [
  AlertPlugin,
  EmojiPlugin,
  CodeHighlightPlugin
];

// Markdown-it plugins
const markdownItPlugins = [
  { plugin: markdownItSub },
  { plugin: markdownItSup }
];
</script>

<template>
  <MdRenderer
    :md="markdownText"
    :customPlugins="customPlugins"
    :markdownItPlugins="markdownItPlugins"
    :markdownItOptions="{ html: true, linkify: true }"
  />
</template>
```

## 插件优先级

插件按 `priority` 值从高到低执行。内置的 `CursorPlugin` 优先级为 100。

推荐优先级范围:
- 100+: 系统级插件 (如 Cursor)
- 50-99: 高优先级自定义插件 (如容器、警告框)
- 10-49: 中等优先级插件 (如图标、徽章)
- 0-9: 低优先级插件 (如文本处理、emoji)

## 注意事项

1. `test` 函数应该尽可能高效,因为它会被每个节点调用
2. `render` 函数可以是同步或异步的
3. 如果多个插件匹配同一个节点,只有优先级最高的会被执行
4. 使用 `renderChildren()` 来渲染子节点内容
5. 插件可以访问节点的所有属性: `node.attribs`, `node.children`, `node.parent` 等

## ASTNode 结构

```typescript
interface ASTNode {
  type: 'tag' | 'text' | 'comment' | 'script' | 'style' | 'directive' | 'component';
  name?: string;           // 标签名 (仅 type='tag')
  attribs?: Record<string, string>;  // 属性
  children?: ASTNode[];    // 子节点
  data?: string;           // 文本内容 (仅 type='text')
  parent?: ASTNode;        // 父节点
  [key: string]: any;      // 其他属性
}
```

## 最佳实践

1. **性能**: 避免在 `test` 函数中进行复杂计算
2. **缓存**: 对于昂贵的操作(如语法高亮),使用缓存
3. **错误处理**: 在 `render` 函数中添加 try-catch
4. **类型安全**: 使用 TypeScript 和类型定义
5. **可组合**: 设计小而专注的插件,易于组合使用

## 内置插件

mio-previewer 提供了多个开箱即用的插件:

### 1. AlertPlugin (Custom 插件)

渲染自定义警告框，支持 4 种类型。

**优先级**: 50

**使用方式**:
```markdown
::: info
这是一个信息提示框
:::

::: warning
警告内容
:::

::: error
错误信息
:::

::: success
成功提示
:::
```

**依赖**: 需要配合 `markdown-it-container` 使用。

### 2. EmojiPlugin (Custom 插件)

将文本中的 emoji 代码转换为实际的 emoji 符号。

**优先级**: 10

**支持的 Emoji**:
- `:smile:` → 😊
- `:heart:` → ❤️
- `:fire:` → 🔥
- `:rocket:` → 🚀
- `:star:` → ⭐
- `:thumbsup:` → 👍
- `:tada:` → 🎉
- `:check:` → ✅
- `:cross:` → ❌
- `:eyes:` → 👀
- `:thinking:` → 🤔
- `:100:` → 💯

### 3. CodeBlockPlugin (Custom 插件)

使用 Prism 进行代码高亮，并提供复制和 HTML 预览功能。

**优先级**: 70

**特性**:
- 🎨 支持 20+ 编程语言语法高亮
- 📋 一键复制代码
- 👁️ HTML 代码实时预览 (沙箱 iframe)
- 🎯 语言标签显示
- 🌙 暗色主题 (Tomorrow Night)

**使用方式**:
````javascript
```javascript
const hello = "world";
console.log(hello);
```
````

**HTML 预览**:
````html
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Hello World</h1>
</body>
</html>
```
````

点击预览按钮可在安全的 iframe 中预览 HTML 效果。

**依赖**: `prismjs` 和 Prism 主题 CSS。

**导入样式**:
```typescript
import 'mio-previewer/dist/style.css';  // 包含 Prism 主题
```

### 4. katexPlugin (markdown-it 插件)

渲染数学公式，支持多种 LaTeX 定界符。

**支持的语法**（按优先级排序）:

1. **块级公式 - `$$...$$`**:
```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

2. **块级公式 - `\[...\]`**:
```markdown
\[
E = mc^2
\]
```

3. **行内公式 - `\(...\)`**:
```markdown
欧拉公式: \(e^{i\pi} + 1 = 0\)
```

4. **行内公式 - `$...$`**:
```markdown
质能方程: $E = mc^2$
```

**示例渲染效果**:

- 行内: $E = mc^2$ 或 \(a^2 + b^2 = c^2\)
- 块级: 
$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

**使用方式**:
```typescript
import { katexPlugin } from 'mio-previewer';

const markdownItPlugins = [
  { plugin: katexPlugin }
];
```

**依赖**: `katex` 和 KaTeX CSS。

**导入样式**:
```typescript
import 'katex/dist/katex.min.css';
```

**注意事项**:
- 定界符按优先级匹配，长定界符（如 `$$`）优先于短定界符（如 `$`）
- 支持转义字符 `\` 来避免意外匹配
- 空白或仅空格的公式内容将被忽略
- 语法错误的公式会显示错误信息而不会中断渲染

## 完整使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { 
  MdRenderer, 
  AlertPlugin, 
  EmojiPlugin, 
  CodeBlockPlugin,
  katexPlugin,
  createAllAlertContainers 
} from 'mio-previewer';
import markdownItContainer from 'markdown-it-container';

// 导入样式
import 'mio-previewer/dist/style.css';
import 'katex/dist/katex.min.css';

const markdown = ref(`
# 完整功能演示

## 数学公式
质能方程: $E = mc^2$

## 代码高亮
\`\`\`javascript
console.log('Hello, World!');
\`\`\`

## 警告框
::: warning
⚠️ 注意事项
:::

## Emoji
Hello :smile: :rocket:
`);

const customPlugins = [
  CodeBlockPlugin,
  AlertPlugin,
  EmojiPlugin
];

const markdownItPlugins = [
  ...createAllAlertContainers(markdownItContainer),
  { plugin: katexPlugin }
];
</script>

<template>
  <MdRenderer
    :md="markdown"
    :customPlugins="customPlugins"
    :markdownItPlugins="markdownItPlugins"
  />
</template>
```

## 安装依赖

```bash
# 核心依赖
pnpm add mio-previewer

# 可选插件依赖
pnpm add prismjs katex markdown-it-container

# 类型定义
pnpm add -D @types/prismjs @types/katex @types/markdown-it-container
```
