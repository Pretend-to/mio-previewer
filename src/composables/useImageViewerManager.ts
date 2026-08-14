import { ref, provide } from 'vue';

// viewerjs 惰性加载：只有点击图片真正打开查看器时才下载 (~60KB)
let viewerjsPromise: Promise<any> | null = null;
function getViewer(): Promise<any> {
  if (!viewerjsPromise) {
    viewerjsPromise = import('viewerjs').then((m: any) => m.default);
  }
  return viewerjsPromise;
}

/**
 * 创建图片查看器管理器的 composable
 * 用于在 MdRenderer 中统一管理所有图片的查看器实例
 */
export function useImageViewerManager(viewerOptions: any = {}) {
  const images = ref<HTMLImageElement[]>([]);
  let viewerInstance: any = null;
  const containerRef = ref<HTMLElement | null>(null);

  let rebuildTimer: any = null;

  // 注册图片
  function registerImage(img: HTMLImageElement) {
    if (!images.value.includes(img)) {
      images.value.push(img);
      scheduleRebuild();
    }
  }

  // 注销图片
  function unregisterImage(img: HTMLImageElement) {
    const index = images.value.indexOf(img);
    if (index > -1) {
      images.value.splice(index, 1);
      scheduleRebuild();
    }
  }

  /**
   * 流式渲染时图片列表高频变化（每条 token 都可能触发注册/注销），
   * 每次都销毁并重建 Viewer 实例会产生大量临时 DOM 和 GC 压力。
   * 这里合并为 150ms 防抖，只在图片列表稳定后重建一次。
   */
  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      void doRebuild();
    }, 150);
  }

  // 重建 Viewer 实例
  async function doRebuild() {
    // 销毁旧实例
    if (viewerInstance) {
      viewerInstance.destroy();
      viewerInstance = null;
    }

    // 如果有图片，创建新实例
    if (images.value.length > 0 && containerRef.value) {
      const Viewer = await getViewer();
      // 清空容器
      containerRef.value.innerHTML = '';

      // 将所有图片添加到容器中
      images.value.forEach(img => {
        const clone = img.cloneNode(true) as HTMLImageElement;
        containerRef.value!.appendChild(clone);
      });

      // 默认配置
      const defaultOptions = {
        inline: false,
        button: true,
        navbar: true,
        title: true,
        toolbar: {
          zoomIn: true,
          zoomOut: true,
          oneToOne: true,
          reset: true,
          prev: true,
          play: false,
          next: true,
          rotateLeft: true,
          rotateRight: true,
          flipHorizontal: true,
          flipVertical: true,
        },
        tooltip: true,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        transition: true,
        fullscreen: true,
        keyboard: true,
      };

      // 创建 Viewer 实例
      viewerInstance = new Viewer(containerRef.value, {
        ...defaultOptions,
        ...viewerOptions,
        url(image: HTMLImageElement) {
          return image.getAttribute('data-original') || image.src;
        }
      });
    }
  }

  // 显示指定索引的图片
  async function show(index: number = 0) {
    // 若实例尚未就绪（防抖窗口内被点击），先立即重建
    if (!viewerInstance) {
      await doRebuild();
    }
    if (viewerInstance) {
      viewerInstance.view(index);
    }
  }

  // 清理
  function cleanup() {
    clearTimeout(rebuildTimer);
    if (viewerInstance) {
      viewerInstance.destroy();
      viewerInstance = null;
    }
    images.value = [];
  }

  // 提供管理器方法
  const manager = {
    registerImage,
    unregisterImage,
    show,
    containerRef,
    cleanup
  };

  // 提供给子组件
  provide('imageViewerManager', manager);

  return manager;
}
