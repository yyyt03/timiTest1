// 英雄数据缓存工具类
import { getHeroesByCategory, getHeroById as getLocalHeroById, getHeroByName as getLocalHeroByName } from '../data/localHeroData';
import { getCurrentConfig } from './config';
import { log } from './logger';
import { CACHE_KEYS } from './cacheKeys';

interface HeroCacheData {
  categories: any;
  totalHeroes: number;
  avatarURLs: { [key: string]: string };
  timestamp: number;
  dataVersion: string; // 数据版本号，用于检测数据变化
  lastVersionCheck: number; // 上次版本检查时间
}

interface CacheConfig {
  heroDataExpireTime: number; // 英雄数据缓存时间（毫秒）
  avatarURLExpireTime: number; // 头像URL缓存时间（毫秒）
  useLocalData: boolean; // 是否优先使用本地数据
}

class HeroCache {
  private cacheKey = CACHE_KEYS.HERO_LIST_DATA;
  private _hasLoggedCacheStrategy = false; // 标记是否已记录缓存策略日志
  private config: CacheConfig = {
    heroDataExpireTime: 23 * 60 * 60 * 1000, // 23小时（英雄数据为静态资源，可长期缓存）
    avatarURLExpireTime: 2 * 60 * 60 * 1000, // 2小时（临时URL有效期）
    useLocalData: true // 优先使用本地数据
  };

  // 获取缓存数据
  getCache(): HeroCacheData | null {
    try {
      // 如果启用本地数据，优先使用本地数据
      if (this.config.useLocalData) {
        // 使用新的日志系统
        log('使用本地英雄数据');
        const localData = getHeroesByCategory();
        
        // 构建本地数据缓存格式，但需要获取头像临时URL
        const localCache: HeroCacheData = {
          categories: localData.categories,
          totalHeroes: localData.totalHeroes,
          avatarURLs: {}, // 头像URL需要从云存储获取
          timestamp: Date.now(),
          dataVersion: 'local', // 本地数据版本
          lastVersionCheck: Date.now()
        };
        
        return localCache;
      }
      
      // 记录英雄数据缓存策略（首次使用时）
      if (!this._hasLoggedCacheStrategy) {
        log('英雄数据缓存策略初始化', {
          heroDataExpireTime: '23小时（英雄数据为静态资源，可长期缓存）',
          avatarURLExpireTime: '2小时（临时URL有效期）',
          strategy: '英雄数据为静态资源，可长期缓存以减少云函数调用',
          cacheKey: this.cacheKey
        });
        this._hasLoggedCacheStrategy = true;
      }
      
      // 否则使用原有缓存逻辑
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
  async setCache(data: any, avatarURLs: { [key: string]: string }): Promise<void> {
    try {
      // 获取当前数据版本
      const currentVersion = await this.getCurrentDataVersion();
      
      const cacheData: HeroCacheData = {
        categories: data.categories,
        totalHeroes: data.totalHeroes,
        avatarURLs: avatarURLs,
        timestamp: Date.now(),
        dataVersion: currentVersion,
        lastVersionCheck: Date.now()
      };

      wx.setStorageSync(this.cacheKey, JSON.stringify(cacheData));
      // 使用新的日志系统
      log('英雄数据缓存已更新，版本:', currentVersion, { cacheKey: this.cacheKey });
    } catch (error) {
      console.error('设置缓存失败:', error);
    }
  }

  // 获取当前数据版本
  private async getCurrentDataVersion(): Promise<string> {
    try {
      const config = getCurrentConfig();
      return config.version || 'v1.0.0';
    } catch (error) {
      console.error('获取数据版本失败:', error);
      return 'v1.0.0';
    }
  }

  // 清除缓存
  clearCache(): void {
    try {
      wx.removeStorageSync(this.cacheKey);
      log('英雄数据缓存已清除', { cacheKey: this.cacheKey });
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  // 检查缓存是否存在
  hasCache(): boolean {
    try {
      const cacheStr = wx.getStorageSync(this.cacheKey);
      if (!cacheStr) return false;

      const cache: HeroCacheData = JSON.parse(cacheStr);
      const now = Date.now();

      // 检查缓存是否过期
      return now - cache.timestamp <= this.config.heroDataExpireTime;
    } catch (error) {
      return false;
    }
  }

  // 获取缓存统计信息
  getCacheStats(): {
    hasCache: boolean;
    cacheKey: string;
    lastUpdate?: number;
    dataVersion?: string;
  } {
    try {
      const cacheStr = wx.getStorageSync(this.cacheKey);
      if (!cacheStr) {
        return {
          hasCache: false,
          cacheKey: this.cacheKey
        };
      }

      const cache: HeroCacheData = JSON.parse(cacheStr);
      return {
        hasCache: true,
        cacheKey: this.cacheKey,
        lastUpdate: cache.timestamp,
        dataVersion: cache.dataVersion
      };
    } catch (error) {
      return {
        hasCache: false,
        cacheKey: this.cacheKey
      };
    }
  }

  // 获取英雄分类数据
  getHeroesByCategory(): any {
    const cache = this.getCache();
    if (cache && cache.categories) {
      return cache.categories;
    }
    
    // 如果缓存不存在，返回本地数据
    return getHeroesByCategory();
  }

  // 根据ID获取英雄
  getHeroById(id: string): any {
    const cache = this.getCache();
    if (cache && cache.categories) {
      // 从缓存中查找英雄
      for (const category of Object.values(cache.categories)) {
        const heroes = (category as any).heroes || [];
        const hero = heroes.find((h: any) => h.id === id);
        if (hero) return hero;
      }
    }
    
    // 如果缓存中找不到，使用本地数据
    return getLocalHeroById(id);
  }

  // 根据名称获取英雄
  getHeroByName(name: string): any {
    const cache = this.getCache();
    if (cache && cache.categories) {
      // 从缓存中查找英雄
      for (const category of Object.values(cache.categories)) {
        const heroes = (category as any).heroes || [];
        const hero = heroes.find((h: any) => h.name === name);
        if (hero) return hero;
      }
    }
    
    // 如果缓存中找不到，使用本地数据
    return getLocalHeroByName(name);
  }

  // 获取英雄总数
  getTotalHeroes(): number {
    const cache = this.getCache();
    if (cache && cache.totalHeroes) {
      return cache.totalHeroes;
    }
    
    // 如果缓存中找不到，使用本地数据
    const localData = getHeroesByCategory();
    return localData.totalHeroes || 0;
  }

  // 获取头像URL映射
  getAvatarURLs(): { [key: string]: string } {
    const cache = this.getCache();
    return cache ? cache.avatarURLs : {};
  }

  // 检查缓存是否过期
  isCacheExpired(): boolean {
    const cache = this.getCache();
    if (!cache) return true;

    const now = Date.now();
    return now - cache.timestamp > this.config.heroDataExpireTime;
  }

  // 获取缓存过期时间
  getCacheExpiryTime(): number | null {
    const cache = this.getCache();
    if (!cache) return null;

    return cache.timestamp + this.config.heroDataExpireTime;
  }

  // 获取缓存剩余时间
  getCacheRemainingTime(): number {
    const expiryTime = this.getCacheExpiryTime();
    if (!expiryTime) return 0;

    const remaining = expiryTime - Date.now();
    return Math.max(0, remaining);
  }

  // 强制刷新缓存
  async forceRefreshCache(): Promise<void> {
    this.clearCache();
    log('英雄数据缓存已强制刷新', { cacheKey: this.cacheKey });
  }

  // 获取缓存配置
  getCacheConfig(): CacheConfig {
    return { ...this.config };
  }

  // 更新缓存配置
  updateCacheConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log('英雄数据缓存配置已更新', { 
      newConfig: this.config,
      cacheKey: this.cacheKey
    });
  }
}

// 创建单例实例
const heroCache = new HeroCache();

export default heroCache; 