// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 内存缓存 - 在云函数实例生命周期内有效
const planCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1秒重试延迟

// 性能监控
const performanceMetrics = {
  totalCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0
};

// 工具函数：延迟执行
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 工具函数：带重试的数据库操作
async function executeWithRetry(operation, maxAttempts = MAX_RETRY_ATTEMPTS) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`操作失败，第${attempt}次尝试:`, error.message);
      
      if (attempt < maxAttempts) {
        await delay(RETRY_DELAY * attempt); // 指数退避
      }
    }
  }
  
  throw lastError;
}

// 工具函数：获取缓存键
function getCacheKey(planId, userId) {
  return `${planId}_${userId}`;
}

// 工具函数：检查缓存是否有效
function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_DURATION;
}

// 工具函数：清理过期缓存
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of planCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      planCache.delete(key);
    }
  }
}

// 云函数入口函数
exports.main = async function(event, context) {
  const startTime = Date.now();
  performanceMetrics.totalCalls++;
  
  console.log('getPlanDetail云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { planId, forceRefresh = false, clearCacheOnly = false } = event;
    
    if (!planId) {
      return {
        success: false,
        data: null,
        message: '方案ID不能为空'
      };
    }
    
    // 获取当前用户信息
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    // 如果只是清除缓存，直接返回成功
    if (clearCacheOnly) {
      const cacheKey = getCacheKey(planId, currentUserId);
      planCache.delete(cacheKey);
      console.log('清除方案详情缓存:', planId);
      return {
        success: true,
        data: null,
        message: '缓存清除成功'
      };
    }
    
    // 检查缓存（只在非强制刷新时使用）
    if (!forceRefresh) {
      const cacheKey = getCacheKey(planId, currentUserId);
      const cachedData = planCache.get(cacheKey);
      
      if (cachedData && isCacheValid(cachedData.timestamp)) {
        performanceMetrics.cacheHits++;
        console.log('从缓存获取方案详情:', planId);
        
        const responseTime = Date.now() - startTime;
        performanceMetrics.averageResponseTime = 
          (performanceMetrics.averageResponseTime * (performanceMetrics.totalCalls - 1) + responseTime) / performanceMetrics.totalCalls;
        
        return {
          success: true,
          data: cachedData.data,
          message: '从缓存获取方案详情成功',
          fromCache: true,
          performance: {
            responseTime,
            cacheHit: true
          }
        };
      }
    }
    
    performanceMetrics.cacheMisses++;
    console.log('缓存未命中或强制刷新，从数据库获取方案详情:', planId);
    
    // 清理过期缓存
    cleanExpiredCache();
    
    // 从数据库获取方案详情（带重试）
    const planResult = await executeWithRetry(async () => {
      return await db.collection('plans')
        .doc(planId)
        .get();
    });
    
    if (!planResult.data) {
      return {
        success: false,
        data: null,
        message: '方案不存在'
      };
    }
    
    const plan = planResult.data;
    
    // 使用聚合查询优化：一次性获取用户状态和总数
    const [userStatusResult, countsResult] = await Promise.all([
      // 获取用户收藏和点赞状态
      executeWithRetry(async () => {
        return await db.collection('favorites')
          .aggregate()
          .match({
            userId: currentUserId,
            planId: planId
          })
          .count('favoriteCount')
          .end()
          .then(result => {
            const favoriteCount = result.list[0]?.favoriteCount || 0;
            return { isFavorited: favoriteCount > 0 };
          });
      }),
      
      // 获取收藏和点赞总数
      executeWithRetry(async () => {
        const [favoriteCountResult, likeCountResult] = await Promise.all([
          db.collection('favorites')
            .where({ planId: planId })
            .count(),
          db.collection('likes')
            .where({ planId: planId })
            .count()
        ]);
        
        return {
          favoriteCount: favoriteCountResult.total,
          likeCount: likeCountResult.total
        };
      })
    ]);
    
    // 获取用户点赞状态
    const likeStatusResult = await executeWithRetry(async () => {
      return await db.collection('likes')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .count();
    });
    
    // 构建返回数据
    const planDetail = {
      ...plan,
      isFavorited: userStatusResult.isFavorited,
      isLiked: likeStatusResult.total > 0,
      favoriteCount: countsResult.favoriteCount,
      likeCount: countsResult.likeCount
    };
    
    // 缓存结果
    const cacheKey = getCacheKey(planId, currentUserId);
    planCache.set(cacheKey, {
      data: planDetail,
      timestamp: Date.now()
    });
    
    const responseTime = Date.now() - startTime;
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime * (performanceMetrics.totalCalls - 1) + responseTime) / performanceMetrics.totalCalls;
    
    console.log('性能指标:', {
      totalCalls: performanceMetrics.totalCalls,
      cacheHits: performanceMetrics.cacheHits,
      cacheMisses: performanceMetrics.cacheMisses,
      cacheHitRate: (performanceMetrics.cacheHits / performanceMetrics.totalCalls * 100).toFixed(2) + '%',
      averageResponseTime: performanceMetrics.averageResponseTime.toFixed(2) + 'ms',
      currentResponseTime: responseTime + 'ms'
    });
    
    return {
      success: true,
      data: planDetail,
      message: '获取方案详情成功',
      fromCache: false,
      performance: {
        responseTime,
        cacheHit: false,
        metrics: {
          totalCalls: performanceMetrics.totalCalls,
          cacheHitRate: (performanceMetrics.cacheHits / performanceMetrics.totalCalls * 100).toFixed(2) + '%',
          averageResponseTime: performanceMetrics.averageResponseTime.toFixed(2) + 'ms'
        }
      }
    };
    
  } catch (error) {
    console.error('获取方案详情失败:', error);
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      data: null,
      message: '获取方案详情失败: ' + error.message,
      performance: {
        responseTime,
        error: true
      }
    };
  }
} 