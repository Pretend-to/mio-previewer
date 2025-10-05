# 图片预览插件 (Image Viewer Plugin)

图片预览插件为 Markdown 中的图片添加点击放大预览功能，基于 [viewerjs](https://github.com/fengyuanchen/viewerjs) 实现。

## 功能特性

- 🖱️ **点击放大**：点击图片进入全屏预览模式
- 📱 **移动端友好**：支持双指缩放、拖动等手势操作
- 🔄 **图片旋转**：支持图片旋转和翻转
- 🖼️ **全屏查看**：支持全屏浏览
- ⌨️ **键盘导航**：使用 ←/→ 键切换图片
- 🔍 **缩放控制**：支持鼠标滚轮和按钮缩放
- 📊 **工具栏**：内置工具栏提供完整控制
- 🎯 **流式更新**：自动跟踪流式渲染中新增的图片

## 快速开始

### 基本使用（推荐）

默认配置已经包含完整的工具栏功能，直接使用即可：

```typescript
import MdRenderer from 'mio-previewer';
import { imageViewerPlugin } from 'mio-previewer/plugins';

const customPlugins = [
  { plugin: imageViewerPlugin }  // 使用默认配置
];

// 在组件中使用
<MdRenderer 
  :md="markdown" 
  :customPlugins="customPlugins"
/>
```

默认配置包括：
- ✅ 所有工具栏按钮（缩放、旋转、翻转等）
- ✅ 缩略图导航栏
- ✅ 图片标题显示
- ✅ 键盘快捷键
- ✅ 全屏支持
- ❌ 自动播放（默认关闭）

### 自定义配置（可选）

如需自定义配置，可以传入 `viewerOptions`：

```typescript
const customPlugins = [
  { 
    plugin: imageViewerPlugin, 
    options: { 
      viewerOptions: {
        navbar: false,     // 隐藏缩略图导航
        toolbar: false,    // 隐藏工具栏
        title: false,      // 隐藏标题
        loop: false        // 不循环浏览
      }
    } 
  }
];
```

### 完全自定义工具栏

```typescript
const customPlugins = [
  { 
    plugin: imageViewerPlugin, 
    options: { 
      viewerOptions: {
        toolbar: {
          zoomIn: 4,         // 显示在第 4 位
          zoomOut: 3,        // 显示在第 3 位
          oneToOne: 2,       // 1:1 显示在第 2 位
          reset: 1,          // 重置显示在第 1 位
          prev: false,       // 隐藏上一张按钮
          play: false,       // 隐藏播放按钮
          next: false,       // 隐藏下一张按钮
          rotateLeft: true,  // 显示左旋转
          rotateRight: true, // 显示右旋转
          flipHorizontal: true,  // 显示水平翻转
          flipVertical: true,    // 显示垂直翻转
        }
      }
    } 
  }
];
          flipHorizontal: true,
          flipVertical: true,
        }
      }
    } 
  }
];
```

## 配置选项

### ImageViewerPluginOptions

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `priority` | `number` | `50` | 插件优先级（数字越大越先执行） |
| `viewerOptions` | `Viewer.Options` | 见下文 | Viewer.js 配置选项 |

### Viewer.Options（常用选项）

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `inline` | `boolean` | `false` | 是否内联显示（而非弹窗） |
| `button` | `boolean` | `true` | 是否显示关闭按钮 |
| `navbar` | `boolean` | `true` | 是否显示缩略图导航栏 |
| `title` | `boolean` | `true` | 是否显示图片标题（来自 alt/title 属性） |
| `toolbar` | `boolean \| object` | `true` | 工具栏配置 |
| `tooltip` | `boolean` | `true` | 是否显示缩放百分比提示 |
| `movable` | `boolean` | `true` | 是否允许拖动图片 |
| `zoomable` | `boolean` | `true` | 是否允许缩放图片 |
| `rotatable` | `boolean` | `true` | 是否允许旋转图片 |
| `scalable` | `boolean` | `true` | 是否允许翻转图片 |
| `transition` | `boolean` | `true` | 是否启用 CSS3 过渡动画 |
| `fullscreen` | `boolean` | `true` | 是否启用全屏 |
| `keyboard` | `boolean` | `true` | 是否启用键盘支持 |
| `loop` | `boolean` | `true` | 是否循环浏览 |

更多配置选项请参考 [Viewer.js 官方文档](https://github.com/fengyuanchen/viewerjs#options)。

## 工作原理

### 架构设计

图片预览插件采用"全局管理器 + 单图片组件"的架构：

```
MdRenderer (提供 imageViewerManager)
    ↓ provide
ImageViewer 组件 (每个图片)
    ↓ inject & register
imageViewerManager
    ↓ 统一管理
Viewer.js 实例 (包含所有图片)
```

### 核心组件

1. **useImageViewerManager** (`src/composables/useImageViewerManager.ts`)
   - 全局管理器，负责收集和管理所有图片
   - 创建统一的 Viewer.js 实例
   - 提供图片注册/注销和显示方法

2. **ImageViewer** (`src/components/ImageViewer.vue`)
   - 单个图片组件
   - 注入管理器并注册自身
   - 处理点击事件，调用管理器显示图片

3. **imageViewerPlugin** (`src/plugins/custom/imageViewerPlugin.ts`)
   - 插件入口，测试和渲染 img 节点
   - 使用 ImageViewer 组件替换原生 img 标签

### 状态管理

插件通过 `RenderContext` 接收图片列表状态：

```typescript
type RenderContext = {
  images?: Array<{
    src: string;
    alt?: string;
    title?: string;
  }>;
  isStreaming?: boolean;
  [key: string]: any;
};
```

### 图片收集

`MdRenderer` 在解析 AST 时自动收集所有图片节点：

```typescript
function collectImages(nodes: ASTNode[]): RenderContext['images'] {
  const images: NonNullable<RenderContext['images']> = [];
  
  function traverse(node: ASTNode) {
    if (node.type === 'tag' && node.name === 'img' && node.attribs?.src) {
      images.push({
        src: node.attribs.src,
        alt: node.attribs.alt,
        title: node.attribs.title
      });
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return images;
}
```

### 图片注册流程

1. **MdRenderer 初始化**：创建 `imageViewerManager` 并通过 `provide` 提供给子组件
2. **ImageViewer 挂载**：每个图片组件挂载时，通过 `inject` 获取管理器并注册自身
3. **管理器更新**：管理器收集所有图片，创建包含所有图片的 Viewer 实例
4. **点击查看**：用户点击任意图片时，管理器打开 Viewer 并定位到对应图片
5. **前后翻页**：Viewer 实例包含所有图片，支持键盘/按钮切换

### 流式更新支持

在流式渲染模式下，新图片会自动注册到管理器：

```typescript
// ImageViewer 组件挂载时自动注册
onMounted(() => {
  if (viewerManager && imgRef.value) {
    viewerManager.registerImage(imgRef.value);
  }
});

// 管理器自动更新 Viewer 实例
function registerImage(img: HTMLImageElement) {
  if (!images.value.includes(img)) {
    images.value.push(img);
    updateViewer(); // 重新创建包含新图片的 Viewer
  }
}
```

## 示例

### 在 Markdown 中使用

```markdown
# 图片展示

![Vue.js Logo](https://vuejs.org/images/logo.png "Vue.js")

![Vite Logo](https://vitejs.dev/logo.svg "Vite")

点击图片可以放大查看！
```

### 流式渲染示例

```vue
<template>
  <div>
    <button @click="startStreaming">开始流式渲染</button>
    <MdRenderer 
      :md="markdownStream" 
      :isStreaming="isStreaming"
      :customPlugins="customPlugins"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MdRenderer from 'mio-previewer';
import { imageViewerPlugin } from 'mio-previewer/plugins';

const markdownStream = ref('');
const isStreaming = ref(false);

const customPlugins = [
  { plugin: imageViewerPlugin }
];

function startStreaming() {
  isStreaming.value = true;
  const text = '# Images\n\n![Image 1](url1.jpg)\n\n![Image 2](url2.jpg)';
  let index = 0;
  
  const interval = setInterval(() => {
    if (index < text.length) {
      markdownStream.value += text[index];
      index++;
    } else {
      clearInterval(interval);
      isStreaming.value = false;
    }
  }, 50);
}
</script>
```

## 键盘快捷键

当查看器处于活动状态时，支持以下键盘快捷键：

- `←` / `A`：查看上一张图片
- `→` / `D`：查看下一张图片
- `↑` / `W`：放大图片
- `↓` / `S`：缩小图片
- `Space`：切换播放状态
- `Esc`：退出查看器
- `Ctrl` + `0`：重置图片大小
- `Ctrl` + `←`：向左旋转
- `Ctrl` + `→`：向右旋转

## 移动端手势

- **双指缩放**：捏合缩放图片
- **拖动**：单指拖动移动图片
- **双击**：双击放大/缩小图片

## 样式自定义

插件为图片添加了 `mio-image-viewer` 类，您可以自定义样式：

```css
/* 自定义图片样式 */
.mio-image-viewer {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.mio-image-viewer:hover {
  transform: scale(1.02);
}
```

## 注意事项

1. **跨域图片**：如果图片来自不同域名，可能会受到 CORS 限制
2. **性能优化**：大量图片时建议使用懒加载
3. **移动端适配**：插件已优化移动端体验，但建议测试具体设备
4. **图片格式**：支持所有浏览器支持的图片格式（JPG, PNG, GIF, WebP, SVG 等）

## 演示

运行演示页面：

```bash
pnpm dev
# 访问 http://localhost:5173/image-viewer-demo.html
```

或查看 `src/App-image-viewer-demo.vue` 了解完整示例。

## 相关资源

- [Viewer.js 官方文档](https://github.com/fengyuanchen/viewerjs)
- [Viewer.js 在线演示](https://fengyuanchen.github.io/viewerjs/)
- [mio-previewer 插件系统文档](./PLUGINS.md)

## 许可证

MIT
