# 图片预览插件实现总结

## 功能概述

为 `mio-previewer` 添加了图片预览功能，支持：
- ✅ 点击图片放大预览
- ✅ 前后翻页浏览多张图片
- ✅ 移动端双指缩放、拖动
- ✅ 图片旋转、翻转
- ✅ 全屏查看
- ✅ 键盘导航（←/→ 切换图片）
- ✅ 流式渲染时自动更新图片列表

## 核心改动

### 1. 类型系统扩展

**文件**: `src/types.ts`

添加了 `RenderContext` 类型，用于在插件系统中传递共享状态：

```typescript
export type RenderContext = {
  images?: Array<{
    src: string;
    alt?: string;
    title?: string;
  }>;
  isStreaming?: boolean;
  [key: string]: any;
};
```

更新了 `CustomPlugin` 的 `render` 函数签名，添加 `context` 参数：

```typescript
render: (
  node: ASTNode,
  renderChildren: () => (VNode | string | null)[],
  h: typeof import('vue').h,
  context?: RenderContext  // 新增
) => VNode | string | null;
```

### 2. 渲染器更新

**文件**: `src/components/RecursiveRenderer.vue`

- 添加 `context` prop
- 将 context 传递给所有插件的 render 函数

### 3. MdRenderer 增强

**文件**: `src/MdRenderer.vue`

- 添加 `collectImages` 函数，遍历 AST 收集所有图片
- 创建 `renderContext`，包含图片列表和流式状态
- 集成 `useImageViewerManager`，统一管理所有图片
- 添加隐藏容器用于 Viewer.js 管理

### 4. 图片查看器管理器

**文件**: `src/composables/useImageViewerManager.ts`

核心管理器，负责：
- 收集和管理所有图片元素
- 创建统一的 Viewer.js 实例
- 提供图片注册/注销接口
- 处理图片显示和索引定位

关键方法：
- `registerImage()`: 注册新图片
- `unregisterImage()`: 注销图片
- `updateViewer()`: 更新 Viewer 实例
- `show(index)`: 显示指定索引的图片

### 5. ImageViewer 组件

**文件**: `src/components/ImageViewer.vue`

单个图片组件，负责：
- 注入全局管理器
- 在挂载时注册自身
- 在卸载时注销自身
- 处理点击事件，调用管理器显示

### 6. imageViewerPlugin 插件

**文件**: `src/plugins/custom/imageViewerPlugin.ts`

插件入口，负责：
- 测试 img 节点
- 渲染 ImageViewer 组件替代原生 img
- 计算图片索引
- 传递配置选项

### 7. 现有插件适配

更新了所有现有插件的 `render` 函数签名以适配新的 context 参数：
- `cursorPlugin.ts`
- `codeBlockPlugin.ts`
- `mermaidPlugin.ts`
- `emojiPlugin.ts`

## 架构设计

```
┌─────────────────────────────────────┐
│         MdRenderer                  │
│  - collectImages(ast)               │
│  - useImageViewerManager()          │
│  - provide('imageViewerManager')    │
└────────────┬────────────────────────┘
             │ provide
             ↓
┌─────────────────────────────────────┐
│    RecursiveRenderer                │
│  - 遍历 AST 节点                     │
│  - 调用插件 render(node, ..., ctx)  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│    imageViewerPlugin                │
│  - test: img 节点                    │
│  - render: ImageViewer 组件          │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│    ImageViewer Component            │
│  - inject('imageViewerManager')     │
│  - onMounted: registerImage()       │
│  - onClick: show(index)             │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│    imageViewerManager               │
│  - images: HTMLImageElement[]       │
│  - viewerInstance: Viewer           │
│  - registerImage() / show(index)    │
└─────────────────────────────────────┘
```

## 为什么不在 render 函数中使用生命周期钩子？

初始实现尝试在插件的 `render` 函数中直接使用 `onMounted`、`onUnmounted` 等生命周期钩子，但这会导致错误：

```
[Vue warn]: onMounted is called when there is no active component instance
```

**原因**：
- `render` 函数不是组件的 `setup` 函数
- 生命周期钩子只能在组件的 setup 上下文中调用
- 插件的 render 函数是在渲染阶段调用的，没有组件实例上下文

**解决方案**：
- 创建独立的 Vue 组件 (`ImageViewer.vue`)
- 在组件的 setup 中使用生命周期钩子
- 插件的 render 函数返回该组件实例

## 为什么需要全局管理器？

**问题**：每个图片独立创建 Viewer 实例，无法实现多图片切换

**解决方案**：
- 使用 `useImageViewerManager` 创建全局管理器
- 收集所有图片到一个容器中
- 创建包含所有图片的单个 Viewer 实例
- 点击任意图片时，打开 Viewer 并定位到对应索引

**好处**：
- 支持前后翻页浏览
- 支持缩略图导航
- 统一管理，避免多个实例冲突
- 更好的性能和内存管理

## 文件清单

### 新增文件
- `src/components/ImageViewer.vue` - 图片组件
- `src/composables/useImageViewerManager.ts` - 管理器 composable
- `src/plugins/custom/imageViewerPlugin.ts` - 插件入口
- `src/plugins/index.ts` - 插件统一导出
- `src/App-image-viewer-demo.vue` - 演示页面
- `src/main-image-viewer-demo.ts` - 演示入口
- `image-viewer-demo.html` - 演示 HTML
- `docs/IMAGE_VIEWER_PLUGIN.md` - 使用文档

### 修改文件
- `src/types.ts` - 添加 RenderContext 和更新 CustomPlugin
- `src/components/RecursiveRenderer.vue` - 支持 context 传递
- `src/MdRenderer.vue` - 集成管理器和图片收集
- `src/plugins/custom/index.ts` - 导出新插件
- `src/plugins/custom/cursorPlugin.ts` - 适配 context 参数
- `src/plugins/custom/codeBlockPlugin.ts` - 适配 context 参数
- `src/plugins/custom/mermaidPlugin.ts` - 适配 context 参数
- `src/plugins/custom/emojiPlugin.ts` - 适配 context 参数
- `README.md` - 添加插件说明

### 依赖
- `viewerjs` - 图片查看器库（已安装）

## 使用示例

```vue
<template>
  <MdRenderer 
    :md="markdown" 
    :customPlugins="customPlugins"
  />
</template>

<script setup>
import { MdRenderer } from 'mio-previewer';
import { imageViewerPlugin } from 'mio-previewer/plugins';

// 最简配置 - 使用默认值
const customPlugins = [
  { plugin: imageViewerPlugin }
];

// 自定义配置（可选）
const customPluginsWithOptions = [
  { 
    plugin: imageViewerPlugin,
    options: {
      viewerOptions: {
        navbar: false,  // 隐藏缩略图
        toolbar: false  // 隐藏工具栏
      }
    }
  }
];

const markdown = `
![Image 1](url1.jpg)
![Image 2](url2.jpg)
`;
</script>
```

**默认配置包括**：
- ✅ 完整的工具栏（缩放、旋转、翻转、重置等）
- ✅ 缩略图导航栏
- ✅ 图片标题显示
- ✅ 键盘快捷键支持
- ✅ 全屏模式
- ❌ 自动播放（默认关闭）

## 演示

运行 `pnpm dev` 并访问 `http://localhost:5173/image-viewer-demo.html`

## 下一步优化

可能的改进方向：
1. 懒加载支持
2. 预加载相邻图片
3. 图片加载状态显示
4. 自定义过渡动画
5. 支持视频预览
6. 缩略图预览模式

## 总结

本次实现通过以下关键设计实现了完整的图片预览功能：

1. **插件系统扩展**：添加 context 传递机制，支持共享状态
2. **组件化设计**：将图片处理逻辑封装在独立组件中
3. **全局管理器**：统一管理所有图片，支持多图切换
4. **流式兼容**：自动适配流式渲染场景
5. **类型安全**：完整的 TypeScript 类型定义

这个实现不仅解决了图片预览的需求，还为未来添加更多需要共享状态的插件奠定了基础。
