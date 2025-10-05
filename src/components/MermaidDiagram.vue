<template>
  <div class="mermaid-diagram-wrapper">
    <div ref="diagramRef" class="mermaid-diagram"></div>
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
const error = ref<string | null>(null)
const currentTheme = ref<'dark' | 'default'>('default')

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
})

onUnmounted(() => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleThemeChange)
  }
  
  if (diagramRef.value && (diagramRef.value as any).__observer) {
    ;(diagramRef.value as any).__observer.disconnect()
  }
})

watch(() => props.code, () => {
  renderDiagram()
})
</script>

<style scoped>
.mermaid-diagram-wrapper {
  margin: 1em 0;
  padding: 1em;
  background: var(--mermaid-bg, #f9f9f9);
  border-radius: 8px;
  border: 1px solid var(--mermaid-border, #e0e0e0);
}

.mermaid-diagram {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: auto;
}

.mermaid-diagram :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-error {
  color: #c00;
  background: #fff0f0;
  padding: 1em;
  border-radius: 4px;
  margin-top: 1em;
}

.mermaid-error pre {
  margin: 0.5em 0 0 0;
  font-size: 0.9em;
  white-space: pre-wrap;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .mermaid-diagram-wrapper {
    --mermaid-bg: #1e1e1e;
    --mermaid-border: #444;
  }
}

.theme-dark .mermaid-diagram-wrapper {
  --mermaid-bg: #1e1e1e;
  --mermaid-border: #444;
}

.theme-light .mermaid-diagram-wrapper {
  --mermaid-bg: #f9f9f9;
  --mermaid-border: #e0e0e0;
}
</style>
