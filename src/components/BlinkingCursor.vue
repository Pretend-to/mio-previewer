<!-- src/components/BlinkingCursor.vue -->
<template>
  <span class="blinking-cursor"></span>
</template>

<style scoped>
.blinking-cursor {
  display: inline-block;
  width: 8px;
  height: 1.2em;
  background-color: #333;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
}

@keyframes blink {
  50% {
    background-color: transparent;
  }
}
</style>
