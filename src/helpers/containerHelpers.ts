/**
 * Helper functions for configuring markdown-it-container plugins
 * 
 * 简化 markdown-it-container 的配置过程
 */

import type { MarkdownItPluginConfig } from '../types';
import { AlertPlugin } from '../plugins/AlertPlugin';

/**
 * 创建一个 Alert 容器配置
 * 
 * @param type - Alert 类型 (info, warning, error, success)
 * @returns markdown-it-container 配置对象
 * 
 * @example
 * ```typescript
 * import { createAlertContainer } from 'mio-previewer/helpers';
 * 
 * const markdownItPlugins = [
 *   createAlertContainer('info'),
 *   createAlertContainer('warning'),
 *   createAlertContainer('error'),
 *   createAlertContainer('success')
 * ];
 * ```
 * 
 * 使用方式:
 * ```markdown
 * ::: info
 * 这是一个 **info** 类型的警告框
 * :::
 * ```
 */
export function createAlertContainer(
  type: 'info' | 'warning' | 'error' | 'success',
  plugin: any
): MarkdownItPluginConfig {
  return {
    plugin,
    options: [type, {
      render: (tokens: any[], idx: number) => {
        if (tokens[idx].nesting === 1) {
          return `<div class="alert" data-type="${type}">\n`;
        } else {
          return '</div>\n';
        }
      }
    }]
  };
}

/**
 * 创建所有 Alert 容器配置的便捷函数
 * 
 * @param plugin - markdown-it-container 插件
 * @returns 包含所有 alert 类型的配置数组
 * 
 * @example
 * ```typescript
 * import markdownItContainer from 'markdown-it-container';
 * import { createAllAlertContainers } from 'mio-previewer/helpers';
 * 
 * const markdownItPlugins = createAllAlertContainers(markdownItContainer);
 * ```
 */
export function createAllAlertContainers(plugin: any): MarkdownItPluginConfig[] {
  return [
    createAlertContainer('info', plugin),
    createAlertContainer('warning', plugin),
    createAlertContainer('error', plugin),
    createAlertContainer('success', plugin)
  ];
}

/**
 * 便捷函数：同时返回自定义渲染插件（用于 RecursiveRenderer 的 customPlugins）
 * 以及对应的 markdown-it-container 配置数组（用于 markdown-it 插件数组）
 *
 * 这样可以在 demo 中通过一个调用同时获得两类插件，使用更直观。
 */
export function createAlertPlugins(plugin: any) {
  return {
    customPlugins: [AlertPlugin],
    markdownItPlugins: createAllAlertContainers(plugin)
  };
}
