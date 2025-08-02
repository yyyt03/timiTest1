// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('toggleFavorite云函数被调用', event);
  
  try {
    const db = cloud.database();
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    const { planId } = event;
    
    if (!planId) {
      return {
        success: false,
        data: null,
        message: '方案ID不能为空'
      };
    }
    
    // 检查是否已收藏
    const existingFavorite = await db.collection('favorites')
      .where({
        userId: currentUserId,
        planId: planId
      })
      .get();
    
    if (existingFavorite.data.length > 0) {
      // 取消收藏
      await db.collection('favorites')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .remove();
      
      // 统计更新后的收藏数量
      const favoriteCountResult = await db.collection('favorites')
        .where({
          planId: planId
        })
        .count();
      
      const updatedFavoriteCount = favoriteCountResult.total;
      
      return {
        success: true,
        data: {
          isFavorited: false,
          action: 'unfavorited',
          favorites: updatedFavoriteCount
        },
        message: '取消收藏成功'
      };
    } else {
      // 添加收藏
      await db.collection('favorites').add({
        data: {
          userId: currentUserId,
          planId: planId,
          createTime: new Date().toISOString()
        }
      });
      
      // 统计更新后的收藏数量
      const favoriteCountResult = await db.collection('favorites')
        .where({
          planId: planId
        })
        .count();
      
      const updatedFavoriteCount = favoriteCountResult.total;
      
      return {
        success: true,
        data: {
          isFavorited: true,
          action: 'favorited',
          favorites: updatedFavoriteCount
        },
        message: '收藏成功'
      };
    }
    
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    return {
      success: false,
      data: null,
      message: '切换收藏状态失败: ' + error.message
    };
  }
} 