/**
 * Mermaid Plugin for RecursiveRenderer
 * Detects code blocks with language="mermaid" and renders them as interactive diagrams
 */

import { h } from 'vue'
import type { CustomPlugin, ASTNode } from '../types'
import MermaidDiagram from '../components/MermaidDiagram.vue'

/**
 * Helper to extract language from code block class names
 */
function getLanguage(node: ASTNode): string | null {
  if (node.type !== 'tag' || node.name !== 'code') return null
  
  const classAttr = node.attribs?.class || ''
  const match = classAttr.match(/language-(\w+)/)
  return match ? match[1] : null
}

/**
 * Extract text content from code node
 */
function getCodeContent(node: ASTNode): string {
  if (!node.children || node.children.length === 0) return ''
  
  return node.children
    .map((child: ASTNode) => {
      if (child.type === 'text') return child.data
      if (child.children) return getCodeContent(child)
      return ''
    })
    .join('')
}

/**
 * Mermaid Plugin
 * Test: matches <pre><code class="language-mermaid">
 * Render: creates MermaidDiagram component with code content
 * 
 * Priority: 80 (higher than CodeBlock to intercept mermaid blocks)
 */
export const mermaidPlugin: CustomPlugin = {
  name: 'mermaid',
  priority: 80,
  test: (node: ASTNode) => {
    // Match <pre> containing <code class="language-mermaid">
    if (node.type === 'tag' && node.name === 'pre') {
      const codeChild = node.children?.find(
        (child: ASTNode) => child.type === 'tag' && child.name === 'code'
      )
      if (codeChild) {
        const lang = getLanguage(codeChild)
        return lang === 'mermaid'
      }
    }
    return false
  },

  render: (node: ASTNode, _renderChildren: any, _h: any) => {
    // Find the code child and extract content
    const codeChild = node.children?.find(
      (child: ASTNode) => child.type === 'tag' && child.name === 'code'
    )
    
    if (!codeChild) {
      return h('div', { class: 'mermaid-error' }, 'No code content found')
    }

    const code = getCodeContent(codeChild)
    
    return h(MermaidDiagram, { code })
  }
}
