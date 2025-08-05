const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取英雄技能数据
 * @param {Object} event - 事件参数
 * @param {string} event.heroId - 英雄ID
 */
exports.main = async (event, context) => {
  const { heroId } = event;

  try {
    if (!heroId) {
      return {
        success: false,
        error: '英雄ID不能为空',
        errorCode: 'MISSING_HERO_ID'
      };
    }

    // 查询英雄技能数据
    const result = await db.collection('hero_skills')
      .where({
        heroId: heroId
      })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        error: '未找到该英雄的技能数据',
        errorCode: 'HERO_NOT_FOUND'
      };
    }

    // 获取英雄技能数据
    const heroSkillsData = result.data[0];
    
    // 直接返回技能数据结构
    const skillsData = {
      heroId: heroSkillsData.heroId,
      heroName: heroSkillsData.heroName,
      skills: heroSkillsData.skills
    };

    return {
      success: true,
      data: skillsData
    };

  } catch (error) {
    console.error('获取英雄技能数据失败:', error);
    return {
      success: false,
      error: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}; 