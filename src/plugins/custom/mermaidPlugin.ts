/**
 * Mermaid Plugin for RecursiveRenderer
 * Detects code blocks with language="mermaid" and renders them a      
      // 传递配置的主题和流式状态
      const props: any = { 
        code, 
        isStreaming: context?.isStreaming || false
      };
      
      if (theme) {
        props.theme = theme;
      }
      
      return h(MermaidDiagram, props)
    }
  }
}ms
 */

import { h } from 'vue'
import type { CustomPlugin, ASTNode } from '../../types'
import MermaidDiagram from '../../components/MermaidDiagram.vue'

/**
 * Mermaid 插件配置选项
 */
export interface MermaidPluginOptions {
  /**
   * 优先级（默认 80，高于 CodeBlock 以拦截 mermaid 代码块）
   */
  priority?: number;
  
  /**
   * Mermaid 主题配置
   */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

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
 * @param options - 插件配置选项
 * @param options.priority - 优先级（默认 80）
 * @param options.theme - Mermaid 主题
 * @returns CustomPlugin
 * 
 * @example
 * ```ts
 * // 默认配置
 * { plugin: mermaidPlugin }
 * 
 * // 自定义优先级和主题
 * { 
 *   plugin: mermaidPlugin, 
 *   options: { 
 *     priority: 90,
 *     theme: 'dark'
 *   } 
 * }
 * ```
 */
export function mermaidPlugin(options?: MermaidPluginOptions): CustomPlugin {
  const {
    priority = 80,
    theme
  } = options || {};
  
  return {
    name: 'mermaid',
    priority,
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

    render: (node: ASTNode, _renderChildren: any, _h: any, context?: any) => {
      // Find the code child and extract content
      const codeChild = node.children?.find(
        (child: ASTNode) => child.type === 'tag' && child.name === 'code'
      )
      
      if (!codeChild) {
        return h('div', { class: 'mermaid-error' }, 'No code content found')
      }

      const code = getCodeContent(codeChild)
      
      // 传递配置的主题和流式状态
      const props: any = { 
        code, 
        isStreaming: context?.isStreaming || false
      };
      
      if (theme) {
        props.theme = theme;
      }
      
      return h(MermaidDiagram, props)
    }
  };
}

export default mermaidPlugin;
