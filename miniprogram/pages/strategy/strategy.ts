// 攻略页面
Page({
  data: {
    // 页面数据
  },

  // 生命周期函数--监听页面加载
  onLoad() {
    // 页面加载时执行的逻辑
  },

  // 导航到推荐方案页面
  navigateToRecommend() {
    wx.navigateTo({
      url: '../recommendPlan/recommendPlan'
    });
  },

  // 导航到英雄分类页面
  navigateToHeroCategory() {
    wx.navigateTo({
      url: '../heroCategory/heroCategory?source=strategy'
    });
  },

  // 导航到体验服方案页面
  navigateToBeta() {
    wx.navigateTo({
      url: '../betaPlan/betaPlan'
    });
  },

  // 导航到方案创作页面
  navigateToCreate() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  }
}); 