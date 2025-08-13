// 头像缓存管理器测试文件
// 注意：这个文件仅用于开发和测试，生产环境可以删除

import { avatarCache } from './avatarCache';

// 测试头像缓存管理器的基本功能
export async function testAvatarCache() {
  console.log('开始测试头像缓存管理器...');
  
  try {
    // 测试1: 获取缓存统计信息
    const stats = avatarCache.getCacheStats();
    console.log('缓存统计信息:', stats);
    
    // 测试2: 测试单个头像URL获取
    const testFileID = 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/hero1.png';
    console.log('测试获取单个头像URL:', testFileID);
    
    try {
      const singleUrl = await avatarCache.getAvatarUrl(testFileID);
      console.log('单个头像URL获取成功:', singleUrl.substring(0, 50) + '...');
    } catch (error) {
      console.log('单个头像URL获取失败（预期行为）:', error);
    }
    
    // 测试3: 测试批量头像URL获取
    const testFileIDs = [
      'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/hero1.png',
      'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/hero2.png',
      'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/hero3.png'
    ];
    
    console.log('测试批量获取头像URL:', testFileIDs);
    
    try {
      const batchUrls = await avatarCache.getAvatarUrls(testFileIDs);
      console.log('批量头像URL获取结果:', {
        requested: testFileIDs.length,
        received: Object.keys(batchUrls).length,
        urls: Object.keys(batchUrls).map(key => key.substring(0, 30) + '...')
      });
    } catch (error) {
      console.log('批量头像URL获取失败（预期行为）:', error);
    }
    
    // 测试4: 测试预加载功能
    console.log('测试预加载功能...');
    await avatarCache.preloadAvatarUrls(testFileIDs);
    console.log('预加载完成');
    
    // 测试5: 再次获取缓存统计信息
    const statsAfter = avatarCache.getCacheStats();
    console.log('操作后缓存统计信息:', statsAfter);
    
    // 测试6: 测试缓存命中
    console.log('测试缓存命中...');
    const startTime = Date.now();
    const cachedUrl = await avatarCache.getAvatarUrl(testFileIDs[0]);
    const endTime = Date.now();
    console.log('缓存命中测试完成，耗时:', endTime - startTime, 'ms');
    
    console.log('头像缓存管理器测试完成！');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 测试缓存清理功能
export function testCacheCleanup() {
  console.log('测试缓存清理功能...');
  
  try {
    // 清理缓存
    avatarCache.clearCache();
    
    // 验证清理结果
    const stats = avatarCache.getCacheStats();
    console.log('清理后缓存统计信息:', stats);
    
    if (stats.totalAvatars === 0) {
      console.log('✅ 缓存清理测试通过');
    } else {
      console.log('❌ 缓存清理测试失败');
    }
    
  } catch (error) {
    console.error('缓存清理测试失败:', error);
  }
}

// 性能测试
export async function testPerformance() {
  console.log('开始性能测试...');
  
  const testFileIDs = Array.from({ length: 50 }, (_, i) => 
    `cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/hero${i}.png`
  );
  
  try {
    // 测试批量获取性能
    const startTime = Date.now();
    const result = await avatarCache.getAvatarUrls(testFileIDs);
    const endTime = Date.now();
    
    console.log('性能测试结果:', {
      totalFileIDs: testFileIDs.length,
      successCount: Object.keys(result).length,
      totalTime: endTime - startTime,
      averageTime: (endTime - startTime) / testFileIDs.length
    });
    
  } catch (error) {
    console.error('性能测试失败:', error);
  }
}

// 导出测试函数
export default {
  testAvatarCache,
  testCacheCleanup,
  testPerformance
};
