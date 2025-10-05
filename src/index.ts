// Library entry - re-export the main component and types
import MdRenderer from './MdRenderer.vue'

// Export types
export type {
  ASTNode,
  CustomPlugin,
  CustomPluginConfig,
  MarkdownItPluginConfig,
  MdRendererProps
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
export {
  alertPlugin,
  katexPlugin
} from './plugins/markdown-it'

// Provide both named and default export to be robust for dynamic imports
export { MdRenderer }
export default MdRenderer
