// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('clearCache云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { cacheType = 'all' } = event;
    
    let deleteCount = 0;
    
    if (cacheType === 'all' || cacheType === 'heroes') {
      // 清理英雄列表缓存
      const heroesCacheResult = await db.collection('heroes_cache').remove();
      deleteCount += heroesCacheResult.stats.removed;
      console.log(`清理英雄缓存: ${heroesCacheResult.stats.removed} 条`);
    }
    
    if (cacheType === 'all' || cacheType === 'plans') {
      // 清理方案缓存
      const plansCacheResult = await db.collection('plans_cache').remove();
      deleteCount += plansCacheResult.stats.removed;
      console.log(`清理方案缓存: ${plansCacheResult.stats.removed} 条`);
    }
    
    return {
      success: true,
      data: {
        deletedCount: deleteCount,
        cacheType: cacheType
      },
      message: `清理缓存成功，共删除 ${deleteCount} 条缓存记录`
    };
    
  } catch (error) {
    console.error('清理缓存失败:', error);
    return {
      success: false,
      data: null,
      message: '清理缓存失败: ' + error.message
    };
  }
} 