<template>
  <div class="image-viewer-demo">
    <h1>图片预览插件演示</h1>
    
    <div class="controls">
      <button @click="toggleStreaming" :class="{ active: isStreaming }">
        {{ isStreaming ? '停止流式' : '开始流式' }}
      </button>
      <button @click="resetMarkdown">重置</button>
      <button @click="loadMoreImages">加载更多图片</button>
    </div>
    
    <div class="info">
      <p>当前图片数量: {{ imageCount }}</p>
      <p>流式状态: {{ isStreaming ? '进行中' : '已停止' }}</p>
    </div>
    
    <MdRenderer 
      :md="markdownStream" 
      :isStreaming="isStreaming"
      :customPlugins="customPlugins"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MdRenderer from './MdRenderer.vue';
import { imageViewerPlugin, cursorPlugin } from './plugins/custom';

// 初始 Markdown 内容
const initialMarkdown = `# 图片预览插件演示

点击图片可以放大预览，支持：
- 🖱️ 点击图片放大
- 📱 移动端双指缩放
- ↔️ 拖动图片
- 🔄 旋转图片
- 🖼️ 全屏查看
- ⌨️ 键盘导航（←/→ 切换图片）

## 示例图片

![Vue.js Logo](https://vuejs.org/images/logo.png "Vue.js")

![Vite Logo](https://vitejs.dev/logo.svg "Vite")
`;

const additionalImages = [
  '![GitHub](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png "GitHub")',
  '![TypeScript](https://www.typescriptlang.org/icons/icon-512x512.png "TypeScript")',
  '![Markdown](https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg "Markdown")',
];

const markdownStream = ref('');
const isStreaming = ref(false);
let streamingInterval: any = null;
let currentIndex = 0;

// 配置插件
const customPlugins = [
  { plugin: imageViewerPlugin }, // 使用默认配置
  { plugin: cursorPlugin, options: { shape: 'line', color: '#0066ff' } }
];

// 计算图片数量
const imageCount = computed(() => {
  const matches = markdownStream.value.match(/!\[.*?\]\(.*?\)/g);
  return matches ? matches.length : 0;
});

// 开始/停止流式渲染
function toggleStreaming() {
  if (isStreaming.value) {
    stopStreaming();
  } else {
    startStreaming();
  }
}

function startStreaming() {
  if (streamingInterval) return;
  
  isStreaming.value = true;
  currentIndex = 0;
  markdownStream.value = '';
  
  const fullText = initialMarkdown;
  const chunkSize = 3; // 每次添加 3 个字符
  
  streamingInterval = setInterval(() => {
    if (currentIndex < fullText.length) {
      const chunk = fullText.substring(currentIndex, currentIndex + chunkSize);
      markdownStream.value += chunk;
      currentIndex += chunkSize;
    } else {
      stopStreaming();
    }
  }, 30); // 每 30ms 添加一次
}

function stopStreaming() {
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }
  isStreaming.value = false;
}

// 重置 Markdown
function resetMarkdown() {
  stopStreaming();
  markdownStream.value = '';
  setTimeout(() => {
    markdownStream.value = initialMarkdown;
  }, 100);
}

// 加载更多图片
function loadMoreImages() {
  const nextImage = additionalImages.shift();
  if (nextImage) {
    markdownStream.value += '\n\n' + nextImage;
  } else {
    alert('没有更多图片了！');
  }
}

// 初始化
onMounted(() => {
  markdownStream.value = initialMarkdown;
});

// 清理
import { onUnmounted } from 'vue';
onUnmounted(() => {
  stopStreaming();
});
</script>

<style scoped>
.image-viewer-demo {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

button:hover {
  background: #f5f5f5;
  border-color: #0066ff;
}

button.active {
  background: #0066ff;
  color: white;
  border-color: #0066ff;
}

.info {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.info p {
  margin: 0.5rem 0;
  font-size: 14px;
  color: #666;
}

/* 图片样式优化 */
:deep(.mio-image-viewer) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 1rem 0;
}

:deep(.mio-image-viewer:hover) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式 */
@media (max-width: 768px) {
  .image-viewer-demo {
    padding: 1rem;
  }
  
  .controls {
    flex-direction: column;
  }
  
  button {
    width: 100%;
  }
}
</style>
