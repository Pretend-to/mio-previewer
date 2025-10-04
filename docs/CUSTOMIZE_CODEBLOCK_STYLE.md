# 自定义代码块样式指南

## 样式文件位置

### 1. **全局样式覆盖** - `src/styles/plugin-styles.css` ⭐ 推荐

这是自定义代码块样式的**主要位置**，适合：

- 覆盖 Prism 语法高亮颜色
- 修改代码块整体外观（背景、边框、阴影）
- 自定义字体、字号、行高
- 全局性的样式调整

**优点**：
- 集中管理插件样式
- 不影响组件内部逻辑
- 易于维护和分享

### 2. **组件级样式** - `src/components/CodeBlock.vue` 的 `<style scoped>`

这里包含代码块组件的**结构样式**，适合：

- 修改按钮布局和样式
- 调整 header 区域
- iframe 预览区域样式
- 组件特定的交互样式

**注意**：由于是 scoped，这里的样式不会影响其他组件

## 常见自定义场景

### 场景 1：更改语法高亮配色

**文件**: `src/styles/plugin-styles.css`

```css
/* 注释颜色 */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #6a9955 !important;
}

/* 关键字颜色 */
.token.keyword {
  color: #569cd6 !important;
}

/* 字符串颜色 */
.token.string {
  color: #ce9178 !important;
}

/* 函数名颜色 */
.token.function {
  color: #dcdcaa !important;
}

/* 数字颜色 */
.token.number {
  color: #b5cea8 !important;
}
```

### 场景 2：更换 Prism 主题

**方法 1**: 替换主题文件

```css
/* 在 src/styles/plugin-styles.css 中 */

/* 原主题（Tomorrow Night） */
/* @import 'prismjs/themes/prism-tomorrow.css'; */

/* 更换为其他主题 */
@import 'prismjs/themes/prism-okaidia.css';
/* 或 */
@import 'prismjs/themes/prism-twilight.css';
/* 或 */
@import 'prismjs/themes/prism-coy.css';
```

**方法 2**: 在主题后面覆盖

```css
@import 'prismjs/themes/prism-tomorrow.css';

/* 覆盖特定颜色 */
.token.keyword {
  color: #ff6b9d !important;
}
```

### 场景 3：自定义代码块外观

**文件**: `src/styles/plugin-styles.css`

```css
/* 修改圆角 */
.code-block-wrapper {
  border-radius: 12px !important;
}

/* 修改阴影 */
.code-block-wrapper {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
}

/* 修改背景色 */
.code-block-wrapper pre {
  background: #0d1117 !important; /* GitHub dark 风格 */
}

/* 修改边框 */
.code-block-wrapper {
  border: 2px solid #30363d !important;
}
```

### 场景 4：自定义字体和排版

**文件**: `src/styles/plugin-styles.css`

```css
.code-block-wrapper pre,
.code-block-wrapper code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace !important;
  font-size: 15px !important;
  line-height: 1.8 !important;
  font-weight: 400 !important;
}

/* 启用连字（如果字体支持） */
.code-block-wrapper code {
  font-variant-ligatures: normal !important;
}
```

### 场景 5：自定义按钮样式

**文件**: `src/components/CodeBlock.vue` 的 `<style scoped>`

```css
/* 复制按钮 */
.copy-code-button {
  background: #3b82f6 !important;
  color: white !important;
  padding: 0.4em 0.8em !important;
  border-radius: 6px !important;
}

.copy-code-button:hover {
  background: #2563eb !important;
}

/* 预览按钮 */
.preview-html-button {
  background: #10b981 !important;
  color: white !important;
  padding: 0.4em 0.8em !important;
  border-radius: 6px !important;
}
```

### 场景 6：添加行号

**文件**: `src/styles/plugin-styles.css`

```css
/* 使用 CSS 计数器添加行号 */
.code-block-wrapper pre {
  counter-reset: line;
  padding-left: 3.5em !important;
}

.code-block-wrapper pre code {
  counter-increment: line;
}

.code-block-wrapper pre code::before {
  content: counter(line);
  position: absolute;
  left: 0;
  width: 2.5em;
  text-align: right;
  padding-right: 1em;
  color: #6e7681;
  user-select: none;
}
```

### 场景 7：自定义滚动条

**文件**: `src/components/CodeBlock.vue` 的 `<style scoped>`

```css
/* 修改滚动条样式 */
pre::-webkit-scrollbar {
  height: 12px !important;
  background: #1a1a2e !important;
}

pre::-webkit-scrollbar-thumb {
  background: linear-gradient(to right, #667eea, #764ba2) !important;
  border-radius: 6px !important;
}

pre::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to right, #764ba2, #667eea) !important;
}
```

## 最佳实践

### ✅ 推荐做法

1. **在 `plugin-styles.css` 中自定义全局样式**
   - 主题颜色
   - 字体排版
   - 代码块外观

2. **使用 `!important` 覆盖默认样式**
   - 因为 Prism 和 scoped 样式有较高优先级

3. **保持样式一致性**
   - 使用 CSS 变量统一配色
   - 保持与整体设计风格协调

### ❌ 避免做法

1. **不要直接修改 node_modules 中的文件**
   - 更新依赖时会丢失修改

2. **不要在多个地方重复定义相同样式**
   - 集中在 `plugin-styles.css` 管理

3. **避免过度使用内联样式**
   - 难以维护和覆盖

## CSS 变量方案（推荐）

在 `src/styles/plugin-styles.css` 中定义变量：

```css
:root {
  /* 代码块颜色变量 */
  --code-bg: #1e1e2e;
  --code-border: #222229;
  --code-text: #cdd6f4;
  --code-keyword: #89b4fa;
  --code-string: #a6e3a1;
  --code-comment: #6c7086;
  --code-function: #f9e2af;
  --code-number: #fab387;
}

/* 使用变量 */
.code-block-wrapper pre {
  background: var(--code-bg) !important;
  border: 1px solid var(--code-border) !important;
  color: var(--code-text) !important;
}

.token.keyword {
  color: var(--code-keyword) !important;
}

.token.string {
  color: var(--code-string) !important;
}
```

这样可以轻松切换主题！

## 完整示例：暗色主题配置

```css
/* src/styles/plugin-styles.css */

/* Prism 基础主题 */
@import 'prismjs/themes/prism-tomorrow.css';

/* 自定义覆盖 */
.code-block-wrapper {
  border-radius: 12px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid #30363d !important;
  margin: 2em 0 !important;
}

.code-block-wrapper pre {
  background: #0d1117 !important;
  padding: 1.25rem !important;
}

.code-block-wrapper code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace !important;
  font-size: 14px !important;
  line-height: 1.7 !important;
}

/* 语法高亮配色 - GitHub Dark 风格 */
.token.comment { color: #8b949e !important; }
.token.keyword { color: #ff7b72 !important; }
.token.string { color: #a5d6ff !important; }
.token.function { color: #d2a8ff !important; }
.token.number { color: #79c0ff !important; }
.token.operator { color: #ff7b72 !important; }
.token.class-name { color: #ffa657 !important; }
.token.punctuation { color: #c9d1d9 !important; }
```

## 参考资源

- [Prism 官方主题](https://prismjs.com/)
- [Prism Themes 仓库](https://github.com/PrismJS/prism-themes)
- [支持的语言列表](https://prismjs.com/#supported-languages)

---

**提示**: 修改样式后记得在浏览器中硬刷新（Ctrl+Shift+R 或 Cmd+Shift+R）以清除缓存。
