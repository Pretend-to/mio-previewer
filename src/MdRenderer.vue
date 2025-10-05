<!-- MdRenderer.vue (可选 Worker 版本) -->
<template>
  <div class="mio-previewer markdown-body">
    <RecursiveRenderer :nodes="ast" :plugins="allPlugins" :isStreaming="isStreaming" />
  </div>
</template>

<script setup lang="ts">
// Markdown 解析库和 HTML 解析库
import MarkdownIt from 'markdown-it';
import { parseDocument } from 'htmlparser2';

import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';

import RecursiveRenderer from './components/RecursiveRenderer.vue';

import BlinkingCursor from './components/BlinkingCursor.vue';

import type { CustomPlugin, MarkdownItPluginConfig } from './types';

// === Props ===
type Props = {
  md: string;
  isStreaming?: boolean;
  useWorker?: boolean;
  markdownItPlugins?: MarkdownItPluginConfig[];
  markdownItOptions?: Record<string, any>;
  customPlugins?: CustomPlugin[];
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  useWorker: false,
  markdownItPlugins: () => [],
  markdownItOptions: () => ({}),
  customPlugins: () => []
});

// 初始化 markdown-it 实例（支持动态配置）
function createMarkdownInstance() {
  const defaultOptions = {
    html: true,
    linkify: true,
    typographer: true
  };
  
  const mdInstance = new MarkdownIt({
    ...defaultOptions,
    ...props.markdownItOptions
  });
  
  // 注册 markdown-it 插件
  if (props.markdownItPlugins && props.markdownItPlugins.length > 0) {
    props.markdownItPlugins.forEach((config: MarkdownItPluginConfig) => {
      // 如果 options 是数组，则展开参数（用于 markdown-it-container 等插件）
      if (Array.isArray(config.options)) {
        mdInstance.use(config.plugin, ...config.options);
      } else {
        mdInstance.use(config.plugin, config.options);
      }
    });
  }
  
  // 添加链接安全规则：为外部链接添加 target="_blank" 和 rel="noopener noreferrer"
  const defaultRender = mdInstance.renderer.rules.link_open || function(tokens: any, idx: any, options: any, env: any, self: any) {
    return self.renderToken(tokens, idx, options);
  };
  
  mdInstance.renderer.rules.link_open = function(tokens: any, idx: any, options: any, env: any, self: any) {
    const aIndex = tokens[idx].attrIndex('target');
    if (aIndex < 0) {
      tokens[idx].attrPush(['target', '_blank']);
    } else {
      if (tokens[idx].attrs) tokens[idx].attrs[aIndex][1] = '_blank';
    }
    
    const relIndex = tokens[idx].attrIndex('rel');
    if (relIndex < 0) {
      tokens[idx].attrPush(['rel', 'noopener noreferrer']);
    } else {
      if (tokens[idx].attrs) tokens[idx].attrs[relIndex][1] = 'noopener noreferrer';
    }
    
    return defaultRender(tokens, idx, options, env, self);
  };
  
  return mdInstance;
}

let md = createMarkdownInstance();

// 将所有自定义组件放入一个对象中，以便传递给渲染器
const CursorPlugin: CustomPlugin = {
  name: 'cursor',
  priority: 100,
  test: (node: any) => node.type === 'component' && node.name === 'cursor',
  render: (node: any, renderChildren: any, h: any) => {
    // 直接渲染 BlinkingCursor 组件
    return h(BlinkingCursor, node.attribs || {});
  }
};

// 合并内置插件和用户自定义插件，并按优先级排序
function getAllPlugins() {
  const plugins = [CursorPlugin, ...(props.customPlugins || [])];
  return plugins.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

const allPlugins = ref(getAllPlugins());

// Watch customPlugins changes and update
watch(() => props.customPlugins, () => {
  allPlugins.value = getAllPlugins();
}, { deep: true });

// Watch markdownIt related props and recreate instance
watch([() => props.markdownItPlugins, () => props.markdownItOptions], () => {
  md = createMarkdownInstance();
}, { deep: true });

// === State ===
const ast: Ref<any[]> = ref([]);
let worker: Worker | null = null;

// === 工具函数 (基本不变) ===
function findLastTextNode(nodes: any): any | null {
  if (!nodes?.length) return null;
  let last = nodes[nodes.length - 1];
  if (last.type === 'text') return last;
  if (last.type === 'tag') return findLastTextNode(last.children);
  return null;
}

const getLastSignificantNode = (nodes: any): any | null => {
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

function manageCursor(astArray: any[], action = 'add') {
  const removeCursor = (nodes: any[]) => {
    if (!nodes) return;
    const i = nodes.findIndex(
      n => n.type === 'component' && n.name === 'cursor'
    );
    if (i !== -1) nodes.splice(i, 1);
    nodes.forEach(n => n.children && removeCursor(n.children));
  };
  removeCursor(astArray);

  if (action === 'add') {
  const cursorNode = { type: 'component', name: 'cursor' } as any;
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
const parseMarkdown = (markdownText: string) => {
  const html = md.render(markdownText);
  const parsedAst = parseDocument(html).children;
  try {
    if (typeof window !== 'undefined') {
      // expose for debugging in benchmark page
      (window as any).__mio_last_html__ = html;
      (window as any).__mio_last_ast__ = parsedAst;
    }
  } catch (e) {}
  return parsedAst;
};

// === 初始化 Worker (如果 useWorker 为 true) ===
onMounted(() => {
  if (props.useWorker && typeof window !== 'undefined') {
    worker = new Worker(new URL('/parser.worker.js', import.meta.url), {
      type: 'module'
    });
    worker.onmessage = e => {
      ast.value = e.data.ast;
      try { if (typeof window !== 'undefined') (window as any).__mio_last_ast__ = ast.value; } catch(e){}
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
  (newMd: string, oldMd?: string) => {
    const oldText = oldMd || '';
    if (newMd === oldText) return;

    // --- 非流式模式 ---
    // 始终全量解析
    if (!props.isStreaming) {
      manageCursor(ast.value, 'remove');
      if (props.useWorker && worker) {
        try { if (typeof window !== 'undefined') (window as any).__mio_last_html__ = md.render(newMd); } catch(e){}
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
    // const isSimpleTextChunk = !/[`*#\[\]|!~]/.test(newTextChunk);
    // TODO: 以后再尝试快速路径，目前先假设所有流式更新都需要重新解析
    const isSimpleTextChunk = false;

    if (lastNode && isSimpleTextChunk) {
      // 4. 快速路径：如果可以，直接追加到最后一个文本节点
      lastNode.data += newTextChunk;
    } else {
      // 5. 慢速路径：如果不行（例如新块含Markdown语法），则重新解析整个字符串
      if (props.useWorker && worker) {
        try { if (typeof window !== 'undefined') (window as any).__mio_last_html__ = md.render(newMd); } catch(e){}
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
  (isStreaming: boolean) => {
    if (!isStreaming) {
      manageCursor(ast.value, 'remove');
    } else {
      manageCursor(ast.value, 'add');
    }
  }
);
// no additional fallback helpers here

</script>

<style>
/* Import GitHub markdown styles by default */
@import 'github-markdown-css/github-markdown.css';
</style>
