// 简化的缓存管理系统
import { logger } from './logger';

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  version?: string; // 版本号，用于缓存失效
}

// 缓存配置接口
export interface CacheConfig {
  defaultTTL: number; // 默认生存时间
  maxSize: number; // 最大缓存项数量
  enableVersioning: boolean; // 是否启用版本控制
  cleanupInterval: number; // 清理间隔（毫秒）
  enableCompression: boolean; // 是否启用压缩（小程序环境暂不支持）
}

// 缓存统计接口
export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  memoryUsage: number;
}

// 缓存管理器类
class CacheManager {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0
  };
  private cleanupTimer?: number;
  private isInitialized = false;

  constructor() {
    this.config = {
      defaultTTL: 15 * 60 * 1000, // 15分钟，延长默认缓存时间
      maxSize: 1000,
      enableVersioning: true,
      cleanupInterval: 60 * 1000, // 1分钟
      enableCompression: false
    };
  }

  // 初始化缓存管理器
  init(): void {
    if (this.isInitialized) return;
    
    try {
      this.startCleanupTimer();
      this.isInitialized = true;
      
      logger.info('缓存管理器初始化成功');
    } catch (error) {
      logger.error('缓存管理器初始化失败', error);
    }
  }

  // 设置缓存项
  set<T>(key: string, value: T, ttl?: number, version?: string): void {
    try {
      const item: CacheItem<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        version
      };

      // 检查缓存大小限制
      if (this.cache.size >= this.config.maxSize) {
        this.evictOldest();
      }

      this.cache.set(key, item);
      logger.debug(`缓存项已设置: ${key}`, { ttl: item.ttl, version });
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
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.stats.missCount++;
        logger.debug(`缓存项已过期: ${key}`);
        return null;
      }

      // 检查版本（如果启用）
      if (this.config.enableVersioning && version && item.version !== version) {
        this.cache.delete(key);
        this.stats.missCount++;
        logger.debug(`缓存项版本不匹配: ${key}`, { expected: version, actual: item.version });
        return null;
      }

      this.stats.hitCount++;
      logger.debug(`缓存命中: ${key}`);
      return item.value;
    } catch (error) {
      logger.error(`获取缓存项失败: ${key}`, error);
      return null;
    }
  }

  // 检查缓存项是否存在
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // 删除缓存项
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`缓存项已删除: ${key}`);
    }
    return deleted;
  }

  // 清空所有缓存
  clear(): void {
    this.cache.clear();
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    logger.info('所有缓存已清空');
  }

  // 获取缓存统计
  getStats(): CacheStats {
    const totalItems = this.cache.size;
    const totalSize = this.calculateMemoryUsage();
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;

    return {
      totalItems,
      totalSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      memoryUsage: totalSize
    };
  }

  // 检查缓存项是否过期
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // 驱逐最旧的缓存项
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`驱逐最旧缓存项: ${oldestKey}`);
    }
  }

  // 计算内存使用量（估算）
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      // 估算内存使用量
      totalSize += key.length * 2; // 字符串大约2字节/字符
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 100; // 其他属性开销
    }
    
    return totalSize;
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval) as any;
  }

  // 清理过期缓存项
  private cleanup(): void {
    const beforeSize = this.cache.size;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }

    const afterSize = this.cache.size;
    const cleanedCount = beforeSize - afterSize;
    
    if (cleanedCount > 0) {
      logger.debug(`清理完成，清理了 ${cleanedCount} 个过期缓存项`);
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重新启动清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.startCleanupTimer();
    
    logger.info('缓存配置已更新');
  }

  // 获取当前配置
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // 预加载数据
  async preload<T>(key: string, loader: () => Promise<T>, ttl?: number, version?: string): Promise<T> {
    try {
      // 检查是否已有缓存
      const cached = this.get<T>(key, version);
      if (cached !== null) {
        return cached;
      }

      // 加载数据
      const value = await loader();
      this.set(key, value, ttl, version);
      return value;
    } catch (error) {
      logger.error(`预加载失败: ${key}`, error);
      throw error;
    }
  }

  // 批量设置缓存
  setBatch<T>(items: Array<{ key: string; value: T; ttl?: number; version?: string }>): void {
    items.forEach(item => {
      this.set(item.key, item.value, item.ttl, item.version);
    });
  }

  // 批量获取缓存
  getBatch<T>(keys: string[], version?: string): Map<string, T | null> {
    const result = new Map<string, T | null>();
    
    keys.forEach(key => {
      result.set(key, this.get<T>(key, version));
    });
    
    return result;
  }

  // 获取所有缓存键
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 获取缓存项信息
  getItemInfo(key: string): { exists: boolean; expired: boolean; ttl: number; age: number } | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    const now = Date.now();
    const age = now - item.timestamp;
    const expired = age > item.ttl;

    return {
      exists: true,
      expired,
      ttl: item.ttl,
      age
    };
  }

  // 刷新缓存项（重置时间戳）
  refresh(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    item.timestamp = Date.now();
    logger.debug(`缓存项已刷新: ${key}`);
    return true;
  }

  // 设置缓存项过期时间
  setTTL(key: string, ttl: number): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    item.ttl = ttl;
    logger.debug(`缓存项TTL已更新: ${key}`, { ttl });
    return true;
  }

  // 销毁缓存管理器
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cache.clear();
    this.isInitialized = false;
    logger.info('缓存管理器已销毁');
  }
}

// 导出单例实例
export const cacheManager = new CacheManager();

// 便捷的缓存函数
export function setCache<T>(key: string, value: T, ttl?: number, version?: string): void {
  cacheManager.set(key, value, ttl, version);
}

export function getCache<T>(key: string, version?: string): T | null {
  return cacheManager.get<T>(key, version);
}

export function hasCache(key: string): boolean {
  return cacheManager.has(key);
}

export function deleteCache(key: string): boolean {
  return cacheManager.delete(key);
}

export function clearCache(): void {
  cacheManager.clear();
}

// 缓存装饰器
export function cached(ttl?: number, version?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cacheKey = `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: any[]) {
      // 生成缓存键（包含参数）
      const argsKey = args.length > 0 ? JSON.stringify(args) : '';
      const fullKey = `${cacheKey}:${argsKey}`;

      // 尝试从缓存获取
      const cached = cacheManager.get(fullKey, version);
      if (cached !== null) {
        return cached;
      }

      // 执行方法并缓存结果
      const result = method.apply(this, args);
      
      if (result instanceof Promise) {
        return result.then(value => {
          cacheManager.set(fullKey, value, ttl, version);
          return value;
        });
      } else {
        cacheManager.set(fullKey, result, ttl, version);
        return result;
      }
    };

    return descriptor;
  };
}

// 缓存失效装饰器
export function invalidateCache(pattern: string | RegExp) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = method.apply(this, args);
      
      // 失效匹配的缓存
      const keys = cacheManager.getKeys();
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      
      keys.forEach(key => {
        if (regex.test(key)) {
          cacheManager.delete(key);
        }
      });

      return result;
    };

    return descriptor;
  };
} 