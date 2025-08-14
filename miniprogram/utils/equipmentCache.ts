// 装备图片缓存工具
import { findEquipmentByName } from './equipmentMatcher';
import { avatarCache } from './avatarCache';
import { logger } from './logger';
import { CACHE_KEYS } from './cacheKeys';

interface EquipmentImageCache {
  imageUrls: Record<string, string>;
  lastUpdate: number;
}

class EquipmentCacheManager {
  private static instance: EquipmentCacheManager;
  private cache: EquipmentImageCache | null = null;
  private readonly CACHE_KEY = CACHE_KEYS.EQUIPMENT_IMAGE_CACHE;
  // 装备图片是静态资源，可以长期缓存，设置为23小时（接近24小时最大有效期）
  private readonly CACHE_DURATION = 23 * 60 * 60 * 1000; // 23小时缓存
  private readonly DEFAULT_AVATAR_PATH = '../images/unused/default-avatar.png';

  static getInstance(): EquipmentCacheManager {
    if (!EquipmentCacheManager.instance) {
      EquipmentCacheManager.instance = new EquipmentCacheManager();
      logger.info('装备图片缓存管理器初始化完成', {
        cacheDuration: '23小时',
        strategy: '装备图片为静态资源，可长期缓存以减少云函数调用',
        maxTempUrlValidity: '24小时（云存储限制）',
        cacheKey: CACHE_KEYS.EQUIPMENT_IMAGE_CACHE
      });
    }
    return EquipmentCacheManager.instance;
  }

  // 批量获取装备图片URL
  async getEquipmentImageUrls(equipmentNames: string[]): Promise<Record<string, string>> {
    const cached = this.getCachedData();
    if (!cached || !this.isCacheValid(cached.lastUpdate)) {
      this.cache = {
        imageUrls: {},
        lastUpdate: Date.now()
      };
    } else {
      // 智能缓存检测：检查是否所有装备都是默认路径
      if (this.isAllDefaultPaths(cached.imageUrls, equipmentNames)) {
        this.clearCache();
        this.cache = {
          imageUrls: {},
          lastUpdate: Date.now()
        };
      }
    }

    const uncachedNames = equipmentNames.filter(name => !this.cache!.imageUrls[name]);
    
    if (uncachedNames.length > 0) {
      // 为每个装备名称查找对应的装备数据，获取正确的图片文件名
      const imagePaths: string[] = [];
      const nameToImageMap: Record<string, string> = {};
      
      for (const name of uncachedNames) {
        const equipment = findEquipmentByName(name);
        
        if (equipment && equipment.image) {
          const imagePath = `cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/equipment/${equipment.image}`;
          imagePaths.push(imagePath);
          nameToImageMap[name] = equipment.image;
        } else {
          // 如果找不到装备数据，使用默认图片
          this.cache!.imageUrls[name] = this.DEFAULT_AVATAR_PATH;
        }
      }

      if (imagePaths.length > 0) {
        try {
          // 使用新的头像缓存管理器批量获取临时URL
          const avatarUrlMap = await avatarCache.getAvatarUrls(imagePaths);

          // 更新装备图片URL
          for (const name of uncachedNames) {
            const equipment = findEquipmentByName(name);
            if (equipment && equipment.image) {
              const imagePath = `cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/equipment/${equipment.image}`;
              const tempURL = avatarUrlMap[imagePath];
              
              if (tempURL && tempURL.startsWith('http')) {
                this.cache!.imageUrls[name] = tempURL;
              } else {
                this.cache!.imageUrls[name] = this.DEFAULT_AVATAR_PATH;
              }
            } else {
              this.cache!.imageUrls[name] = this.DEFAULT_AVATAR_PATH;
            }
          }

          this.setCachedData(this.cache!);
          logger.info('装备图片URL获取完成', { 
            total: uncachedNames.length, 
            success: Object.keys(this.cache!.imageUrls).length,
            cacheKey: this.CACHE_KEY
          });
        } catch (error) {
          logger.error('获取装备图片URL失败', error);
          // 为失败的装备设置默认图片
          uncachedNames.forEach(name => {
            this.cache!.imageUrls[name] = this.DEFAULT_AVATAR_PATH;
          });
        }
      }
    }

    return this.cache!.imageUrls;
  }

  // 获取单个装备图片URL
  async getEquipmentImageUrl(equipmentName: string): Promise<string> {
    const imageUrls = await this.getEquipmentImageUrls([equipmentName]);
    return imageUrls[equipmentName] || this.DEFAULT_AVATAR_PATH;
  }

  // 获取缓存的装备图片URL
  getCachedEquipmentImageUrl(equipmentName: string): string | null {
    const cached = this.getCachedData();
    if (cached && this.isCacheValid(cached.lastUpdate)) {
      return cached.imageUrls[equipmentName] || null;
    }
    return null;
  }

  // 获取缓存数据
  private getCachedData(): EquipmentImageCache | null {
    if (this.cache) {
      return this.cache;
    }

    try {
      const cached = wx.getStorageSync(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.imageUrls && typeof parsed.imageUrls === 'object' && typeof parsed.lastUpdate === 'number') {
          this.cache = parsed;
          return parsed;
        }
      }
    } catch (error) {
      logger.error('读取装备图片缓存失败', error);
    }

    return null;
  }

  // 设置缓存数据
  private setCachedData(data: EquipmentImageCache): void {
    try {
      wx.setStorageSync(this.CACHE_KEY, JSON.stringify(data));
      this.cache = data;
    } catch (error) {
      logger.error('保存装备图片缓存失败', error);
    }
  }

  // 检查缓存是否有效
  private isCacheValid(lastUpdate: number): boolean {
    return Date.now() - lastUpdate < this.CACHE_DURATION;
  }

  // 检查是否所有装备都是默认路径
  private isAllDefaultPaths(imageUrls: Record<string, string>, equipmentNames: string[]): boolean {
    return equipmentNames.every(name => 
      imageUrls[name] === this.DEFAULT_AVATAR_PATH
    );
  }

  // 清理缓存
  clearCache(): void {
    try {
      wx.removeStorageSync(this.CACHE_KEY);
      this.cache = null;
      logger.info('装备图片缓存已清理', { cacheKey: this.CACHE_KEY });
    } catch (error) {
      logger.error('清理装备图片缓存失败', error);
    }
  }

  // 获取缓存统计信息
  getCacheStats(): {
    hasCache: boolean;
    totalEquipment: number;
    lastUpdate?: number;
    cacheKey: string;
  } {
    const cached = this.getCachedData();
    if (!cached) {
      return {
        hasCache: false,
        totalEquipment: 0,
        cacheKey: this.CACHE_KEY
      };
    }

    return {
      hasCache: true,
      totalEquipment: Object.keys(cached.imageUrls).length,
      lastUpdate: cached.lastUpdate,
      cacheKey: this.CACHE_KEY
    };
  }

  // 检查缓存是否过期
  isCacheExpired(): boolean {
    const cached = this.getCachedData();
    if (!cached) return true;

    return !this.isCacheValid(cached.lastUpdate);
  }

  // 获取缓存过期时间
  getCacheExpiryTime(): number | null {
    const cached = this.getCachedData();
    if (!cached) return null;

    return cached.lastUpdate + this.CACHE_DURATION;
  }

  // 获取缓存剩余时间
  getCacheRemainingTime(): number {
    const expiryTime = this.getCacheExpiryTime();
    if (!expiryTime) return 0;

    const remaining = expiryTime - Date.now();
    return Math.max(0, remaining);
  }

  // 强制刷新缓存
  forceRefreshCache(): void {
    this.clearCache();
    logger.info('装备图片缓存已强制刷新', { cacheKey: this.CACHE_KEY });
  }

  // 预加载装备图片
  async preloadEquipmentImages(equipmentNames: string[]): Promise<void> {
    if (equipmentNames.length === 0) return;

    try {
      await this.getEquipmentImageUrls(equipmentNames);
      logger.info('装备图片预加载完成', { 
        count: equipmentNames.length,
        cacheKey: this.CACHE_KEY
      });
    } catch (error) {
      logger.error('装备图片预加载失败', error);
    }
  }

  // 获取所有缓存的装备名称
  getCachedEquipmentNames(): string[] {
    const cached = this.getCachedData();
    if (!cached) return [];

    return Object.keys(cached.imageUrls);
  }

  // 检查特定装备是否已缓存
  isEquipmentCached(equipmentName: string): boolean {
    const cached = this.getCachedData();
    if (!cached) return false;

    return cached.imageUrls.hasOwnProperty(equipmentName);
  }
}

// 导出单例实例
export const equipmentCache = EquipmentCacheManager.getInstance(); 