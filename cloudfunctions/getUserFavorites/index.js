// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getUserFavorites云函数被调用', event);
  
  try {
    const db = cloud.database();
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    const { page = 1, pageSize = 20 } = event;
    
    // 获取用户的收藏记录
    const favoritesResult = await db.collection('favorites')
      .where({
        userId: currentUserId
      })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    if (favoritesResult.data.length === 0) {
      return {
        success: true,
        data: {
          favorites: [],
          total: 0,
          hasMore: false
        },
        message: '暂无收藏记录'
      };
    }
    
    // 获取收藏的方案ID列表
    const planIds = favoritesResult.data.map(fav => fav.planId);
    
    // 获取方案详情
    const plansResult = await db.collection('plans')
      .where({
        _id: db.command.in(planIds)
      })
      .get();
    
    // 将方案信息与收藏信息合并
    const favoritesWithPlans = favoritesResult.data.map(favorite => {
      const plan = plansResult.data.find(p => p._id === favorite.planId);
      return {
        ...favorite,
        plan: plan || null
      };
    });
    
    // 获取总收藏数
    const totalResult = await db.collection('favorites')
      .where({
        userId: currentUserId
      })
      .count();
    
    const hasMore = favoritesResult.data.length === pageSize;
    
    return {
      success: true,
      data: {
        favorites: favoritesWithPlans,
        total: totalResult.total,
        hasMore: hasMore,
        page: page,
        pageSize: pageSize
      },
      message: '获取收藏列表成功'
    };
    
  } catch (error) {
    console.error('获取用户收藏失败:', error);
    return {
      success: false,
      data: null,
      message: '获取用户收藏失败: ' + error.message
    };
  }
} 