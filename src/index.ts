// Library entry - re-export the main component and types
import MdRenderer from './MdRenderer.vue'

// Export types
export type {
  ASTNode,
  CustomPlugin,
  CustomPluginConfig,
  MarkdownItPluginConfig,
  MdRendererProps,
  VueInlineComponentConfig,
  VueBlockComponentConfig,
  VueComponentsConfig
} from './types'

// Export custom rendering plugins
export { 
  codeBlockPlugin,
  emojiPlugin,
  mermaidPlugin,
  cursorPlugin
} from './plugins/custom'
export type { 
  CodeBlockPluginOptions,
  EmojiPluginOptions,
  MermaidPluginOptions,
  CursorPluginOptions 
} from './plugins/custom'

// Export markdown-it plugins
// katexPlugin 刻意不在此导出：katex (~367KB) 只在消息里出现数学公式时才有用，
// 请通过 'mio-previewer/plugins/markdown-it' 子路径按需导入，避免拖累主入口体积
export {
  alertPlugin
} from './plugins/markdown-it'

// Provide both named and default export to be robust for dynamic imports
export { MdRenderer }
export default MdRenderer
