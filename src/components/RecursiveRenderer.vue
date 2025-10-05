<script lang="ts">
import { h, defineComponent, type VNode } from 'vue'
import type { RenderContext } from '../types'

type Plugin = {
  test: (node: any) => boolean;
  render: (node: any, renderChildren: () => any[], h: any, context?: RenderContext) => VNode | string | null;
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
    }
  },
  setup(props: { nodes: any[]; plugins?: any[]; context?: RenderContext }) {
    function renderNode(node: any): VNode | string | null {
      // 1. 优先检查插件
      const plugins = props.plugins || []
      for (const plugin of plugins) {
        if (plugin.test && plugin.render && plugin.test(node)) {
          const renderChildren = () => node.children ? node.children.map(renderNode) : [];
          return plugin.render(node, renderChildren, h as any, props.context);
        }
      }

      // --- 如果没有插件匹配，则回退到默认渲染逻辑 ---

      // 2. 渲染标准的 HTML 标签
      if (node.type === 'tag' || node.type === 'script' || node.type === 'style') {
        return h(
          node.name,
          node.attribs || {},
          node.children ? node.children.map(renderNode) : []
        );
      }

      // 2b. htmlparser2 有时会把整个文档包在 root/document 节点中，递归渲染其 children
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
