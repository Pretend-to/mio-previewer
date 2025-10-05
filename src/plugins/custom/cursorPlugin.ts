import { h } from 'vue';
import BlinkingCursor from '../../components/BlinkingCursor.vue';
import type { CustomPlugin } from '../../types';

export interface CursorPluginOptions {
  /**
   * 光标形状
   * - 'square': 方形光标（默认）
   * - 'line': 竖线光标
   * - 'circle': 圆形光标
   */
  shape?: 'square' | 'line' | 'circle';

  /**
   * 光标颜色（CSS 颜色值）
   */
  color?: string;

  /**
   * 优先级（默认 100）
   */
  priority?: number;
}

/**
 * 光标插件
 * 用于在流式渲染时显示闪烁的光标
 * 
 * @param options - 插件配置选项
 * @returns CustomPlugin
 * 
 * @example
 * ```ts
 * // 默认方形光标
 * { plugin: cursorPlugin }
 * 
 * // 自定义竖线光标
 * { plugin: cursorPlugin, options: { shape: 'line', color: '#0066ff' } }
 * 
 * // 圆形黑色光标
 * { plugin: cursorPlugin, options: { shape: 'circle', color: '#000' } }
 * 
 * // 圆形蓝色光标
 * { plugin: cursorPlugin, options: { shape: 'circle', color: '#0066ff' } }
 * ```
 */
export function cursorPlugin(options: CursorPluginOptions = {}): CustomPlugin {
  const {
    shape = 'square',
    color,
    priority = 100
  } = options;

  return {
    name: 'cursor',
    priority,
    test: (node: any) => node.type === 'component' && node.name === 'cursor',
    render: (node: any, _renderChildren: any, _h: any, _context?: any) => {
      // 合并 node.attribs 和 options
      const props = {
        ...node.attribs,
        shape,
        ...(color && { color })
      };
      
      return h(BlinkingCursor, props);
    }
  };
}

export default cursorPlugin;
