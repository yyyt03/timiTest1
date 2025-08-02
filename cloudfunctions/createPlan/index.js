// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('createPlan云函数被调用', event);
  
  try {
    const db = cloud.database();
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    const {
      heroId,
      heroName,
      title,
      description,
      coreSkill,
      talents,
      equipment,
      equipmentCode,
      strategy,
      imageUrl
    } = event;
    
    // 验证必填字段
    if (!heroId || !heroName || !title || !coreSkill || !talents || !equipment || !strategy) {
      return {
        success: false,
        data: null,
        message: '必填字段不能为空'
      };
    }
    
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
      coreSkill,
      talents: Array.isArray(talents) ? talents : [talents],
      equipment,
      equipmentCode: equipmentCode || '',
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