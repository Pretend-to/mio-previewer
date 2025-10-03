<!-- MdRenderer.vue (可选 Worker 版本) -->
<template>
  <div class="markdown-body">
    <RecursiveRenderer :nodes="ast" :plugins="[CursorPlugin]" />
  </div>
</template>

<script setup>
// Markdown 解析库和 HTML 解析库
import MarkdownIt from 'markdown-it';
import { parseDocument } from 'htmlparser2';
// 引入markdown-it的 mermaid 和 latex 插件
import markdownItLatex from 'markdown-it-katex';

import { ref, watch, onMounted, onUnmounted} from 'vue';

import RecursiveRenderer from './components/RecursiveRenderer.vue';

import BlinkingCursor from './components/BlinkingCursor.vue';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
}).use(markdownItLatex);


// 将所有自定义组件放入一个对象中，以便传递给渲染器
const CursorPlugin = {
  test: (node) => node.type === 'component' && node.name === 'cursor',
  render: (node, renderChildren, h) => {
    // 直接渲染 BlinkingCursor 组件
    return h(BlinkingCursor, node.attribs || {});
  }
};

// === Props ===
const props = defineProps({
  md: { type: String, required: true },
  isStreaming: { type: Boolean, default: false },
  useWorker: { type: Boolean, default: false } // 新增 prop：是否使用 Worker
});

// === State ===
const ast = ref([]);
let worker = null;

// === 工具函数 (基本不变) ===
function findLastTextNode(nodes) {
  if (!nodes?.length) return null;
  let last = nodes[nodes.length - 1];
  if (last.type === 'text') return last;
  if (last.type === 'tag') return findLastTextNode(last.children);
  return null;
}

const getLastSignificantNode = (nodes) => {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.type === 'text' && node.data.trim() === '') {
      continue;
    }
    return node;
  }

  return null;
};

function manageCursor(astArray, action = 'add') {
  const removeCursor = nodes => {
    if (!nodes) return;
    const i = nodes.findIndex(
      n => n.type === 'component' && n.name === 'cursor'
    );
    if (i !== -1) nodes.splice(i, 1);
    nodes.forEach(n => n.children && removeCursor(n.children));
  };
  removeCursor(astArray);

  if (action === 'add') {
    const cursorNode = { type: 'component', name: 'cursor' };
    let target = astArray;
    let last = getLastSignificantNode(astArray);

    while (last && last.type === 'tag' && last.children) {
      target = last.children;
      last = getLastSignificantNode(target);
    }

    target.push(cursorNode);
  }
}

// === Markdown 解析和 AST 生成 ===
const parseMarkdown = (markdownText) => {
  const html = md.render(markdownText);
  const ast = parseDocument(html).children;
  return ast;
};

// === 初始化 Worker (如果 useWorker 为 true) ===
onMounted(() => {
  if (props.useWorker && typeof window !== 'undefined') {
    worker = new Worker(new URL('/parser.worker.js', import.meta.url), {
      type: 'module'
    });
    worker.onmessage = e => {
      ast.value = e.data.ast;
      // 当 Worker 完成解析后，如果仍在流式传输，则添加光标
      if (props.isStreaming) {
        manageCursor(ast.value, 'add');
      }
    };
  } else {
    // 如果不使用 Worker，则进行初始解析
    ast.value = parseMarkdown(props.md);
    if (props.isStreaming) {
      manageCursor(ast.value, 'add');
    }
  }
});

// 组件卸载时终止 worker
onUnmounted(() => {
  if (worker) {
    worker.terminate();
  }
});

// === 核心逻辑 (已重构) ===
watch(
  () => props.md,
  (newMd, oldMd) => {
    const oldText = oldMd || '';
    if (newMd === oldText) return;

    // --- 非流式模式 ---
    // 始终全量解析
    if (!props.isStreaming) {
      manageCursor(ast.value, 'remove');
      if (props.useWorker && worker) {
        worker.postMessage({ markdownText: newMd });
      } else {
        ast.value = parseMarkdown(newMd); // 主线程解析
      }
      return;
    }

    // --- 流式模式 ---
    // 1. 获取新增的文本块
    const newTextChunk = newMd.substring(oldText.length);
    if (!newTextChunk) return;

    // 2. 移除旧光标，准备更新
    manageCursor(ast.value, 'remove');

    const lastNode = findLastTextNode(ast.value);
    // 3. 优化：检查新文本块是否为不含Markdown特殊语法的“纯文本”
    const isSimpleTextChunk = !/[`*#\[\]|!~]/.test(newTextChunk);

    if (false && lastNode && isSimpleTextChunk) {
      // 暂时注释掉这部分，先测试好光标位置再说
      // 4. 快速路径：如果可以，直接追加到最后一个文本节点
      lastNode.data += newTextChunk;
    } else {
      // 5. 慢速路径：如果不行（例如新块含Markdown语法），则重新解析整个字符串
      if (props.useWorker && worker) {
        worker.postMessage({ markdownText: newMd });
      } else {
        ast.value = parseMarkdown(newMd); // 主线程解析
      }
    }

    // 6. 为快速路径或流结束添加光标
    if (props.isStreaming) {
      manageCursor(ast.value, 'add');
    }
  },
  { immediate: false }
); // immediate: false，避免在 mounted 之前执行

// 监听 isStreaming 状态的变化，以在流结束时移除光标
watch(
  () => props.isStreaming,
  (isStreaming) => {
    if (!isStreaming) {
      manageCursor(ast.value, 'remove');
    } else {
      manageCursor(ast.value, 'add');
    }
  }
);

</script>

<style>
/* 样式保持不变 */
.markdown-body {
  font-family: sans-serif;
  line-height: 1.6;
}

.markdown-body :deep(pre) {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-body :deep(code) {
  font-family: 'Courier New', monospace;
}
</style>
