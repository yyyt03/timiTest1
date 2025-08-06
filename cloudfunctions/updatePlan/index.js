// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('updatePlan云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { planId, planData } = event;
    
    if (!planId || !planData) {
      return {
        success: false,
        data: null,
        message: '方案ID和方案数据不能为空'
      };
    }
    
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    if (!currentUserId) {
      return {
        success: false,
        data: null,
        message: '用户未登录'
      };
    }
    
    // 验证方案是否属于当前用户
    const planResult = await db.collection('plans')
      .where({
        _id: planId,
        creatorId: currentUserId
      })
      .get();
    
    if (planResult.data.length === 0) {
      return {
        success: false,
        data: null,
        message: '方案不存在或无权限修改'
      };
    }
    
    // 更新方案数据
    const updateData = {
      ...planData,
      updateTime: new Date().toISOString()
    };
    
    // 移除不需要更新的字段
    delete updateData._id;
    delete updateData.creatorId;
    delete updateData.createTime;
    delete updateData.likeCount;
    delete updateData.favoriteCount;
    delete updateData.views;
    
    await db.collection('plans')
      .doc(planId)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      data: null,
      message: '方案更新成功'
    };
    
  } catch (error) {
    console.error('更新方案失败:', error);
    return {
      success: false,
      data: null,
      message: '更新方案失败: ' + error.message
    };
  }
} 