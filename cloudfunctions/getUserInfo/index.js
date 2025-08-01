// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
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
    
    // 如果传入了用户信息，则合并
    if (event.userInfo) {
      userInfo = {
        ...userInfo,
        avatarUrl: event.userInfo.avatarUrl,
        nickName: event.userInfo.nickName,
        gender: event.userInfo.gender,
        country: event.userInfo.country,
        province: event.userInfo.province,
        city: event.userInfo.city,
        language: event.userInfo.language
      }
    }
    
    // 获取数据库实例
    var db = cloud.database()
    
    // 检查是否需要更新用户信息
    const { forceUpdate = false } = event;
    
    if (!forceUpdate) {
      // 先尝试获取现有用户信息，避免不必要的更新
      try {
        const userResult = await db.collection('users').where({
          openid: userInfo.openid
        }).field({
          openid: true,
          updateTime: true
        }).get();
        
        if (userResult.data.length > 0) {
          const lastUpdate = new Date(userResult.data[0].updateTime);
          const now = new Date();
          const timeDiff = now - lastUpdate;
          
          // 如果距离上次更新不到1小时，直接返回现有信息
          if (timeDiff < 60 * 60 * 1000) {
            console.log('用户信息较新，跳过更新');
            return {
              success: true,
              data: userResult.data[0],
              message: '获取用户信息成功（缓存）',
              fromCache: true
            };
          }
        }
      } catch (queryError) {
        console.log('查询用户信息失败，继续创建/更新:', queryError);
      }
    }
    
    // 需要创建或更新用户信息
    try {
      // 使用upsert操作，减少数据库查询次数
      await db.collection('users').where({
        openid: userInfo.openid
      }).update({
        data: {
          ...userInfo,
          updateTime: new Date().toISOString()
        }
      });
      
      // 如果更新失败（用户不存在），则创建新用户
      const updateResult = await db.collection('users').where({
        openid: userInfo.openid
      }).get();
      
      if (updateResult.data.length === 0) {
        await db.collection('users').add({
          data: {
            ...userInfo,
            updateTime: new Date().toISOString()
          }
        });
      }
      
      console.log('用户信息更新成功');
      
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      // 数据库操作失败时，仍然返回用户信息
    }
    
    return {
      success: true,
      data: userInfo,
      message: '获取用户信息成功',
      fromCache: false
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