// Library entry - re-export the main component and types
import MdRenderer from './MdRenderer.vue'

// Export types
export type {
  ASTNode,
  CustomPlugin,
  MarkdownItPluginConfig,
  MdRendererProps
} from './types'

// Export built-in plugins
export { AlertPlugin, EmojiPlugin, CodeBlockPlugin, katexPlugin } from './plugins'

// Export helper functions
export { createAlertContainer, createAllAlertContainers } from './helpers'

// Provide both named and default export to be robust for dynamic imports
export { MdRenderer }
export default MdRenderer
