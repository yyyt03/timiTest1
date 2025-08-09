// 英雄数据缓存工具类
import { getHeroesByCategory, getHeroById as getLocalHeroById, getHeroByName as getLocalHeroByName } from '../data/localHeroData';
import { getCurrentConfig, log } from './config';

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
  private cacheKey = 'hero_list_cache';
  private config: CacheConfig = {
    heroDataExpireTime: 10 * 60 * 1000, // 10分钟
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
      log('英雄数据缓存已更新，版本:', currentVersion);
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

  // 检查数据版本是否有变化
  async checkDataVersion(): Promise<boolean> {
    try {
      const currentConfig = getCurrentConfig();
      if (!currentConfig.enableVersionCheck) {
        return false; // 版本检查被禁用
      }

      const cache = this.getCache();
      if (!cache) {
        return true; // 无缓存，需要刷新
      }

      const now = Date.now();
      const timeSinceLastCheck = now - cache.lastVersionCheck;
      
      // 检查是否需要执行版本检查
      if (timeSinceLastCheck < currentConfig.versionCheckInterval) {
        return false; // 距离上次检查时间太短，跳过
      }

      // 获取当前数据版本
      const currentVersion = await this.getCurrentDataVersion();
      
      // 如果版本不同，需要刷新
      if (currentVersion !== cache.dataVersion) {
        log('数据版本已变化，需要刷新缓存');
        return true;
      }

      // 更新最后检查时间
      cache.lastVersionCheck = now;
      this.updateCacheTimestamp(cache);
      
      return false; // 版本相同，无需刷新
    } catch (error) {
      log('版本检查失败:', error);
      return false; // 检查失败时，保守处理，不刷新
    }
  }

  // 获取当前数据版本
  private async getCurrentDataVersion(): Promise<string> {
    try {
      if (this.config.useLocalData) {
        // 本地数据版本：基于数据内容生成哈希值
        const localData = getHeroesByCategory();
        const dataHash = this.generateDataHash(localData);
        return `local-${dataHash}`;
      } else {
        // 远程数据版本：从服务器获取
        // 这里可以调用一个轻量级的版本检查API
        return 'remote-v1.0';
      }
    } catch (error) {
      log('获取数据版本失败:', error);
      return 'unknown';
    }
  }

  // 生成数据哈希值
  private generateDataHash(data: any): string {
    try {
      // 简化的哈希算法，基于关键数据字段
      const keyData = {
        totalHeroes: data.totalHeroes,
        categories: Object.keys(data.categories).length,
        // 可以添加更多关键字段
      };
      
      const dataStr = JSON.stringify(keyData);
      let hash = 0;
      
      for (let i = 0; i < dataStr.length; i++) {
        const char = dataStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      log('生成数据哈希失败:', error);
      return 'hash-error';
    }
  }

  // 更新缓存时间戳
  private updateCacheTimestamp(cache: HeroCacheData): void {
    try {
      cache.timestamp = Date.now();
      wx.setStorageSync(this.cacheKey, JSON.stringify(cache));
    } catch (error) {
      log('更新缓存时间戳失败:', error);
    }
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

  // 切换本地数据使用状态
  toggleLocalData(useLocal: boolean): void {
    this.config.useLocalData = useLocal;
    console.log('本地数据使用状态已切换为:', useLocal);
  }

  // 获取本地数据使用状态
  isLocalDataEnabled(): boolean {
    return this.config.useLocalData;
  }

  // 根据英雄ID查找英雄信息
  async getHeroById(heroId: string): Promise<any | null> {
    try {
      // 如果启用本地数据，优先使用本地数据查找
      if (this.config.useLocalData) {
        const localHero = getLocalHeroById(heroId);
        if (localHero) {
          console.log('通过本地数据找到英雄:', localHero);
          return {
            id: localHero._id,
            name: localHero.name,
            avatar: localHero.avatar,
            category: localHero.category
          };
        }
      }
      
      // 否则使用原有缓存逻辑
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
      // 如果启用本地数据，优先使用本地数据查找
      if (this.config.useLocalData) {
        const localHero = getLocalHeroByName(heroName);
        if (localHero) {
          console.log('通过本地数据找到英雄:', localHero);
          return {
            id: localHero._id,
            name: localHero.name,
            avatar: localHero.avatar,
            category: localHero.category
          };
        }
      }
      
      // 否则使用原有缓存逻辑
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

  // 获取头像URL（兼容性方法）
  async getAvatarUrl(heroId: string): Promise<string | null> {
    return this.getHeroAvatar(heroId);
  }
}

// 导出单例实例
export const heroCache = new HeroCache(); 