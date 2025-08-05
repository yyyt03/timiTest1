// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('=== 云函数接收到的数据 ===');
    console.log('完整event对象:', JSON.stringify(event, null, 2));
    
    const {
      heroId,
      heroName,
      title,
      description,
      cores, // Changed from coreSkill
      talents,
      equipment,
      equipmentText, // Changed from equipmentCode
      strategy,
      imageUrl
    } = event;

    console.log('解构后的字段:');
    console.log('heroId:', heroId);
    console.log('heroName:', heroName);
    console.log('title:', title);
    console.log('description:', description);
    console.log('cores:', cores);
    console.log('talents:', talents);
    console.log('equipment:', equipment);
    console.log('equipmentText:', equipmentText);
    console.log('strategy:', strategy);
    console.log('imageUrl:', imageUrl);
    console.log('=== 解构数据结束 ===');

    // 验证必填字段
    console.log('=== 开始验证必填字段 ===');
    console.log('heroId 验证:', !!heroId);
    console.log('heroName 验证:', !!heroName);
    console.log('title 验证:', !!title);
    console.log('cores 验证:', !!cores);
    console.log('talents 验证:', !!talents);
    console.log('equipment 验证:', !!equipment);
    console.log('strategy 验证:', !!strategy);
    
    if (!heroId || !heroName || !title || !cores || !talents || !equipment || !strategy) { // Updated validation
      console.log('=== 验证失败 ===');
      console.log('失败的字段:');
      if (!heroId) console.log('- heroId 为空');
      if (!heroName) console.log('- heroName 为空');
      if (!title) console.log('- title 为空');
      if (!cores) console.log('- cores 为空');
      if (!talents) console.log('- talents 为空');
      if (!equipment) console.log('- equipment 为空');
      if (!strategy) console.log('- strategy 为空');
      
      return {
        success: false,
        data: null,
        message: '必填字段不能为空'
      };
    }
    console.log('=== 验证通过 ===');
    
    const db = cloud.database();
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    // 获取用户信息
    const userResult = await db.collection('users')
      .where({
        openid: currentUserId
      })
      .get();
    
    const creatorName = userResult.data.length > 0 ? userResult.data[0].nickName || '匿名用户' : '匿名用户';
    
    // 创建方案数据
    const planData = {
      heroId,
      heroName,
      creatorId: currentUserId,
      creatorName,
      title,
      description: description || '',
      cores,
      talents,
      equipment,
      equipmentText: equipmentText || '',
      strategy,
      imageUrl: imageUrl || '',
      likes: 0,
      favorites: 0,
      views: 0,
      status: 'active',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
    
    // 保存到数据库
    const result = await db.collection('plans').add({
      data: planData
    });
    
    return {
      success: true,
      data: {
        planId: result._id,
        ...planData
      },
      message: '方案创建成功'
    };
    
  } catch (error) {
    console.error('创建方案失败:', error);
    return {
      success: false,
      data: null,
      message: '创建方案失败: ' + error.message
    };
  }
} 