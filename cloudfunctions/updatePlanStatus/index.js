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
    const { planId, status } = event;
    
    if (!planId || !status) {
      return {
        success: false,
        data: null,
        message: '方案ID和状态不能为空'
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

    // 环境验证：只在开发环境下允许发布
    if (status === 'published') {
      // 获取小程序版本信息
      const accountInfo = wxContext.ACCOUNT_INFO || {};
      const envVersion = accountInfo.envVersion || '';
      const version = accountInfo.version || '';
      
      // 检查是否为开发环境
      const isDev = envVersion === 'develop' || 
                    envVersion === 'trial' || 
                    version.includes('dev') || 
                    version.includes('test');
      
      console.log('云函数环境检测结果:', {
        envVersion,
        version,
        isDevelopment: isDev
      });
      
      if (!isDev) {
        return {
          success: false,
          data: null,
          message: '发布功能仅在开发环境下可用'
        };
      }
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
    
    // 更新方案状态
    await db.collection('plans')
      .doc(planId)
      .update({
        data: {
          status: status,
          updateTime: new Date().toISOString()
        }
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