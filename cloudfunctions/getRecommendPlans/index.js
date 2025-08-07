// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getRecommendPlans云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { 
      filter = 'featured', // featured: 精选方案, latest: 最新方案
      heroId = null, // 可选的英雄筛选
      page = 1, 
      pageSize = 10 
    } = event;
    
    // 计算偏移量
    const skip = (page - 1) * pageSize;
    
    // 获取当前用户信息
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    console.log('获取推荐方案数据，筛选条件:', { filter, heroId, page, pageSize });
    
    // 构建查询条件
    let whereCondition = {
      status: 'published' // 只显示已发布的方案
    };
    
    // 如果指定了英雄ID，添加英雄筛选条件
    if (heroId && heroId !== 'all') {
      whereCondition.heroId = heroId;
    }
    
    // 根据筛选类型设置排序
    let orderByField = 'createTime';
    let orderByDirection = 'desc';
    
    if (filter === 'featured') {
      // 精选方案：按点赞数和收藏数排序
      // 由于云数据库不支持复合排序，我们先按创建时间排序，然后在应用层处理
      orderByField = 'createTime';
      orderByDirection = 'desc';
    } else if (filter === 'latest') {
      // 最新方案：按创建时间排序
      orderByField = 'createTime';
      orderByDirection = 'desc';
    }
    
    // 并行查询方案列表和总数
    const [plansResult, countResult] = await Promise.all([
      db.collection('plans')
        .where(whereCondition)
        .orderBy(orderByField, orderByDirection)
        .skip(skip)
        .limit(pageSize)
        .get(),
      db.collection('plans')
        .where(whereCondition)
        .count()
    ]);
    
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
    
    // 获取用户的收藏和点赞状态
    const [userFavorites, userLikes] = await Promise.all([
      db.collection('favorites')
        .where({
          userId: currentUserId,
          planId: db.command.in(planIds)
        })
        .field({
          planId: true
        })
        .get(),
      db.collection('likes')
        .where({
          userId: currentUserId,
          planId: db.command.in(planIds)
        })
        .field({
          planId: true
        })
        .get()
    ]);
    
    const userFavoritePlanIds = userFavorites.data.map(f => f.planId);
    const userLikePlanIds = userLikes.data.map(l => l.planId);
    
    // 处理方案数据，添加用户交互状态和数量
    let plans = plansResult.data.map(plan => ({
      ...plan,
      isFavorited: userFavoritePlanIds.includes(plan._id),
      isLiked: userLikePlanIds.includes(plan._id),
      likeCount: likeCountMap[plan._id] || 0,
      favoriteCount: favoriteCountMap[plan._id] || 0
    }));
    
    // 如果是精选方案，按点赞数和收藏数重新排序
    if (filter === 'featured') {
      plans.sort((a, b) => {
        const aScore = (a.likeCount * 2) + a.favoriteCount;
        const bScore = (b.likeCount * 2) + b.favoriteCount;
        return bScore - aScore;
      });
    }
    
    const resultData = {
      plans: plans,
      total: countResult.total,
      page: page,
      pageSize: pageSize,
      hasMore: skip + plans.length < countResult.total,
      filter: filter,
      heroId: heroId
    };
    
    const result = {
      success: true,
      data: resultData,
      message: '获取推荐方案列表成功'
    };
    
    return result;
    
  } catch (error) {
    console.error('获取推荐方案列表失败:', error);
    return {
      success: false,
      data: null,
      message: '获取推荐方案列表失败: ' + error.message
    };
  }
} 