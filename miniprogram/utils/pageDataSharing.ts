// 页面间数据共享工具类
import { logger } from './logger';
import { smartCacheManager } from './smartCacheManager';

// 数据共享配置
export interface DataSharingConfig {
  enableSharing: boolean; // 是否启用数据共享
  maxAge: number; // 最大数据年龄（毫秒）
  confidenceThreshold: number; // 置信度阈值
  enablePreload: boolean; // 是否启用预加载
}

// 共享数据结果
export interface SharedDataResult<T = any> {
  data: T;
  source: string; // 数据来源页面
  timestamp: number;
  confidence: number;
  reused: boolean; // 是否复用了缓存
}

// 页面间数据共享管理器
class PageDataSharingManager {
  private static instance: PageDataSharingManager;
  private config: DataSharingConfig;
  private sharedData: Map<string, any> = new Map();
  private dataSources: Map<string, string> = new Map(); // 数据来源页面
  private accessCounts: Map<string, number> = new Map(); // 访问次数

  private constructor() {
    this.config = {
      enableSharing: true,
      maxAge: 5 * 60 * 1000, // 5分钟
      confidenceThreshold: 0.7,
      enablePreload: true
    };
  }

  static getInstance(): PageDataSharingManager {
    if (!PageDataSharingManager.instance) {
      PageDataSharingManager.instance = new PageDataSharingManager();
    }
    return PageDataSharingManager.instance;
  }

  // 检查是否有可复用的缓存数据
  async checkReusableCache<T>(
    targetKey: string,
    filterFn?: (data: any, params?: any) => T,
    params?: any
  ): Promise<SharedDataResult<T> | null> {
    if (!this.config.enableSharing) {
      return null;
    }

    try {
      // 1. 检查智能缓存复用
      const reusableData = smartCacheManager.getReusableData<T>(targetKey, params);
      if (reusableData && reusableData.confidence >= this.config.confidenceThreshold) {
        logger.info(`智能缓存复用成功: ${targetKey}`, {
          source: reusableData.source,
          confidence: reusableData.confidence
        });

        return {
          data: reusableData.data,
          source: reusableData.source,
          timestamp: reusableData.timestamp,
          confidence: reusableData.confidence,
          reused: true
        };
      }

      // 2. 检查页面间共享数据
      const sharedData = this.getSharedData<T>(targetKey);
      if (sharedData) {
        logger.info(`页面间数据共享成功: ${targetKey}`, {
          source: sharedData.source,
          confidence: sharedData.confidence
        });

        return {
          data: sharedData.data,
          source: sharedData.source,
          timestamp: sharedData.timestamp,
          confidence: sharedData.confidence,
          reused: true
        };
      }

      return null;
    } catch (error) {
      logger.error(`检查可复用缓存失败: ${targetKey}`, error);
      return null;
    }
  }

  // 从推荐方案中筛选体验服方案（复用推荐方案缓存）
  async getBetaPlansFromRecommend(mode: string): Promise<SharedDataResult<any[]> | null> {
    const targetKey = `plans_recommend_${mode}`;
    
    return await this.checkReusableCache<any[]>(targetKey, (data) => {
      if (data?.allPlans) {
        return data.allPlans.filter((plan: any) => plan.isBetaPlan === true);
      }
      return null;
    });
  }

  // 从推荐方案中筛选指定英雄方案（复用推荐方案缓存）
  async getHeroPlansFromRecommend(mode: string, heroId: string): Promise<SharedDataResult<any[]> | null> {
    const targetKey = `plans_recommend_${mode}`;
    
    return await this.checkReusableCache<any[]>(targetKey, (data, heroId) => {
      if (data?.allPlans) {
        return data.allPlans.filter((plan: any) => plan.heroId === heroId);
      }
      return null;
    }, heroId);
  }

  // 从英雄数据中获取英雄详情（复用英雄列表缓存）
  async getHeroDetailFromHeroData(heroId: string): Promise<SharedDataResult<any> | null> {
    const targetKey = `hero_data_list`;
    
    return await this.checkReusableCache<any>(targetKey, (data, heroId) => {
      if (data?.heroes) {
        return data.heroes.find((hero: any) => hero.id === heroId);
      }
      return null;
    }, heroId);
  }

  // 从装备分类中获取装备列表（复用装备分类缓存）
  async getEquipmentListFromCategory(category: string): Promise<SharedDataResult<any[]> | null> {
    const targetKey = `equipment_category_${category}`;
    
    return await this.checkReusableCache<any[]>(targetKey, (data, category) => {
      if (data?.equipment) {
        return data.equipment.filter((item: any) => item.category === category);
      }
      return null;
    }, category);
  }

  // 设置共享数据
  setSharedData<T>(key: string, data: T, sourcePage: string): void {
    try {
      this.sharedData.set(key, data);
      this.dataSources.set(key, sourcePage);
      this.accessCounts.set(key, 0);

      // 记录智能缓存使用
      smartCacheManager.recordCacheUsage(key);

      logger.info(`设置页面间共享数据: ${key}`, {
        sourcePage,
        dataSize: JSON.stringify(data).length
      });
    } catch (error) {
      logger.error(`设置共享数据失败: ${key}`, error);
    }
  }

  // 获取共享数据
  getSharedData<T>(key: string): SharedDataResult<T> | null {
    try {
      const data = this.sharedData.get(key);
      if (!data) {
        return null;
      }

      // 检查数据是否过期
      const timestamp = this.getDataTimestamp(key);
      if (Date.now() - timestamp > this.config.maxAge) {
        this.removeSharedData(key);
        return null;
      }

      // 更新访问次数
      const accessCount = this.accessCounts.get(key) || 0;
      this.accessCounts.set(key, accessCount + 1);

      // 计算置信度
      const confidence = this.calculateConfidence(key, accessCount + 1);

      return {
        data,
        source: this.dataSources.get(key) || 'unknown',
        timestamp,
        confidence,
        reused: true
      };
    } catch (error) {
      logger.error(`获取共享数据失败: ${key}`, error);
      return null;
    }
  }

  // 移除共享数据
  removeSharedData(key: string): boolean {
    try {
      const removed = this.sharedData.delete(key);
      if (removed) {
        this.dataSources.delete(key);
        this.accessCounts.delete(key);
        logger.debug(`移除共享数据: ${key}`);
      }
      return removed;
    } catch (error) {
      logger.error(`移除共享数据失败: ${key}`, error);
      return false;
    }
  }

  // 清理过期的共享数据
  cleanupExpiredData(): void {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, timestamp] of this.getDataTimestamps().entries()) {
        if (now - timestamp > this.config.maxAge) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.removeSharedData(key));

      if (expiredKeys.length > 0) {
        logger.info(`清理了 ${expiredKeys.length} 个过期的共享数据`);
      }
    } catch (error) {
      logger.error('清理过期共享数据失败', error);
    }
  }

  // 预加载相关数据
  async preloadRelatedData(key: string, relatedKeys: string[]): Promise<void> {
    if (!this.config.enablePreload) {
      return;
    }

    try {
      const promises = relatedKeys.map(async (relatedKey) => {
        if (!this.sharedData.has(relatedKey)) {
          logger.debug(`预加载相关数据: ${relatedKey}`);
        }
      });

      await Promise.all(promises);
      logger.info(`预加载完成: ${key}`, { relatedKeys });
    } catch (error) {
      logger.error(`预加载失败: ${key}`, error);
    }
  }

  // 获取数据时间戳（模拟实现）
  private getDataTimestamp(key: string): number {
    return Date.now() - Math.random() * 60000; // 随机时间，实际应该存储真实时间戳
  }

  // 获取所有数据时间戳
  private getDataTimestamps(): Map<string, number> {
    const timestamps = new Map<string, number>();
    for (const key of this.sharedData.keys()) {
      timestamps.set(key, this.getDataTimestamp(key));
    }
    return timestamps;
  }

  // 计算置信度
  private calculateConfidence(key: string, accessCount: number): number {
    let confidence = 0.5; // 基础置信度

    // 根据访问次数调整
    if (accessCount > 10) confidence += 0.3;
    else if (accessCount > 5) confidence += 0.2;
    else if (accessCount > 1) confidence += 0.1;

    // 根据数据来源页面调整
    const sourcePage = this.dataSources.get(key);
    if (sourcePage) {
      // 可以根据页面重要性调整置信度
      if (sourcePage.includes('recommend')) confidence += 0.1;
      if (sourcePage.includes('hero')) confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // 获取共享数据统计
  getSharedDataStats(): {
    totalData: number;
    totalAccess: number;
    averageConfidence: number;
    dataSources: Record<string, number>;
  } {
    const totalData = this.sharedData.size;
    let totalAccess = 0;
    let totalConfidence = 0;
    const dataSources: Record<string, number> = {};

    for (const [key, accessCount] of this.accessCounts.entries()) {
      totalAccess += accessCount;
      totalConfidence += this.calculateConfidence(key, accessCount);

      const source = this.dataSources.get(key) || 'unknown';
      dataSources[source] = (dataSources[source] || 0) + 1;
    }

    return {
      totalData,
      totalAccess,
      averageConfidence: totalData > 0 ? totalConfidence / totalData : 0,
      dataSources
    };
  }

  // 获取数据来源页面
  getDataSource(key: string): string | null {
    return this.dataSources.get(key) || null;
  }

  // 获取访问次数
  getAccessCount(key: string): number {
    return this.accessCounts.get(key) || 0;
  }

  // 更新配置
  updateConfig(newConfig: Partial<DataSharingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('页面数据共享配置已更新', { newConfig: this.config });
  }

  // 获取配置
  getConfig(): DataSharingConfig {
    return { ...this.config };
  }

  // 清空所有共享数据
  clearAllSharedData(): void {
    try {
      this.sharedData.clear();
      this.dataSources.clear();
      this.accessCounts.clear();
      logger.info('所有页面间共享数据已清空');
    } catch (error) {
      logger.error('清空共享数据失败', error);
    }
  }

  // 获取管理器状态
  getStatus(): {
    isEnabled: boolean;
    totalData: number;
    totalAccess: number;
    config: DataSharingConfig;
  } {
    const stats = this.getSharedDataStats();
    return {
      isEnabled: this.config.enableSharing,
      totalData: stats.totalData,
      totalAccess: stats.totalAccess,
      config: this.config
    };
  }
}

// 导出单例实例
export const pageDataSharing = PageDataSharingManager.getInstance();

// 便捷函数
export async function checkReusableCache<T>(
  targetKey: string,
  filterFn?: (data: any, params?: any) => T,
  params?: any
): Promise<SharedDataResult<T> | null> {
  return pageDataSharing.checkReusableCache(targetKey, filterFn, params);
}

export async function getBetaPlansFromRecommend(mode: string): Promise<SharedDataResult<any[]> | null> {
  return pageDataSharing.getBetaPlansFromRecommend(mode);
}

export async function getHeroPlansFromRecommend(mode: string, heroId: string): Promise<SharedDataResult<any[]> | null> {
  return pageDataSharing.getHeroPlansFromRecommend(mode, heroId);
}

export async function getHeroDetailFromHeroData(heroId: string): Promise<SharedDataResult<any> | null> {
  return pageDataSharing.getHeroDetailFromHeroData(heroId);
}

export async function getEquipmentListFromCategory(category: string): Promise<SharedDataResult<any[]> | null> {
  return pageDataSharing.getEquipmentListFromCategory(category);
}
