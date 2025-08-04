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

  // 根据英雄ID查找英雄信息
  async getHeroById(heroId: string): Promise<any | null> {
    try {
      const cache = this.getCache();
      if (!cache || !cache.categories) {
        console.log('缓存中没有英雄数据');
        return null;
      }

      // 遍历所有分类查找英雄
      for (const category of Object.values(cache.categories)) {
        if (category && typeof category === 'object' && (category as any).heroes && Array.isArray((category as any).heroes)) {
          const hero = (category as any).heroes.find((h: any) => h.id === heroId);
          if (hero) {
            console.log('通过ID找到英雄:', hero);
            return hero;
          }
        }
      }

      console.log('未找到ID为', heroId, '的英雄');
      return null;
    } catch (error) {
      console.error('通过ID查找英雄失败:', error);
      return null;
    }
  }

  // 根据英雄名称查找英雄信息
  async getHeroByName(heroName: string): Promise<any | null> {
    try {
      const cache = this.getCache();
      if (!cache || !cache.categories) {
        console.log('缓存中没有英雄数据');
        return null;
      }

      // 遍历所有分类查找英雄
      for (const category of Object.values(cache.categories)) {
        if (category && typeof category === 'object' && (category as any).heroes && Array.isArray((category as any).heroes)) {
          const hero = (category as any).heroes.find((h: any) => h.name === heroName);
          if (hero) {
            console.log('通过名称找到英雄:', hero);
            return hero;
          }
        }
      }

      console.log('未找到名称为', heroName, '的英雄');
      return null;
    } catch (error) {
      console.error('通过名称查找英雄失败:', error);
      return null;
    }
  }

  // 获取英雄头像URL
  async getHeroAvatar(heroId: string): Promise<string | null> {
    try {
      const cache = this.getCache();
      if (!cache || !cache.avatarURLs) {
        console.log('缓存中没有头像数据');
        return null;
      }

      const avatarURL = cache.avatarURLs[heroId];
      if (avatarURL) {
        console.log('获取到英雄头像URL:', avatarURL);
        return avatarURL;
      }

      console.log('未找到英雄', heroId, '的头像URL');
      return null;
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      return null;
    }
  }

  // 获取英雄头像URL（兼容方法名）
  async getAvatarUrl(heroId: string): Promise<string | null> {
    return this.getHeroAvatar(heroId);
  }
}

// 导出单例实例
export const heroCache = new HeroCache(); 