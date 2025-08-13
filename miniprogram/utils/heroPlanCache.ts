// 英雄方案缓存工具类
import { cacheManager } from './cacheManager';
import { log } from './logger';

interface HeroPlansCacheData {
  plans: any[];
  total: number;
  page: number;
  hasMore: boolean;
  timestamp: number;
  heroId?: string;
  heroName?: string;
}

interface HeroAvatarCacheData {
  avatarUrl: string;
  timestamp: number;
}

class HeroPlanCache {
  private readonly PLANS_CACHE_TTL = 30 * 60 * 1000; // 30分钟
  private readonly AVATAR_CACHE_TTL = 2 * 60 * 60 * 1000; // 2小时
  private readonly DETAIL_CACHE_TTL = 15 * 60 * 1000; // 15分钟

  // 获取英雄方案列表缓存键
  private getPlansCacheKey(heroId?: string, heroName?: string): string {
    return `hero_plans_cache_${heroId || heroName || 'unknown'}`;
  }

  // 获取英雄头像缓存键
  private getAvatarCacheKey(heroName: string): string {
    return `hero_avatar_cache_${heroName}`;
  }

  // 获取方案详情缓存键
  private getDetailCacheKey(planId: string): string {
    return `hero_plan_detail_${planId}`;
  }

  // 缓存英雄方案列表
  setPlansCache(heroId: string | undefined, heroName: string | undefined, data: {
    plans: any[];
    total: number;
    page: number;
    hasMore: boolean;
  }): void {
    try {
      const cacheKey = this.getPlansCacheKey(heroId, heroName);
      const cacheData: HeroPlansCacheData = {
        ...data,
        timestamp: Date.now(),
        heroId,
        heroName
      };

      cacheManager.set(cacheKey, cacheData, this.PLANS_CACHE_TTL);
      log('英雄方案列表已缓存', {
        key: cacheKey,
        plansCount: data.plans.length,
        ttl: this.PLANS_CACHE_TTL / 1000 / 60 + '分钟'
      });
    } catch (error) {
      log('缓存英雄方案列表失败', error);
    }
  }

  // 获取英雄方案列表缓存
  getPlansCache(heroId?: string, heroName?: string): HeroPlansCacheData | null {
    try {
      const cacheKey = this.getPlansCacheKey(heroId, heroName);
      const cachedData = cacheManager.get<HeroPlansCacheData>(cacheKey);
      
      if (cachedData) {
        // 检查缓存是否仍然有效
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < this.PLANS_CACHE_TTL) {
          log('使用缓存的英雄方案列表', {
            key: cacheKey,
            age: Math.round(cacheAge / 1000 / 60) + '分钟前',
            plansCount: cachedData.plans.length
          });
          return cachedData;
        } else {
          log('英雄方案列表缓存已过期', {
            key: cacheKey,
            age: Math.round(cacheAge / 1000 / 60) + '分钟前'
          });
          // 清除过期缓存
          this.deletePlansCache(heroId, heroName);
        }
      }
      
      return null;
    } catch (error) {
      log('获取英雄方案列表缓存失败', error);
      return null;
    }
  }

  // 删除英雄方案列表缓存
  deletePlansCache(heroId?: string, heroName?: string): boolean {
    try {
      const cacheKey = this.getPlansCacheKey(heroId, heroName);
      const deleted = cacheManager.delete(cacheKey);
      
      if (deleted) {
        log('已删除英雄方案列表缓存', { key: cacheKey });
      }
      
      return deleted;
    } catch (error) {
      log('删除英雄方案列表缓存失败', error);
      return false;
    }
  }

  // 缓存英雄头像
  setAvatarCache(heroName: string, avatarUrl: string): void {
    try {
      const cacheKey = this.getAvatarCacheKey(heroName);
      const cacheData: HeroAvatarCacheData = {
        avatarUrl,
        timestamp: Date.now()
      };

      cacheManager.set(cacheKey, cacheData, this.AVATAR_CACHE_TTL);
      log('英雄头像已缓存', {
        hero: heroName,
        ttl: this.AVATAR_CACHE_TTL / 1000 / 60 / 60 + '小时'
      });
    } catch (error) {
      log('缓存英雄头像失败', error);
    }
  }

  // 获取英雄头像缓存
  getAvatarCache(heroName: string): string | null {
    try {
      const cacheKey = this.getAvatarCacheKey(heroName);
      const cachedData = cacheManager.get<HeroAvatarCacheData>(cacheKey);
      
      if (cachedData) {
        // 检查缓存是否仍然有效
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < this.AVATAR_CACHE_TTL) {
          log('使用缓存的英雄头像', {
            hero: heroName,
            age: Math.round(cacheAge / 1000 / 60) + '分钟前'
          });
          return cachedData.avatarUrl;
        } else {
          log('英雄头像缓存已过期', {
            hero: heroName,
            age: Math.round(cacheAge / 1000 / 60) + '分钟前'
          });
          // 清除过期缓存
          this.deleteAvatarCache(heroName);
        }
      }
      
      return null;
    } catch (error) {
      log('获取英雄头像缓存失败', error);
      return null;
    }
  }

  // 删除英雄头像缓存
  deleteAvatarCache(heroName: string): boolean {
    try {
      const cacheKey = this.getAvatarCacheKey(heroName);
      const deleted = cacheManager.delete(cacheKey);
      
      if (deleted) {
        log('已删除英雄头像缓存', { hero: heroName });
      }
      
      return deleted;
    } catch (error) {
      log('删除英雄头像缓存失败', error);
      return false;
    }
  }

  // 缓存方案详情
  setDetailCache(planId: string, data: any): void {
    try {
      const cacheKey = this.getDetailCacheKey(planId);
      cacheManager.set(cacheKey, data, this.DETAIL_CACHE_TTL);
      log('方案详情已缓存', {
        planId,
        ttl: this.DETAIL_CACHE_TTL / 1000 / 60 + '分钟'
      });
    } catch (error) {
      log('缓存方案详情失败', error);
    }
  }

  // 获取方案详情缓存
  getDetailCache(planId: string): any | null {
    try {
      const cacheKey = this.getDetailCacheKey(planId);
      const cachedData = cacheManager.get(cacheKey);
      
      if (cachedData) {
        log('使用缓存的方案详情', { planId });
        return cachedData;
      }
      
      return null;
    } catch (error) {
      log('获取方案详情缓存失败', error);
      return null;
    }
  }

  // 删除方案详情缓存
  deleteDetailCache(planId: string): boolean {
    try {
      const cacheKey = this.getDetailCacheKey(planId);
      const deleted = cacheManager.delete(cacheKey);
      
      if (deleted) {
        log('已删除方案详情缓存', { planId });
      }
      
      return deleted;
    } catch (error) {
      log('删除方案详情缓存失败', error);
      return false;
    }
  }

  // 清除英雄相关的所有缓存
  clearHeroCache(heroId?: string, heroName?: string): void {
    try {
      const heroKey = heroId || heroName;
      if (!heroKey) return;

      // 获取所有相关的缓存键
      const allKeys = cacheManager.getKeys();
      const heroRelatedKeys = allKeys.filter(key => 
        key.includes(`hero_plans_cache_${heroKey}`) ||
        key.includes(`hero_avatar_cache_${heroKey}`) ||
        key.includes(`hero_info_cache_${heroKey}`)
      );

      // 删除相关缓存
      heroRelatedKeys.forEach(key => {
        cacheManager.delete(key);
      });

      log('已清除英雄相关缓存', {
        hero: heroKey,
        deletedKeys: heroRelatedKeys
      });
    } catch (error) {
      log('清除英雄相关缓存失败', error);
    }
  }

  // 获取缓存统计信息
  getCacheStats(): {
    plansCacheCount: number;
    avatarCacheCount: number;
    detailCacheCount: number;
    totalCacheSize: number;
  } {
    try {
      const allKeys = cacheManager.getKeys();
      const stats = cacheManager.getStats();

      const plansCacheCount = allKeys.filter(key => key.includes('hero_plans_cache_')).length;
      const avatarCacheCount = allKeys.filter(key => key.includes('hero_avatar_cache_')).length;
      const detailCacheCount = allKeys.filter(key => key.includes('hero_plan_detail_')).length;

      return {
        plansCacheCount,
        avatarCacheCount,
        detailCacheCount,
        totalCacheSize: stats.totalSize
      };
    } catch (error) {
      log('获取缓存统计信息失败', error);
      return {
        plansCacheCount: 0,
        avatarCacheCount: 0,
        detailCacheCount: 0,
        totalCacheSize: 0
      };
    }
  }

  // 预热缓存（预加载常用英雄的数据）
  async preloadHeroData(heroNames: string[]): Promise<void> {
    try {
      log('开始预热英雄数据缓存', { heroes: heroNames });
      
      // 这里可以实现预加载逻辑
      // 例如：预先获取常用英雄的头像和基本信息
      
      log('英雄数据缓存预热完成');
    } catch (error) {
      log('英雄数据缓存预热失败', error);
    }
  }
}

// 导出单例实例
export const heroPlanCache = new HeroPlanCache();

// 便捷的缓存函数
export function setHeroPlansCache(heroId: string | undefined, heroName: string | undefined, data: any): void {
  heroPlanCache.setPlansCache(heroId, heroName, data);
}

export function getHeroPlansCache(heroId?: string, heroName?: string): HeroPlansCacheData | null {
  return heroPlanCache.getPlansCache(heroId, heroName);
}

export function setHeroAvatarCache(heroName: string, avatarUrl: string): void {
  heroPlanCache.setAvatarCache(heroName, avatarUrl);
}

export function getHeroAvatarCache(heroName: string): string | null {
  return heroPlanCache.getAvatarCache(heroName);
}
