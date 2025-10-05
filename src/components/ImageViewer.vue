<template>
  <img
    ref="imgRef"
    :src="src"
    :alt="alt"
    :title="title"
    :data-original="src"
    :data-index="index"
    class="mio-image-viewer"
    :style="imageStyle"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, computed } from 'vue';
import type { RenderContext } from '../types';

interface Props {
  src: string;
  alt?: string;
  title?: string;
  index?: number;
  context?: RenderContext;
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  title: '',
  index: 0
});

const imgRef = ref<HTMLImageElement | null>(null);

// 注入全局的图片查看器管理器
const viewerManager = inject<any>('imageViewerManager', null);

const imageStyle = {
  cursor: 'pointer',
  maxWidth: '100%',
  height: 'auto'
};

// 计算当前图片在所有图片中的实际索引
const actualIndex = computed(() => {
  const images = props.context?.images || [];
  if (props.src && images.length > 0) {
    const index = images.findIndex(img => img.src === props.src);
    return index !== -1 ? index : 0;
  }
  return 0;
});

onMounted(() => {
  // 将图片注册到管理器
  if (viewerManager && imgRef.value) {
    viewerManager.registerImage(imgRef.value);
  }
});

onUnmounted(() => {
  // 从管理器注销图片
  if (viewerManager && imgRef.value) {
    viewerManager.unregisterImage(imgRef.value);
  }
});

// 点击图片时打开查看器
function handleClick() {
  if (viewerManager) {
    viewerManager.show(actualIndex.value);
  }
}
</script>

<style scoped>
.mio-image-viewer {
  display: inline-block;
  max-width: 100%;
  height: auto;
}
</style>

