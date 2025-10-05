import markdownItContainer from 'markdown-it-container';

/**
 * AlertPlugin - markdown-it 插件，支持 Alert 警告框
 * 
 * 支持 markdown 语法:
 * ::: info
 * 这是 info 类型的警告框，支持 **Markdown** 语法
 * :::
 * 
 * 支持的类型: info, warning, error, success
 * 
 * 使用方式：直接放到 markdownItPlugins 里
 * 
 * @example
 * import { AlertPlugin } from './plugins/AlertPlugin'
 * 
 * <MdRenderer :markdownItPlugins="[{ plugin: AlertPlugin }]" />
 */

export function AlertPlugin(md: any) {
  const types = ['info', 'warning', 'error', 'success'];
  const colors = {
    info: '#0ea5e9',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981'
  };
  
  types.forEach(type => {
    md.use(markdownItContainer, type, {
      render: (tokens: any[], idx: number) => {
        const color = colors[type as keyof typeof colors];
        if (tokens[idx].nesting === 1) {
          // 开始标签
          return `<div class="custom-alert alert-${type}" style="padding: 12px 16px; border-left: 4px solid ${color}; background-color: ${color}15; margin: 8px 0; border-radius: 4px; font-family: system-ui, -apple-system, sans-serif;">\n`;
        } else {
          // 结束标签
          return '</div>\n';
        }
      }
    });
  });
}
