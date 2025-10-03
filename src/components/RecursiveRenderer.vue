<script>
import { h, defineComponent } from 'vue'

export default defineComponent({
  name: 'RecursiveRenderer',
  props: {
    nodes: {
      type: Array,
      required: true
    },
    /**
     * An array of plugins to customize rendering.
     * Each plugin is { test: (node) => boolean, render: (node, renderChildren, h) => VNode }
     * @type {Array}
     */
    plugins: {
      type: Array,
      default: () => ([])
    }
  },
  setup(props) {
    function renderNode(node) {
      // 1. 优先检查插件
      for (const plugin of props.plugins) {
        if (plugin.test && plugin.render && plugin.test(node)) {
          const renderChildren = () => node.children ? node.children.map(renderNode) : [];
          return plugin.render(node, renderChildren, h);
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
