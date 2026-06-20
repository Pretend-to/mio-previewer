<template>
  <Teleport to="body" :disabled="!isFullscreen">
    <div :class="{ 'markdown-body': isFullscreen }">
      <div 
        ref="wrapperRef"
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
        
        <!-- 折叠/展开按钮 -->
        <button
          v-if="enableCollapse && shouldShowCollapseButton && !isFullscreen"
          class="collapse-toggle-button"
          type="button"
          :title="isCollapsed ? '展开代码' : '折叠代码'"
          @click="toggleCollapse"
          v-html="isCollapsed ? expandSvg : collapseSvg"
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
    <div
      v-show="!isPreviewOpen"
      class="pre-container"
    >
      <pre
        ref="preRef"
        :class="[
          `language-${language}`, 
          { 
            'is-collapsed': enableCollapse && isCollapsed && shouldShowCollapseButton && !isFullscreen,
            'line-numbers': showLineNumbers
          }
        ]"
        :style="preStyle"
        @scroll="handleScroll"
      ><span v-if="showLineNumbers" class="line-numbers-rows" aria-hidden="true"><span v-for="n in lineCount" :key="n"></span></span><code :class="`language-${language}`" v-html="highlightedCode"></code></pre>
      
      <!-- 符合主题的向下展开提示栏 -->
      <div 
        v-if="enableCollapse && shouldShowCollapseButton && isCollapsed && !isFullscreen" 
        class="collapse-expand-bar"
        @click="toggleCollapse"
      >
        <span class="expand-prompt-text">展开全部代码</span>
        <span class="expand-prompt-icon" v-html="expandSvg"></span>
      </div>

      <!-- 符合主题的向上收起提示栏 -->
      <div 
        v-if="enableCollapse && shouldShowCollapseButton && !isCollapsed && !isFullscreen" 
        class="collapse-expand-bar collapse-bar"
        @click="toggleCollapse"
      >
        <span class="expand-prompt-text">收起全部代码</span>
        <span class="expand-prompt-icon" v-html="collapseSvg"></span>
      </div>
    </div>
    
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
    </div>
  </Teleport>
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

const props = withDefaults(
  defineProps<{
    code: string;
    language: string;
    publishUrl?: string;
    onPublished?: (url: string) => void;
    enableCollapse?: boolean;
    collapseMaxHeight?: number;
    showLineNumbers?: boolean;
  }>(),
  {
    enableCollapse: true,
    collapseMaxHeight: 300,
    showLineNumbers: true,
  }
);

const isCopied = ref(false);
const isPreviewOpen = ref(false);
const previewIframe = ref<HTMLIFrameElement | null>(null);
const iframeHeight = ref('300px');
const isPublishing = ref(false);
const isPublished = ref(false);
const isFullscreen = ref(false);
const wrapperRef = ref<HTMLDivElement | null>(null);

// Collapse state
const isCollapsed = ref(true);
const shouldShowCollapseButton = ref(false);
const isScrollAtBottom = ref(false);
const preRef = ref<HTMLPreElement | null>(null);

const lineCount = computed(() => {
  if (!props.code) return 0;
  const matches = props.code.match(/\n(?!$)/g);
  return matches ? matches.length + 1 : 1;
});

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

const checkHeight = () => {
  if (!props.enableCollapse) {
    shouldShowCollapseButton.value = false;
    return;
  }
  if (preRef.value) {
    shouldShowCollapseButton.value = preRef.value.scrollHeight > props.collapseMaxHeight;
  }
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  if (preRef.value) {
    preRef.value.scrollTop = 0;
    isScrollAtBottom.value = false;
  }
};

const preStyle = computed(() => {
  if (props.enableCollapse && isCollapsed.value && shouldShowCollapseButton.value && !isFullscreen.value) {
    return {
      maxHeight: `${props.collapseMaxHeight}px`,
      overflowY: 'auto' as const
    };
  }
  return {};
});

const handleScroll = () => {
  if (preRef.value) {
    const { scrollTop, scrollHeight, clientHeight } = preRef.value;
    isScrollAtBottom.value = scrollHeight - scrollTop <= clientHeight + 15;
  }
};

// 初始化和监听 props 变化
updateHighlight();
watch(() => [props.code, props.language], () => {
  let wasAtBottom = true;
  if (preRef.value) {
    const { scrollTop, scrollHeight, clientHeight } = preRef.value;
    wasAtBottom = scrollHeight <= clientHeight || (scrollHeight - scrollTop <= clientHeight + 30);
  }
  
  updateHighlight();
  
  setTimeout(() => {
    checkHeight();
    if (preRef.value) {
      if (wasAtBottom) {
        preRef.value.scrollTop = preRef.value.scrollHeight;
      }
      handleScroll();
    }
  }, 50);
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
    // 将 U+00A0 (non-breaking space) 替换为正常空格 (U+0020)
    const cleanedCode = props.code.replace(/\u00A0/g, ' ');
    await navigator.clipboard.writeText(cleanedCode);
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

let resizeObserver: ResizeObserver | null = null;

// 组件挂载时添加监听
onMounted(() => {
  window.addEventListener('message', handleMessage);
  window.addEventListener('keydown', handleEscKey);
  
  setTimeout(() => {
    checkHeight();
    handleScroll();
  }, 50);
  
  if (typeof ResizeObserver !== 'undefined' && preRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkHeight();
    });
    resizeObserver.observe(preRef.value);
  }
});

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
  window.removeEventListener('keydown', handleEscKey);
  document.body.style.overflow = ''; // 确保清理
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// SVG 图标
const copySvg = `<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2 0v10h6V2H6zm-1 2V2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8zm-2 2H2V14a2 2 0 0 0 2 2h6v-2a2 2 0 0 0-2-2H4V4zm0 0v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4H4z"/></svg>`;

const previewSvg = `<svg width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 0v10h12V5H4zm3.6 3.55l1.4 1.45l-1.4 1.45L7 11.38l2-2l-2-2zm5.4.83l-1.4-1.45L13 6.62l2 2l-2 2z"/></svg>`;

const closeSvg = `<svg width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" d="M6.23 4.81a1 1 0 0 1 1.41 0L10 7.17l2.36-2.36a1 1 0 0 1 1.41 1.41L11.41 8.59l2.36 2.36a1 1 0 1 1-1.41 1.41L10 10l-2.36 2.36a1 1 0 0 1-1.41-1.41L8.59 8.59 6.23 6.23a1 1 0 0 1 0-1.41z"/></svg>`;

const publishSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;

const fullscreenSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;

const exitFullscreenSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;

const expandSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>`;
const collapseSvg = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/></svg>`;
</script>

<style scoped>
.code-block-wrapper {
  /* 默认：阳间模式 (Light Theme) */
  --cb-bg: #ffffff;
  --cb-border: #d0d7de;
  --cb-header-bg: #f6f8fa;
  --cb-header-border: #d0d7de;
  --cb-lang-color: #57606a;
  --cb-btn-color: #57606a;
  --cb-btn-hover-bg: rgba(0, 0, 0, 0.05);
  --cb-pre-bg: #f6f8fa;
  --cb-pre-color: #24292f;
  --cb-scrollbar-thumb: rgba(0, 0, 0, 0.2);
  --cb-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  --cb-expand-hover-bg: #eaeef2;

  /* Light Theme Tokens */
  --token-comment: #6a737d;
  --token-punctuation: #24292f;
  --token-tag: #d73a49;
  --token-attr-name: #6f42c1;
  --token-function-name: #6f42c1;
  --token-number: #005cc5;
  --token-class-name: #6f42c1;
  --token-constant: #005cc5;
  --token-keyword: #d73a49;
  --token-string: #032f62;
  --token-operator: #d73a49;
  --token-entity: #e36209;
  --token-url: #032f62;

  margin: 1.5em 0;
  background: var(--cb-bg);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--cb-shadow);
  border: 1px solid var(--cb-border);
  position: relative;
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}

/* 阴间模式覆盖 (Dark Theme) */
:global(.theme-dark) .code-block-wrapper,
:global(.dark) .code-block-wrapper,
:global([data-theme="dark"]) .code-block-wrapper {
  --cb-bg: #181824;
  --cb-border: #1f1f2e;
  --cb-header-bg: #1f1f2e;
  --cb-header-border: #1a1a26;
  --cb-lang-color: #75799e;
  --cb-btn-color: #75799e;
  --cb-btn-hover-bg: rgba(255, 255, 255, 0.08);
  --cb-pre-bg: #0f0f1a;
  --cb-pre-color: #a6accd;
  --cb-scrollbar-thumb: rgba(255, 255, 255, 0.15);
  --cb-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  --cb-expand-hover-bg: #2d303f;

  /* Dark Theme Tokens */
  --token-comment: #676e95;
  --token-punctuation: #89ddff;
  --token-tag: #f07178;
  --token-attr-name: #f07178;
  --token-function-name: #82aaff;
  --token-number: #f78c6c;
  --token-class-name: #82aaff;
  --token-constant: #f78c6c;
  --token-keyword: #c792ea;
  --token-string: #c3e88d;
  --token-operator: #c792ea;
  --token-entity: #c792ea;
  --token-url: #c3e88d;
}

@media (prefers-color-scheme: dark) {
  :global(:root:not(.theme-light):not(.light):not([data-theme="light"])) .code-block-wrapper {
    --cb-bg: #181824;
    --cb-border: #1f1f2e;
    --cb-header-bg: #1f1f2e;
    --cb-header-border: #1a1a26;
    --cb-lang-color: #75799e;
    --cb-btn-color: #75799e;
    --cb-btn-hover-bg: rgba(255, 255, 255, 0.08);
    --cb-pre-bg: #0f0f1a;
    --cb-pre-color: #a6accd;
    --cb-scrollbar-thumb: rgba(255, 255, 255, 0.15);
    --cb-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    --cb-expand-hover-bg: #2d303f;

    /* Dark Theme Tokens */
    --token-comment: #676e95;
    --token-punctuation: #89ddff;
    --token-tag: #f07178;
    --token-attr-name: #f07178;
    --token-function-name: #82aaff;
    --token-number: #f78c6c;
    --token-class-name: #82aaff;
    --token-constant: #f78c6c;
    --token-keyword: #c792ea;
    --token-string: #c3e88d;
    --token-operator: #c792ea;
    --token-entity: #c792ea;
    --token-url: #c3e88d;
  }
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
  background: var(--cb-header-bg);
  padding: 0.35rem 0.85rem;
  border-bottom: 1px solid var(--cb-header-border);
  transition: background 0.3s, border-color 0.3s;
}

.lang-label {
  color: var(--cb-lang-color);
  font-size: 0.89em;
  font-weight: 600;
  letter-spacing: 1px;
  user-select: none;
  transition: color 0.3s;
}

.op-btn-group {
  display: flex;
  gap: 0.4rem;
}

.op-btn-group button {
  border: none;
  outline: none;
  background: transparent;
  color: var(--cb-btn-color);
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
  background: var(--cb-btn-hover-bg);
}

.op-btn-group button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.copy-code-button {
  color: var(--cb-btn-color);
}

.publish-html-button {
  color: #10b981;
}

.preview-html-button {
  color: #3486ff;
}

.close-preview-button {
  color: #ff5d5b;
  background: var(--cb-btn-hover-bg);
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
  color: var(--cb-pre-color);
}

pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  background: var(--cb-pre-bg);
  transition: background 0.3s;
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
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999;
  margin: 0 !important;
  border-radius: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  background: #262733 !important;
}

.code-block-wrapper.fullscreen .code-block-header {
  flex-shrink: 0;
}

.code-block-wrapper.fullscreen pre {
  flex: 1;
  overflow: auto !important;
  -webkit-overflow-scrolling: touch;
  max-height: none !important;
  min-height: 0;
}

.code-block-wrapper.fullscreen .iframe-wrapper {
  flex: 1;
  height: auto !important;
  border: none;
  min-height: 0;
}

.code-block-wrapper.fullscreen .html-preview-iframe {
  height: 100%;
}

/* Auto-collapse styles */
.pre-container {
  position: relative;
  width: 100%;
}

.collapse-expand-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--cb-header-bg);
  padding: 8px 12px;
  border-top: 1px solid var(--cb-header-border);
  cursor: pointer;
  color: var(--cb-btn-color);
  font-size: 12px;
  font-weight: 500;
  user-select: none;
  transition: background-color 0.2s, color 0.2s;
}

.collapse-expand-bar:hover {
  background: var(--cb-expand-hover-bg);
  color: var(--cb-pre-color);
}

.collapse-expand-bar :deep(svg) {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.collapse-expand-bar:hover :deep(svg) {
  transform: translateY(2px);
}

.collapse-expand-bar.collapse-bar:hover :deep(svg) {
  transform: translateY(-2px);
}

.collapse-toggle-button {
  color: var(--cb-btn-color);
}

/* Fullscreen mode overrides */
.code-block-wrapper.fullscreen .pre-container {
  max-height: none !important;
  overflow: hidden !important;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.code-block-wrapper.fullscreen pre {
  max-height: none !important;
  flex: 1;
  overflow: auto !important;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}

/* Line Numbers Styling */
pre.line-numbers {
  display: flex !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: 0 !important;
}

pre.line-numbers > code {
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  padding-right: 1rem !important;
  flex: 1;
}

.line-numbers-rows {
  position: sticky;
  left: 0;
  flex-shrink: 0;
  width: 2.8rem;
  margin-right: 0.8rem;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  border-right: 1px solid var(--cb-border);
  background: var(--cb-pre-bg);
  text-align: right;
  user-select: none;
  z-index: 5;
  counter-reset: linenumber;
  transition: background 0.3s, border-color 0.3s;
}

.line-numbers-rows > span {
  display: block;
  counter-increment: linenumber;
  height: 1.6em;
  line-height: 1.6em;
}

.line-numbers-rows > span:before {
  content: counter(linenumber);
  color: var(--cb-lang-color);
  opacity: 0.5;
  display: block;
  padding-right: 0.6rem;
  font-size: 0.82em;
  font-family: monospace;
}
</style>

<!-- 全局样式：覆盖 GitHub CSS 和 Prism CSS -->
<style>
/* 自定义滚动条样式，使用高优先级选择器以覆盖 github-markdown-css 等外部样式 */
.code-block-wrapper pre::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
  background: transparent !important;
}

.code-block-wrapper pre::-webkit-scrollbar-track {
  background: var(--cb-pre-bg) !important;
  border-radius: 0 !important;
}

.code-block-wrapper pre::-webkit-scrollbar-thumb {
  background-color: var(--cb-scrollbar-thumb) !important;
  border-radius: 4px !important;
  border: 2px solid var(--cb-pre-bg) !important;
}

.code-block-wrapper pre::-webkit-scrollbar-thumb:hover {
  background-color: var(--cb-scrollbar-thumb) !important;
  filter: brightness(0.8);
}

.code-block-wrapper pre::-webkit-scrollbar-corner {
  background: var(--cb-pre-bg) !important;
}

/* 使用高优先级选择器强制覆盖背景色 */
.code-block-wrapper.code-block-wrapper pre {
  background-color: var(--cb-pre-bg) !important;
  background: var(--cb-pre-bg) !important;
  margin: 0 !important;
}

.code-block-wrapper.code-block-wrapper code {
  background: transparent !important;
}

/* 覆盖 Prism 主题的 language-* 类 */
.code-block-wrapper pre[class*="language-"] {
  background-color: var(--cb-pre-bg) !important;
  background: var(--cb-pre-bg) !important;
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
  background-color: var(--cb-pre-bg) !important;
  background: var(--cb-pre-bg) !important;
}

/* 覆盖 markdown-body 容器内的代码块 */
.markdown-body .code-block-wrapper pre,
.markdown-body .code-block-wrapper pre[class*="language-"] {
  background-color: var(--cb-pre-bg) !important;
  background: var(--cb-pre-bg) !important;
}

/* Prism 语法高亮颜色重写 */
.code-block-wrapper .token.comment,
.code-block-wrapper .token.prolog,
.code-block-wrapper .token.doctype,
.code-block-wrapper .token.cdata {
  color: var(--token-comment) !important;
  font-style: italic;
}

.code-block-wrapper .token.punctuation {
  color: var(--token-punctuation) !important;
}

.code-block-wrapper .token.namespace {
  opacity: .7;
}

.code-block-wrapper .token.property,
.code-block-wrapper .token.tag,
.code-block-wrapper .token.boolean,
.code-block-wrapper .token.number,
.code-block-wrapper .token.constant,
.code-block-wrapper .token.symbol,
.code-block-wrapper .token.deleted {
  color: var(--token-tag) !important;
}

.code-block-wrapper .token.number,
.code-block-wrapper .token.boolean,
.code-block-wrapper .token.constant {
  color: var(--token-number) !important;
}

.code-block-wrapper .token.selector,
.code-block-wrapper .token.attr-name,
.code-block-wrapper .token.string,
.code-block-wrapper .token.char,
.code-block-wrapper .token.builtin,
.code-block-wrapper .token.inserted {
  color: var(--token-string) !important;
}

.code-block-wrapper .token.attr-name {
  color: var(--token-attr-name) !important;
}

.code-block-wrapper .token.operator,
.code-block-wrapper .token.entity,
.code-block-wrapper .token.url,
.language-css .token.string,
.style .token.string {
  color: var(--token-operator) !important;
  background: transparent !important;
}

.code-block-wrapper .token.atrule,
.code-block-wrapper .token.attr-value,
.code-block-wrapper .token.keyword {
  color: var(--token-keyword) !important;
}

.code-block-wrapper .token.function,
.code-block-wrapper .token.class-name {
  color: var(--token-function-name) !important;
}

.code-block-wrapper .token.regex,
.code-block-wrapper .token.important,
.code-block-wrapper .token.variable {
  color: var(--token-entity) !important;
}
</style>
