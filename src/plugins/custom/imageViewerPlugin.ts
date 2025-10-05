import { h } from 'vue';
import type { CustomPlugin, ASTNode, RenderContext } from '../../types';
import ImageViewer from '../../components/ImageViewer.vue';
import 'viewerjs/dist/viewer.css';

/**
 * ImageViewer 插件配置选项
 */
export interface ImageViewerPluginOptions {
  /**
   * 优先级（默认 50）
   */
  priority?: number;
  
  /**
   * Viewer.js 配置选项
   * @see https://github.com/fengyuanchen/viewerjs#options
   */
  viewerOptions?: any;
}

/**
 * imageViewerPlugin - 图片预览插件
 * 
 * 为 Markdown 中的图片添加点击放大预览功能，支持：
 * - 点击图片放大预览
 * - 移动端双指缩放
 * - 拖动图片
 * - 图片旋转
 * - 图片翻转
 * - 全屏查看
 * - 键盘导航
 * 
 * 基于 viewerjs 实现，自动集成到 Markdown 渲染的图片中
 * 
 * @param options - 插件配置选项
 * @param options.priority - 优先级（默认 50）
 * @param options.viewerOptions - Viewer.js 配置选项
 * @returns CustomPlugin
 * 
 * @example
 * ```ts
 * // 默认配置
 * { plugin: imageViewerPlugin }
 * 
 * // 自定义 Viewer 配置
 * { 
 *   plugin: imageViewerPlugin, 
 *   options: { 
 *     viewerOptions: {
 *       toolbar: true,
 *       navbar: true,
 *       title: true,
 *       button: true,
 *       loop: false
 *     }
 *   } 
 * }
 * ```
 */
export function imageViewerPlugin(options?: ImageViewerPluginOptions): CustomPlugin {
  const {
    priority = 50,
    viewerOptions = {}
  } = options || {};

  return {
    name: 'imageViewer',
    priority,
    test: (node: ASTNode) => {
      // 匹配 img 标签
      return node.type === 'tag' && node.name === 'img';
    },
    render: (node: ASTNode, _renderChildren: any, _h: any, context?: RenderContext) => {
      // 从 context 获取所有图片
      const images = context?.images || [];
      
      // 计算当前图片在列表中的索引
      let currentIndex = 0;
      if (node.attribs?.src && images.length > 0) {
        const index = images.findIndex(img => img.src === node.attribs?.src);
        if (index !== -1) {
          currentIndex = index;
        }
      }
      
      // 使用 ImageViewer 组件渲染
      return h(ImageViewer, {
        src: node.attribs?.src || '',
        alt: node.attribs?.alt || '',
        title: node.attribs?.title || '',
        index: currentIndex,
        viewerOptions,
        context
      });
    }
  };
}

export default imageViewerPlugin;
