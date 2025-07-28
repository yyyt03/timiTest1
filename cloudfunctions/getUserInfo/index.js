// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取用户信息
    const userInfo = {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      env: wxContext.ENV,
      createTime: new Date().toISOString()
    }
    
    // 获取数据库实例
    const db = cloud.database()
    
    try {
      // 检查用户是否已存在
      const userResult = await db.collection('users').where({
        openid: userInfo.openid
      }).get()
      
      if (userResult.data.length === 0) {
        // 新用户，添加到数据库
        await db.collection('users').add({
          data: userInfo
        })
      } else {
        // 更新用户信息
        await db.collection('users').where({
          openid: userInfo.openid
        }).update({
          data: {
            updateTime: new Date().toISOString()
          }
        })
      }
    } catch (dbError) {
      console.error('数据库操作失败:', dbError)
      // 数据库操作失败时，仍然返回用户信息
    }
    
    return {
      success: true,
      data: userInfo,
      message: '获取用户信息成功'
    }
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: error.message,
      message: '获取用户信息失败'
    }
  }
} 