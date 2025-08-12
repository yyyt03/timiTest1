// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('updatePlanStatus云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { planId, status, reason, admin = false, isRecommended = null } = event;
    
    if (!planId || !status) {
      return {
        success: false,
        data: null,
        message: '方案ID和状态不能为空'
      };
    }

    // 如果是返回状态，必须提供返回原因
    if (status === 'rejected' && (!reason || !reason.trim())) {
      return {
        success: false,
        data: null,
        message: '返回方案时必须提供返回原因'
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

    // 环境验证：只在开发环境下允许发布；管理员操作(admin=true)则放宽限制
    if (status === 'published') {
      let isDev = false;
      if (admin) {
        isDev = true;
      } else {
        const accountInfo = wxContext.ACCOUNT_INFO || {};
        const envVersion = accountInfo.envVersion || '';
        const version = accountInfo.version || '';
        isDev = envVersion === 'develop' || envVersion === 'trial' || version.includes('dev') || version.includes('test');
        console.log('云函数环境检测结果:', { envVersion, version, isDevelopment: isDev });
      }
      if (!isDev) {
        return { success: false, data: null, message: '发布功能仅在开发环境下可用' };
      }
    }
    
    // 所有权验证：管理员(admin=true)跳过，否则需验证归属
    let isDev = false;
    if (admin) {
      isDev = true;
    } else {
      try {
        const accountInfo = wxContext.ACCOUNT_INFO || {};
        const envVersion = accountInfo.envVersion || '';
        const version = accountInfo.version || '';
        isDev = envVersion === 'develop' || envVersion === 'trial' || version.includes('dev') || version.includes('test');
      } catch (e) {
        isDev = false;
      }
    }

    if (!isDev && !admin) {
      // 非开发环境需要验证归属
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
    }
    
    // 更新方案状态
    const updateData = {
      status: status,
      updateTime: new Date().toISOString()
    };

    // 如果是返回状态，保存返回原因
    if (status === 'rejected' && reason) {
      updateData.rejectionReason = reason.trim();
    }

    // 如果是其他状态，清除返回原因
    if (status !== 'rejected') {
      updateData.rejectionReason = null;
    }

    // 如果指定了推荐状态，更新推荐状态
    if (isRecommended !== null) {
      updateData.isRecommended = isRecommended;
    }

    await db.collection('plans')
      .doc(planId)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      data: null,
      message: '方案状态更新成功'
    };
    
  } catch (error) {
    console.error('更新方案状态失败:', error);
    return {
      success: false,
      data: null,
      message: '更新方案状态失败: ' + error.message
    };
  }
} 