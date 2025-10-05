<template>
  <div class="code-block-wrapper" :data-lang="language">
    <div class="code-block-header">
      <span class="lang-label">{{ language.toUpperCase() }}</span>
      <div class="op-btn-group">
        <!-- 复制按钮 -->
        <button
          class="copy-code-button"
          :class="{ copied: isCopied }"
          type="button"
          title="复制代码"
          @click="handleCopy"
        >
          <span v-if="!isCopied" v-html="copySvg"></span>
          <span v-else>已复制</span>
        </button>
        
        <!-- HTML 预览按钮 (仅 HTML 语言显示) -->
        <button
          v-if="isHtmlLang() && !isPreviewOpen"
          class="preview-html-button"
          type="button"
          title="预览 HTML"
          @click="handlePreview"
          v-html="previewSvg"
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
    <div v-if="isPreviewOpen" class="iframe-wrapper">
      <iframe
        class="html-preview-iframe"
        :srcdoc="code"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
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
}>();

const isCopied = ref(false);
const isPreviewOpen = ref(false);

// 计算是否为 HTML 语言
function isHtmlLang() {
  return props.language.toLowerCase() === 'html' || 
         props.language.toLowerCase() === 'markup';
}

// 计算高亮后的代码
function getHighlightedCode() {
  const lang = props.language || 'plaintext';
  if (Prism.languages[lang]) {
    return Prism.highlight(props.code, Prism.languages[lang], lang);
  }
  return Prism.util.encode(props.code);
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

// 复制代码
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 1700);
  } catch (err) {
    console.error('复制失败:', err);
  }
};

// 打开预览
const handlePreview = () => {
  isPreviewOpen.value = true;
};

// 关闭预览
const handleClosePreview = () => {
  isPreviewOpen.value = false;
};

// SVG 图标
const copySvg = `<svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M4 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2 0v10h6V2H6zm-1 2V2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8zm-2 2H2V14a2 2 0 0 0 2 2h6v-2a2 2 0 0 0-2-2H4V4zm0 0v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4H4z"/></svg>`;

const previewSvg = `<svg width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 0v10h12V5H4zm3.6 3.55l1.4 1.45l-1.4 1.45L7 11.38l2-2l-2-2zm5.4.83l-1.4-1.45L13 6.62l2 2l-2 2z"/></svg>`;

const closeSvg = `<svg width="17" height="17" viewBox="0 0 20 20"><path fill="currentColor" d="M6.23 4.81a1 1 0 0 1 1.41 0L10 7.17l2.36-2.36a1 1 0 0 1 1.41 1.41L11.41 8.59l2.36 2.36a1 1 0 1 1-1.41 1.41L10 10l-2.36 2.36a1 1 0 0 1-1.41-1.41L8.59 8.59 6.23 6.23a1 1 0 0 1 0-1.41z"/></svg>`;
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

.copy-code-button.copied {
  color: #4ade80;
  font-size: 0.75rem;
}

.preview-html-button {
  color: #3486ff;
}

.close-preview-button {
  color: #ff5d5b;
  background: #fae8e410;
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
  min-height: 200px;
  height: 300px;
  resize: vertical;
  overflow: hidden;
  display: block;
  position: relative;
  border: 1px solid #ddd;
}

.html-preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
  display: block;
}
</style>
