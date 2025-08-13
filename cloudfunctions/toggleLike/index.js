const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
});

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('toggleLike云函数被调用', event);
  
  try {
    const db = cloud.database();
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    const { planId } = event;
    
    console.log('当前用户ID:', currentUserId);
    console.log('方案ID:', planId);
    
    if (!planId) {
      return {
        success: false,
        data: null,
        message: '方案ID不能为空'
      };
    }
    
    // 检查方案是否存在
    const planCheck = await db.collection('plans')
      .doc(planId)
      .get();
    
    console.log('方案数据:', planCheck.data);
    
    // 检查是否已点赞
    const existingLike = await db.collection('likes')
      .where({
        userId: currentUserId,
        planId: planId
      })
      .get();
    
    console.log('已存在的点赞记录:', existingLike.data);
    
    if (existingLike.data.length > 0) {
      // 取消点赞
      await db.collection('likes')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .remove();
      
      // 统计更新后的点赞数量
      const likeCountResult = await db.collection('likes')
        .where({
          planId: planId
        })
        .count();
      
      const updatedLikeCount = likeCountResult.total;
      console.log('取消点赞后点赞数:', updatedLikeCount);
      
      return {
        success: true,
        data: {
          isLiked: false,
          likeCount: updatedLikeCount
        },
        message: '取消点赞成功'
      };
    } else {
      // 添加点赞
      await db.collection('likes').add({
        data: {
          userId: currentUserId,
          planId: planId,
          createTime: new Date().toISOString()
        }
      });
      
      // 统计更新后的点赞数量
      const likeCountResult = await db.collection('likes')
        .where({
          planId: planId
        })
        .count();
      
      const updatedLikeCount = likeCountResult.total;
      console.log('添加点赞后点赞数:', updatedLikeCount);
      
      return {
        success: true,
        data: {
          isLiked: true,
          likeCount: updatedLikeCount
        },
        message: '点赞成功'
      };
    }
    
  } catch (error) {
    console.error('切换点赞状态失败:', error);
    return {
      success: false,
      data: null,
      message: '操作失败，请重试'
    };
  }
}; 