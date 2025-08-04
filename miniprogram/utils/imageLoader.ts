// 图片懒加载工具类
interface ImageLoadOptions {
  placeholder?: string;
  errorImage?: string;
  lazyLoad?: boolean;
}

class ImageLoader {
  private static instance: ImageLoader;
  private loadedImages: Set<string> = new Set();
  private loadingImages: Set<string> = new Set();
  private imageCache: Map<string, string> = new Map();

  static getInstance(): ImageLoader {
    if (!ImageLoader.instance) {
      ImageLoader.instance = new ImageLoader();
    }
    return ImageLoader.instance;
  }

  // 预加载图片
  preloadImage(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.loadedImages.has(src)) {
        resolve(src);
        return;
      }

      if (this.loadingImages.has(src)) {
        // 如果正在加载，等待加载完成
        const checkLoaded = () => {
          if (this.loadedImages.has(src)) {
            resolve(src);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      this.loadingImages.add(src);

      const img = new Image();
      img.onload = () => {
        this.loadedImages.add(src);
        this.loadingImages.delete(src);
        resolve(src);
      };
      img.onerror = () => {
        this.loadingImages.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }

  // 批量预加载图片
  async preloadImages(srcs: string[]): Promise<string[]> {
    const promises = srcs.map(src => this.preloadImage(src).catch(() => src));
    return Promise.all(promises);
  }

  // 获取图片（支持缓存）
  getImage(src: string, options: ImageLoadOptions = {}): string {
    const {
      placeholder = '../images/unused/default-avatar.png',
      errorImage = '../images/unused/default-avatar.png'
    } = options;

    if (!src) {
      return placeholder;
    }

    // 检查缓存
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)!;
    }

    // 如果是本地图片，直接返回
    if (src.startsWith('../') || src.startsWith('./') || src.startsWith('/')) {
      this.imageCache.set(src, src);
      return src;
    }

    // 如果是网络图片，返回原地址（小程序会自动处理）
    this.imageCache.set(src, src);
    return src;
  }

  // 清除缓存
  clearCache(): void {
    this.loadedImages.clear();
    this.loadingImages.clear();
    this.imageCache.clear();
  }

  // 获取缓存状态
  getCacheStatus(): {
    loadedCount: number;
    loadingCount: number;
    cachedCount: number;
  } {
    return {
      loadedCount: this.loadedImages.size,
      loadingCount: this.loadingImages.size,
      cachedCount: this.imageCache.size
    };
  }
}

export const imageLoader = ImageLoader.getInstance(); 