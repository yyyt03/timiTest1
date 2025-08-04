// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 内存缓存 - 在云函数实例生命周期内有效
const heroListCache = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存
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

// 工具函数：检查缓存是否有效
function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_DURATION;
}

// 云函数入口函数
exports.main = async function(event, context) {
  const startTime = Date.now();
  performanceMetrics.totalCalls++;
  
  console.log('getHeroList云函数被调用');
  
  try {
    const db = cloud.database();
    
    // 检查是否有缓存参数，避免重复查询
    const { useCache = true } = event;
    
    // 检查内存缓存
    if (useCache && heroListCache.data && isCacheValid(heroListCache.timestamp)) {
      performanceMetrics.cacheHits++;
      console.log('使用内存缓存的英雄数据');
      
      const responseTime = Date.now() - startTime;
      performanceMetrics.averageResponseTime = 
        (performanceMetrics.averageResponseTime * (performanceMetrics.totalCalls - 1) + responseTime) / performanceMetrics.totalCalls;
      
      return {
        success: true,
        data: heroListCache.data,
        message: '获取英雄列表成功（内存缓存）',
        fromCache: true,
        performance: {
          responseTime,
          cacheHit: true
        }
      };
    }
    
    // 如果使用缓存，检查数据库缓存
    if (useCache) {
      try {
        const cacheResult = await executeWithRetry(async () => {
          return await db.collection('heroes_cache').where({
            type: 'hero_list',
            updateTime: db.command.gte(new Date(Date.now() - 5 * 60 * 1000)) // 5分钟内的缓存
          }).limit(1).get();
        });
        
        if (cacheResult.data.length > 0) {
          performanceMetrics.cacheHits++;
          console.log('使用数据库缓存的英雄数据');
          
          // 更新内存缓存
          heroListCache.data = cacheResult.data[0].data;
          heroListCache.timestamp = Date.now();
          
          const responseTime = Date.now() - startTime;
          performanceMetrics.averageResponseTime = 
            (performanceMetrics.averageResponseTime * (performanceMetrics.totalCalls - 1) + responseTime) / performanceMetrics.totalCalls;
          
          return {
            success: true,
            data: cacheResult.data[0].data,
            message: '获取英雄列表成功（数据库缓存）',
            fromCache: true,
            performance: {
              responseTime,
              cacheHit: true
            }
          };
        }
      } catch (cacheError) {
        console.log('数据库缓存查询失败，继续从主数据源获取:', cacheError);
      }
    }
    
    performanceMetrics.cacheMisses++;
    console.log('缓存未命中，从主数据源获取英雄数据');
    
    // 从heroes集合中读取所有英雄数据，只选择必要字段（带重试）
    const heroesResult = await executeWithRetry(async () => {
      return await db.collection('heroes')
        .field({
          _id: true,
          name: true,
          avatar: true,
          category: true
        })
        .get();
    });
    
    // 分类映射
    const categoryMap = {
      'shooter': '射手',
      'support': '辅助', 
      'assassin': '刺客',
      'warrior': '战士',
      'mage': '法师'
    };
    
    // 按分类组织数据
    const categories = {};
    let totalHeroes = 0;
    
    heroesResult.data.forEach((hero) => {
      const chineseCategory = categoryMap[hero.category] || hero.category;
      
      if (!categories[chineseCategory]) {
        categories[chineseCategory] = {
          name: chineseCategory,
          heroes: []
        };
      }
      
      categories[chineseCategory].heroes.push({
        id: hero._id,
        name: hero.name,
        avatar: hero.avatar,
        category: chineseCategory
      });
      
      totalHeroes++;
    });
    
    const resultData = {
      categories: categories,
      totalHeroes: totalHeroes
    };
    
    // 更新内存缓存
    heroListCache.data = resultData;
    heroListCache.timestamp = Date.now();
    
    // 更新数据库缓存（异步，不阻塞主流程）
    try {
      await executeWithRetry(async () => {
        await db.collection('heroes_cache').where({
          type: 'hero_list'
        }).remove();
        
        await db.collection('heroes_cache').add({
          data: {
            type: 'hero_list',
            data: resultData,
            updateTime: new Date()
          }
        });
      });
      console.log('数据库缓存更新成功');
    } catch (cacheError) {
      console.log('数据库缓存更新失败，但不影响主功能:', cacheError);
    }
    
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
      data: resultData,
      message: '获取英雄列表成功',
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
    console.error('获取英雄列表失败:', error);
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      data: null,
      message: '获取英雄列表失败: ' + error.message,
      performance: {
        responseTime,
        error: true
      }
    };
  }
} 