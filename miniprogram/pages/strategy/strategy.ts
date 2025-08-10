// 攻略页面
import { callFunction } from '../../utils/cloud';

Page({
  data: {
    userInfo: null,
    plans: [],
    loading: false,
    isDevelopment: false
  },

  onLoad() {
    // 确保云开发已初始化
    this.ensureCloudInitialized();
  },

  // 确保云开发已初始化
  async ensureCloudInitialized() {
    try {
      // 等待云开发初始化完成
      if (!wx.cloud || !wx.cloud.init) {
        console.error('云开发未初始化');
        return;
      }

      // 直接初始化云开发（如果还没有初始化）
      if (!(wx.cloud as any).inited) {
        wx.cloud.init({
          env: 'cloudbase-1gk9t6w2d1d090af',
          traceUser: true
        });
        (wx.cloud as any).inited = true;
        console.log('云开发初始化完成');
      }

      // 开始获取数据
      this.getUserInfo();
      this.getPlans();
      this.detectEnvironment();
    } catch (error) {
      console.error('云开发初始化检查失败:', error);
    }
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
  async getUserInfo() {
    try {
      const result = await callFunction('getUserInfo') as any;
      this.setData({
        userInfo: result.data
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 使用统一的错误处理
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    }
  },

  // 获取方案列表
  async getPlans() {
    this.setData({ loading: true });
    try {
      const result = await callFunction('getHeroPlans', {
        limit: 10,
        status: 'active'
      }) as any;
      this.setData({
        plans: result.data || [],
        loading: false
      });
    } catch (error) {
      console.error('获取方案列表失败:', error);
      this.setData({ loading: false });
      // 使用统一的错误处理
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: '获取方案列表失败',
          icon: 'none'
        });
      }
    }
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

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '觉醒天赋推荐 - 英雄攻略大全',
      path: '/pages/strategy/strategy',
      imageUrl: '/pages/images/share-strategy.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '觉醒天赋推荐 - 英雄攻略大全',
      imageUrl: '/pages/images/share-strategy.png'
    };
  }
}); 