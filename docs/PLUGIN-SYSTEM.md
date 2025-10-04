# 插件系统文档

mio-previewer 提供了一个灵活的双层插件系统,允许你扩展 Markdown 解析和渲染功能。

## 插件系统架构

插件系统分为两层:

1. **markdown-it 插件** - 在 Markdown → HTML 转换阶段工作,用于扩展 Markdown 语法
2. **自定义渲染插件** - 在 HTML AST → Vue VNodes 渲染阶段工作,用于自定义 HTML 元素的渲染

## 1. Markdown-it 插件

### 什么是 markdown-it 插件?

markdown-it 插件在 Markdown 解析阶段工作,可以:
- 扩展 Markdown 语法 (如: 高亮标记 `==text==`, 容器语法 `:::warning`)
- 修改解析规则
- 转换 token 流

### 如何使用?

```typescript
import type { MarkdownItPluginConfig } from 'mio-previewer'
import markdownItMark from 'markdown-it-mark'
import markdownItContainer from 'markdown-it-container'

const markdownItPlugins: MarkdownItPluginConfig[] = [
  {
    plugin: markdownItMark,
    options: undefined  // 插件选项，如果插件不需要选项则为 undefined
  },
  {
    plugin: markdownItContainer,
    options: 'warning'  // markdown-it-container 需要一个容器名称
  }
]

// 在组件中使用
<MdRenderer 
  :md="markdownText"
  :markdownItPlugins="markdownItPlugins"
/>
```

### 常用 markdown-it 插件推荐

- `markdown-it-mark` - 支持 `==高亮==` 语法
- `markdown-it-container` - 支持自定义容器 `:::warning\n内容\n:::`
- `markdown-it-emoji` - 支持 emoji 短代码 `:smile:`
- `markdown-it-footnote` - 支持脚注
- `markdown-it-task-lists` - 支持任务列表 `- [ ] task`
- `markdown-it-anchor` - 为标题添加锚点
- `markdown-it-toc-done-right` - 生成目录

## 2. 自定义渲染插件

### 什么是自定义渲染插件?

自定义渲染插件在 HTML AST → Vue VNodes 渲染阶段工作,可以:
- 自定义 HTML 元素的渲染方式
- 添加样式、属性或包装元素
- 将特定元素渲染为 Vue 组件
- 实现代码高亮、图表渲染等功能

### 插件接口

```typescript
interface CustomPlugin {
  name: string;              // 插件名称
  priority?: number;         // 优先级 (数字越大优先级越高，默认为 0)
  test: (node: ASTNode) => boolean;  // 测试函数：判断是否应用此插件
  render: (                  // 渲染函数：返回 Vue VNode
    node: ASTNode,
    renderChildren: (children: ASTNode[]) => any,
    h: typeof import('vue').h
  ) => any;
}
```

### 如何创建自定义插件?

#### 示例 1: 为代码块添加语言标签

```typescript
import type { CustomPlugin } from 'mio-previewer'
import { h } from 'vue'

const CodeBlockPlugin: CustomPlugin = {
  name: 'codeblock-with-label',
  priority: 60,
  
  // 测试函数：匹配所有包含 <code> 的 <pre> 标签
  test: (node) => {
    return node.type === 'tag' && 
           node.name === 'pre' && 
           node.children?.some(child => child.name === 'code');
  },
  
  // 渲染函数：添加语言标签
  render: (node, renderChildren, h) => {
    const codeNode = node.children?.find(child => child.name === 'code');
    const className = codeNode?.attribs?.class || '';
    const languageMatch = className.match(/language-(\w+)/);
    const language = languageMatch ? languageMatch[1] : '';

    return h('div', {
      style: { position: 'relative', marginBottom: '1em' }
    }, [
      // 语言标签
      language && h('div', {
        style: {
          position: 'absolute',
          top: '0',
          right: '0',
          padding: '2px 8px',
          backgroundColor: '#2d3748',
          color: '#e2e8f0',
          fontSize: '12px',
          borderBottomLeftRadius: '4px'
        }
      }, language),
      
      // 代码块
      h('pre', {
        style: {
          backgroundColor: '#1e293b',
          padding: '16px',
          borderRadius: '4px',
          overflow: 'auto'
        }
      }, renderChildren(node.children))
    ]);
  }
};
```

#### 示例 2: 为链接添加外部链接图标

```typescript
const LinkPlugin: CustomPlugin = {
  name: 'external-link-icon',
  priority: 40,
  
  test: (node) => node.type === 'tag' && node.name === 'a',
  
  render: (node, renderChildren, h) => {
    const href = node.attribs?.href || '';
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    
    return h('a', {
      ...node.attribs,
      style: {
        color: '#3b82f6',
        textDecoration: 'none',
        borderBottom: '1px solid #3b82f6'
      }
    }, [
      ...renderChildren(node.children),
      isExternal && h('span', { style: { marginLeft: '4px' } }, '🔗')
    ]);
  }
};
```

#### 示例 3: 自定义高亮标记样式

```typescript
const HighlightPlugin: CustomPlugin = {
  name: 'custom-highlight',
  priority: 50,
  
  test: (node) => node.type === 'tag' && node.name === 'mark',
  
  render: (node, renderChildren, h) => {
    return h('mark', {
      style: {
        backgroundColor: '#ffeb3b',
        padding: '2px 4px',
        borderRadius: '2px',
        fontWeight: 'bold'
      }
    }, renderChildren(node.children));
  }
};
```

### 插件优先级

插件按优先级从高到低排序执行。如果多个插件的 `test` 函数都返回 `true`,则只有优先级最高的插件会被应用。

```typescript
const plugins = [
  { name: 'plugin-a', priority: 100, test: ..., render: ... },  // 最高优先级
  { name: 'plugin-b', priority: 50, test: ..., render: ... },
  { name: 'plugin-c', priority: 10, test: ..., render: ... },   // 最低优先级
];
```

### 在组件中使用自定义插件

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MdRenderer from 'mio-previewer'
import type { CustomPlugin } from 'mio-previewer'

const customPlugins = ref([
  CodeBlockPlugin,
  LinkPlugin,
  HighlightPlugin
]);

const markdownText = ref('# Hello\n\n```js\nconsole.log("world");\n```');
</script>

<template>
  <MdRenderer 
    :md="markdownText"
    :customPlugins="customPlugins"
  />
</template>
```

## 完整示例

```vue
<template>
  <MdRenderer 
    :md="markdownStream"
    :isStreaming="isStreaming"
    :markdownItPlugins="markdownItPlugins"
    :customPlugins="customPlugins"
    :markdownItOptions="mdOptions"
  />
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import MdRenderer from 'mio-previewer'
import type { CustomPlugin, MarkdownItPluginConfig } from 'mio-previewer'
import markdownItMark from 'markdown-it-mark'

// Markdown-it 配置
const mdOptions = {
  html: true,
  linkify: true,
  typographer: true
};

// Markdown-it 插件
const markdownItPlugins = ref<MarkdownItPluginConfig[]>([
  { plugin: markdownItMark, options: undefined }
]);

// 自定义渲染插件
const customPlugins = ref([
  {
    name: 'code-highlight',
    priority: 100,
    test: (node) => node.type === 'tag' && node.name === 'code',
    render: (node, renderChildren, h) => {
      // 使用 Shiki 或 Prism 进行代码高亮
      return h('code', { class: 'highlighted' }, renderChildren(node.children));
    }
  }
]);

const markdownStream = ref('');
const isStreaming = ref(false);
</script>
```

## 高级插件示例

### 代码高亮插件 (使用 Shiki)

```typescript
import { getHighlighter } from 'shiki'

let highlighter: any = null;

const CodeHighlightPlugin: CustomPlugin = {
  name: 'shiki-highlight',
  priority: 100,
  
  test: (node) => {
    return node.type === 'tag' && 
           node.name === 'code' && 
           node.parent?.name === 'pre' &&
           node.attribs?.class?.startsWith('language-');
  },
  
  render: (node, renderChildren, h) => {
    const className = node.attribs?.class || '';
    const lang = className.replace('language-', '');
    const code = node.children?.[0]?.data || '';
    
    // 异步加载高亮器
    if (!highlighter) {
      getHighlighter({
        theme: 'nord',
        langs: [lang]
      }).then(hl => {
        highlighter = hl;
      });
      // 返回未高亮的代码
      return h('code', { class: className }, code);
    }
    
    // 使用高亮器渲染
    const html = highlighter.codeToHtml(code, { lang });
    return h('div', { innerHTML: html });
  }
};
```

### Mermaid 图表插件

```typescript
import mermaid from 'mermaid'

const MermaidPlugin: CustomPlugin = {
  name: 'mermaid',
  priority: 90,
  
  test: (node) => {
    return node.type === 'tag' &&
           node.name === 'code' &&
           node.attribs?.class === 'language-mermaid';
  },
  
  render: (node, renderChildren, h) => {
    const code = node.children?.[0]?.data || '';
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    
    // 使用 Vue 的 onMounted 来渲染图表
    return h('div', {
      ref: (el) => {
        if (el) {
          mermaid.render(id, code).then(({ svg }) => {
            el.innerHTML = svg;
          });
        }
      },
      class: 'mermaid-container'
    });
  }
};
```

## 最佳实践

1. **优先级设置**: 通用插件使用较低优先级 (0-50),特殊插件使用较高优先级 (50-100)
2. **性能考虑**: 避免在 `test` 函数中进行复杂计算,应该尽可能快速判断
3. **子节点渲染**: 使用 `renderChildren()` 确保子节点也能被插件系统处理
4. **类型安全**: 使用 TypeScript 类型定义确保插件接口正确
5. **错误处理**: 在 `render` 函数中添加 try-catch 避免单个插件错误影响整体渲染

## 调试技巧

```typescript
const DebugPlugin: CustomPlugin = {
  name: 'debug',
  priority: -1000,  // 最低优先级,只在其他插件都不匹配时触发
  
  test: (node) => {
    console.log('AST Node:', node);  // 打印所有未被处理的节点
    return false;  // 不实际渲染,只用于调试
  },
  
  render: () => null
};
```

## 常见问题

### Q: 为什么我的插件没有生效?

A: 检查以下几点:
1. `test` 函数是否正确匹配目标节点
2. 是否有其他优先级更高的插件也匹配了该节点
3. 插件是否正确传递给 `MdRenderer` 组件

### Q: 如何处理异步操作 (如代码高亮)?

A: 可以使用 Vue 的 ref 回调或 onMounted 钩子:

```typescript
render: (node, renderChildren, h) => {
  return h('div', {
    ref: (el) => {
      if (el) {
        // 在这里执行异步操作
        asyncOperation().then(result => {
          el.innerHTML = result;
        });
      }
    }
  });
}
```

### Q: 可以修改 AST 节点吗?

A: 不推荐直接修改 AST 节点。插件应该是无副作用的,只负责渲染。如果需要修改内容,应该在 markdown-it 层面使用 markdown-it 插件。

## 参考资料

- [markdown-it 插件开发](https://github.com/markdown-it/markdown-it/blob/master/docs/development.md)
- [Vue h() 函数文档](https://vuejs.org/api/render-function.html#h)
- [htmlparser2 AST 结构](https://github.com/fb55/htmlparser2/wiki/Parser-options)
