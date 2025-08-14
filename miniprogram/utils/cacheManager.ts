// 简化的缓存管理系统
import { logger } from './logger';
import { CACHE_KEYS, CacheKeyValidator } from './cacheKeys';

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  version?: string; // 版本号，用于缓存失效
  metadata?: {
    source?: string; // 数据来源
    dependencies?: string[]; // 依赖的缓存键
    usage?: number; // 使用次数
    lastAccess?: number; // 最后访问时间
  };
}

// 缓存配置接口
export interface CacheConfig {
  defaultTTL: number; // 默认生存时间
  maxSize: number; // 最大缓存项数量
  enableVersioning: boolean; // 是否启用版本控制
  cleanupInterval: number; // 清理间隔（毫秒）
  enableCompression: boolean; // 是否启用压缩（小程序环境暂不支持）
  enableKeyValidation: boolean; // 是否启用缓存键验证
  enableReuse: boolean; // 是否启用缓存复用
  enablePreload: boolean; // 是否启用缓存预加载
  reuseThreshold: number; // 复用阈值（访问次数）
}

// 缓存统计接口
export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  memoryUsage: number;
  validKeys: number;
  invalidKeys: number;
  reuseCount: number; // 复用次数
  preloadCount: number; // 预加载次数
}

// 可复用数据接口
export interface ReusableData<T = any> {
  data: T;
  source: string; // 数据来源
  timestamp: number;
  confidence: number; // 置信度 (0-1)
}

// 缓存管理器类
class CacheManager {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
    reuseCount: 0,
    preloadCount: 0
  };
  private cleanupTimer?: number;
  private isInitialized = false;
  private reusePatterns = new Map<string, RegExp>(); // 复用模式
  private dependencies = new Map<string, Set<string>>(); // 依赖关系

  constructor() {
    this.config = {
      defaultTTL: 15 * 60 * 1000, // 15分钟，延长默认缓存时间
      maxSize: 1000,
      enableVersioning: true,
      cleanupInterval: 60 * 1000, // 1分钟
      enableCompression: false,
      enableKeyValidation: true, // 启用缓存键验证
      enableReuse: true, // 启用缓存复用
      enablePreload: true, // 启用缓存预加载
      reuseThreshold: 2 // 访问2次以上才考虑复用
    };

    this.initReusePatterns();
  }

  // 初始化复用模式
  private initReusePatterns(): void {
    // 推荐方案缓存复用模式
    this.reusePatterns.set('plans_recommend', /^plans_recommend_/);
    
    // 英雄方案缓存复用模式
    this.reusePatterns.set('hero_plans', /^hero_plans_/);
    
    // 装备数据缓存复用模式
    this.reusePatterns.set('equipment_data', /^equipment_/);
    
    // 头像缓存复用模式
    this.reusePatterns.set('avatar_cache', /^avatar_/);
  }

  // 初始化缓存管理器
  init(): void {
    if (this.isInitialized) return;
    
    try {
      this.startCleanupTimer();
      this.isInitialized = true;
      
      logger.info('缓存管理器初始化成功', {
        config: this.config,
        cacheKeys: CACHE_KEYS,
        reusePatterns: Array.from(this.reusePatterns.keys())
      });
    } catch (error) {
      logger.error('缓存管理器初始化失败', error);
    }
  }

  // 设置缓存项
  set<T>(key: string, value: T, ttl?: number, version?: string, metadata?: any): void {
    try {
      // 验证缓存键格式
      if (this.config.enableKeyValidation && !CacheKeyValidator.isValid(key)) {
        logger.warn(`缓存键格式不符合规范: ${key}`, {
          expectedFormat: 'timi:module:type:identifier:version',
          actualKey: key
        });
      }

      const item: CacheItem<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        version,
        metadata: {
          source: metadata?.source,
          dependencies: metadata?.dependencies || [],
          usage: 0,
          lastAccess: Date.now(),
          ...metadata
        }
      };

      // 检查缓存大小限制
      if (this.cache.size >= this.config.maxSize) {
        this.evictOldest();
      }

      this.cache.set(key, item);
      
      // 更新依赖关系
      if (metadata?.dependencies) {
        this.updateDependencies(key, metadata.dependencies);
      }

      logger.debug(`缓存项已设置: ${key}`, { 
        ttl: item.ttl, 
        version,
        cacheSize: this.cache.size,
        metadata: item.metadata
      });
    } catch (error) {
      logger.error(`设置缓存项失败: ${key}`, error);
    }
  }

  // 获取缓存项
  get<T>(key: string, version?: string): T | null {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.missCount++;
        logger.debug(`缓存未命中: ${key}`);
        return null;
      }

      // 检查是否过期
      if (Date.now() > item.timestamp + item.ttl) {
        this.cache.delete(key);
        this.stats.missCount++;
        logger.debug(`缓存项已过期: ${key}`);
        return null;
      }

      // 检查版本
      if (this.config.enableVersioning && version && item.version !== version) {
        this.cache.delete(key);
        this.stats.missCount++;
        logger.debug(`缓存项版本不匹配: ${key}`, { 
          expected: version, 
          actual: item.version 
        });
        return null;
      }

      // 更新使用统计
      if (item.metadata) {
        item.metadata.usage = (item.metadata.usage || 0) + 1;
        item.metadata.lastAccess = Date.now();
      }

      this.stats.hitCount++;
      logger.debug(`缓存命中: ${key}`, { 
        usage: item.metadata?.usage,
        lastAccess: item.metadata?.lastAccess
      });
      return item.value;
    } catch (error) {
      logger.error(`获取缓存项失败: ${key}`, error);
      return null;
    }
  }

  // 智能获取可复用数据
  getReusableData<T>(key: string, filterFn?: (data: any) => T): ReusableData<T> | null {
    if (!this.config.enableReuse) {
      return null;
    }

    try {
      // 1. 直接查找目标缓存
      const directCache = this.get(key);
      if (directCache) {
        return {
          data: filterFn ? filterFn(directCache) : directCache,
          source: 'direct',
          timestamp: Date.now(),
          confidence: 1.0
        };
      }

      // 2. 查找可复用的相关缓存
      const reusableCache = this.findReusableCache(key, filterFn);
      if (reusableCache) {
        this.stats.reuseCount++;
        logger.info(`找到可复用的缓存数据: ${key}`, {
          source: reusableCache.source,
          confidence: reusableCache.confidence
        });
        return reusableCache;
      }

      return null;
    } catch (error) {
      logger.error(`获取可复用数据失败: ${key}`, error);
      return null;
    }
  }

  // 查找可复用的缓存
  private findReusableCache<T>(key: string, filterFn?: (data: any) => T): ReusableData<T> | null {
    // 遍历所有缓存，查找可复用的数据
    for (const [cacheKey, item] of this.cache.entries()) {
      if (this.isReusable(key, cacheKey, item)) {
        try {
          const filteredData = filterFn ? filterFn(item.value) : item.value;
          if (filteredData) {
            const confidence = this.calculateReuseConfidence(key, cacheKey, item);
            return {
              data: filteredData,
              source: cacheKey,
              timestamp: item.timestamp,
              confidence
            };
          }
        } catch (error) {
          logger.warn(`过滤可复用数据失败: ${cacheKey}`, error);
        }
      }
    }
    return null;
  }

  // 判断缓存是否可复用
  private isReusable(targetKey: string, cacheKey: string, item: CacheItem): boolean {
    // 检查缓存是否过期
    if (Date.now() > item.timestamp + item.ttl) {
      return false;
    }

    // 检查使用次数是否达到阈值
    if ((item.metadata?.usage || 0) < this.config.reuseThreshold) {
      return false;
    }

    // 检查是否匹配复用模式
    for (const [patternName, pattern] of this.reusePatterns.entries()) {
      if (pattern.test(targetKey) && pattern.test(cacheKey)) {
        return true;
      }
    }

    // 检查依赖关系
    if (this.dependencies.has(targetKey)) {
      const deps = this.dependencies.get(targetKey)!;
      if (deps.has(cacheKey)) {
        return true;
      }
    }

    return false;
  }

  // 计算复用置信度
  private calculateReuseConfidence(targetKey: string, cacheKey: string, item: CacheItem): number {
    let confidence = 0.5; // 基础置信度

    // 根据使用次数调整
    const usage = item.metadata?.usage || 0;
    if (usage > 10) confidence += 0.2;
    else if (usage > 5) confidence += 0.1;

    // 根据时间新鲜度调整
    const age = Date.now() - item.timestamp;
    const maxAge = item.ttl;
    if (age < maxAge * 0.3) confidence += 0.2;
    else if (age < maxAge * 0.6) confidence += 0.1;

    // 根据键名相似度调整
    if (targetKey === cacheKey) confidence += 0.3;
    else if (targetKey.includes(cacheKey) || cacheKey.includes(targetKey)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  // 从推荐方案中筛选体验服方案
  getBetaPlansFromRecommend(mode: string): any[] | null {
    const cacheKey = `plans_recommend_${mode}`;
    const reusableData = this.getReusableData(cacheKey, (data) => {
      if (data?.allPlans) {
        return data.allPlans.filter((plan: any) => plan.isBetaPlan === true);
      }
      return null;
    });

    if (reusableData) {
      logger.info(`复用推荐方案缓存，筛选体验服方案: ${mode}`, {
        source: reusableData.source,
        count: reusableData.data.length,
        confidence: reusableData.confidence
      });
      return reusableData.data;
    }

    return null;
  }

  // 从推荐方案中筛选指定英雄方案
  getHeroPlansFromRecommend(mode: string, heroId: string): any[] | null {
    const cacheKey = `plans_recommend_${mode}`;
    const reusableData = this.getReusableData(cacheKey, (data) => {
      if (data?.allPlans) {
        return data.allPlans.filter((plan: any) => plan.heroId === heroId);
      }
      return null;
    });

    if (reusableData) {
      logger.info(`复用推荐方案缓存，筛选英雄方案: ${mode} - ${heroId}`, {
        source: reusableData.source,
        count: reusableData.data.length,
        confidence: reusableData.confidence
      });
      return reusableData.data;
    }

    return null;
  }

  // 预加载相关缓存
  async preloadRelatedCache(key: string, relatedKeys: string[]): Promise<void> {
    if (!this.config.enablePreload) {
      return;
    }

    try {
      const promises = relatedKeys.map(async (relatedKey) => {
        if (!this.has(relatedKey)) {
          // 这里可以触发预加载逻辑
          logger.debug(`预加载相关缓存: ${relatedKey}`);
          this.stats.preloadCount++;
        }
      });

      await Promise.all(promises);
      logger.info(`预加载完成: ${key}`, { relatedKeys });
    } catch (error) {
      logger.error(`预加载失败: ${key}`, error);
    }
  }

  // 更新依赖关系
  private updateDependencies(key: string, dependencies: string[]): void {
    this.dependencies.set(key, new Set(dependencies));
    
    // 反向依赖关系
    dependencies.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    });
  }

  // 删除缓存项
  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        // 清理依赖关系
        this.dependencies.delete(key);
        logger.debug(`缓存项已删除: ${key}`);
      }
      return deleted;
    } catch (error) {
      logger.error(`删除缓存项失败: ${key}`, error);
      return false;
    }
  }

  // 检查缓存项是否存在
  has(key: string): boolean {
    try {
      const item = this.cache.get(key);
      if (!item) return false;

      // 检查是否过期
      if (Date.now() > item.timestamp + item.ttl) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`检查缓存项失败: ${key}`, error);
      return false;
    }
  }

  // 清理过期缓存项
  private cleanup(): void {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, item] of this.cache.entries()) {
        if (now > item.timestamp + item.ttl) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => {
        this.cache.delete(key);
        this.dependencies.delete(key);
      });

      if (expiredKeys.length > 0) {
        logger.info(`清理了 ${expiredKeys.length} 个过期缓存项`);
      }
    } catch (error) {
      logger.error('清理过期缓存项失败', error);
    }
  }

  // 驱逐最旧的缓存项
  private evictOldest(): void {
    try {
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, item] of this.cache.entries()) {
        if (item.timestamp < oldestTime) {
          oldestTime = item.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.dependencies.delete(oldestKey);
        logger.debug(`驱逐最旧缓存项: ${oldestKey}`);
      }
    } catch (error) {
      logger.error('驱逐最旧缓存项失败', error);
    }
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // 获取缓存统计信息
  getStats(): CacheStats {
    const now = Date.now();
    let validKeys = 0;
    let invalidKeys = 0;
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        invalidKeys++;
      } else {
        validKeys++;
        totalSize += JSON.stringify(item.value).length;
      }
    }

    const hitRate = this.stats.hitCount + this.stats.missCount > 0 
      ? this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) 
      : 0;

    return {
      totalItems: this.cache.size,
      totalSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : 0,
      validKeys,
      invalidKeys,
      reuseCount: this.stats.reuseCount,
      preloadCount: this.stats.preloadCount
    };
  }

  // 清空所有缓存
  clear(): void {
    try {
      this.cache.clear();
      this.dependencies.clear();
      this.stats.hitCount = 0;
      this.stats.missCount = 0;
      this.stats.reuseCount = 0;
      this.stats.preloadCount = 0;
      logger.info('所有缓存已清空');
    } catch (error) {
      logger.error('清空缓存失败', error);
    }
  }

  // 获取缓存配置
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // 更新缓存配置
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果清理间隔发生变化，重新启动定时器
    if (newConfig.cleanupInterval) {
      this.startCleanupTimer();
    }

    logger.info('缓存配置已更新', { newConfig: this.config });
  }

  // 获取所有缓存键
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 获取缓存项详情
  getCacheItem(key: string): CacheItem | null {
    try {
      const item = this.cache.get(key);
      if (!item) return null;

      // 检查是否过期
      if (Date.now() > item.timestamp + item.ttl) {
        this.cache.delete(key);
        return null;
      }

      return item;
    } catch (error) {
      logger.error(`获取缓存项详情失败: ${key}`, error);
      return null;
    }
  }

  // 批量设置缓存项
  setBatch<T>(items: Array<{ key: string; value: T; ttl?: number; version?: string; metadata?: any }>): void {
    try {
      items.forEach(item => {
        this.set(item.key, item.value, item.ttl, item.version, item.metadata);
      });
      logger.info(`批量设置 ${items.length} 个缓存项`);
    } catch (error) {
      logger.error('批量设置缓存项失败', error);
    }
  }

  // 批量获取缓存项
  getBatch<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    
    try {
      keys.forEach(key => {
        result[key] = this.get<T>(key);
      });
    } catch (error) {
      logger.error('批量获取缓存项失败', error);
    }

    return result;
  }

  // 批量删除缓存项
  deleteBatch(keys: string[]): number {
    let deletedCount = 0;
    
    try {
      keys.forEach(key => {
        if (this.delete(key)) {
          deletedCount++;
        }
      });
      
      logger.info(`批量删除了 ${deletedCount}/${keys.length} 个缓存项`);
    } catch (error) {
      logger.error('批量删除缓存项失败', error);
    }

    return deletedCount;
  }

  // 获取缓存键分析信息
  getCacheKeyAnalysis(): {
    validKeys: string[];
    invalidKeys: string[];
    moduleStats: Record<string, number>;
    typeStats: Record<string, number>;
    reuseStats: Record<string, number>;
  } {
    const validKeys: string[] = [];
    const invalidKeys: string[] = [];
    const moduleStats: Record<string, number> = {};
    const typeStats: Record<string, number> = {};
    const reuseStats: Record<string, number> = {};

    for (const [key, item] of this.cache.entries()) {
      if (CacheKeyValidator.isValid(key)) {
        validKeys.push(key);
        const parsed = CacheKeyValidator.parse(key);
        if (parsed) {
          moduleStats[parsed.module] = (moduleStats[parsed.module] || 0) + 1;
          typeStats[parsed.type] = (typeStats[parsed.type] || 0) + 1;
        }
      } else {
        invalidKeys.push(key);
      }

      // 复用统计
      const usage = item.metadata?.usage || 0;
      if (usage > 0) {
        reuseStats[key] = usage;
      }
    }

    return {
      validKeys,
      invalidKeys,
      moduleStats,
      typeStats,
      reuseStats
    };
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

    for (const [key, item] of this.cache.entries()) {
      const usage = item.metadata?.usage || 0;
      if (usage >= this.config.reuseThreshold) {
        // 分析可能的复用场景
        for (const [patternName, pattern] of this.reusePatterns.entries()) {
          if (pattern.test(key)) {
            suggestions.push({
              key,
              suggestion: `可复用为 ${patternName} 类型数据`,
              confidence: Math.min(usage / 10, 1.0)
            });
            break;
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // 销毁缓存管理器
  destroy(): void {
    try {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
      
      this.cache.clear();
      this.dependencies.clear();
      this.reusePatterns.clear();
      this.isInitialized = false;
      
      logger.info('缓存管理器已销毁');
    } catch (error) {
      logger.error('销毁缓存管理器失败', error);
    }
  }
}

// 创建单例实例
const cacheManager = new CacheManager();

export default cacheManager; 