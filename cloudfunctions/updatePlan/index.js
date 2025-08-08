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
      console.error('参数验证失败:', { planId, planData });
      return {
        success: false,
        data: null,
        message: '方案ID和方案数据不能为空'
      };
    }
    
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    if (!currentUserId) {
      console.error('用户未登录');
      return {
        success: false,
        data: null,
        message: '用户未登录'
      };
    }
    
    console.log('当前用户ID:', currentUserId);
    console.log('要更新的方案ID:', planId);
    
    // 验证方案是否属于当前用户
    const planResult = await db.collection('plans')
      .doc(planId)
      .get();
    
    console.log('查询到的方案:', planResult.data);
    
    if (!planResult.data) {
      console.error('方案不存在');
      return {
        success: false,
        data: null,
        message: '方案不存在'
      };
    }
    
    // 检查权限
    if (planResult.data.creatorId !== currentUserId) {
      console.error('无权限修改此方案');
      console.error('当前用户ID:', currentUserId);
      console.error('方案创建者ID:', planResult.data.creatorId);
      return {
        success: false,
        data: null,
        message: '无权限修改此方案'
      };
    }
    
    // 准备更新数据
    const updateData = {
      heroId: planData.heroId,
      heroName: planData.heroName,
      title: planData.title,
      description: planData.description,
      skillOne: planData.skillOne,
      skillTwo: planData.skillTwo,
      skillThree: planData.skillThree,
      equipment: planData.equipment,
      equipmentText: planData.equipmentText,
      strategy: planData.strategy,
      authorName: planData.authorName,
      isBetaPlan: planData.isBetaPlan,
      updateTime: new Date().toISOString()
    };
    
    console.log('准备更新的数据:', updateData);
    
    // 执行更新
    const updateResult = await db.collection('plans')
      .doc(planId)
      .update({
        data: updateData
      });
    
    console.log('更新结果:', updateResult);
    
    // 清除相关缓存，确保数据及时更新
    try {
      // 清除方案详情缓存
      await db.collection('plans_cache').where({
        key: db.RegExp({
          regexp: planId,
          options: 'i'
        })
      }).remove();
      
      // 清除英雄方案列表缓存
      await db.collection('plans_cache').where({
        key: db.RegExp({
          regexp: `hero_plans_${planData.heroId}`,
          options: 'i'
        })
      }).remove();
      
      // 调用getPlanDetail云函数清除内存缓存
      try {
        const cloud = require('wx-server-sdk');
        await cloud.callFunction({
          name: 'getPlanDetail',
          data: {
            planId: planId,
            forceRefresh: true,
            clearCacheOnly: true
          }
        });
      } catch (cacheError) {
        console.log('清除内存缓存失败，但不影响主功能:', cacheError);
      }
      
      console.log('缓存清除完成');
    } catch (cacheError) {
      console.log('缓存清除失败，但不影响主功能:', cacheError);
    }
    
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