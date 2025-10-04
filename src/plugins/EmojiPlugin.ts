import type { CustomPlugin } from '../types';

/**
 * EmojiPlugin - Emoji 文本替换插件
 * 
 * 将文本中的 :emoji_code: 替换为对应的 emoji 符号
 * 
 * 支持的 emoji:
 * :smile: 😊, :heart: ❤️, :fire: 🔥, :rocket: 🚀, :star: ⭐
 * :thumbsup: 👍, :tada: 🎉, :check: ✅, :cross: ❌
 */
export const EmojiPlugin: CustomPlugin = {
  name: 'emoji',
  priority: 10,
  test: (node) => {
    return node.type === 'text' && /:\w+:/g.test(node.data || '');
  },
  render: (node, _renderChildren, _h) => {
    const text = node.data || '';
    const emojiMap: Record<string, string> = {
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
    
    let result = text;
    Object.entries(emojiMap).forEach(([code, emoji]) => {
      result = result.replace(new RegExp(code, 'g'), emoji);
    });
    
    return result;
  }
};
