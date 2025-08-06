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
      success: (res: any) => {
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
      success: (res: any) => {
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
      url: '/pages/heroCategory/heroCategory?source=createPlan'
    });
  }
}); 