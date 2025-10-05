import type { CustomPlugin } from '../../types';

/**
 * Emoji 插件配置选项
 */
export interface EmojiPluginOptions {
  /**
   * 优先级（默认 10）
   */
  priority?: number;
  
  /**
   * 自定义 emoji 映射表
   * @example { ':custom:': '🎨', ':logo:': '🚀' }
   */
  customEmojis?: Record<string, string>;
}

/**
 * emojiPlugin - Emoji 文本替换插件
 * 
 * 将文本中的 :emoji_code: 替换为对应的 emoji 符号
 * 
 * @param options - 插件配置选项
 * @param options.priority - 优先级（默认 10）
 * @param options.customEmojis - 自定义 emoji 映射表
 * @returns CustomPlugin
 * 
 * @example
 * ```ts
 * // 默认配置（内置常用 emoji）
 * { plugin: emojiPlugin }
 * 
 * // 添加自定义 emoji
 * { 
 *   plugin: emojiPlugin, 
 *   options: { 
 *     customEmojis: { ':custom:': '🎨', ':logo:': '🚀' }
 *   } 
 * }
 * ```
 * 
 * 内置支持的 emoji:
 * :smile: 😊, :heart: ❤️, :fire: 🔥, :rocket: 🚀, :star: ⭐
 * :thumbsup: 👍, :tada: 🎉, :check: ✅, :cross: ❌, :eyes: 👀
 * :thinking: 🤔, :100: 💯
 */
export function emojiPlugin(options?: EmojiPluginOptions): CustomPlugin {
  const {
    priority = 10,
    customEmojis = {}
  } = options || {};
  
  // 内置 emoji 映射表
  const defaultEmojiMap: Record<string, string> = {
    ':smile:': '😊',
    ':heart:': '❤️',
    ':fire:': '🔥',
    ':rocket:': '🚀',
    ':star:': '⭐',
    ':thumbsup:': '👍',
    ':tada:': '🎉',
    ':check:': '✅',
    ':cross:': '❌',
    ':eyes:': '👀',
    ':thinking:': '🤔',
    ':100:': '💯'
  };
  
  // 合并自定义 emoji
  const emojiMap = { ...defaultEmojiMap, ...customEmojis };
  
  return {
    name: 'emoji',
    priority,
    test: (node) => {
      return node.type === 'text' && /:\w+:/g.test(node.data || '');
    },
    render: (node, _renderChildren, _h) => {
      const text = node.data || '';
      
      let result = text;
      Object.entries(emojiMap).forEach(([code, emoji]) => {
        result = result.replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
      });
      
      return result;
    }
  };
}

export default emojiPlugin;
