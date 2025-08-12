// 数据库迁移脚本：为现有方案添加推荐字段
// 使用方法：在云开发控制台运行此脚本

const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
});

exports.main = async function(event, context) {
  console.log('开始迁移推荐字段...');
  
  try {
    const db = cloud.database();
    
    // 获取所有已发布的方案
    const plansResult = await db.collection('plans')
      .where({ status: 'published' })
      .get();
    
    const plans = plansResult.data;
    console.log(`找到 ${plans.length} 个已发布的方案`);
    
    if (plans.length === 0) {
      return {
        success: true,
        message: '没有找到需要迁移的方案',
        migratedCount: 0
      };
    }
    
    // 批量更新，为现有方案设置默认推荐状态
    const updatePromises = plans.map(plan => {
      // 检查是否已经有推荐字段
      if (plan.hasOwnProperty('isRecommended')) {
        console.log(`方案 ${plan._id} 已有推荐字段，跳过`);
        return Promise.resolve();
      }
      
      return db.collection('plans').doc(plan._id).update({
        data: {
          isRecommended: false, // 默认不推荐
          updateTime: new Date().toISOString()
        }
      });
    });
    
    // 等待所有更新完成
    const results = await Promise.allSettled(updatePromises);
    
    // 统计成功和失败的数量
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`迁移完成：成功 ${succeeded} 个，失败 ${failed} 个`);
    
    return {
      success: true,
      message: '推荐字段迁移完成',
      totalPlans: plans.length,
      migratedCount: succeeded,
      failedCount: failed
    };
    
  } catch (error) {
    console.error('迁移失败:', error);
    return {
      success: false,
      message: '迁移失败: ' + error.message
    };
  }
};
