import { ref, provide, onMounted, onUnmounted } from 'vue';
import Viewer from 'viewerjs';

/**
 * 创建图片查看器管理器的 composable
 * 用于在 MdRenderer 中统一管理所有图片的查看器实例
 */
export function useImageViewerManager(viewerOptions: any = {}) {
  const images = ref<HTMLImageElement[]>([]);
  let viewerInstance: Viewer | null = null;
  const containerRef = ref<HTMLElement | null>(null);

  // 注册图片
  function registerImage(img: HTMLImageElement) {
    if (!images.value.includes(img)) {
      images.value.push(img);
      updateViewer();
    }
  }

  // 注销图片
  function unregisterImage(img: HTMLImageElement) {
    const index = images.value.indexOf(img);
    if (index > -1) {
      images.value.splice(index, 1);
      updateViewer();
    }
  }

  // 更新 Viewer 实例
  function updateViewer() {
    // 销毁旧实例
    if (viewerInstance) {
      viewerInstance.destroy();
      viewerInstance = null;
    }

    // 如果有图片，创建新实例
    if (images.value.length > 0 && containerRef.value) {
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
  function show(index: number = 0) {
    if (viewerInstance) {
      viewerInstance.view(index);
    }
  }

  // 清理
  function cleanup() {
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
