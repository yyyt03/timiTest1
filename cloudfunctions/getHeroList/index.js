// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取数据库实例
    const db = cloud.database()
    
    // 获取所有英雄分类
    const categoriesResult = await db.collection('hero_categories').get()
    
    // 获取所有英雄数据
    const heroesResult = await db.collection('heroes').get()
    
    // 组织数据结构
    const heroCategories = {}
    
    // 按分类组织英雄数据
    categoriesResult.data.forEach(category => {
      const categoryHeroes = heroesResult.data.filter(hero => 
        hero.category === category.key
      )
      
      heroCategories[category.key] = {
        name: category.name,
        heroes: categoryHeroes.map(hero => ({
          id: hero._id,
          name: hero.name,
          avatar: hero.avatar, // 云端图片URL
          category: hero.category
        }))
      }
    })
    
    return {
      success: true,
      data: {
        categories: heroCategories,
        totalHeroes: heroesResult.data.length
      },
      message: '获取英雄列表成功'
    }
    
  } catch (error) {
    console.error('获取英雄列表失败:', error)
    return {
      success: false,
      error: error.message,
      message: '获取英雄列表失败'
    }
  }
} 