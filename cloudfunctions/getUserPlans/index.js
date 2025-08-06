// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getUserPlans云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { page = 1, pageSize = 10 } = event;
    
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    if (!currentUserId) {
      return {
        success: false,
        data: null,
        message: '用户未登录'
      };
    }
    
    // 计算偏移量
    const skip = (page - 1) * pageSize;
    
    console.log('获取用户方案数据');
    
    // 并行查询用户方案列表和总数
    const [plansResult, countResult] = await Promise.all([
      db.collection('plans')
        .where({
          creatorId: currentUserId
        })
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get(),
      db.collection('plans')
        .where({
          creatorId: currentUserId
        })
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
    
    // 处理方案数据，添加点赞收藏数量
    const plans = plansResult.data.map(plan => ({
      ...plan,
      likeCount: likeCountMap[plan._id] || 0,
      favoriteCount: favoriteCountMap[plan._id] || 0
    }));
    
    const resultData = {
      plans: plans,
      total: countResult.total,
      page: page,
      pageSize: pageSize,
      hasMore: skip + plans.length < countResult.total
    };
    
    return {
      success: true,
      data: resultData,
      message: '获取用户方案列表成功'
    };
    
  } catch (error) {
    console.error('获取用户方案列表失败:', error);
    return {
      success: false,
      data: null,
      message: '获取用户方案列表失败: ' + error.message
    };
  }
} 