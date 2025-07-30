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
    const { heroId, page = 1, pageSize = 10 } = event;
    
    if (!heroId) {
      return {
        success: false,
        data: null,
        message: '英雄ID不能为空'
      };
    }
    
    // 计算偏移量
    const skip = (page - 1) * pageSize;
    
    // 获取方案列表
    const plansResult = await db.collection('plans')
      .where({
        heroId: heroId,
        status: 'active'
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 获取总数
    const countResult = await db.collection('plans')
      .where({
        heroId: heroId,
        status: 'active'
      })
      .count();
    
    // 获取当前用户信息
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    // 获取用户的收藏和点赞信息
    const userFavorites = await db.collection('favorites')
      .where({
        userId: currentUserId
      })
      .get();
    
    const userLikes = await db.collection('likes')
      .where({
        userId: currentUserId
      })
      .get();
    
    const favoritePlanIds = userFavorites.data.map(f => f.planId);
    const likePlanIds = userLikes.data.map(l => l.planId);
    
    // 处理方案数据，添加用户交互状态
    const plans = plansResult.data.map(plan => ({
      ...plan,
      isFavorited: favoritePlanIds.includes(plan._id),
      isLiked: likePlanIds.includes(plan._id)
    }));
    
    const result = {
      success: true,
      data: {
        plans: plans,
        total: countResult.total,
        page: page,
        pageSize: pageSize,
        hasMore: skip + plans.length < countResult.total
      },
      message: '获取英雄方案列表成功'
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