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
    
    // 从heroes集合中读取所有英雄数据
    const heroesResult = await db.collection('heroes').get();
    
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
    
    heroesResult.data.forEach((hero, index) => {
      const chineseCategory = categoryMap[hero.category] || hero.category;
      
      if (!categories[chineseCategory]) {
        categories[chineseCategory] = {
          name: chineseCategory,
          heroes: []
        };
      }
      
      categories[chineseCategory].heroes.push({
        id: hero._id, // 使用heroes集合的_id作为heroId
        name: hero.name,
        avatar: hero.avatar, // 这里包含云存储的fileID
        category: chineseCategory
      });
      
      totalHeroes++;
    });
    
    const result = {
      success: true,
      data: {
        categories: categories,
        totalHeroes: totalHeroes
      },
      message: '获取英雄列表成功'
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