/**
 * 懒加载 Prism 及常用语言模块。
 *
 * 原 CodeBlock.vue 在模块顶层静态 import Prism 及其全部语言组件，
 * 导致 codeBlockPlugin（主入口静态导出）一被引用，Prism 全家桶就
 * 被打进主 bundle。这里改为按需异步加载：只有真正渲染代码块时
 * 才下载 Prism 核心 + 常用语言，未出现代码块时 0 字节加载。
 */

let prismPromise: Promise<any> | null = null;

export function getPrism(): Promise<any> {
  if (!prismPromise) {
    prismPromise = (async () => {
      const [{ default: Prism }] = await Promise.all([
        import('prismjs'),
        // 主题 CSS（副作用）
        import('prismjs/themes/prism-tomorrow.css'),
        // 常用语言（副作用注册到 Prism.languages）
        import('prismjs/components/prism-typescript'),
        import('prismjs/components/prism-javascript'),
        import('prismjs/components/prism-jsx'),
        import('prismjs/components/prism-tsx'),
        import('prismjs/components/prism-json'),
        import('prismjs/components/prism-python'),
        import('prismjs/components/prism-bash'),
        import('prismjs/components/prism-markup'),
        import('prismjs/components/prism-css'),
        import('prismjs/components/prism-java'),
        import('prismjs/components/prism-c'),
        import('prismjs/components/prism-cpp'),
        import('prismjs/components/prism-go'),
        import('prismjs/components/prism-rust'),
        import('prismjs/components/prism-markup-templating'), // PHP 依赖
        import('prismjs/components/prism-php'),
        import('prismjs/components/prism-ruby'),
        import('prismjs/components/prism-sql'),
        import('prismjs/components/prism-yaml'),
        import('prismjs/components/prism-markdown'),
      ]);
      return Prism;
    })();
  }
  return prismPromise;
}

export async function getHighlightedCode(code: string, language: string): Promise<string> {
  const Prism = await getPrism();
  const lang = language || 'plaintext';
  if (Prism.languages[lang]) {
    return Prism.highlight(code, Prism.languages[lang], lang);
  }
  return Prism.util.encode(code) as string;
}
