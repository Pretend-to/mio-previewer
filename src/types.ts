import type { VNode } from 'vue';

/**
 * AST 节点类型（htmlparser2 输出）
 */
export type ASTNode = {
  type: 'tag' | 'text' | 'comment' | 'component' | 'root' | 'document' | 'script' | 'style';
  name?: string;
  attribs?: Record<string, string>;
  children?: ASTNode[];
  data?: string; // 文本节点的内容
};

/**
 * 渲染上下文（传递给插件的共享状态）
 */
export type RenderContext = {
  /**
   * 图片列表（用于图片预览等功能）
   */
  images?: Array<{
    src: string;
    alt?: string;
    title?: string;
  }>;

  /**
   * 是否处于流式渲染模式
   */
  isStreaming?: boolean;

  /**
   * 其他自定义状态
   */
  [key: string]: any;
};

/**
 * Custom 插件接口
 */
export type CustomPlugin = {
  /**
   * 插件名称（用于调试）
   */
  name?: string;

  /**
   * 优先级（数字越大越先执行，默认 0）
   */
  priority?: number;

  /**
   * 测试函数：判断节点是否匹配此插件
   */
  test: (node: ASTNode) => boolean;

  /**
   * 渲染函数：返回 VNode、字符串或 null
   * @param node 当前 AST 节点
   * @param renderChildren 渲染子节点的函数
   * @param h Vue 的 h 函数
   * @param context 渲染上下文（包含共享状态）
   */
  render: (
    node: ASTNode,
    renderChildren: () => (VNode | string | null)[],
    h: typeof import('vue').h,
    context?: RenderContext
  ) => VNode | string | null;
};

/**
 * Custom 插件配置（支持 options）
 * 
 * 使用方式：
 * ```ts
 * customPlugins: [
 *   { plugin: codeBlockPlugin },                    // 无配置
 *   { plugin: cursorPlugin, options: { shape: 'line' } }  // 带配置
 * ]
 * ```
 */
export type CustomPluginConfig = {
  /**
   * 插件工厂函数（接收可选配置，返回 CustomPlugin）
   */
  plugin: (options?: any) => CustomPlugin;

  /**
   * 插件选项（可选）
   */
  options?: any;
};

/**
 * Markdown-it 插件配置
 */
export type MarkdownItPluginConfig = {
  /**
   * markdown-it 插件函数
   */
  plugin: (md: any, options?: any) => void;

  /**
   * 插件选项
   */
  options?: any;
};

/**
 * MdRenderer Props
 */
export type MdRendererProps = {
  /**
   * Markdown 文本
   */
  md: string;

  /**
   * 是否处于流式模式
   */
  isStreaming?: boolean;

  /**
   * 是否使用 Worker 进行解析
   */
  useWorker?: boolean;

  /**
   * Markdown-it 插件配置
   */
  markdownItPlugins?: MarkdownItPluginConfig[];

  /**
   * Markdown-it 配置选项
   */
  markdownItOptions?: Record<string, any>;

  /**
   * Custom 渲染插件配置
   */
  customPlugins?: CustomPluginConfig[];
};
