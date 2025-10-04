import { h } from 'vue';
import type { CustomPlugin, ASTNode } from '../types';
import CodeBlock from '../components/CodeBlock.vue';

/**
 * CodeBlockPlugin - 代码块渲染插件
 * 
 * 使用 Prism 进行语法高亮，并提供复制和 HTML 预览功能
 * 
 * 优先级: 70 (高于默认渲染)
 */
export const CodeBlockPlugin: CustomPlugin = {
  name: 'codeblock',
  priority: 70,
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
  render: (node: ASTNode, _renderChildren: any, _h: any) => {
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
    const language = languageMatch ? languageMatch[1] : 'plaintext';
    
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
      language
    });
  }
};
