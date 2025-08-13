// 头像URL缓存管理器
import { getTempFileURLs } from './cloud';
import { logger } from './logger';

interface AvatarCacheItem {
  url: string;
  timestamp: number;
  expiresAt: number; // 过期时间戳
  fileID: string; // 原始云存储文件ID
}

interface AvatarCacheData {
  avatars: Record<string, AvatarCacheItem>;
  lastUpdate: number;
  batchSize: number; // 批量处理大小
}

class AvatarCacheManager {
  private static instance: AvatarCacheManager;
  private cache: AvatarCacheData;
  private readonly CACHE_KEY = 'avatar_url_cache';
  // 英雄头像也是静态资源，可以长期缓存，设置为23小时（接近24小时最大有效期）
  private readonly CACHE_DURATION = 23 * 60 * 60 * 1000; // 23小时缓存
  private readonly BATCH_SIZE = 20; // 批量处理大小
  // 21小时后开始刷新，留2小时缓冲时间
  private readonly REFRESH_THRESHOLD = 21 * 60 * 60 * 1000; // 21小时后开始刷新
  private pendingRequests: Map<string, Promise<string>> = new Map(); // 防止重复请求

  private constructor() {
    this.cache = {
      avatars: {},
      lastUpdate: 0,
      batchSize: this.BATCH_SIZE
    };
    this.loadCache();
    
    // 记录缓存策略初始化
    logger.info('英雄头像缓存管理器初始化完成', {
      cacheDuration: '23小时',
      refreshThreshold: '21小时',
      strategy: '英雄头像为静态资源，可长期缓存以减少云函数调用',
      maxTempUrlValidity: '24小时（云存储限制）'
    });
  }

  static getInstance(): AvatarCacheManager {
    if (!AvatarCacheManager.instance) {
      AvatarCacheManager.instance = new AvatarCacheManager();
    }
    return AvatarCacheManager.instance;
  }

  // 加载缓存数据
  private loadCache(): void {
    try {
      const cached = wx.getStorageSync(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // 验证缓存数据完整性
        if (parsed.avatars && typeof parsed.avatars === 'object') {
          this.cache = parsed;
          this.cleanupExpiredAvatars();
          logger.info('头像缓存加载成功', { 
            count: Object.keys(this.cache.avatars).length,
            lastUpdate: new Date(this.cache.lastUpdate),
            cacheKey: this.CACHE_KEY
          });
        } else {
          logger.warn('缓存数据格式无效', { parsed });
        }
      } else {
        logger.info('没有找到头像缓存数据，使用默认配置');
      }
    } catch (error) {
      logger.warn('加载头像缓存失败，使用默认配置', error);
    }
  }

  // 保存缓存数据
  private saveCache(): void {
    try {
      wx.setStorageSync(this.CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      logger.error('保存头像缓存失败', error);
    }
  }

  // 清理过期的头像URL
  private cleanupExpiredAvatars(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of Object.entries(this.cache.avatars)) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      delete this.cache.avatars[key];
    });
    
    if (expiredKeys.length > 0) {
      logger.info('清理过期头像URL', { count: expiredKeys.length });
      this.saveCache();
    }
  }

  // 获取头像URL（主要方法）
  async getAvatarUrl(fileID: string): Promise<string> {
    // 检查缓存
    const cached = this.cache.avatars[fileID];
    if (cached && Date.now() < cached.expiresAt) {
      // 如果缓存即将过期，后台刷新
      if (Date.now() > cached.expiresAt - this.REFRESH_THRESHOLD) {
        this.refreshAvatarUrl(fileID).catch(error => {
          logger.warn('后台刷新头像URL失败', { fileID, error });
        });
      }
      return cached.url;
    }

    // 检查是否有正在进行的请求
    if (this.pendingRequests.has(fileID)) {
      return this.pendingRequests.get(fileID)!;
    }

    // 创建新的请求
    const requestPromise = this.fetchAvatarUrl(fileID);
    this.pendingRequests.set(fileID, requestPromise);
    
    try {
      const url = await requestPromise;
      return url;
    } finally {
      this.pendingRequests.delete(fileID);
    }
  }

  // 批量获取头像URL
  async getAvatarUrls(fileIDs: string[]): Promise<Record<string, string>> {
    if (fileIDs.length === 0) {
      return {};
    }

    // 过滤出需要获取的fileID
    const now = Date.now();
    const needFetch: string[] = [];
    const result: Record<string, string> = {};

    logger.info('开始批量获取头像URL', { 
      total: fileIDs.length, 
      cacheSize: Object.keys(this.cache.avatars).length 
    });

    for (const fileID of fileIDs) {
      const cached = this.cache.avatars[fileID];
      if (cached && now < cached.expiresAt) {
        result[fileID] = cached.url;
        logger.debug('使用缓存的头像URL', { fileID, expiresAt: new Date(cached.expiresAt) });
        // 如果缓存即将过期，加入刷新队列
        if (now > cached.expiresAt - this.REFRESH_THRESHOLD) {
          needFetch.push(fileID);
          logger.debug('缓存即将过期，加入刷新队列', { fileID, expiresAt: new Date(cached.expiresAt) });
        }
      } else {
        needFetch.push(fileID);
        if (cached) {
          logger.debug('缓存已过期', { fileID, expiresAt: new Date(cached.expiresAt), now: new Date(now) });
        } else {
          logger.debug('缓存不存在', { fileID });
        }
      }
    }

    logger.info('头像URL缓存状态', { 
      cached: fileIDs.length - needFetch.length, 
      needFetch: needFetch.length,
      needFetchList: needFetch
    });

    // 批量获取需要的头像URL
    if (needFetch.length > 0) {
      logger.info('开始获取未缓存的头像URL', { count: needFetch.length });
      const batchResults = await this.batchFetchAvatarUrls(needFetch);
      Object.assign(result, batchResults);
    }

    // 后台刷新即将过期的URL
    if (needFetch.length > 0) {
      this.refreshExpiringAvatars(needFetch).catch(error => {
        logger.warn('后台刷新即将过期的头像URL失败', error);
      });
    }

    return result;
  }

  // 批量获取头像URL
  private async batchFetchAvatarUrls(fileIDs: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    try {
      // 分批处理，避免单次请求过大
      const batches = this.chunkArray(fileIDs, this.BATCH_SIZE);
      
      for (const batch of batches) {
        const batchResult = await this.fetchBatchAvatarUrls(batch);
        Object.assign(result, batchResult);
      }
      
      logger.info('批量获取头像URL完成', { 
        total: fileIDs.length, 
        success: Object.keys(result).length 
      });
    } catch (error) {
      logger.error('批量获取头像URL失败', error);
      // 失败时返回空结果，避免阻塞
    }
    
    return result;
  }

  // 获取单批头像URL
  private async fetchBatchAvatarUrls(fileIDs: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    try {
      const tempURLs = await getTempFileURLs(fileIDs);
      
      for (let i = 0; i < fileIDs.length; i++) {
        const fileID = fileIDs[i];
        const tempURL = tempURLs[i];
        
        if (tempURL && tempURL.startsWith('http')) {
          result[fileID] = tempURL;
          // 缓存URL
          this.cacheAvatarUrl(fileID, tempURL);
        } else {
          logger.warn('获取头像临时URL失败', { fileID, tempURL });
        }
      }
    } catch (error) {
      logger.error('获取单批头像URL失败', error);
    }
    
    return result;
  }

  // 获取单个头像URL
  private async fetchAvatarUrl(fileID: string): Promise<string> {
    try {
      const tempURLs = await getTempFileURLs([fileID]);
      const tempURL = tempURLs[0];
      
      if (tempURL && tempURL.startsWith('http')) {
        this.cacheAvatarUrl(fileID, tempURL);
        return tempURL;
      } else {
        throw new Error('获取临时URL失败');
      }
    } catch (error) {
      logger.error('获取头像URL失败', { fileID, error });
      // 返回默认头像或抛出错误
      throw error;
    }
  }

  // 缓存头像URL
  private cacheAvatarUrl(fileID: string, url: string): void {
    const now = Date.now();
    const expiresAt = now + this.CACHE_DURATION;
    
    this.cache.avatars[fileID] = {
      url,
      timestamp: now,
      expiresAt,
      fileID
    };
    
    this.cache.lastUpdate = now;
    this.saveCache();
    
    logger.info('头像URL已缓存', { 
      fileID, 
      expiresAt: new Date(expiresAt),
      cacheSize: Object.keys(this.cache.avatars).length 
    });
  }

  // 刷新头像URL
  private async refreshAvatarUrl(fileID: string): Promise<void> {
    try {
      const url = await this.fetchAvatarUrl(fileID);
      logger.debug('头像URL刷新成功', { fileID, url: url.substring(0, 50) + '...' });
    } catch (error) {
      logger.warn('刷新头像URL失败', { fileID, error });
    }
  }

  // 后台刷新即将过期的头像URL
  private async refreshExpiringAvatars(fileIDs: string[]): Promise<void> {
    const now = Date.now();
    const expiringFileIDs = fileIDs.filter(fileID => {
      const cached = this.cache.avatars[fileID];
      return cached && now > cached.expiresAt - this.REFRESH_THRESHOLD;
    });
    
    if (expiringFileIDs.length > 0) {
      logger.info('开始后台刷新即将过期的头像URL', { count: expiringFileIDs.length });
      
      // 分批刷新，避免阻塞主线程
      const batches = this.chunkArray(expiringFileIDs, this.BATCH_SIZE);
      for (const batch of batches) {
        setTimeout(() => {
          this.batchFetchAvatarUrls(batch).catch(error => {
            logger.warn('后台刷新头像URL批次失败', { batch, error });
          });
        }, 100); // 延迟100ms，避免阻塞
      }
    }
  }

  // 数组分块
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 清除缓存
  clearCache(): void {
    this.cache.avatars = {};
    this.cache.lastUpdate = 0;
    this.saveCache();
    logger.info('头像缓存已清除');
  }

  // 获取缓存统计信息
  getCacheStats(): {
    totalAvatars: number;
    validAvatars: number;
    expiredAvatars: number;
    lastUpdate: number;
    cacheSize: number;
  } {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    
    for (const item of Object.values(this.cache.avatars)) {
      if (now < item.expiresAt) {
        validCount++;
      } else {
        expiredCount++;
      }
    }
    
    return {
      totalAvatars: Object.keys(this.cache.avatars).length,
      validAvatars: validCount,
      expiredAvatars: expiredCount,
      lastUpdate: this.cache.lastUpdate,
      cacheSize: JSON.stringify(this.cache).length
    };
  }

  // 获取详细的缓存状态（用于调试）
  getDetailedCacheInfo(): any {
    const now = Date.now();
    const avatars = Object.entries(this.cache.avatars).map(([fileID, item]) => ({
      fileID,
      url: item.url,
      timestamp: new Date(item.timestamp),
      expiresAt: new Date(item.expiresAt),
      isExpired: now > item.expiresAt,
      timeUntilExpiry: item.expiresAt - now
    }));

    return {
      cacheKey: this.CACHE_KEY,
      lastUpdate: new Date(this.cache.lastUpdate),
      totalAvatars: avatars.length,
      expiredAvatars: avatars.filter(a => a.isExpired).length,
      validAvatars: avatars.filter(a => !a.isExpired).length,
      avatars: avatars
    };
  }

  // 预加载头像URL（用于优化用户体验）
  async preloadAvatarUrls(fileIDs: string[]): Promise<void> {
    if (fileIDs.length === 0) return;
    
    // 过滤出未缓存的fileID
    const uncachedFileIDs = fileIDs.filter(fileID => {
      const cached = this.cache.avatars[fileID];
      return !cached || Date.now() >= cached.expiresAt;
    });
    
    if (uncachedFileIDs.length > 0) {
      logger.info('开始预加载头像URL', { count: uncachedFileIDs.length });
      
      // 异步预加载，不阻塞主线程
      setTimeout(() => {
        this.batchFetchAvatarUrls(uncachedFileIDs).catch(error => {
          logger.warn('预加载头像URL失败', error);
        });
      }, 100);
    }
  }
}

// 导出单例实例
export const avatarCache = AvatarCacheManager.getInstance();

// 兼容性导出
export default avatarCache;

// 全局调试方法（在控制台中使用）
// 在微信小程序控制台中可以使用以下命令查看缓存状态：
// avatarCache.getDetailedCacheInfo()
// avatarCache.getCacheStats()
