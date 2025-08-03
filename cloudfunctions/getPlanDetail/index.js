// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('getPlanDetail云函数被调用', event);
  
  try {
    const db = cloud.database();
    const { planId } = event;
    
    if (!planId) {
      return {
        success: false,
        data: null,
        message: '方案ID不能为空'
      };
    }
    
    // 获取当前用户信息
    const wxContext = cloud.getWXContext();
    const currentUserId = wxContext.OPENID;
    
    // 获取方案详情
    let plan;
    
    // 如果是测试数据，直接返回
    if (planId === 'plan_001') {
      plan = {
        "_id": "plan_001",
        "heroId": "mingshiyin",
        "heroName": "飞天流小明",
        "creatorId": "user_001",
        "creatorName": "诸神",
        "title": "飞天流小明 - 主二副三流",
        "description": "主二副三,12级的时候能完全体,前期很牢,后期很强。",
        "skillOne": {
          "core": {
            "name": "临·无穷逆转",
            "tag": "特性",
            "description": "向指定方向位移,在落点处自动连接3名队友"
          },
          "talents": [
            {
              "name": "卦愈",
              "tag": "特性",
              "description": "释放一技能时,附近敌人将被抽取血球"
            },
            {
              "name": "灵盾",
              "tag": "生存",
              "description": "连接队友后,队友和自身均受护盾加持"
            },
            {
              "name": "临·神谕",
              "tag": "特性",
              "description": "向被连接的队友持续供给血球"
            }
          ]
        },
        "skillTwo": {
          "core": {
            "name": "师·无穷逆转",
            "tag": "特性",
            "description": "向指定方向位移,在落点处会自动连接3名敌人"
          },
          "talents": [
            {
              "name": "灵视",
              "tag": "特性",
              "description": "减少双抗的效果翻倍,且自身双抗+100点"
            },
            {
              "name": "师·神谕",
              "tag": "特性",
              "description": "连接敌人后,向目标持续汲取血球"
            },
            {
              "name": "坤护",
              "tag": "生存",
              "description": "连接后,自身获得2秒霸体,若连线断开则提前结束"
            }
          ]
        },
        "skillThree": {
          "core": {
            "name": "命运锁链",
            "tag": "特性",
            "description": "大招解除禁用,施法时短暂浮空,自动连接并控制周围最多3名敌人"
          },
          "talents": [
            {
              "name": "天命",
              "tag": "特性",
              "description": "额外放出3个大招(20%效果)"
            },
            {
              "name": "星运",
              "tag": "特性",
              "description": "完整效果的大招命中时,减少大招5秒冷却"
            },
            {
              "name": "玄击",
              "tag": "伤害",
              "description": "伤害和回复效果+30%"
            }
          ]
        },
        "equipment": [
          {
            "name": "疾步之靴",
            "icon": "boots"
          },
          {
            "name": "圣杯",
            "icon": "chalice"
          },
          {
            "name": "贤者之书",
            "icon": "book"
          },
          {
            "name": "魔法水晶",
            "icon": "crystal"
          },
          {
            "name": "蛇杖",
            "icon": "staff"
          },
          {
            "name": "贤者的庇护",
            "icon": "shield"
          }
        ],
        "summonerSkill": {
          "name": "闪现",
          "icon": "flash"
        },
        "likeCount": 25,
        "favoriteCount": 12,
        "views": 156,
        "status": "active",
        "createTime": "2025-01-27T17:30:00.000Z",
        "updateTime": "2025-01-27T17:30:00.000Z"
      };
    } else {
      // 从数据库获取方案详情
      const planResult = await db.collection('plans')
        .doc(planId)
        .get();
      
      if (!planResult.data) {
        return {
          success: false,
          data: null,
          message: '方案不存在'
        };
      }
      
      plan = planResult.data;
    }
    
    // 并行查询用户的收藏和点赞状态
    const [favoriteResult, likeResult] = await Promise.all([
      db.collection('favorites')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .count(),
      db.collection('likes')
        .where({
          userId: currentUserId,
          planId: planId
        })
        .count()
    ]);
    
    // 并行查询方案的收藏和点赞总数
    const [favoriteCountResult, likeCountResult] = await Promise.all([
      db.collection('favorites')
        .where({
          planId: planId
        })
        .count(),
      db.collection('likes')
        .where({
          planId: planId
        })
        .count()
    ]);
    
    // 构建返回数据
    const planDetail = {
      ...plan,
      isFavorited: favoriteResult.total > 0,
      isLiked: likeResult.total > 0,
      favoriteCount: favoriteCountResult.total,
      likeCount: likeCountResult.total
    };
    
    return {
      success: true,
      data: planDetail,
      message: '获取方案详情成功'
    };
    
  } catch (error) {
    console.error('获取方案详情失败:', error);
    return {
      success: false,
      data: null,
      message: '获取方案详情失败: ' + error.message
    };
  }
} 