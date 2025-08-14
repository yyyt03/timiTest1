// 智能缓存复用机制使用示例
import { logger } from './logger';
import { pageDataSharing, checkReusableCache } from './pageDataSharing';
import { smartCacheManager } from './smartCacheManager';

/**
 * 示例1：betaPlan 页面优先使用 recommendPlan 的缓存
 */
export async function checkReusableCacheExample(mode: string) {
  try {
    // 1. 检查 recommendPlan 缓存
    const recommendData = await pageDataSharing.getBetaPlansFromRecommend(mode);
    
    if (recommendData && recommendData.data.length > 0) {
      logger.info('复用 recommendPlan 缓存数据，体验服方案数量:', recommendData.data.length, {
        source: recommendData.source,
        confidence: recommendData.confidence,
        reused: recommendData.reused
      });
      return { source: 'recommend', data: recommendData.data };
    }
    
    // 2. 检查自己的缓存
    const betaData = await checkReusableCache(`plans_beta_${mode}`);
    if (betaData) {
      return { source: 'beta', data: betaData.data };
    }
    
    return null;
  } catch (error) {
    logger.error('检查可复用缓存失败:', error);
    return null;
  }
}

/**
 * 示例2：heroPlan 页面复用推荐方案缓存
 */
export async function getHeroPlansFromRecommendExample(mode: string, heroId: string) {
  try {
    const reusableData = await pageDataSharing.getHeroPlansFromRecommend(mode, heroId);
    
    if (reusableData && reusableData.data.length > 0) {
      logger.info('复用推荐方案缓存数据，英雄方案数量:', reusableData.data.length, {
        source: reusableData.source,
        confidence: reusableData.confidence,
        heroId,
        mode
      });
      
      // 使用缓存数据进行筛选和排序
      const filteredPlans = reusableData.data.filter((plan: any) => plan.heroId === heroId);
      const sortedPlans = sortPlansByLikeAndFavorite(filteredPlans);
      
      return {
        plans: sortedPlans,
        total: sortedPlans.length,
        source: reusableData.source,
        reused: true
      };
    }
    
    return null;
  } catch (error) {
    logger.error('获取英雄方案缓存失败:', error);
    return null;
  }
}

/**
 * 示例3：页面初始化时优先使用可复用缓存
 */
export async function initPageWithReusableCache(mode: string, requestId: number) {
  try {
    // 优先检查是否有可复用的缓存数据
    const reusableData = await checkReusableCacheExample(mode);
    
    if (reusableData) {
      logger.info('使用可复用缓存数据初始化页面', {
        source: reusableData.source,
        dataCount: reusableData.data.length,
        requestId
      });
      
      // 使用缓存数据，避免重复调用云函数
      const pageData = {
        allBetaPlans: reusableData.data,
        total: reusableData.data.length,
        source: reusableData.source,
        reused: true
      };
      
      // 生成英雄分类
      const heroCategories = await generateHeroCategoriesFromPlans(reusableData.data);
      
      return {
        ...pageData,
        heroCategories
      };
    }
    
    // 只有在没有可复用缓存时才调用云函数
    logger.info('没有可复用缓存，调用云函数获取数据', { requestId });
    return null;
  } catch (error) {
    logger.error('初始化页面缓存失败:', error);
    return null;
  }
}

/**
 * 示例4：设置页面间共享数据
 */
export function setSharedDataExample() {
  try {
    // 在 recommendPlan 页面设置共享数据
    const recommendData = {
      allPlans: [
        { id: '1', heroId: 'hero1', isBetaPlan: true, mode: 'hot' },
        { id: '2', heroId: 'hero2', isBetaPlan: false, mode: 'hot' },
        { id: '3', heroId: 'hero1', isBetaPlan: true, mode: 'hot' }
      ],
      mode: 'hot',
      timestamp: Date.now()
    };
    
    // 设置共享数据，供其他页面复用
    pageDataSharing.setSharedData(
      'plans_recommend_hot',
      recommendData,
      'recommendPlan'
    );
    
    logger.info('设置推荐方案共享数据成功', {
      planCount: recommendData.allPlans.length,
      betaPlanCount: recommendData.allPlans.filter(p => p.isBetaPlan).length
    });
  } catch (error) {
    logger.error('设置共享数据失败:', error);
  }
}

/**
 * 示例5：智能缓存预加载
 */
export async function preloadRelatedDataExample() {
  try {
    // 预加载相关数据
    await pageDataSharing.preloadRelatedData('plans_recommend_hot', [
      'plans_beta_hot',
      'hero_data_list',
      'equipment_category_weapon'
    ]);
    
    logger.info('相关数据预加载完成');
  } catch (error) {
    logger.error('预加载相关数据失败:', error);
  }
}

/**
 * 示例6：获取缓存复用统计和建议
 */
export function getCacheReuseStatsExample() {
  try {
    // 获取智能缓存管理器状态
    const smartCacheStatus = smartCacheManager.getStatus();
    logger.info('智能缓存管理器状态:', smartCacheStatus);
    
    // 获取复用建议
    const reuseSuggestions = smartCacheManager.getReuseSuggestions();
    logger.info('缓存复用建议:', reuseSuggestions);
    
    // 获取页面数据共享统计
    const sharingStats = pageDataSharing.getSharedDataStats();
    logger.info('页面数据共享统计:', sharingStats);
    
    // 获取共享数据状态
    const sharingStatus = pageDataSharing.getStatus();
    logger.info('页面数据共享状态:', sharingStatus);
    
    return {
      smartCache: smartCacheStatus,
      reuseSuggestions,
      sharingStats,
      sharingStatus
    };
  } catch (error) {
    logger.error('获取缓存复用统计失败:', error);
    return null;
  }
}

/**
 * 示例7：自定义缓存复用模式
 */
export function addCustomReusePatternExample() {
  try {
    // 添加自定义复用模式：从用户收藏中筛选特定英雄的方案
    const customPattern = {
      name: 'user_favorite_hero_plans',
      pattern: /^user_favorites_/,
      filterFn: (data: any, heroId: string) => {
        if (data?.favorites) {
          return data.favorites.filter((item: any) => item.heroId === heroId);
        }
        return null;
      },
      confidence: 0.8
    };
    
    smartCacheManager.addReusePattern(customPattern);
    logger.info('添加自定义复用模式成功:', customPattern.name);
    
    return true;
  } catch (error) {
    logger.error('添加自定义复用模式失败:', error);
    return false;
  }
}

/**
 * 示例8：缓存复用配置管理
 */
export function manageCacheReuseConfigExample() {
  try {
    // 更新页面数据共享配置
    pageDataSharing.updateConfig({
      enableSharing: true,
      maxAge: 10 * 60 * 1000, // 10分钟
      confidenceThreshold: 0.8, // 提高置信度阈值
      enablePreload: true
    });
    
    // 获取当前配置
    const currentConfig = pageDataSharing.getConfig();
    logger.info('当前页面数据共享配置:', currentConfig);
    
    return currentConfig;
  } catch (error) {
    logger.error('管理缓存复用配置失败:', error);
    return null;
  }
}

// 辅助函数
function sortPlansByLikeAndFavorite(plans: any[]): any[] {
  return plans.sort((a, b) => {
    // 按点赞数排序
    const likeDiff = (b.likeCount || 0) - (a.likeCount || 0);
    if (likeDiff !== 0) return likeDiff;
    
    // 按收藏数排序
    const favoriteDiff = (b.favoriteCount || 0) - (a.favoriteCount || 0);
    if (favoriteDiff !== 0) return favoriteDiff;
    
    // 按创建时间排序
    return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
  });
}

async function generateHeroCategoriesFromPlans(plans: any[]): Promise<any[]> {
  try {
    // 从方案中提取英雄信息并分类
    const heroMap = new Map();
    
    plans.forEach(plan => {
      if (plan.heroId && plan.heroName) {
        if (!heroMap.has(plan.heroId)) {
          heroMap.set(plan.heroId, {
            heroId: plan.heroId,
            heroName: plan.heroName,
            planCount: 0,
            plans: []
          });
        }
        
        const heroCategory = heroMap.get(plan.heroId);
        heroCategory.planCount++;
        heroCategory.plans.push(plan);
      }
    });
    
    return Array.from(heroMap.values());
  } catch (error) {
    logger.error('生成英雄分类失败:', error);
    return [];
  }
}

// 导出所有示例函数
export const SmartCacheExamples = {
  checkReusableCache: checkReusableCacheExample,
  getHeroPlansFromRecommend: getHeroPlansFromRecommendExample,
  initPageWithReusableCache: initPageWithReusableCacheExample,
  setSharedData: setSharedDataExample,
  preloadRelatedData: preloadRelatedDataExample,
  getCacheReuseStats: getCacheReuseStatsExample,
  addCustomReusePattern: addCustomReusePatternExample,
  manageCacheReuseConfig: manageCacheReuseConfigExample
};
