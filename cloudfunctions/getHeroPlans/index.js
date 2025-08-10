// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getHeroPlans云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { heroId, page = 1, pageSize = 10, useCache = true, forceRefresh = false } = event;
    
    if (!heroId) {
      return {
        success: false,
        data: null,
        message: '英雄ID不能为空'
      };
    }
    
    // 计算偏移量
    const skip = (page - 1) * pageSize;
    
    // 获取当前用户信息
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    // 检查缓存（只在非强制刷新时使用）
    if (useCache && page === 1 && !forceRefresh) {
      const cacheKey = `hero_plans_${heroId}_${currentUserId}`;
      const cacheResult = await db.collection('plans_cache').where({
        key: cacheKey,
        updateTime: db.command.gte(new Date(Date.now() - 1 * 60 * 1000)) // 1分钟内的缓存
      }).limit(1).get();
      
      if (cacheResult.data.length > 0) {
        console.log('使用缓存的方案数据');
        return {
          success: true,
          data: cacheResult.data[0].data,
          message: '获取英雄方案列表成功（缓存）',
          fromCache: true
        };
      }
    }
    
    console.log('获取最新方案数据');
    
    // 并行查询方案列表和总数，减少等待时间
    const [plansResult, countResult] = await Promise.all([
      db.collection('plans')
        .where({
          heroId: heroId,
          status: 'published' // 只显示已发布的方案
        })
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get(), // 移除field限制，获取所有字段
      db.collection('plans')
        .where({
          heroId: heroId,
          status: 'published' // 只显示已发布的方案
        })
        .count()
    ]);
    
    // 只在第一页时查询用户交互信息，减少资源消耗
    let favoritePlanIds = [];
    let likePlanIds = [];
    
    if (page === 1) {
      try {
        // 并行查询用户的收藏和点赞信息
        const [userFavorites, userLikes] = await Promise.all([
          db.collection('favorites')
            .where({
              userId: currentUserId
            })
            .field({
              planId: true
            })
            .get(),
          db.collection('likes')
            .where({
              userId: currentUserId
            })
            .field({
              planId: true
            })
            .get()
        ]);
        
        favoritePlanIds = userFavorites.data.map(f => f.planId);
        likePlanIds = userLikes.data.map(l => l.planId);
      } catch (interactionError) {
        console.log('获取用户交互信息失败，但不影响主功能:', interactionError);
      }
    }
    
    // 获取所有方案的点赞和收藏数量
    const planIds = plansResult.data.map(plan => plan._id);
    
    // 并行查询所有方案的点赞和收藏数量
    const [likeCounts, favoriteCounts] = await Promise.all([
      db.collection('likes')
        .where({
          planId: db.command.in(planIds)
        })
        .field({
          planId: true
        })
        .get(),
      db.collection('favorites')
        .where({
          planId: db.command.in(planIds)
        })
        .field({
          planId: true
        })
        .get()
    ]);
    
    // 统计每个方案的点赞和收藏数量
    const likeCountMap = {};
    const favoriteCountMap = {};
    
    likeCounts.data.forEach(like => {
      likeCountMap[like.planId] = (likeCountMap[like.planId] || 0) + 1;
    });
    
    favoriteCounts.data.forEach(favorite => {
      favoriteCountMap[favorite.planId] = (favoriteCountMap[favorite.planId] || 0) + 1;
    });
    
    // 处理方案数据，添加用户交互状态和数量
    const plans = plansResult.data.map(plan => ({
      ...plan,
      isFavorited: favoritePlanIds.includes(plan._id),
      isLiked: likePlanIds.includes(plan._id),
      likeCount: likeCountMap[plan._id] || 0,
      favoriteCount: favoriteCountMap[plan._id] || 0
    }));
    
    // 按点赞收藏总和降序排序
    plans.sort((a, b) => {
      const aScore = a.likeCount + a.favoriteCount;
      const bScore = b.likeCount + b.favoriteCount;
      return bScore - aScore;
    });
    
    const resultData = {
      plans: plans,
      total: countResult.total,
      page: page,
      pageSize: pageSize,
      hasMore: skip + plans.length < countResult.total
    };
    
    // 缓存第一页数据（只在非强制刷新时）
    if (page === 1 && !forceRefresh) {
      try {
        const cacheKey = `hero_plans_${heroId}_${currentUserId}`;
        await db.collection('plans_cache').where({
          key: cacheKey
        }).remove();
        
        await db.collection('plans_cache').add({
          data: {
            key: cacheKey,
            data: resultData,
            updateTime: new Date()
          }
        });
      } catch (cacheError) {
        console.log('缓存更新失败，但不影响主功能:', cacheError);
      }
    }
    
    const result = {
      success: true,
      data: resultData,
      message: '获取英雄方案列表成功',
      fromCache: false
    };
    
    return result;
    
  } catch (error) {
    console.error('获取英雄方案列表失败:', error);
    return {
      success: false,
      data: null,
      message: '获取英雄方案列表失败: ' + error.message
    };
  }
} 