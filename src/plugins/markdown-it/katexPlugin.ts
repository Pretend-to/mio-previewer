/**
 * Enhanced KaTeX plugin for markdown-it
 *
 * Supports multiple math delimiters (in priority order):
 * - Block math: $$...$$, \[...\]
 * - Inline math: \(...\), $...$
 */

import katex from "katex";
import type MarkdownIt from "markdown-it";
import { loadCss } from '../../utils/loadCss';

export interface KatexPluginOptions {
  /** Optional CSS URL to load for KaTeX (consumers can provide local file path) */
  cssUrl?: string;
}

interface Delimiter {
  open: string;
  close: string;
  display: boolean;
}

export function katexPlugin(md: any): void {
  // NOTE: We intentionally do NOT load KaTeX CSS here to keep the package
  // bundle lean and avoid relying on network/CDN in restricted environments.
  // If you want KaTeX styles, import them in your application's entry
  // (for example, in main.js or main.ts):
  //   import 'katex/dist/katex.min.css'
  return simpleKatexPlugin(md as any) as any;
}

// Factory that accepts options (e.g., cssUrl) and returns a markdown-it plugin
export function createKatexPlugin(options?: KatexPluginOptions) {
  const { cssUrl } = options || {};
  return (md: any) => {
    if (cssUrl && typeof window !== 'undefined') {
      loadCss(cssUrl);
    }
    return simpleKatexPlugin(md as any) as any;
  };
}

// Reuse implementation
function simpleKatexPlugin(md: any): void {
  // 所有支持的定界符，按优先级排序（长的在前）
  const allDelimiters: Delimiter[] = [
    { open: "$$", close: "$$", display: true },
    { open: "\\[", close: "\\]", display: true },
    { open: "\\(", close: "\\)", display: false },
    { open: "$", close: "$", display: false },
  ];

  // 统一的数学公式解析规则
  const mathRule = (state: any, silent: boolean): boolean => {
    const src = state.src;
    for (const delim of allDelimiters) {
      if (!src.startsWith(delim.open, state.pos)) continue;

      const start = state.pos + delim.open.length;
      let match = start;
      let found = -1;

      // 查找配对的结束定界符
      while ((match = src.indexOf(delim.close, match)) !== -1) {
        // 检查反斜杠转义
        let pos = match - 1;
        let backslashes = 0;
        while (pos >= 0 && src[pos] === "\\") {
          backslashes++;
          pos--;
        }

        // 如果反斜杠数量是偶数，说明结束定界符没有被转义
        if (backslashes % 2 === 0) {
          found = match;
          break;
        }
        match += delim.close.length;
      }

      if (found === -1) {
        // 没有找到结束定界符，当作普通文本
        if (!silent) state.pending += delim.open;
        state.pos += delim.open.length;
        return true;
      }

      // 提取内容
      const content = src.slice(start, found);

      if (!silent) {
        const token: any = state.push("math", "math", 0);
        token.content = content;
        token.markup = delim.open;
        token.meta = { display: delim.display } as any;
      }

      state.pos = found + delim.close.length;
      return true;
    }

    return false;
  };

  const mathRenderer = (tokens: any[], idx: number): string => {
    const token = tokens[idx];
    const display = (token.meta as { display?: boolean })?.display || false;

    try {
      const html = katex.renderToString(token.content, {
        displayMode: display,
        throwOnError: false,
        // Only output MathML markup (remove the HTML output). This keeps the
        // MathML representation and prevents the HTML portion   // appended alongside it.
        output: "mathml",
        // Do not trust input to avoid inserting raw text nodes
        trust: false,
      });

      if (display) {
        return `<div class="katex-block">${html}</div>`;
      }
      return html;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const encodedContent = md.utils
        ? md.utils.escapeHtml(token.content)
        : token.content;
      const encodedError = md.utils
        ? md.utils.escapeHtml(errorMessage)
        : errorMessage;
      return `<span class="katex-error" title="${encodedError}">${encodedContent}</span>`;
    }
  };

  // 注册规则 - 在 escape 之前
  md.inline.ruler.before("escape", "math", mathRule as any);
  md.renderer.rules["math"] = mathRenderer as any;

  // 匹配块级公式的规则（markdown-it block rule 签名）
  const mathBlockRule = (
    state: any,
    startLine: number,
    endLine: number,
    silent: boolean
  ): boolean => {
    for (const delim of allDelimiters) {
      if (!delim.display) continue; // 只处理块级定界符

      let pos = state.bMarks[startLine] + state.tShift[startLine];
      let max = state.eMarks[startLine];

      // 检查行首是否为打开定界符
      if (pos + delim.open.length > max) continue;
      if (state.src.slice(pos, pos + delim.open.length) !== delim.open)
        continue;

      pos += delim.open.length;
      const firstLine = state.src.slice(pos, max);

      // 单行情况：$$...$$ 或 \[...\]
      if (firstLine.trim().endsWith(delim.close)) {
        const content = firstLine.trim().slice(0, -delim.close.length);
        if (!silent) {
          const token: any = state.push("math", "math", 0);
          token.block = true;
          token.content = content;
          token.markup = delim.open;
          token.meta = { display: delim.display } as any;
          token.map = [startLine, startLine + 1];
        }
        state.line = startLine + 1;
        return true;
      }

      // 多行块：查找单独一行的关闭定界符
      let nextLine = startLine;
      let hasEnding = false;

      while (nextLine < endLine) {
        nextLine++;
        if (nextLine >= endLine) break;

        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];

        if (pos < max && state.tShift[nextLine] < state.blkIndent) break;

        if (state.src.slice(pos, max).trim() === delim.close) {
          hasEnding = true;
          break;
        }
      }

      if (!hasEnding) continue;

      // 保存并设置解析状态（符合 markdown-it 要求）
      const oldParent = state.parentType;
      const oldLineMax = state.lineMax;
      state.parentType = "math";

      // 收集内容
      let content = "";
      for (let i = startLine + 1; i < nextLine; i++) {
        const lineContent = state.getLines(
          i,
          i + 1,
          state.tShift[startLine],
          false
        );
        content += lineContent;
      }

      if (!silent) {
        const token: any = state.push("math", "math", 0);
        token.block = true;
        token.content = content.trim();
        token.markup = delim.open;
        token.meta = { display: delim.display } as any;
        token.map = [startLine, nextLine + 1];
      }

      state.parentType = oldParent;
      state.lineMax = oldLineMax;
      state.line = nextLine + 1;
      return true;
    }

    return false;
  };

  // 注册 block 规则，优先级在 fence 之前
  md.block.ruler.before("fence", "math_block", mathBlockRule as any);
}
