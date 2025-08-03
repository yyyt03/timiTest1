// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getPlanDetail云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { planId } = event;
    
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
    
    // 从数据库获取方案详情
    const planResult = await db.collection('plans')
      .doc(planId)
      .get();
    
    if (!planResult.data) {
      return {
        success: false,
        data: null,
        message: '方案不存在'
      };
    }
    
    const plan = planResult.data;
    
    // 并行查询用户的收藏和点赞状态
    const [favoriteResult, likeResult] = await Promise.all([
      db.collection('favorites')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .count(),
      db.collection('likes')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .count()
    ]);
    
    // 并行查询方案的收藏和点赞总数
    const [favoriteCountResult, likeCountResult] = await Promise.all([
      db.collection('favorites')
        .where({
          planId: planId
        })
        .count(),
      db.collection('likes')
        .where({
          planId: planId
        })
        .count()
    ]);
    
    // 构建返回数据
    const planDetail = {
      ...plan,
      isFavorited: favoriteResult.total > 0,
      isLiked: likeResult.total > 0,
      favoriteCount: favoriteCountResult.total,
      likeCount: likeCountResult.total
    };
    
    return {
      success: true,
      data: planDetail,
      message: '获取方案详情成功'
    };
    
  } catch (error) {
    console.error('获取方案详情失败:', error);
    return {
      success: false,
      data: null,
      message: '获取方案详情失败: ' + error.message
    };
  }
} 