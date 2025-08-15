// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getRecommendPlans云函数被调用，完整参数:', event);
  
  try {
    const db = cloud.database();
    const { 
      filter = 'featured', // featured: 精选方案, latest: 最新方案
      heroId = null, // 可选的英雄筛选
      hero = null, // 英雄名称筛选
      isBetaPlan = false, // 是否为体验服方案筛选
      includeBetaPlans = false, // 是否包含体验服方案
      mode = 'hot', // recommended: 推荐方案, hot: 热门方案(按点赞收藏排序), latest: 最新方案(按时间排序)
      isRecommended = false, // 是否为推荐方案筛选
      page = 1, 
      pageSize = 10 
    } = event;
    
    console.log('解析后的参数:', {
      filter,
      heroId,
      hero,
      isBetaPlan,
      includeBetaPlans,
      mode,
      isRecommended,
      page,
      pageSize
    });
    
    // 计算偏移量
    const skip = (page - 1) * pageSize;
    
    // 获取当前用户信息
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    console.log('获取推荐方案数据，筛选条件:', { filter, heroId, page, pageSize });
    
    // 构建查询条件 - 根据mode参数决定筛选逻辑
    let whereCondition = {
      status: 'published' // 只显示已发布的方案
    };
    
    // 根据模式设置不同的筛选和排序逻辑
    if (mode === 'all') {
      // 全局模式：获取所有已发布的方案，不做额外筛选
      console.log('全局模式：获取所有已发布的方案');
    } else if (mode === 'recommended' || event.isRecommended === true) {
      // 推荐模式：只显示被标记为推荐的方案
      whereCondition.isRecommended = true;
      console.log('推荐模式：只显示推荐方案，查询条件:', whereCondition);
    } else if (mode === 'hot') {
      // 热门模式：显示所有已发布方案（按点赞收藏排序）
      console.log('热门模式：显示所有已发布方案（按点赞收藏排序）');
    } else if (mode === 'latest') {
      // 最新模式：显示所有已发布方案（按时间排序）
      console.log('最新模式：显示所有已发布方案（按时间排序）');
    }
    
    // 如果指定了英雄ID，添加英雄筛选条件
    if (heroId && heroId !== 'all') {
      whereCondition.heroId = heroId;
    }
    
    // 如果指定了英雄名称，添加英雄名称筛选条件
    if (hero && hero !== 'all') {
      whereCondition.heroName = hero;
    }
    
    // 如果指定了体验服筛选条件，添加体验服筛选
    if (isBetaPlan !== undefined) {
      whereCondition.isBetaPlan = isBetaPlan;
    }
    
    // 如果包含体验服方案，则不限制isBetaPlan字段
    if (includeBetaPlans) {
      delete whereCondition.isBetaPlan;
    }
    
    // 根据筛选类型和模式设置排序
    let orderByField = 'createTime';
    let orderByDirection = 'desc';
    
    if (mode === 'hot') {
      // 热门模式：需要先获取所有方案，然后按点赞数和收藏数排序
      // 由于云数据库不支持复合排序，我们需要获取所有方案后在应用层处理
      orderByField = 'createTime';
      orderByDirection = 'desc';
    } else if (mode === 'latest') {
      // 最新模式：按创建时间排序
      orderByField = 'createTime';
      orderByDirection = 'desc';
    } else if (mode === 'recommended') {
      // 推荐模式：按创建时间排序，但只显示推荐方案
      orderByField = 'createTime';
      orderByDirection = 'desc';
    }
    
    // 根据模式决定数据获取方式
    let plansResult, countResult;
    
    if (mode === 'all') {
      // 全局模式：获取所有方案，不分页
      [plansResult, countResult] = await Promise.all([
        db.collection('plans')
          .where(whereCondition)
          .get(),
        db.collection('plans')
          .where(whereCondition)
          .count()
      ]);
    } else if (mode === 'hot') {
      // 热门模式：获取所有方案用于排序
      [plansResult, countResult] = await Promise.all([
        db.collection('plans')
          .where(whereCondition)
          .get(),
        db.collection('plans')
          .where(whereCondition)
          .count()
      ]);
    } else {
      // 推荐模式和最新模式：按时间排序分页获取
      [plansResult, countResult] = await Promise.all([
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
    }
    
    console.log('数据库查询结果:', {
      mode,
      isRecommended: event.isRecommended,
      whereCondition,
      plansCount: plansResult.data.length,
      totalCount: countResult.total
    });
    
    // 验证推荐方案筛选结果
    if (mode === 'recommended' || event.isRecommended === true) {
      const recommendedPlans = plansResult.data.filter(plan => plan.isRecommended === true);
      console.log('推荐方案筛选验证:', {
        totalPlans: plansResult.data.length,
        recommendedPlans: recommendedPlans.length,
        isRecommendedPlans: recommendedPlans.map(p => ({ id: p._id, title: p.title, isRecommended: p.isRecommended }))
      });
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
    
    // 如果是热门模式或全局模式，按点赞数和收藏数重新排序
    if (mode === 'hot' || mode === 'all') {
      plans.sort((a, b) => {
        const aScore = a.likeCount + a.favoriteCount;
        const bScore = b.likeCount + b.favoriteCount;
        return bScore - aScore;
      });
      
      // 如果是热门模式，排序后应用分页；全局模式不分页
      if (mode === 'hot') {
        plans = plans.slice(skip, skip + pageSize);
      }
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