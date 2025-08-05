import { getRecommendPlanIcon, getHeroCategoryIcon, getBetaPlanIcon, getCreatePlanIcon, getFavoritePlanIcon } from '../../utils/iconManager';

// pages/strategy/strategy.ts
Page({
  data: {
    userInfo: null as any,
    plans: [] as any[],
    loading: false,
    iconUrls: {
      recommendPlan: getRecommendPlanIcon(),
      heroCategory: getHeroCategoryIcon(),
      betaPlan: getBetaPlanIcon(),
      createPlan: getCreatePlanIcon(),
      favoritePlan: getFavoritePlanIcon()
    }
  },

  onLoad() {
    this.getUserInfo();
    this.getPlans();
  },

  // 获取用户信息
  getUserInfo() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: (res) => {
        this.setData({
          userInfo: res.result.data
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
      }
    });
  },

  // 获取方案列表
  getPlans() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'getHeroPlans',
      data: {
        limit: 10,
        status: 'active'
      },
      success: (res) => {
        this.setData({
          plans: res.result.data || [],
          loading: false
        });
      },
      fail: (err) => {
        console.error('获取方案列表失败:', err);
        this.setData({ loading: false });
      }
    });
  },

  // 页面跳转函数
  goToRecommendPlan() {
    wx.navigateTo({
      url: '/pages/recommendPlan/recommendPlan'
    });
  },

  goToHeroCategory() {
    wx.navigateTo({
      url: '/pages/heroCategory/heroCategory'
    });
  },

  goToBetaPlan() {
    wx.navigateTo({
      url: '/pages/betaPlan/betaPlan'
    });
  },

  goToCreatePlan() {
    wx.navigateTo({
      url: '/pages/createPlan/createPlan'
    });
  },

  // 测试生成一图流功能
  testGenerateImage() {
    // 模拟数据
    const mockPlanData = {
      heroName: '妲己',
      heroId: 'daji',
      title: '爆发流妲己',
      skillOne: {
        core: {
          name: '灵魂冲击',
          description: '妲己释放灵魂冲击，对敌人造成法术伤害',
          tag: '核心技能'
        },
        talents: [
          {
            name: '灵魂汲取',
            description: '技能命中敌人时回复生命值',
            tag: '生存'
          },
          {
            name: '灵魂强化',
            description: '技能伤害提升20%',
            tag: '输出'
          }
        ]
      },
      skillTwo: {
        core: {
          name: '偶像魅力',
          description: '妲己释放魅力，对敌人造成伤害并减速',
          tag: '控制技能'
        },
        talents: [
          {
            name: '魅力增强',
            description: '减速效果提升至50%',
            tag: '控制'
          },
          {
            name: '魅力扩散',
            description: '技能范围扩大30%',
            tag: '范围'
          }
        ]
      },
      skillThree: {
        core: {
          name: '女王崇拜',
          description: '妲己释放终极技能，对范围内敌人造成大量伤害',
          tag: '终极技能'
        },
        talents: [
          {
            name: '女王威严',
            description: '技能伤害提升30%',
            tag: '输出'
          },
          {
            name: '女王庇护',
            description: '技能释放时获得护盾',
            tag: '生存'
          }
        ]
      },
      equipment: [
        {
          name: '博学者之怒',
          imageUrl: 'https://game.gtimg.cn/images/yxzj/img201606/itemimg/1421.jpg'
        },
        {
          name: '痛苦面具',
          imageUrl: 'https://game.gtimg.cn/images/yxzj/img201606/itemimg/1422.jpg'
        },
        {
          name: '虚无法杖',
          imageUrl: 'https://game.gtimg.cn/images/yxzj/img201606/itemimg/1423.jpg'
        },
        {
          name: '贤者之书',
          imageUrl: 'https://game.gtimg.cn/images/yxzj/img201606/itemimg/1424.jpg'
        },
        {
          name: '回响之杖',
          imageUrl: 'https://game.gtimg.cn/images/yxzj/img201606/itemimg/1425.jpg'
        },
        {
          name: '冷静之靴',
          imageUrl: 'https://game.gtimg.cn/images/yxzj/img201606/itemimg/1426.jpg'
        }
      ],
      strategy: '妲己是一个高爆发的法师英雄，前期利用一技能清兵发育，中期配合二技能进行游走支援，后期利用三技能在团战中打出爆炸伤害。出装以法术强度为主，配合冷却缩减提升技能释放频率。'
    };

    // 跳转到生成一图流页面
    wx.navigateTo({
      url: `../generateImage/generateImage?planData=${encodeURIComponent(JSON.stringify(mockPlanData))}`
    });
  }
}); 