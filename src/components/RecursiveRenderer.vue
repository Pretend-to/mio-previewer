<script lang="ts">
import { h, defineComponent, defineAsyncComponent, type VNode, type Component } from 'vue'
import type { RenderContext, VueComponentsConfig } from '../types'
import { shouldAddCors } from '../utils/cors'

type Plugin = {
  test: (node: any) => boolean;
  render: (node: any, renderChildren: () => any[], h: any, context?: RenderContext) => VNode | string | null;
}

/**
 * 将用户配置的 component 归一化为可渲染组件：
 * - 普通组件对象（含函数式组件）直接返回
 * - 约定：传入函数 = 异步 loader（() => import('...vue')），包一层 defineAsyncComponent
 */
function resolveComponent(comp: any): Component {
  if (typeof comp === 'function' && !comp.render && !comp.setup) {
    return defineAsyncComponent(comp);
  }
  return comp;
}

function extractText(n: any): string {
  if (n.type === 'text') return n.data || '';
  if (n.children) return n.children.map(extractText).join('');
  return '';
}

export default defineComponent({
  name: 'RecursiveRenderer',
  props: {
    nodes: {
      type: Array as () => any[],
      required: true
    },
    plugins: {
      type: Array as () => Plugin[],
      default: () => ([])
    },
    context: {
      type: Object as () => RenderContext,
      default: () => ({})
    },
    vueComponents: {
      type: Object as () => VueComponentsConfig,
      default: () => ({})
    }
  },
  setup(props: { nodes: any[]; plugins?: any[]; context?: RenderContext; vueComponents?: VueComponentsConfig }) {
    function renderNode(node: any): VNode | string | null {
      // 0. inline 级 Vue 组件（MdRenderer 解析阶段生成的 component 节点）
      if (node.type === 'component') {
        const cfg = (props.vueComponents?.inline || []).find(c => c.name === node.name);
        if (cfg) {
          return h(resolveComponent(cfg.component), node.attribs || {});
        }
        return null;
      }

      // 1. block 级 Vue 组件（代码块语言匹配，优先于 customPlugins）
      if (node.type === 'tag' && node.name === 'code' && node.attribs?.class) {
        const langMatch = node.attribs.class.match(/language-(\w+)/);
        if (langMatch) {
          const lang = langMatch[1];
          const cfg = (props.vueComponents?.block || []).find(c =>
            Array.isArray(c.lang) ? c.lang.includes(lang) : c.lang === lang
          );
          if (cfg) {
            const code = extractText(node);
            const compProps = cfg.getProps ? cfg.getProps(code, lang) : {};
            return h(resolveComponent(cfg.component), compProps);
          }
        }
      }

      // 2. 优先检查插件
      const plugins = props.plugins || []
      for (const plugin of plugins) {
        if (plugin.test && plugin.render && plugin.test(node)) {
          const renderChildren = () => node.children ? node.children.map(renderNode) : [];
          return plugin.render(node, renderChildren, h as any, props.context);
        }
      }

      // --- 如果没有插件匹配，则回退到默认渲染逻辑 ---

      // 3. 渲染标准的 HTML 标签
      if (node.type === 'tag' || node.type === 'script' || node.type === 'style') {
        let attribs = node.attribs || {};
        if (node.name === 'img' && attribs.src) {
          if (shouldAddCors(attribs.src, props.context?.autoCors)) {
            attribs = {
              ...attribs,
              crossorigin: 'anonymous'
            };
          }
        }
        return h(
          node.name,
          attribs,
          (attribs && attribs.innerHTML !== undefined) ? undefined : (node.children ? node.children.map(renderNode) : [])
        );
      }

      // 3b. htmlparser2 有时会把整个文档包在 root/document 节点中，递归渲染其 children
      if (node.type === 'root' || node.type === 'document') {
        return node.children ? node.children.map(renderNode) : null;
      }

      // 忽略注释节点
      if (node.type === 'comment') {
        return null;
      }

      // 4. 渲染文本节点
      if (node.type === 'text') {
        return node.data;
      }

      // 5. 忽略其他类型的节点
      return null;
    }

    return () => props.nodes?.length ? props.nodes.map(renderNode) : null;
  }
})
</script>
