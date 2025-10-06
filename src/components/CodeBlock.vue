<template>
  <div 
    class="code-block-wrapper" 
    :class="{ 'fullscreen': isFullscreen }"
    :data-lang="language"
  >
    <!-- Tooltip 提示 - 使用 Teleport 渲染到 body -->
    <Teleport to="body">
      <div 
        v-if="tooltipVisible"
        class="code-block-tooltip"
        :style="{
          left: tooltipLeft,
          top: tooltipTop
        }"
      >
        {{ tooltipMessage }}
      </div>
    </Teleport>
    
    <div class="code-block-header">
      <span class="lang-label">{{ language.toUpperCase() }}</span>
      <div class="op-btn-group">
        <!-- 复制按钮 -->
        <button
          class="copy-code-button"
          type="button"
          title="复制代码"
          @click="handleCopy"
          v-html="copySvg"
        ></button>
        
        <!-- HTML 预览按钮 (仅 HTML 语言显示) -->
        <button
          v-if="isHtmlLang() && !isPreviewOpen"
          class="preview-html-button"
          type="button"
          title="预览 HTML"
          @click="handlePreview"
          v-html="previewSvg"
        ></button>
        
        <!-- 发布按钮 (仅 HTML 语言且配置了 publishUrl 时显示) -->
        <button
          v-if="isHtmlLang() && publishUrl"
          class="publish-html-button"
          :disabled="isPublishing"
          type="button"
          :title="publishStatus"
          @click="handlePublish"
          v-html="publishSvg"
        ></button>
        
        <!-- 全屏按钮 -->
        <button
          v-if="!isFullscreen"
          class="fullscreen-button"
          type="button"
          title="全屏"
          @click="handleFullscreen"
          v-html="fullscreenSvg"
        ></button>
        
        <!-- 退出全屏按钮 -->
        <button
          v-if="isFullscreen"
          class="exit-fullscreen-button"
          type="button"
          title="退出全屏"
          @click="handleExitFullscreen"
          v-html="exitFullscreenSvg"
        ></button>
        
        <!-- 关闭预览按钮 -->
        <button
          v-if="isPreviewOpen"
          class="close-preview-button"
          type="button"
          title="关闭预览"
          @click="handleClosePreview"
          v-html="closeSvg"
        ></button>
      </div>
    </div>
    
    <!-- 代码区域 -->
    <pre
      v-show="!isPreviewOpen"
      :class="`language-${language}`"
    ><code :class="`language-${language}`" v-html="highlightedCode"></code></pre>
    
    <!-- HTML 预览区域 -->
    <div v-if="isPreviewOpen" class="iframe-wrapper" :style="{ height: iframeHeight }">
      <iframe
        ref="previewIframe"
        class="html-preview-iframe"
        :srcdoc="enhancedHtmlCode"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
        @load="handleIframeLoad"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import Prism from 'prismjs';
// Import Prism theme so CSS is included in the build
import 'prismjs/themes/prism-tomorrow.css';

// 导入常用语言支持
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-markup-templating'; // PHP 依赖
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

const props = defineProps<{
  code: string;
  language: string;
  publishUrl?: string;
  onPublished?: (url: string) => void;
}>();

const isCopied = ref(false);
const isPreviewOpen = ref(false);
const previewIframe = ref<HTMLIFrameElement | null>(null);
const iframeHeight = ref('300px');
const isPublishing = ref(false);
const isPublished = ref(false);
const isFullscreen = ref(false);

// Tooltip 消息
const tooltipMessage = ref('');
const tooltipVisible = ref(false);
const tooltipLeft = ref('0px');
const tooltipTop = ref('0px');

// 计算发布按钮的 title
const publishStatus = computed(() => {
  if (isPublishing.value) return '正在发布...';
  if (isPublished.value) return '已发布成功';
  return '发布 HTML';
});

// 生成唯一的 iframe ID
const iframeId = `iframe-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;

// 计算是否为 HTML 语言
function isHtmlLang() {
  return props.language.toLowerCase() === 'html' || 
         props.language.toLowerCase() === 'markup';
}

// 计算高亮后的代码
function getHighlightedCode(): string {
  const lang = props.language || 'plaintext';
  if (Prism.languages[lang]) {
    return Prism.highlight(props.code, Prism.languages[lang], lang);
  }
  return Prism.util.encode(props.code) as string;
}

const highlightedCode = ref('');

// 更新高亮代码
const updateHighlight = () => {
  highlightedCode.value = getHighlightedCode();
};

// 初始化和监听 props 变化
updateHighlight();
watch(() => [props.code, props.language], () => {
  updateHighlight();
});

// 打开预览
const handlePreview = () => {
  isPreviewOpen.value = true;
};

// 关闭预览
const handleClosePreview = () => {
  isPreviewOpen.value = false;
  iframeHeight.value = '300px'; // 重置高度
};

// 显示 Tooltip
const showTooltip = (message: string, button: HTMLButtonElement | null, duration = 2000) => {
  if (!button) {
    console.warn('showTooltip: button is null');
    return;
  }
  
  tooltipMessage.value = message;
  
  // 获取按钮的位置（相对于视口）
  const rect = button.getBoundingClientRect();
  
  // 使用视口坐标，因为 tooltip 被 teleport 到 body
  const left = rect.left + rect.width / 2;
  const top = rect.top;
  
  tooltipLeft.value = `${left}px`;
  tooltipTop.value = `${top}px`;
  
  console.log('Tooltip:', { message, left, top, visible: true });
  
  tooltipVisible.value = true;
  
  setTimeout(() => {
    tooltipVisible.value = false;
  }, duration);
};

// 复制代码
const handleCopy = async (event: MouseEvent) => {
  const button = event.currentTarget as HTMLButtonElement; // 在异步前保存引用
  try {
    await navigator.clipboard.writeText(props.code);
    isCopied.value = true;
    showTooltip('已复制', button);
    setTimeout(() => {
      isCopied.value = false;
    }, 1700);
  } catch (err) {
    console.error('复制失败:', err);
    showTooltip('复制失败', button);
  }
};

// 发布 HTML
const handlePublish = async (event: MouseEvent) => {
  if (!props.publishUrl || isPublishing.value) return;
  
  const button = event.currentTarget as HTMLButtonElement; // 在异步前保存引用
  isPublishing.value = true;
  isPublished.value = false;
  showTooltip('正在发布...', button, 10000); // 长时间显示
  
  try {
    const response = await fetch(props.publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: props.code }),
    });
    
    const result = await response.json();
    
    if (result.code === 0) {
      isPublished.value = true;
      
      // 如果有回调函数，执行回调
      if (props.onPublished && result.url) {
        props.onPublished(result.url);
        showTooltip('已发布成功', button);
      } 
      // 否则复制 URL 到剪贴板
      else if (result.url) {
        await navigator.clipboard.writeText(result.url);
        showTooltip('已发布，URL 已复制', button);
      } else {
        showTooltip('已发布成功', button);
      }
      
      // 2秒后恢复按钮状态
      setTimeout(() => {
        isPublished.value = false;
      }, 2000);
    } else {
      showTooltip(`发布失败: ${result.msg || '未知错误'}`, button);
      console.error('发布失败:', result.msg || '未知错误');
    }
  } catch (err) {
    showTooltip('发布失败，请检查网络', button);
    console.error('发布失败:', err);
  } finally {
    isPublishing.value = false;
  }
};

// 全屏模式
const handleFullscreen = () => {
  isFullscreen.value = true;
  document.body.style.overflow = 'hidden';
};

// 退出全屏
const handleExitFullscreen = () => {
  isFullscreen.value = false;
  document.body.style.overflow = '';
};

// 增强的 HTML 代码，注入高度自适应脚本
const enhancedHtmlCode = computed(() => {
  const heightScript = `
    <script>
      (function() {
        const iframeId = '${iframeId}';
        
        function sendHeight() {
          const height = Math.max(
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight,
            document.body.scrollHeight,
            document.body.offsetHeight
          );
          window.parent.postMessage({
            type: 'iframe-height',
            iframeId: iframeId,
            height: height
          }, '*');
        }
        
        // 初始发送
        if (document.readyState === 'complete') {
          sendHeight();
        } else {
          window.addEventListener('load', sendHeight);
        }
        
        // 监听内容变化
        const observer = new ResizeObserver(sendHeight);
        observer.observe(document.body);
        
        // 监听 DOM 变化
        const mutationObserver = new MutationObserver(sendHeight);
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        // 定时更新（防止某些情况下监听失效）
        setInterval(sendHeight, 1000);
      })();
    <\/script>
  `;
  
  // 如果 HTML 中没有 </body>，在末尾添加脚本
  if (props.code.toLowerCase().includes('</body>')) {
    return props.code.replace('</body>', `${heightScript}</body>`);
  } else {
    return props.code + heightScript;
  }
});

// 处理 iframe 加载
const handleIframeLoad = () => {
  // iframe 加载完成后，可以进行额外的初始化
};

// 监听来自 iframe 的消息
const handleMessage = (event: MessageEvent) => {
  // 只处理来自当前 iframe 的消息
  if (event.data && 
      event.data.type === 'iframe-height' && 
      event.data.iframeId === iframeId) {
    const height = event.data.height;
    // 设置最小高度 100px，最大高度 1000px
    const clampedHeight = Math.max(100, Math.min(1000, height));
    iframeHeight.value = `${clampedHeight}px`;
  }
};

// 监听 ESC 键退出全屏
const handleEscKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    handleExitFullscreen();
  }
};

// 组件挂载时添加监听
onMounted(() => {
  window.addEventListener('message', handleMessage);
  window.addEventListener('keydown', handleEscKey);
});

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
  window.removeEventListener('keydown', handleEscKey);
  document.body.style.overflow = ''; // 确保清理
});

// SVG 图标
const copySvg = `<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2 0v10h6V2H6zm-1 2V2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8zm-2 2H2V14a2 2 0 0 0 2 2h6v-2a2 2 0 0 0-2-2H4V4zm0 0v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4H4z"/></svg>`;

const previewSvg = `<svg width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 0v10h12V5H4zm3.6 3.55l1.4 1.45l-1.4 1.45L7 11.38l2-2l-2-2zm5.4.83l-1.4-1.45L13 6.62l2 2l-2 2z"/></svg>`;

const closeSvg = `<svg width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" d="M6.23 4.81a1 1 0 0 1 1.41 0L10 7.17l2.36-2.36a1 1 0 0 1 1.41 1.41L11.41 8.59l2.36 2.36a1 1 0 1 1-1.41 1.41L10 10l-2.36 2.36a1 1 0 0 1-1.41-1.41L8.59 8.59 6.23 6.23a1 1 0 0 1 0-1.41z"/></svg>`;

const publishSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;

const fullscreenSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;

const exitFullscreenSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;
</script>

<style scoped>
.code-block-wrapper {
  margin: 1.5em 0;
  background: #262733;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px 0 rgba(110, 125, 140, 0.07);
  border: 1px solid #222229;
  position: relative;
}

/* Tooltip 样式 - 使用 fixed 定位，因为通过 Teleport 渲染到 body */
.code-block-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  margin-top: -8px;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10000;
  animation: tooltipFadeIn 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.code-block-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.9);
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-100% - 5px));
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}

.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2d2f3a;
  padding: 0.35rem 0.85rem;
  border-bottom: 1px solid #23242d;
}

.lang-label {
  color: #a3b0d0;
  font-size: 0.89em;
  font-weight: 600;
  letter-spacing: 1px;
  user-select: none;
}

.op-btn-group {
  display: flex;
  gap: 0.4rem;
}

.op-btn-group button {
  border: none;
  outline: none;
  background: transparent;
  color: #8fa3c1;
  cursor: pointer;
  border-radius: 3px;
  padding: 0.21em;
  transition: color 0.18s, background 0.22s;
  line-height: 1;
  display: flex;
  align-items: center;
  font-size: 1.02rem;
  opacity: 0.85;
}

.op-btn-group button:hover:not(:disabled) {
  background: #ecf6ff1a;
}

.op-btn-group button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.copy-code-button {
  color: #8fa3c1;
}

.publish-html-button {
  color: #10b981;
}

.preview-html-button {
  color: #3486ff;
}

.close-preview-button {
  color: #ff5d5b;
  background: #fae8e410;
}

.fullscreen-button {
  color: #8b5cf6;
}

.exit-fullscreen-button {
  color: #f59e0b;
}

pre,
code {
  background: transparent;
  border-radius: 0;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, Monaco, monospace;
  font-size: 0.92em;
  line-height: 1.6;
  color: #ddd;
}

pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  background: #1e1e2e;
}

pre::-webkit-scrollbar {
  height: 8px;
  background: transparent;
}

pre::-webkit-scrollbar-thumb {
  background-color: rgba(136, 136, 136, 0.6);
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb:hover {
  background-color: rgba(136, 136, 136, 0.9);
}

.iframe-wrapper {
  width: 100%;
  overflow: hidden;
  display: block;
  position: relative;
  border: 1px solid #ddd;
  background: #fff;
  transition: height 0.1s ease-out;
}

.html-preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
  display: block;
}

/* 全屏模式样式 */
.code-block-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  margin: 0;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}

.code-block-wrapper.fullscreen .code-block-header {
  flex-shrink: 0;
}

.code-block-wrapper.fullscreen pre {
  flex: 1;
  overflow: auto;
  max-height: none;
}

.code-block-wrapper.fullscreen .iframe-wrapper {
  flex: 1;
  height: auto !important;
  border: none;
}

.code-block-wrapper.fullscreen .html-preview-iframe {
  height: 100%;
}
</style>

<!-- 全局样式：覆盖 GitHub CSS 和 Prism CSS -->
<style>
/* 使用高优先级选择器强制覆盖背景色 */
.code-block-wrapper.code-block-wrapper pre {
  background-color: #1e1e2e !important;
  background: #1e1e2e !important;
}

.code-block-wrapper.code-block-wrapper code {
  background: transparent !important;
}

/* 覆盖 Prism 主题的 language-* 类 */
.code-block-wrapper pre[class*="language-"] {
  background-color: #1e1e2e !important;
  background: #1e1e2e !important;
}

.code-block-wrapper code[class*="language-"] {
  background: transparent !important;
  background-color: transparent !important;
}

/* 强制覆盖所有可能的背景 */
.code-block-wrapper pre,
.code-block-wrapper pre code,
.code-block-wrapper pre[class*="language-"],
.code-block-wrapper code[class*="language-"] {
  background-color: #1e1e2e !important;
  background: #1e1e2e !important;
}

/* 覆盖 markdown-body 容器内的代码块 */
.markdown-body .code-block-wrapper pre,
.markdown-body .code-block-wrapper pre[class*="language-"] {
  background-color: #1e1e2e !important;
  background: #1e1e2e !important;
}
</style>
