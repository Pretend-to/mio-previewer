# CodeBlock & KaTeX Plugins Implementation

## 概述

成功实现了外部 Markdown 渲染器的核心功能,通过插件化架构集成到 mio-previewer。

## 完成的功能

### 1. CodeBlockPlugin (代码块增强)

**类型**: Custom Plugin  
**优先级**: 70  
**实现文件**: 
- `src/components/CodeBlock.vue` - Vue 组件
- `src/plugins/CodeBlockPlugin.ts` - 插件定义

**功能特性**:
- ✅ Prism 语法高亮 (20+ 语言支持)
- ✅ 复制按钮 (一键复制代码到剪贴板)
- ✅ HTML 预览按钮 (仅 HTML 语言显示)
- ✅ 安全的 iframe 预览 (sandbox 属性)
- ✅ 语言标签显示
- ✅ 暗色主题 (Prism Tomorrow Night)
- ✅ 响应式设计

**支持的语言**:
JavaScript, TypeScript, JSX, TSX, JSON, Python, Bash, HTML/Markup, CSS, Java, C, C++, Go, Rust, PHP, Ruby, SQL, YAML, Markdown

**技术实现**:
- 使用 Vue 组件封装 UI 和交互逻辑
- Prism.highlight() 进行语法高亮
- navigator.clipboard API 实现复制
- iframe srcdoc + sandbox 实现安全预览
- 通过 CustomPlugin 接口集成到渲染管道

### 2. katexPlugin (数学公式)

**类型**: markdown-it Plugin  
**实现文件**: `src/plugins/katexPlugin.ts`

**功能特性**:
- ✅ 行内公式: `$E = mc^2$`
- ✅ 块级公式: `$$...$$`
- ✅ 单行和多行公式支持
- ✅ 错误处理 (语法错误显示为红色提示)
- ✅ KaTeX 完整功能支持

**技术实现**:
- 使用 markdown-it inline.ruler 和 block.ruler 注册自定义规则
- 解析阶段识别 `$...$` 和 `$$...$$` 语法
- katex.renderToString() 渲染为 HTML
- 支持转义字符处理

### 3. 链接安全规则

**实现位置**: `src/MdRenderer.vue` - `createMarkdownInstance()`

**功能**:
- ✅ 自动为所有链接添加 `target="_blank"`
- ✅ 自动添加 `rel="noopener noreferrer"` (防止安全漏洞)

**技术实现**:
- 在 markdown-it 实例创建时注册 renderer.rules.link_open
- 拦截链接渲染并添加安全属性

### 4. 样式文件组织

**新增文件**: `src/styles/plugin-styles.css`

**内容**:
- Prism 主题 CSS (`prismjs/themes/prism-tomorrow.css`)
- KaTeX 样式 (`katex/dist/katex.min.css`)
- 自定义错误样式

## 依赖安装

```bash
# 运行时依赖
pnpm add prismjs katex markdown-it-container

# 开发依赖
pnpm add -D @types/prismjs @types/katex @types/markdown-it-container
```

## 文件清单

### 新增文件
- `src/components/CodeBlock.vue` - 代码块 UI 组件
- `src/plugins/CodeBlockPlugin.ts` - 代码块插件
- `src/plugins/katexPlugin.ts` - KaTeX 数学公式插件
- `src/styles/plugin-styles.css` - 全局插件样式

### 修改文件
- `src/MdRenderer.vue` - 添加链接安全规则
- `src/plugins/index.ts` - 导出新插件
- `src/index.ts` - 库入口导出
- `src/App-plugin-demo.vue` - 集成和演示
- `docs/PLUGIN_GUIDE.md` - 完整文档更新
- `README.md` - 内置插件列表更新
- `package.json` - 新依赖

## 使用示例

### 完整配置

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
import 'mio-previewer/dist/style.css';

const markdown = ref(`
# Demo

## Math
$E = mc^2$

## Code
\`\`\`javascript
console.log('Hello');
\`\`\`

## Alert
::: info
Important info
:::
`);

const customPlugins = [
  CodeBlockPlugin,  // 优先级 70
  AlertPlugin,      // 优先级 50
  EmojiPlugin       // 优先级 10
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

## 架构优势

### vs 外部实现 (直接 DOM 操作)

**外部方式**:
- ❌ 手动 DOM 操作 (querySelector, appendChild)
- ❌ 事件监听器手动管理
- ❌ 渲染后 DOM 修改 (watch + nextTick)
- ❌ 难以测试和维护

**mio-previewer 方式**:
- ✅ VNode 声明式渲染
- ✅ Vue 组件封装
- ✅ 响应式状态管理
- ✅ 可测试、可组合
- ✅ 插件优先级系统
- ✅ 与流式渲染兼容

### 关键设计决策

1. **CodeBlock 作为 Vue 组件**: 而不是字符串拼接 HTML
   - 更好的状态管理 (复制状态、预览开关)
   - 事件处理由 Vue 管理
   - 样式作用域

2. **KaTeX 作为 markdown-it 插件**: 而不是 Custom 插件
   - 解析阶段处理更高效
   - 避免二次遍历 AST
   - 更符合 markdown-it 生态

3. **链接安全规则集成到 MdRenderer**: 而不是单独插件
   - 全局生效
   - 一次配置,自动应用
   - 不增加插件列表复杂度

## 测试验证

✅ 在浏览器中打开 `http://localhost:5173/plugin-demo.html`

**验证项**:
- [x] JavaScript/TypeScript/Python 等代码高亮正确
- [x] 复制按钮功能正常 (1.7秒后恢复)
- [x] HTML 代码预览按钮显示
- [x] iframe 预览正常渲染并有 sandbox 保护
- [x] 行内数学公式 `$...$` 渲染
- [x] 块级数学公式 `$$...$$` 渲染
- [x] Alert 容器与代码块共存
- [x] Emoji 在各处正常转换
- [x] 流式渲染时 cursor 正常显示
- [x] 外部链接打开新标签 (target="_blank")

## 性能考虑

1. **Prism 语言按需加载**: 只导入需要的语言文件
2. **KaTeX 解析时渲染**: 避免二次遍历
3. **组件级别状态**: 每个代码块独立状态,不影响全局
4. **优先级排序一次**: 在 `getAllPlugins()` 中完成

## 后续扩展建议

1. **代码块增强**:
   - 行号显示
   - 代码折叠
   - 主题切换
   - 更多语言支持

2. **数学公式增强**:
   - 公式编号
   - 引用支持
   - 化学公式 (mhchem)

3. **其他插件**:
   - Mermaid 图表
   - 表格排序
   - 图片懒加载
   - 目录生成

## 总结

成功将外部 Markdown 渲染器的核心功能通过插件化架构迁移到 mio-previewer,保持了代码的可维护性和扩展性。所有功能都通过声明式插件系统集成,避免了手动 DOM 操作,提供了更好的开发体验和性能。
