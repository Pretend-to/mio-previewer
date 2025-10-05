<!-- src/components/BlinkingCursor.vue -->
<template>
  <span 
    class="blinking-cursor" 
    :class="`cursor-${shape}`"
    :style="cursorStyle"
  ></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  shape?: 'square' | 'line' | 'circle';
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  shape: 'square',
  color: '#333'
});

const cursorStyle = computed(() => ({
  backgroundColor: props.color
}));
</script>

<style scoped>
.blinking-cursor {
  display: inline-block;
  animation: blink 1.2s ease-in-out infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
}

.cursor-square {
  width: 8px;
  height: 1.2em;
}

.cursor-line {
  width: 2px;
  height: 1.2em;
}

.cursor-circle {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  vertical-align: baseline;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}
</style>
