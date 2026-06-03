/**
 * 判断是否需要为图片加上 crossorigin="anonymous" 属性
 */
export function shouldAddCors(src: string, autoCors: boolean | string[] | undefined): boolean {
  if (!autoCors || !src) return false;
  
  // Data URI 或 blob 等不需要跨域设置
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;

  const isAbsolute = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
  
  if (Array.isArray(autoCors)) {
    // 域名列表：如果 src 是绝对路径且包含列表里的任何域名，就加上 CORS
    return autoCors.some(domain => {
      try {
        const url = isAbsolute ? new URL(src, window.location.origin) : new URL(src, 'http://dummy.com');
        return url.hostname.includes(domain);
      } catch (e) {
        return src.includes(domain);
      }
    });
  }

  if (autoCors === true) {
    // boolean 模式：如果是绝对路径且域名与当前站点不同，则视为跨域
    if (isAbsolute) {
      try {
        const url = new URL(src, window.location.origin);
        return url.hostname !== window.location.hostname;
      } catch (e) {
        return false;
      }
    }
  }

  return false;
}
