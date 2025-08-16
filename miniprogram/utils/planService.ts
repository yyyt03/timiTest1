import cacheManager from './cacheManager';
import { CACHE_KEYS } from './cacheKeys';
import { logger } from './logger';

const ALL_PLANS_CACHE_KEY = CACHE_KEYS.ALL_PLANS_CACHE_KEY;

class PlanService {
  private isFetching = false;
  private fetchPromise: Promise<any[]> | null = null;

  async getAllPlans(forceRefresh = false): Promise<any[]> {
    const cachedData = cacheManager.get<any[]>(ALL_PLANS_CACHE_KEY);

    if (cachedData && !forceRefresh) {
      logger.info('从全局缓存获取所有方案数据');
      return cachedData;
    }

    if (this.isFetching && this.fetchPromise) {
      logger.info('等待正在进行的方案数据请求');
      return this.fetchPromise;
    }

    this.isFetching = true;
    this.fetchPromise = new Promise(async (resolve, reject) => {
      try {
        logger.info('开始通过云函数获取所有方案数据');
        const result = await wx.cloud.callFunction({
          name: 'getRecommendPlans',
          data: {
            mode: 'all', // 使用一个特殊模式来获取所有方案
            page: 1,
            pageSize: 1000, // 获取足够多的数据
            includeBetaPlans: true,
          },
        }) as any;

        if (result.result && result.result.success) {
          const { plans } = result.result.data;
          logger.info(`成功获取 ${plans.length} 个方案`);
          cacheManager.set(ALL_PLANS_CACHE_KEY, plans, 30 * 60); // 缓存30分钟
          this.isFetching = false;
          this.fetchPromise = null;
          resolve(plans);
        } else {
          throw new Error('获取方案失败');
        }
      } catch (error) {
        logger.error('获取所有方案数据失败:', error);
        this.isFetching = false;
        this.fetchPromise = null;
        reject(error);
      }
    });

    return this.fetchPromise;
  }

  // 获取推荐方案（从全局缓存中筛选）
  async getRecommendPlans(mode: string = 'hot', forceRefresh: boolean = false): Promise<any[]> {
    const allPlans = await this.getAllPlans(forceRefresh);
    
    let filteredPlans = allPlans;
    
    if (mode === 'recommended') {
      // 推荐模式：只显示被标记为推荐的方案
      filteredPlans = allPlans.filter(plan => plan.isRecommended === true);
    } else {
      // 热门和最新模式：显示非体验服方案
      filteredPlans = allPlans.filter(plan => plan.isBetaPlan !== true);
    }
    
    // 根据模式排序
    if (mode === 'hot') {
      filteredPlans.sort((a, b) => {
        const aScore = (a.likeCount || 0) + (a.favoriteCount || 0);
        const bScore = (b.likeCount || 0) + (b.favoriteCount || 0);
        return bScore - aScore;
      });
    } else if (mode === 'latest') {
      filteredPlans.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
    }
    
    logger.info(`获取${mode}模式推荐方案: ${filteredPlans.length}个`);
    return filteredPlans;
  }

  // 获取体验服方案（从全局缓存中筛选）
  async getBetaPlans(mode: string = 'hot', forceRefresh: boolean = false): Promise<any[]> {
    const allPlans = await this.getAllPlans(forceRefresh);
    
    let filteredPlans = allPlans;
    
    if (mode === 'recommended') {
      // 推荐模式：只显示被标记为推荐的体验服方案
      filteredPlans = allPlans.filter(plan => plan.isBetaPlan === true && plan.isRecommended === true);
    } else {
      // 热门和最新模式：显示所有体验服方案
      filteredPlans = allPlans.filter(plan => plan.isBetaPlan === true);
    }
    
    // 根据模式排序
    if (mode === 'hot') {
      filteredPlans.sort((a, b) => {
        const aScore = (a.likeCount || 0) + (a.favoriteCount || 0);
        const bScore = (b.likeCount || 0) + (b.favoriteCount || 0);
        return bScore - aScore;
      });
    } else if (mode === 'latest') {
      filteredPlans.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
    }
    
    logger.info(`获取${mode}模式体验服方案: ${filteredPlans.length}个`);
    return filteredPlans;
  }

  // 根据英雄筛选方案
  async getPlansByHero(heroId: string, isBetaPlan?: boolean): Promise<any[]> {
    const allPlans = await this.getAllPlans();
    
    let filteredPlans = allPlans.filter(plan => plan.heroId === heroId);
    
    if (isBetaPlan !== undefined) {
      filteredPlans = filteredPlans.filter(plan => plan.isBetaPlan === isBetaPlan);
    }
    
    logger.info(`获取英雄${heroId}的方案: ${filteredPlans.length}个`);
    return filteredPlans;
  }

  // 清除缓存
  clearCache(): void {
    cacheManager.delete(ALL_PLANS_CACHE_KEY);
    logger.info('已清除全局方案缓存');
  }
}

export const planService = new PlanService();
