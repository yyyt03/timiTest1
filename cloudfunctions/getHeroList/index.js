// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getHeroList云函数被调用');
  
  try {
    const db = cloud.database();
    
    // 检查是否有缓存参数，避免重复查询
    const { useCache = true } = event;
    
    // 如果使用缓存，先检查是否有最近的数据
    if (useCache) {
      const cacheResult = await db.collection('heroes_cache').where({
        type: 'hero_list',
        updateTime: db.command.gte(new Date(Date.now() - 5 * 60 * 1000)) // 5分钟内的缓存
      }).limit(1).get();
      
      if (cacheResult.data.length > 0) {
        console.log('使用缓存的英雄数据');
        return {
          success: true,
          data: cacheResult.data[0].data,
          message: '获取英雄列表成功（缓存）',
          fromCache: true
        };
      }
    }
    
    // 从heroes集合中读取所有英雄数据，只选择必要字段
    const heroesResult = await db.collection('heroes')
      .field({
        _id: true,
        name: true,
        avatar: true,
        category: true
      })
      .get();
    
    // 分类映射
    const categoryMap = {
      'shooter': '射手',
      'support': '辅助', 
      'assassin': '刺客',
      'warrior': '战士',
      'mage': '法师'
    };
    
    // 按分类组织数据
    const categories = {};
    let totalHeroes = 0;
    
    heroesResult.data.forEach((hero) => {
      const chineseCategory = categoryMap[hero.category] || hero.category;
      
      if (!categories[chineseCategory]) {
        categories[chineseCategory] = {
          name: chineseCategory,
          heroes: []
        };
      }
      
      categories[chineseCategory].heroes.push({
        id: hero._id,
        name: hero.name,
        avatar: hero.avatar,
        category: chineseCategory
      });
      
      totalHeroes++;
    });
    
    const resultData = {
      categories: categories,
      totalHeroes: totalHeroes
    };
    
    // 更新缓存
    try {
      await db.collection('heroes_cache').where({
        type: 'hero_list'
      }).remove();
      
      await db.collection('heroes_cache').add({
        data: {
          type: 'hero_list',
          data: resultData,
          updateTime: new Date()
        }
      });
    } catch (cacheError) {
      console.log('缓存更新失败，但不影响主功能:', cacheError);
    }
    
    const result = {
      success: true,
      data: resultData,
      message: '获取英雄列表成功',
      fromCache: false
    };
    
    return result;
    
  } catch (error) {
    console.error('获取英雄列表失败:', error);
    return {
      success: false,
      data: null,
      message: '获取英雄列表失败: ' + error.message
    };
  }
} 