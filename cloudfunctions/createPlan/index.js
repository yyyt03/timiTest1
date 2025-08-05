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
      skillOne,
      skillTwo,
      skillThree,
      equipment,
      equipmentText,
      strategy,
      authorName,
      imageUrl
    } = event;

    console.log('解构后的字段:');
    console.log('heroId:', heroId);
    console.log('heroName:', heroName);
    console.log('title:', title);
    console.log('description:', description);
    console.log('skillOne:', skillOne);
    console.log('skillTwo:', skillTwo);
    console.log('skillThree:', skillThree);
    console.log('equipment:', equipment);
    console.log('equipmentText:', equipmentText);
    console.log('strategy:', strategy);
    console.log('authorName:', authorName);
    console.log('imageUrl:', imageUrl);
    console.log('=== 解构数据结束 ===');

    // 验证必填字段
    console.log('=== 开始验证必填字段 ===');
    console.log('heroId 验证:', !!heroId);
    console.log('heroName 验证:', !!heroName);
    console.log('title 验证:', !!title);
    console.log('skillOne 验证:', !!skillOne);
    console.log('skillTwo 验证:', !!skillTwo);
    console.log('skillThree 验证:', !!skillThree);
    console.log('equipment 验证:', !!equipment);
    console.log('strategy 验证:', !!strategy);
    console.log('authorName 验证:', !!authorName);
    
    if (!heroId || !heroName || !title || !skillOne || !skillTwo || !skillThree || !equipment || !strategy || !authorName) {
      console.log('=== 验证失败 ===');
      console.log('失败的字段:');
      if (!heroId) console.log('- heroId 为空');
      if (!heroName) console.log('- heroName 为空');
      if (!title) console.log('- title 为空');
      if (!skillOne) console.log('- skillOne 为空');
      if (!skillTwo) console.log('- skillTwo 为空');
      if (!skillThree) console.log('- skillThree 为空');
      if (!equipment) console.log('- equipment 为空');
      if (!strategy) console.log('- strategy 为空');
      if (!authorName) console.log('- authorName 为空');
      
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
    
    // 创建方案数据
    const planData = {
      heroId,
      heroName,
      creatorId: currentUserId,
      creatorName: authorName, // 使用用户输入的作者名称
      title,
      description: description || '',
      skillOne,
      skillTwo,
      skillThree,
      equipment,
      equipmentText: equipmentText || '',
      strategy,
      authorName: authorName, // 保存作者名称
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