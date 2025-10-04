<!-- App-plugin-demo.vue - 插件系统演示 -->
<template>
  <div class="container">
    <div class="controls">
      <h2>插件系统演示</h2>
      <button @click="startStreaming">开始流式渲染</button>
      <button @click="resetStreaming">重置</button>
    </div>
    <div class="preview">
      <MdRenderer 
        :md="markdownStream" 
        :isStreaming="isStreaming"
        :customPlugins="customPlugins"
        :markdownItPlugins="markdownItPlugins"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MdRenderer from './MdRenderer.vue'
import { AlertPlugin, EmojiPlugin } from './plugins'
import { createAllAlertContainers } from './helpers'
// @ts-ignore - markdown-it-container types issue
import markdownItContainer from 'markdown-it-container'

const markdownStream = ref('')
const isStreaming = ref(false)

// 示例文本，包含自定义标记
const fullText = `# 插件系统演示 :rocket:

这是一个普通的段落，包含一些表情 :smile: :fire:

## 自定义 Alert 警告框

::: info
这是一个 **info** 类型的警告框 :eyes:
支持 *Markdown* 语法!
:::

::: warning
⚠️ 这是一个 **warning** 类型的警告框
可以有 \`代码\` 和其他格式
:::

::: error
❌ 这是一个 **error** 类型的警告框
- 支持列表
- 支持 **加粗**
:::

::: success
✅ 这是一个 **success** 类型的警告框 :check:
[链接也可以](https://example.com)
:::

## Emoji 表情替换

Hello :smile: Welcome! :tada:

Let's build something awesome :rocket: :fire:

Great work! :thumbsup: :100: :star:

## 代码块

\`\`\`javascript
const plugins = [AlertPlugin, EmojiPlugin];
console.log('Plugins loaded!', plugins);
\`\`\`

## 列表 :check:

- 项目 1 :star:
- 项目 2 :fire:
- 项目 3 :rocket:

## 表格

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A :heart: | B :star: | C :fire: |
| D | E | F |

## 链接

这是一个 [链接示例](https://example.com) :eyes:

---

**流式渲染完成!** :tada: :100:
`

// 使用内置插件
const customPlugins = ref([
  AlertPlugin,
  EmojiPlugin
]);

// 配置 markdown-it-container 来支持自定义容器语法
// ::: type
// 内容
// :::
const markdownItPlugins = ref(createAllAlertContainers(markdownItContainer));

let intervalId: number | null = null;

function startStreaming() {
  if (isStreaming.value) return;
  
  markdownStream.value = '';
  isStreaming.value = true;
  let index = 0;

  intervalId = window.setInterval(() => {
    if (index < fullText.length) {
      markdownStream.value += fullText[index];
      index++;
    } else {
      isStreaming.value = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }
  }, 20); // 每 20 毫秒追加一个字符
}

function resetStreaming() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  markdownStream.value = '';
  isStreaming.value = false;
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #2d3748;
}

.controls button {
  margin-right: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background-color: #3b82f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.controls button:hover {
  background-color: #2563eb;
}

.controls button:active {
  background-color: #1d4ed8;
}

.preview {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}
</style>
