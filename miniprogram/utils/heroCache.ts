// 英雄数据缓存工具类
interface HeroCacheData {
  categories: any;
  totalHeroes: number;
  avatarURLs: { [key: string]: string };
  timestamp: number;
}

interface CacheConfig {
  heroDataExpireTime: number; // 英雄数据缓存时间（毫秒）
  avatarURLExpireTime: number; // 头像URL缓存时间（毫秒）
}

class HeroCache {
  private cacheKey = 'hero_list_cache';
  private config: CacheConfig = {
    heroDataExpireTime: 10 * 60 * 1000, // 10分钟
    avatarURLExpireTime: 2 * 60 * 60 * 1000 // 2小时（临时URL有效期）
  };

  // 获取缓存数据
  getCache(): HeroCacheData | null {
    try {
      const cacheStr = wx.getStorageSync(this.cacheKey);
      if (!cacheStr) return null;

      const cache: HeroCacheData = JSON.parse(cacheStr);
      const now = Date.now();

      // 检查缓存是否过期
      if (now - cache.timestamp > this.config.heroDataExpireTime) {
        this.clearCache();
        return null;
      }

      return cache;
    } catch (error) {
      console.error('读取缓存失败:', error);
      return null;
    }
  }

  // 设置缓存数据
  setCache(data: any, avatarURLs: { [key: string]: string }): void {
    try {
      const cacheData: HeroCacheData = {
        categories: data.categories,
        totalHeroes: data.totalHeroes,
        avatarURLs: avatarURLs,
        timestamp: Date.now()
      };

      wx.setStorageSync(this.cacheKey, JSON.stringify(cacheData));
      console.log('英雄数据缓存已更新');
    } catch (error) {
      console.error('设置缓存失败:', error);
    }
  }

  // 清除缓存
  clearCache(): void {
    try {
      wx.removeStorageSync(this.cacheKey);
      console.log('英雄数据缓存已清除');
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  // 检查缓存是否有效
  isCacheValid(): boolean {
    const cache = this.getCache();
    return cache !== null;
  }

  // 获取缓存状态信息
  getCacheInfo(): { hasCache: boolean; age: number; size: number } {
    const cache = this.getCache();
    if (!cache) {
      return { hasCache: false, age: 0, size: 0 };
    }

    const age = Date.now() - cache.timestamp;
    const size = JSON.stringify(cache).length;

    return {
      hasCache: true,
      age: age,
      size: size
    };
  }

  // 强制刷新缓存
  forceRefresh(): void {
    this.clearCache();
  }
}

// 导出单例实例
export const heroCache = new HeroCache(); 