import { h } from 'vue';
import type { CustomPlugin } from '../types';

/**
 * AlertPlugin - 自定义警告框渲染插件
 * 
 * 配合 markdown-it-container 使用，支持以下 markdown 语法:
 * 
 * ::: info
 * 这是 info 类型的警告框，支持 **Markdown** 语法
 * :::
 * 
 * 或者使用 HTML 标签（但内部 Markdown 不会被解析）:
 * <div class="alert" data-type="info">纯文本内容</div>
 * 
 * 支持的类型: info, warning, error, success
 */
export const AlertPlugin: CustomPlugin = {
  name: 'alert',
  priority: 50,
  test: (node) => {
    return !!(node.type === 'tag' && 
              node.name === 'div' && 
              node.attribs?.class?.includes('alert'));
  },
  render: (node, renderChildren, h) => {
    const type = node.attribs?.['data-type'] || 'info';
    const colors = {
      info: '#0ea5e9',
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#10b981'
    };
    const color = colors[type as keyof typeof colors] || colors.info;
    
    return h('div', {
      class: `custom-alert alert-${type}`,
      style: {
        padding: '12px 16px',
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}15`,
        margin: '8px 0',
        borderRadius: '4px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }, renderChildren());
  }
};
