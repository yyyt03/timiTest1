// 头像URL缓存管理器
import { getTempFileURLs } from './cloud';
import { logger } from './logger';
import { CACHE_KEYS } from './cacheKeys';

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
  private readonly CACHE_KEY = CACHE_KEYS.AVATAR_URL_CACHE;
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
      maxTempUrlValidity: '24小时（云存储限制）',
      cacheKey: this.CACHE_KEY
    });
    
    // 移除调试用的console.log
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
      logger.info(`清理了 ${expiredKeys.length} 个过期的头像缓存`);
      this.saveCache();
    }
  }

  // 检查缓存是否需要刷新
  private shouldRefreshCache(): boolean {
    const now = Date.now();
    return now - this.cache.lastUpdate > this.REFRESH_THRESHOLD;
  }

  // 批量获取头像URL
  async getAvatarUrls(fileIDs: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const uncachedFileIDs: string[] = [];
    
    // 检查缓存
    for (const fileID of fileIDs) {
      const cached = this.cache.avatars[fileID];
      if (cached && Date.now() < cached.expiresAt) {
        result[fileID] = cached.url;
      } else {
        uncachedFileIDs.push(fileID);
      }
    }
    
    // 如果有未缓存的文件ID，批量获取
    if (uncachedFileIDs.length > 0) {
      try {
        const newUrls = await this.fetchAvatarUrls(uncachedFileIDs);
        Object.assign(result, newUrls);
      } catch (error) {
        logger.error('获取头像URL失败', error);
      }
    }
    
    return result;
  }

  // 获取单个头像URL
  async getAvatarUrl(fileID: string): Promise<string> {
    // 检查是否有待处理的请求
    if (this.pendingRequests.has(fileID)) {
      return this.pendingRequests.get(fileID)!;
    }
    
    // 检查缓存
    const cached = this.cache.avatars[fileID];
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url;
    }
    
    // 创建新的请求
    const request = this.fetchAvatarUrl(fileID);
    this.pendingRequests.set(fileID, request);
    
    try {
      const url = await request;
      return url;
    } finally {
      this.pendingRequests.delete(fileID);
    }
  }

  // 获取头像URL（私有方法）
  private async fetchAvatarUrl(fileID: string): Promise<string> {
    try {
      // 构建完整的云存储fileID
      const fullFileID = this.buildFullFileID(fileID);
      
      const result = await getTempFileURLs([fullFileID]);
      if (result && result[fullFileID]) {
        const url = result[fullFileID];
        const expiresAt = Date.now() + this.CACHE_DURATION;
        
        // 更新缓存
        this.cache.avatars[fileID] = {
          url,
          timestamp: Date.now(),
          expiresAt,
          fileID
        };
        
        this.saveCache();
        return url;
      }
    } catch (error) {
      logger.error(`获取头像URL失败: ${fileID}`, error);
    }
    
    // 返回默认头像
    return '../../pages/images/unused/default-avatar.png';
  }

  // 批量获取头像URL（私有方法）
  private async fetchAvatarUrls(fileIDs: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    try {
      // 构建完整的云存储fileID列表
      const fullFileIDs = fileIDs.map(fileID => this.buildFullFileID(fileID));
      
      const tempUrls = await getTempFileURLs(fullFileIDs);
      
      for (const fileID of fileIDs) {
        const fullFileID = this.buildFullFileID(fileID);
        if (tempUrls[fullFileID]) {
          const url = tempUrls[fullFileID];
          const expiresAt = Date.now() + this.CACHE_DURATION;
          
          // 更新缓存
          this.cache.avatars[fileID] = {
            url,
            timestamp: Date.now(),
            expiresAt,
            fileID
          };
          
          result[fileID] = url;
        } else {
          // 设置默认头像
          result[fileID] = '../../pages/images/unused/default-avatar.png';
        }
      }
      
      this.saveCache();
      logger.info(`批量获取头像URL完成，成功: ${Object.keys(result).length}/${fileIDs.length}`);
    } catch (error) {
      logger.error('批量获取头像URL失败', error);
      
      // 为失败的请求设置默认头像
      fileIDs.forEach(fileID => {
        result[fileID] = '../../pages/images/unused/default-avatar.png';
      });
    }
    
    return result;
  }

  // 清理缓存
  clearCache(): void {
    this.cache = {
      avatars: {},
      lastUpdate: 0,
      batchSize: this.BATCH_SIZE
    };
    this.saveCache();
    logger.info('头像缓存已清理');
  }

  // 获取缓存统计信息
  getCacheStats(): {
    totalAvatars: number;
    lastUpdate: number;
    cacheKey: string;
  } {
    return {
      totalAvatars: Object.keys(this.cache.avatars).length,
      lastUpdate: this.cache.lastUpdate,
      cacheKey: this.CACHE_KEY
    };
  }

  // 检查缓存是否有效
  isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdate < this.CACHE_DURATION;
  }

  // 构建完整的云存储fileID
  private buildFullFileID(relativePath: string): string {
    // 清理路径，移除可能的@符号和多余空格
    let cleanPath = relativePath.trim();
    
    // 如果是以@cloud://开头的地址，转换为标准的cloud://格式
    if (cleanPath.startsWith('@cloud://')) {
      cleanPath = cleanPath.substring(1); // 移除@符号
      return cleanPath; // 直接返回，因为已经是正确的cloud://格式
    }
    
    // 如果已经是完整的云存储路径，直接返回
    if (cleanPath.startsWith('cloud://')) {
      return cleanPath;
    }
    
    // 如果路径以/开头，移除开头的/
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    
    // 构建完整的云存储fileID
    // 使用正确的云环境ID格式：1gk9t6w2d1d090af (包含6w)，不是 1gk9t9d1d090af (包含9d)
    const cloudEnv = 'cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497';
    return `cloud://${cloudEnv}/${cleanPath}`;
  }
}

// 导出单例实例
export const avatarCache = AvatarCacheManager.getInstance();
