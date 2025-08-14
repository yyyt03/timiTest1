// 智能缓存复用管理器
import { logger } from './logger';
import { CACHE_KEYS, CacheKeyValidator } from './cacheKeys';

// 可复用数据接口
export interface ReusableData<T = any> {
  data: T;
  source: string; // 数据来源
  timestamp: number;
  confidence: number; // 置信度 (0-1)
}

// 缓存复用模式
export interface ReusePattern {
  name: string;
  pattern: RegExp;
  filterFn: (data: any, params?: any) => any;
  confidence: number;
}

// 智能缓存管理器类
class SmartCacheManager {
  private static instance: SmartCacheManager;
  private reusePatterns: Map<string, ReusePattern> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();
  private usageStats: Map<string, number> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initReusePatterns();
  }

  static getInstance(): SmartCacheManager {
    if (!SmartCacheManager.instance) {
      SmartCacheManager.instance = new SmartCacheManager();
    }
    return SmartCacheManager.instance;
  }

  // 初始化复用模式
  private initReusePatterns(): void {
    // 推荐方案 -> 体验服方案
    this.reusePatterns.set('beta_plans', {
      name: 'beta_plans',
      pattern: /^plans_recommend_/,
      filterFn: (data: any) => {
        if (data?.allPlans) {
          return data.allPlans.filter((plan: any) => plan.isBetaPlan === true);
        }
        return null;
      },
      confidence: 0.9
    });

    // 推荐方案 -> 英雄方案
    this.reusePatterns.set('hero_plans', {
      name: 'hero_plans',
      pattern: /^plans_recommend_/,
      filterFn: (data: any, heroId: string) => {
        if (data?.allPlans) {
          return data.allPlans.filter((plan: any) => plan.heroId === heroId);
        }
        return null;
      },
      confidence: 0.8
    });

    // 英雄数据 -> 英雄详情
    this.reusePatterns.set('hero_detail', {
      name: 'hero_detail',
      pattern: /^hero_data_/,
      filterFn: (data: any, heroId: string) => {
        if (data?.heroes) {
          return data.heroes.find((hero: any) => hero.id === heroId);
        }
        return null;
      },
      confidence: 0.85
    });

    // 装备分类 -> 装备列表
    this.reusePatterns.set('equipment_list', {
      name: 'equipment_list',
      pattern: /^equipment_category_/,
      filterFn: (data: any, category: string) => {
        if (data?.equipment) {
          return data.equipment.filter((item: any) => item.category === category);
        }
        return null;
      },
      confidence: 0.75
    });

    logger.info('智能缓存复用模式初始化完成', {
      patterns: Array.from(this.reusePatterns.keys())
    });
  }

  // 智能获取可复用数据
  getReusableData<T>(key: string, params?: any): ReusableData<T> | null {
    try {
      // 1. 查找匹配的复用模式
      const pattern = this.findMatchingPattern(key);
      if (!pattern) {
        return null;
      }

      // 2. 查找可复用的缓存数据
      const reusableCache = this.findReusableCache(key, pattern, params);
      if (reusableCache) {
        logger.info(`找到可复用的缓存数据: ${key}`, {
          source: reusableCache.source,
          confidence: reusableCache.confidence,
          pattern: pattern.name
        });
        return reusableCache as ReusableData<T>;
      }

      return null;
    } catch (error) {
      logger.error(`获取可复用数据失败: ${key}`, error);
      return null;
    }
  }

  // 查找匹配的复用模式
  private findMatchingPattern(key: string): ReusePattern | null {
    const patterns = Array.from(this.reusePatterns.values());
    for (const pattern of patterns) {
      if (pattern.pattern.test(key)) {
        return pattern;
      }
    }
    return null;
  }

  // 查找可复用的缓存
  private findReusableCache<T>(key: string, pattern: ReusePattern, params?: any): ReusableData<T> | null {
    // 遍历所有缓存，查找可复用的数据
    const usageEntries = Array.from(this.usageStats.entries());
    for (const [cacheKey, usageCount] of usageEntries) {
      if (pattern.pattern.test(cacheKey) && usageCount > 1) {
        try {
          // 从缓存中获取数据
          const cachedData = this.getCachedData(cacheKey);
          if (cachedData) {
            const filteredData = pattern.filterFn(cachedData, params);
            if (filteredData) {
              const confidence = this.calculateReuseConfidence(key, cacheKey, pattern, usageCount);
              return {
                data: filteredData,
                source: cacheKey,
                timestamp: Date.now(),
                confidence
              };
            }
          }
        } catch (error) {
          logger.warn(`过滤可复用数据失败: ${cacheKey}`, error);
        }
      }
    }
    return null;
  }

  // 计算复用置信度
  private calculateReuseConfidence(targetKey: string, cacheKey: string, pattern: ReusePattern, usageCount: number): number {
    let confidence = pattern.confidence; // 基础置信度

    // 根据使用次数调整
    if (usageCount > 10) confidence += 0.1;
    else if (usageCount > 5) confidence += 0.05;

    // 根据键名相似度调整
    if (targetKey === cacheKey) confidence += 0.1;
    else if (targetKey.includes(cacheKey) || cacheKey.includes(targetKey)) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  // 从推荐方案中筛选体验服方案
  getBetaPlansFromRecommend(mode: string): any[] | null {
    const cacheKey = `timi:plan:data:recommend_${mode}:v1`;
    const reusableData = this.getReusableData<any[]>(cacheKey);
    
    if (reusableData) {
      return reusableData.data;
    }
    return null;
  }

  // 从推荐方案中筛选指定英雄方案
  getHeroPlansFromRecommend(mode: string, heroId: string): any[] | null {
    const cacheKey = `timi:plan:data:recommend_${mode}:v1`;
    const reusableData = this.getReusableData<any[]>(cacheKey, heroId);
    
    if (reusableData) {
      return reusableData.data;
    }
    return null;
  }

  // 从英雄数据中获取英雄详情
  getHeroDetailFromHeroData(heroId: string): any | null {
    const cacheKey = `timi:hero:data:list:v1`;
    const reusableData = this.getReusableData<any>(cacheKey, heroId);
    
    if (reusableData) {
      return reusableData.data;
    }
    return null;
  }

  // 从装备分类中获取装备列表
  getEquipmentListFromCategory(category: string): any[] | null {
    const cacheKey = `timi:equipment:data:category_${category}:v1`;
    const reusableData = this.getReusableData<any[]>(cacheKey, category);
    
    if (reusableData) {
      return reusableData.data;
    }
    return null;
  }

  // 记录缓存使用
  recordCacheUsage(key: string): void {
    const currentUsage = this.usageStats.get(key) || 0;
    this.usageStats.set(key, currentUsage + 1);
  }

  // 获取缓存使用统计
  getCacheUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    const usageEntries = Array.from(this.usageStats.entries());
    for (const [key, usage] of usageEntries) {
      stats[key] = usage;
    }
    return stats;
  }

  // 获取复用建议
  getReuseSuggestions(): Array<{
    key: string;
    suggestion: string;
    confidence: number;
  }> {
    const suggestions: Array<{
      key: string;
      suggestion: string;
      confidence: number;
    }> = [];

    const usageEntries = Array.from(this.usageStats.entries());
    for (const [key, usageCount] of usageEntries) {
      if (usageCount > 1) {
        const pattern = this.findMatchingPattern(key);
        if (pattern) {
          suggestions.push({
            key,
            suggestion: `可复用为 ${pattern.name} 类型数据`,
            confidence: Math.min(usageCount / 10, 1.0)
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // 添加自定义复用模式
  addReusePattern(pattern: ReusePattern): void {
    this.reusePatterns.set(pattern.name, pattern);
    logger.info(`添加自定义复用模式: ${pattern.name}`);
  }

  // 移除复用模式
  removeReusePattern(name: string): boolean {
    const removed = this.reusePatterns.delete(name);
    if (removed) {
      logger.info(`移除复用模式: ${name}`);
    }
    return removed;
  }

  // 获取所有复用模式
  getReusePatterns(): string[] {
    return Array.from(this.reusePatterns.keys());
  }

  // 从缓存中获取数据（这里需要集成实际的缓存管理器）
  private getCachedData(key: string): any {
    // 这里应该调用实际的缓存管理器
    // 暂时返回null，实际使用时需要集成
    return null;
  }

  // 清理使用统计
  clearUsageStats(): void {
    this.usageStats.clear();
    logger.info('缓存使用统计已清理');
  }

  // 获取管理器状态
  getStatus(): {
    isInitialized: boolean;
    patternCount: number;
    usageStatsCount: number;
    dependenciesCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      patternCount: this.reusePatterns.size,
      usageStatsCount: this.usageStats.size,
      dependenciesCount: this.dependencies.size
    };
  }
}

// 导出单例实例
export const smartCacheManager = SmartCacheManager.getInstance();
