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
// Per-plugin subpath entries are available under `mio-previewer/plugin-*`.
// We intentionally avoid a single 'plugins' aggregate export to encourage
// explicit, on-demand imports which are friendlier for tree-shaking.

// Export helper functions
export { createAlertContainer, createAllAlertContainers, createAlertPlugins } from './helpers'

// Provide both named and default export to be robust for dynamic imports
export { MdRenderer }
export default MdRenderer
