# Plugin System Implementation Summary

## 完成情况 ✅

已成功实现 mio-previewer 的双层插件系统,提供强大的扩展能力。

## 核心特性

### 1. 双层插件架构

#### Markdown-it 插件层 (语法扩展)
- 在 Markdown 解析阶段工作
- 支持任何标准 markdown-it 插件
- 通过 `markdownItPlugins` prop 动态注册
- 可配置 markdown-it 选项 (`markdownItOptions`)

#### Custom 插件层 (渲染扩展)
- 在 Vue 渲染阶段工作
- 基于 AST 节点匹配和自定义渲染
- 支持优先级排序 (priority)
- 通过 `customPlugins` prop 传递

### 2. 类型系统

创建了完整的 TypeScript 类型定义 (`src/types.ts`):

```typescript
export interface CustomPlugin {
  name: string;
  priority?: number;
  test: (node: ASTNode) => boolean;
  render: (node: ASTNode, renderChildren: () => any, h: typeof import('vue').h) => any;
}

export interface MarkdownItPluginConfig {
  plugin: any;
  options?: any;
}

export interface MdRendererProps {
  md: string;
  isStreaming?: boolean;
  useWorker?: boolean;
  markdownItPlugins?: MarkdownItPluginConfig[];
  markdownItOptions?: Record<string, any>;
  customPlugins?: CustomPlugin[];
}
```

### 3. 内置插件示例

#### AlertPlugin (`src/plugins/AlertPlugin.ts`)
- 渲染自定义警告框
- 支持 4 种类型: info, warning, error, success
- 优先级: 50

用法:
```html
<div class="alert" data-type="warning">
  警告内容
</div>
```

#### EmojiPlugin (`src/plugins/EmojiPlugin.ts`)
- 文本中的 emoji 代码替换
- 支持 12+ 常见 emoji
- 优先级: 10

用法:
```markdown
Hello :smile: :rocket: :fire:
```

### 4. 核心组件改造

#### MdRenderer.vue
- 添加了 `markdownItPlugins`、`markdownItOptions`、`customPlugins` 三个 props
- 实现了动态 markdown-it 实例创建 (`createMarkdownInstance`)
- 插件优先级排序逻辑
- Watch customPlugins 变化自动更新

关键实现:
```typescript
function createMarkdownInstance() {
  const mdInstance = new MarkdownIt(props.markdownItOptions || {});
  if (props.markdownItPlugins && props.markdownItPlugins.length > 0) {
    props.markdownItPlugins.forEach((config: MarkdownItPluginConfig) => {
      mdInstance.use(config.plugin, config.options);
    });
  }
  return mdInstance;
}

function getAllPlugins() {
  const plugins = [CursorPlugin, ...(props.customPlugins || [])];
  return plugins.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
```

### 5. 文档

#### Plugin Guide (`docs/PLUGIN_GUIDE.md`)
- 完整的插件开发指南
- 接口说明和示例代码
- 最佳实践建议
- ASTNode 结构说明

#### README 更新
- 添加了插件系统章节
- 快速开始示例
- 内置插件说明
- 链接到详细文档

### 6. 演示应用

#### App-plugin-demo.vue
- 实时编辑预览
- 展示 AlertPlugin 和 EmojiPlugin 效果
- 美化的 UI 界面
- 支持流式渲染测试

访问: `http://localhost:5173/plugin-demo.html`

## 文件变更清单

### 新增文件
- `src/types.ts` - TypeScript 类型定义
- `src/plugins/AlertPlugin.ts` - Alert 警告框插件
- `src/plugins/EmojiPlugin.ts` - Emoji 表情插件
- `src/plugins/index.ts` - 插件导出入口
- `docs/PLUGIN_GUIDE.md` - 插件开发指南
- `plugin-demo.html` - 插件演示页面

### 修改文件
- `src/MdRenderer.vue` - 添加插件系统支持
- `src/index.ts` - 导出类型和内置插件
- `src/App-plugin-demo.vue` - 更新为使用新插件
- `README.md` - 添加插件系统文档

## 优先级设计

```
100+  系统级插件 (CursorPlugin: 100)
50-99 高优先级 (AlertPlugin: 50)
10-49 中等优先级
0-9   低优先级 (EmojiPlugin: 10)
```

## 使用示例

### 基础用法

```vue
<script setup>
import { ref } from 'vue';
import { MdRenderer, AlertPlugin, EmojiPlugin } from 'mio-previewer';

const markdown = ref('# Hello :smile:');
const customPlugins = [AlertPlugin, EmojiPlugin];
</script>

<template>
  <MdRenderer 
    :md="markdown"
    :customPlugins="customPlugins"
    :markdownItOptions="{ html: true }"
  />
</template>
```

### 高级用法 (带 markdown-it 插件)

```vue
<script setup>
import { MdRenderer } from 'mio-previewer';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';

const markdownItPlugins = [
  { plugin: markdownItSub },
  { plugin: markdownItSup }
];
</script>

<template>
  <MdRenderer 
    :md="text"
    :markdownItPlugins="markdownItPlugins"
    :customPlugins="customPlugins"
  />
</template>
```

## 技术亮点

1. **类型安全**: 完整的 TypeScript 类型定义
2. **优先级系统**: 灵活的插件执行顺序控制
3. **动态配置**: 运行时动态注册和更新插件
4. **双层扩展**: 语法扩展 + 渲染扩展
5. **向后兼容**: 保留了原有的 plugin API
6. **开箱即用**: 内置常用插件示例

## 测试建议

1. 在浏览器中打开 `http://localhost:5173/plugin-demo.html`
2. 编辑左侧 Markdown 文本
3. 观察右侧实时预览效果
4. 测试 Alert 警告框 (4种类型)
5. 测试 Emoji 表情替换
6. 测试流式渲染 (点击"开始流式渲染")

## 后续扩展方向

可以基于这个插件系统继续开发:

1. **CodeHighlightPlugin** - 使用 Shiki/Prism 进行代码高亮
2. **MermaidPlugin** - Mermaid 图表渲染
3. **LaTeXPlugin** - KaTeX 数学公式渲染
4. **TableOfContentsPlugin** - 自动生成目录
5. **ImageLazyLoadPlugin** - 图片懒加载
6. **LinkPreviewPlugin** - 链接预览卡片

## 总结

插件系统的实现为 mio-previewer 提供了强大的扩展能力,虽然在纯性能对比中没有显著优势,但通过插件架构可以轻松实现各种自定义渲染需求,这是 v-html 方案无法做到的。这为项目提供了真正的**架构优势**和**可扩展性**。
