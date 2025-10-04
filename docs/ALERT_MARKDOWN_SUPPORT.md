# Alert Plugin Markdown Support - 实现总结

## 问题

用户发现 AlertPlugin 中的 Markdown 语法(如 `**加粗**`)没有被渲染,显示为纯文本。

## 根本原因

这是 Markdown 的标准行为:**HTML 标签内的内容默认不会被当作 Markdown 解析**。

当使用这种语法时:
```html
<div class="alert" data-type="info">
这是一个 **加粗** 的文本
</div>
```

markdown-it 会将 `<div>` 标签内的内容当作纯 HTML,不会解析 `**加粗**` 语法。

## 解决方案

使用 `markdown-it-container` 插件创建自定义容器,容器内的内容会被正确解析为 Markdown。

### 1. 安装依赖

```bash
pnpm add markdown-it-container
pnpm add -D @types/markdown-it-container
```

### 2. 配置 markdown-it-container

```typescript
import markdownItContainer from 'markdown-it-container';

const markdownItPlugins = [
  {
    plugin: markdownItContainer,
    options: ['warning', {
      render: (tokens: any[], idx: number) => {
        if (tokens[idx].nesting === 1) {
          return '<div class="alert" data-type="warning">\n';
        } else {
          return '</div>\n';
        }
      }
    }]
  }
];
```

### 3. 使用新语法

```markdown
::: warning
这是一个 **警告** 内容，支持 *Markdown* 语法!
- 列表项 1
- 列表项 2
:::
```

## 代码改进

### 1. 支持数组参数展开

修改 `MdRenderer.vue` 以支持 markdown-it-container 的参数格式:

```typescript
// 注册 markdown-it 插件
if (props.markdownItPlugins && props.markdownItPlugins.length > 0) {
  props.markdownItPlugins.forEach((config: MarkdownItPluginConfig) => {
    // 如果 options 是数组，则展开参数（用于 markdown-it-container 等插件）
    if (Array.isArray(config.options)) {
      mdInstance.use(config.plugin, ...config.options);
    } else {
      mdInstance.use(config.plugin, config.options);
    }
  });
}
```

### 2. 创建辅助函数

为了简化配置,创建了 `src/helpers/containerHelpers.ts`:

```typescript
export function createAlertContainer(
  type: 'info' | 'warning' | 'error' | 'success',
  plugin: any
): MarkdownItPluginConfig {
  return {
    plugin,
    options: [type, {
      render: (tokens: any[], idx: number) => {
        if (tokens[idx].nesting === 1) {
          return `<div class="alert" data-type="${type}">\n`;
        } else {
          return '</div>\n';
        }
      }
    }]
  };
}

export function createAllAlertContainers(plugin: any): MarkdownItPluginConfig[] {
  return [
    createAlertContainer('info', plugin),
    createAlertContainer('warning', plugin),
    createAlertContainer('error', plugin),
    createAlertContainer('success', plugin)
  ];
}
```

### 3. 简化使用

现在可以一行代码配置所有 Alert 容器:

```typescript
import { createAllAlertContainers } from 'mio-previewer/helpers';
import markdownItContainer from 'markdown-it-container';

const markdownItPlugins = createAllAlertContainers(markdownItContainer);
```

## 更新的文件

1. ✅ `src/MdRenderer.vue` - 支持数组参数展开
2. ✅ `src/helpers/containerHelpers.ts` - 辅助函数
3. ✅ `src/helpers/index.ts` - 导出
4. ✅ `src/index.ts` - 库入口导出
5. ✅ `src/App-plugin-demo.vue` - 使用新语法和辅助函数
6. ✅ `src/plugins/AlertPlugin.ts` - 更新文档注释
7. ✅ `docs/PLUGIN_GUIDE.md` - 添加详细说明
8. ✅ `package.json` - 添加依赖

## 语法对比

### 旧语法 (不支持 Markdown)

```html
<div class="alert" data-type="info">
这是 **加粗** 文本 (不会被解析)
</div>
```

### 新语法 (支持 Markdown)

```markdown
::: info
这是 **加粗** 文本 (会被正确解析为粗体)
:::
```

## 优势

1. ✅ **完整的 Markdown 支持**: 容器内可以使用所有 Markdown 语法
2. ✅ **语法清晰**: `::: type ... :::` 语法更符合 Markdown 风格
3. ✅ **易于配置**: 辅助函数简化了配置过程
4. ✅ **类型安全**: 完整的 TypeScript 类型支持
5. ✅ **向后兼容**: 仍然支持原有的 HTML 标签语法(但内容不会被解析为 Markdown)

## 测试

在浏览器中打开 `http://localhost:5173/plugin-demo.html` 可以看到:

- ✅ Alert 容器中的 **加粗** 文本正确显示
- ✅ Alert 容器中的 *斜体* 文本正确显示
- ✅ Alert 容器中的列表正确显示
- ✅ Alert 容器中的链接正确显示
- ✅ Alert 容器中的 emoji 代码正确转换
- ✅ 四种 Alert 类型(info, warning, error, success)都正常工作

## 总结

通过引入 `markdown-it-container` 插件和创建辅助函数,成功解决了 Alert 插件中 Markdown 语法不被解析的问题,同时保持了简洁的 API 和良好的开发体验。
