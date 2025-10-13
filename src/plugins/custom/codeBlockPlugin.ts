import { h } from 'vue';
import type { CustomPlugin, ASTNode } from '../../types';
import CodeBlock from '../../components/CodeBlock.vue';
import { loadCss } from '../../utils/loadCss';

/**
 * CodeBlock 插件配置选项
 */
export interface CodeBlockPluginOptions {
  /**
   * 优先级（默认 70）
   */
  priority?: number;
  
  /**
   * 自定义语言别名映射
   * @example { js: 'javascript', ts: 'typescript' }
   */
  languageAliases?: Record<string, string>;
  
  /**
   * HTML 发布接口 URL
   * @example 'https://api.example.com/publish'
   */
  publishUrl?: string;
  
  /**
   * 发布成功后的回调函数
   * @param url - 发布后返回的 URL
   * @example (url) => console.log('Published:', url)
   */
  onPublished?: (url: string) => void;
  /** Optional CSS URL to load for Prism (consumers can provide local file path) */
  cssUrl?: string;
}

/**
 * codeBlockPlugin - 代码块渲染插件
 * 
 * 使用 Prism 进行语法高亮，并提供复制和 HTML 预览功能
 * 
 * @param options - 插件配置选项
 * @param options.priority - 优先级（默认 70）
 * @param options.languageAliases - 语言别名映射
 * @returns CustomPlugin
 * 
 * @example
 * ```ts
 * // 默认配置
 * { plugin: codeBlockPlugin }
 * 
 * // 自定义配置
 * { 
 *   plugin: codeBlockPlugin, 
 *   options: { 
 *     priority: 80,
 *     languageAliases: { js: 'javascript', ts: 'typescript' }
 *   } 
 * }
 * ```
 */
export function codeBlockPlugin(options?: CodeBlockPluginOptions): CustomPlugin {
  const {
    priority = 70,
    languageAliases = {},
    publishUrl,
    onPublished
    , cssUrl
  } = options || {};
  // If a cssUrl is provided by the consumer, load it via loadCss utility.
  if (cssUrl && typeof window !== 'undefined') {
    loadCss(cssUrl);
  }
  // NOTE: We intentionally do NOT load Prism CSS here by default to keep the package
  // bundle lean and avoid relying on network/CDN in restricted environments.
  // If you want Prism styles, import them in your application's entry
  // (for example, in main.js or main.ts):
  //   import 'prismjs/themes/prism.css'
  
  return {
    name: 'codeblock',
    priority,
    // (Prism CSS already imported on-demand above when in browser)
  test: (node: ASTNode) => {
    // 匹配 <pre> 标签且包含 <code> 子节点
    if (node.type !== 'tag' || node.name !== 'pre') {
      return false;
    }
    
    // 检查是否有 code 子节点
    const hasCodeChild = node.children?.some(
      (child: ASTNode) => child.type === 'tag' && child.name === 'code'
    );
    
    return !!hasCodeChild;
  },
  render: (node: ASTNode, _renderChildren: any, _h: any, _context?: any) => {
    // 找到 code 节点
    const codeNode = node.children?.find(
      (child: ASTNode) => child.type === 'tag' && child.name === 'code'
    );
    
    if (!codeNode) {
      return h('pre', {}, '');
    }
    
    // 提取语言信息
    const className = codeNode.attribs?.class || '';
    const languageMatch = className.match(/language-(\w+)/);
    let language = languageMatch ? languageMatch[1] : 'plaintext';
    
    // 应用语言别名映射
    if (languageAliases[language]) {
      language = languageAliases[language];
    }
    
    // 提取代码内容
    const extractText = (n: ASTNode): string => {
      if (n.type === 'text') {
        return n.data || '';
      }
      if (n.children) {
        return n.children.map(extractText).join('');
      }
      return '';
    };
    
    const code = extractText(codeNode);
    
    // 渲染 CodeBlock 组件 (使用顶层导入的 h)
    return h(CodeBlock, {
      code,
      language,
      publishUrl,
      onPublished
    });
  }
  };
}

export default codeBlockPlugin;
