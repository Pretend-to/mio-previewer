import { parseDocument } from "htmlparser2";
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true, // 允许 HTML 标签
  linkify: true, // 自动识别链接
  typographer: true // 启用排版改进
})

self.onmessage = (event) => {
  const { markdownText } = event.data;

  // 1. Markdown -> HTML (应用了 markdown-it 插件)
  const html = md.render(markdownText);

  // 2. HTML -> AST (DOM-like structure)
  const ast = parseDocument(html).children;

  // 将解析结果发送回主线程
  self.postMessage({ ast });
};