<!-- App.vue (父组件) -->
<template>
  <div class="container">
    <MdRenderer :md="markdownStream" :isStreaming="isStreaming" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import MdRenderer from './MdRenderer.vue'

const markdownStream = ref('')
const isStreaming = ref(true)

const fullText = `
# 图片加载测试

这是一张测试图片：

![测试图片](https://picsum.photos/400/300?random=1)

这是一段普通的文字。这是一段普通的文字。这是一段普通的文字。
# 图片加载测试

这是一张测试图片：

![测试图片](https://picsum.photos/400/300?random=1)

这是一段普通的文字。这是一段普通的文字。这是一段普通的文字。# 图片加载测试

这是一张测试图片：

![测试图片](https://picsum.photos/400/300?random=1)

这是一段普通的文字。这是一段普通的文字。这是一段普通的文字。# 图片加载测试

这是一张测试图片：

![测试图片](https://picsum.photos/400/300?random=1)

这是一段普通的文字。这是一段普通的文字。这是一段普通的文字。# 图片加载测试

这是一张测试图片：

![测试图片](https://picsum.photos/400/300?random=1)

这是一段普通的文字。这是一段普通的文字。这是一段普通的文字。# 图片加载测试

这是一张测试图片：

![测试图片](https://picsum.photos/400/300?random=1)

这是一段普通的文字。这是一段普通的文字。这是一段普通的文字。
`

let intervalId: number | null = null

onMounted(() => {
  let index = 0

  intervalId = window.setInterval(() => {
    if (index < fullText.length) {
      // 模拟流的增长，逐字追加
      markdownStream.value += fullText[index]
      index++
    } else {
      // 流结束
      isStreaming.value = false
      if (intervalId !== null) window.clearInterval(intervalId)
    }
  }, 50) // 每 50 毫秒追加一个字符
})

onUnmounted(() => {
  if (intervalId !== null) window.clearInterval(intervalId)
})
</script>

<style scoped>
.container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
</style>
