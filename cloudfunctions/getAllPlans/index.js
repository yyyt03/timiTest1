// 云函数：获取全部方案（管理员/开发环境）
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
});

exports.main = async function(event, context) {
  console.log('getAllPlans云函数被调用', event);

  try {
    const db = cloud.database();
    const { page = 1, pageSize = 20, status = 'all', heroId = null } = event;

    // 注意：该接口不再做环境限制，前端入口已限制，仅管理员路径使用

    // 计算偏移量
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const whereCondition = {};
    if (status && status !== 'all') {
      whereCondition.status = status;
    }
    if (heroId && heroId !== 'all') {
      whereCondition.heroId = heroId;
    }

    // 并行查询列表与总数
    const [plansResult, countResult] = await Promise.all([
      db.collection('plans')
        .where(whereCondition)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get(),
      db.collection('plans')
        .where(whereCondition)
        .count()
    ]);

    const plans = plansResult.data || [];
    const planIds = plans.map(p => p._id);

    // 点赞/收藏统计
    let likeCountMap = {}; let favoriteCountMap = {};
    if (planIds.length > 0) {
      const _ = db.command;
      const [likeCounts, favoriteCounts] = await Promise.all([
        db.collection('likes').where({ planId: _.in(planIds) }).field({ planId: true }).get(),
        db.collection('favorites').where({ planId: _.in(planIds) }).field({ planId: true }).get()
      ]);
      likeCounts.data.forEach(l => { likeCountMap[l.planId] = (likeCountMap[l.planId] || 0) + 1; });
      favoriteCounts.data.forEach(f => { favoriteCountMap[f.planId] = (favoriteCountMap[f.planId] || 0) + 1; });
    }

    const enriched = plans.map(p => ({
      ...p,
      likeCount: likeCountMap[p._id] || 0,
      favoriteCount: favoriteCountMap[p._id] || 0
    }));

    return {
      success: true,
      data: {
        plans: enriched,
        total: countResult.total,
        page,
        pageSize,
        hasMore: skip + plans.length < countResult.total
      },
      message: '获取全部方案成功'
    };
  } catch (error) {
    console.error('获取全部方案失败:', error);
    return {
      success: false,
      data: null,
      message: '获取全部方案失败: ' + error.message
    };
  }
};

