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
    },
    // 环境控制
    isDevelopment: false
  },

  onLoad() {
    this.getUserInfo();
    this.getPlans();
    // 检测环境
    this.detectEnvironment();
  },

  // 检测环境
  detectEnvironment() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const version = accountInfo.miniProgram?.version || '';
      const envVersion = accountInfo.miniProgram?.envVersion || '';
      
      // 开发环境判断逻辑 - 只在develop环境下显示创作功能
      const isDev = envVersion === 'develop';
      
      this.setData({
        isDevelopment: isDev
      });
      
      console.log('攻略页面环境检测结果:', {
        version,
        envVersion,
        isDevelopment: isDev
      });
    } catch (error) {
      console.error('环境检测失败:', error);
      // 如果检测失败，默认设置为非开发环境
      this.setData({
        isDevelopment: false
      });
    }
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