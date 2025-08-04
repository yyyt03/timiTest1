// 装备图片缓存工具
import { findEquipmentByName } from './equipmentMatcher';

interface EquipmentImageCache {
  imageUrls: Record<string, string>;
  lastUpdate: number;
}

class EquipmentCacheManager {
  private static instance: EquipmentCacheManager;
  private cache: EquipmentImageCache | null = null;
  private readonly CACHE_KEY = 'equipment_image_cache';
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存
  private readonly DEFAULT_AVATAR_PATH = '../images/unused/default-avatar.png';

  static getInstance(): EquipmentCacheManager {
    if (!EquipmentCacheManager.instance) {
      EquipmentCacheManager.instance = new EquipmentCacheManager();
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
          const tempURLs = await wx.cloud.getTempFileURL({
            fileList: imagePaths
          });

          tempURLs.fileList.forEach((file: any, index: number) => {
            const imagePath = imagePaths[index];
            const equipmentName = Object.keys(nameToImageMap).find(name => 
              nameToImageMap[name] === imagePath.split('/').pop()
            );
            
            if (equipmentName) {
              if (file.tempFileURL) {
                this.cache!.imageUrls[equipmentName] = file.tempFileURL;
              } else {
                // 如果获取失败，使用默认图片
                this.cache!.imageUrls[equipmentName] = this.DEFAULT_AVATAR_PATH;
              }
            }
          });

          this.setCachedData(this.cache!);
        } catch (error) {
          // 为失败的装备设置默认图片
          uncachedNames.forEach(name => {
            if (!this.cache!.imageUrls[name]) {
              this.cache!.imageUrls[name] = this.DEFAULT_AVATAR_PATH;
            }
          });
          this.setCachedData(this.cache!);
        }
      }
    }

    return this.cache!.imageUrls;
  }

  // 智能缓存检测：检查是否所有装备都是默认路径
  private isAllDefaultPaths(imageUrls: Record<string, string>, equipmentNames: string[]): boolean {
    if (equipmentNames.length === 0) return false;
    
    const defaultPathCount = equipmentNames.filter(name => 
      imageUrls[name] === this.DEFAULT_AVATAR_PATH
    ).length;
    
    // 如果超过80%的装备都是默认路径，认为缓存有问题
    return defaultPathCount / equipmentNames.length > 0.8;
  }

  // 获取单个装备图片URL
  async getEquipmentImageUrl(equipmentName: string): Promise<string> {
    const urls = await this.getEquipmentImageUrls([equipmentName]);
    const url = urls[equipmentName] || this.DEFAULT_AVATAR_PATH;
    return url;
  }

  // 清除缓存
  clearCache(): void {
    this.cache = null;
    wx.removeStorageSync(this.CACHE_KEY);
  }

  private getCachedData(): EquipmentImageCache | null {
    if (this.cache) return this.cache;
    
    try {
      const data = wx.getStorageSync(this.CACHE_KEY);
      this.cache = data || null;
      return this.cache;
    } catch (error) {
      return null;
    }
  }

  private setCachedData(data: EquipmentImageCache): void {
    this.cache = data;
    try {
      wx.setStorageSync(this.CACHE_KEY, data);
    } catch (error) {
      // 静默处理存储错误
    }
  }

  private isCacheValid(lastUpdate: number): boolean {
    const isValid = Date.now() - lastUpdate < this.CACHE_DURATION;
    return isValid;
  }
}

export const equipmentCache = EquipmentCacheManager.getInstance(); 