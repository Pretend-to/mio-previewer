<template>
  <div class="mermaid-diagram-wrapper">
    <div class="mermaid-controls">
      <button @click="resetZoom" class="control-btn" title="重置缩放">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zM1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8z"/>
          <path d="M8 4.5a.5.5 0 0 1 .5.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0v-2h-2a.5.5 0 0 1 0-1h2v-2A.5.5 0 0 1 8 4.5z"/>
        </svg>
      </button>
      <button @click="toggleFullscreen" class="control-btn" title="全屏预览">
        <svg v-if="!isFullscreen" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/>
        </svg>
      </button>
      <span class="zoom-indicator">{{ Math.round(scale * 100) }}%</span>
    </div>
    <div 
      ref="containerRef" 
      class="mermaid-diagram"
      :class="{ 'is-fullscreen': isFullscreen, 'is-dragging': isDragging }"
      @wheel.prevent="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    >
      <div 
        ref="diagramRef" 
        class="mermaid-diagram-content"
        :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }"
      ></div>
    </div>
    <div v-if="error && !isStreaming" class="mermaid-error">
      <strong>Mermaid 渲染错误:</strong>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import mermaid from 'mermaid'

const props = defineProps<{
  code: string
  isStreaming?: boolean
}>()

const diagramRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const error = ref<string | null>(null)
const currentTheme = ref<'dark' | 'default'>('default')

// 缩放和拖动状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartTranslateX = ref(0)
const dragStartTranslateY = ref(0)
const isFullscreen = ref(false)

// 检测当前主题（优先级：.theme-dark/light class > prefers-color-scheme）
const detectTheme = (): 'dark' | 'default' => {
  // 检查文档根元素是否有主题类
  const hasThemeDark = document.documentElement.classList.contains('theme-dark') ||
                       document.body.classList.contains('theme-dark')
  const hasThemeLight = document.documentElement.classList.contains('theme-light') ||
                        document.body.classList.contains('theme-light')
  
  if (hasThemeDark) return 'dark'
  if (hasThemeLight) return 'default'
  
  // 检查 prefers-color-scheme
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  
  return 'default'
}

// 初始化 mermaid 配置
const initMermaid = (theme: 'dark' | 'default') => {
  mermaid.initialize({
    suppressErrorRendering: true,
    startOnLoad: false,
    theme: theme,
    securityLevel: 'loose',
    themeVariables: theme === 'dark' ? {
      darkMode: true,
      background: '#1e1e1e',
      primaryColor: '#4d94ff',
      primaryTextColor: '#e0e0e0',
      primaryBorderColor: '#6b9aff',
      lineColor: '#888',
      secondaryColor: '#2d3748',
      tertiaryColor: '#3d4858',
      mainBkg: '#2d3748',
      secondBkg: '#1e1e1e',
      mainContrastColor: '#e0e0e0',
      darkTextColor: '#e0e0e0',
      border1: '#555',
      border2: '#666',
      note: '#4a5568',
      noteBorder: '#6b9aff',
      noteBkg: '#2d3748',
      noteText: '#e0e0e0',
      actorBorder: '#6b9aff',
      actorBkg: '#2d3748',
      actorTextColor: '#e0e0e0',
      actorLineColor: '#888',
      labelBoxBkgColor: '#2d3748',
      labelBoxBorderColor: '#6b9aff',
      labelTextColor: '#e0e0e0',
      loopTextColor: '#e0e0e0',
      activationBorderColor: '#6b9aff',
      activationBkgColor: '#3d4858',
      sequenceNumberColor: '#1e1e1e'
    } : {}
  })
}

// 滚轮缩放处理
const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.min(Math.max(0.1, scale.value * delta), 5)
  scale.value = newScale
}

// 鼠标拖动处理
const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragStartTranslateX.value = translateX.value
  dragStartTranslateY.value = translateY.value
  if (containerRef.value) {
    containerRef.value.style.cursor = 'grabbing'
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  translateX.value = dragStartTranslateX.value + deltaX
  translateY.value = dragStartTranslateY.value + deltaY
}

const handleMouseUp = () => {
  isDragging.value = false
  if (containerRef.value) {
    containerRef.value.style.cursor = 'grab'
  }
}

const handleMouseLeave = () => {
  if (isDragging.value) {
    isDragging.value = false
    if (containerRef.value) {
      containerRef.value.style.cursor = 'grab'
    }
  }
}

// 重置缩放
const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 全屏切换
const toggleFullscreen = () => {
  if (!containerRef.value) return
  
  if (!isFullscreen.value) {
    // 进入全屏
    if (containerRef.value.requestFullscreen) {
      containerRef.value.requestFullscreen()
    } else if ((containerRef.value as any).webkitRequestFullscreen) {
      (containerRef.value as any).webkitRequestFullscreen()
    } else if ((containerRef.value as any).mozRequestFullScreen) {
      (containerRef.value as any).mozRequestFullScreen()
    } else if ((containerRef.value as any).msRequestFullscreen) {
      (containerRef.value as any).msRequestFullscreen()
    }
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen()
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen()
    }
  }
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  )
}

const renderDiagram = async () => {
  if (!diagramRef.value || !props.code) return

  error.value = null
  diagramRef.value.innerHTML = ''

  try {
    // 检测主题并重新初始化（如果主题变化）
    const newTheme = detectTheme()
    if (newTheme !== currentTheme.value) {
      currentTheme.value = newTheme
      initMermaid(newTheme)
    }

    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
    const { svg } = await mermaid.render(id, props.code)
    diagramRef.value.innerHTML = svg
  } catch (err: any) {
    // 只在非流式模式下显示错误
    // 流式模式下代码可能还未完整，忽略渲染错误
    if (!props.isStreaming) {
      error.value = err?.message || String(err)
      console.error('Mermaid render error:', err)
    }
    // 流式模式下静默失败，不显示错误
    console.log('Mermaid render skipped in streaming mode.')
  }
}

// 监听系统主题变化
let mediaQuery: MediaQueryList | null = null
const handleThemeChange = () => {
  renderDiagram()
}

onMounted(() => {
  // 初始化主题
  currentTheme.value = detectTheme()
  initMermaid(currentTheme.value)
  
  // 首次渲染
  renderDiagram()
  
  // 监听系统主题变化
  if (window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleThemeChange)
  }
  
  // 监听 class 变化（使用 MutationObserver）
  const observer = new MutationObserver(() => {
    renderDiagram()
  })
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  })
  
  // 保存 observer 以便清理
  ;(diagramRef.value as any).__observer = observer
  
  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('msfullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleThemeChange)
  }
  
  if (diagramRef.value && (diagramRef.value as any).__observer) {
    ;(diagramRef.value as any).__observer.disconnect()
  }
  
  // 清理全屏监听器
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('msfullscreenchange', handleFullscreenChange)
})

watch(() => props.code, () => {
  renderDiagram()
})
</script>

<style scoped>
.mermaid-diagram-wrapper {
  margin: 1em 0;
  background: var(--mermaid-bg, #f9f9f9);
  border-radius: 8px;
  border: 1px solid var(--mermaid-border, #e0e0e0);
  position: relative;
}

.mermaid-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: color 0.2s, background 0.2s;
  border-radius: 4px;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #000;
}

.zoom-indicator {
  font-size: 12px;
  color: #666;
  min-width: 45px;
  text-align: center;
  font-weight: 500;
}

.mermaid-diagram {
  position: relative;
  overflow: hidden;
  min-height: 200px;
  padding: 1em;
  cursor: grab;
  user-select: none;
}

.mermaid-diagram.is-dragging {
  cursor: grabbing;
}

.mermaid-diagram.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: var(--mermaid-bg, #f9f9f9);
  margin: 0;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mermaid-diagram-content {
  display: flex;
  justify-content: center;
  align-items: center;
  transform-origin: center center;
  transition: transform 0.1s ease-out;
  will-change: transform;
}

.mermaid-diagram-content :deep(svg) {
  max-width: none;
  height: auto;
}

.mermaid-error {
  color: #c00;
  background: #fff0f0;
  padding: 1em;
  border-radius: 4px;
  margin-top: 1em;
  margin: 1em;
}

.mermaid-error pre {
  margin: 0.5em 0 0 0;
  font-size: 0.9em;
  white-space: pre-wrap;
}

/* 暗色主题支持 */
:global(.theme-dark) .mermaid-controls,
:global(.theme-dark) .mermaid-diagram.is-fullscreen {
  background: rgba(30, 30, 30, 0.95);
}

:global(.theme-dark) .control-btn {
  color: #bbb;
}

:global(.theme-dark) .control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

:global(.theme-dark) .zoom-indicator {
  color: #999;
}

@media (prefers-color-scheme: dark) {
  .mermaid-controls,
  .mermaid-diagram.is-fullscreen {
    background: rgba(30, 30, 30, 0.95);
  }
  
  .control-btn {
    color: #bbb;
  }
  
  .control-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .zoom-indicator {
    color: #999;
  }
}
</style>
