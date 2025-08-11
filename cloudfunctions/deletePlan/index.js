// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('deletePlan云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { planId, admin = false } = event;
    
    if (!planId) {
      return {
        success: false,
        data: null,
        message: '方案ID不能为空'
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

    // 环境检测：develop环境下或管理员模式下跳过权限验证
    let isDev = false;
    if (admin) {
      isDev = true;
    } else {
      try {
        const accountInfo = wxContext.ACCOUNT_INFO || {};
        const envVersion = accountInfo.envVersion || '';
        const version = accountInfo.version || '';
        isDev = envVersion === 'develop' || envVersion === 'trial' || version.includes('dev') || version.includes('test');
        console.log('deletePlan云函数环境检测结果:', { envVersion, version, isDevelopment: isDev });
      } catch (e) {
        isDev = false;
      }
    }
    
    // 如果不是开发环境且不是管理员模式，需要验证方案是否属于当前用户
    if (!isDev && !admin) {
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
          message: '方案不存在或无权限删除'
        };
      }
    }
    
    // 删除方案
    await db.collection('plans')
      .doc(planId)
      .remove();
    
    // 删除相关的点赞记录
    await db.collection('likes')
      .where({
        planId: planId
      })
      .remove();
    
    // 删除相关的收藏记录
    await db.collection('favorites')
      .where({
        planId: planId
      })
      .remove();
    
    return {
      success: true,
      data: null,
      message: '方案删除成功'
    };
    
  } catch (error) {
    console.error('删除方案失败:', error);
    return {
      success: false,
      data: null,
      message: '删除方案失败: ' + error.message
    };
  }
} 