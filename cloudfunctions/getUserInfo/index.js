// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = function(event, context) {
  var wxContext = cloud.getWXContext()
  
  try {
    // 获取用户信息
    var userInfo = {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      env: wxContext.ENV,
      createTime: new Date().toISOString()
    }
    
    // 获取数据库实例
    var db = cloud.database()
    
    try {
      // 检查用户是否已存在
      db.collection('users').where({
        openid: userInfo.openid
      }).get().then(function(userResult) {
        if (userResult.data.length === 0) {
          // 新用户，添加到数据库
          return db.collection('users').add({
            data: userInfo
          });
        } else {
          // 更新用户信息
          return db.collection('users').where({
            openid: userInfo.openid
          }).update({
            data: {
              updateTime: new Date().toISOString()
            }
          });
        }
      }).catch(function(dbError) {
        console.error('数据库操作失败:', dbError);
        // 数据库操作失败时，仍然返回用户信息
      });
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
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