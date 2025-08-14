// 攻略页面

Page({
  data: {
    isDevelopment: false
  },

  onLoad() {
    this.detectEnvironment();
  },

  // 检测环境
  detectEnvironment() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const envVersion = accountInfo.miniProgram?.envVersion || '';
      
      // 开发环境判断逻辑 - 只在develop环境下显示创作功能
      const isDev = envVersion === 'develop';
      
      this.setData({
        isDevelopment: isDev
      });
      
      console.log('攻略页面环境检测结果:', {
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