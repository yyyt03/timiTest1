// 攻略页面
import { CloudService } from '../../utils/cloud'

Page({
  data: {
    userInfo: null as any,
    plans: [] as any[],
    loading: false
  },

  onLoad() {
    this.getUserInfo();
    this.getPlans();
  },

  // 获取用户信息
  getUserInfo() {
    var that = this;
    CloudService.callFunction('getUserInfo').then(function(userInfo: any) {
      that.setData({
        userInfo: userInfo
      });
    }).catch(function(error) {
      console.error('获取用户信息失败:', error);
    });
  },

  // 获取方案列表
  getPlans() {
    var that = this;
    this.setData({ loading: true });
    
    var db = CloudService.getDatabase();
    // 只获取活跃状态的方案，避免全量查询
    db.collection('plans').where({
      status: 'active'
    }).limit(10).get().then(function(result: any) {
      that.setData({
        plans: result.data,
        loading: false
      });
    }).catch(function(error) {
      console.error('获取方案列表失败:', error);
      that.setData({ loading: false });
    });
  },

  // 跳转到推荐方案页面
  goToRecommendPlan() {
    wx.navigateTo({
      url: '../recommendPlan/recommendPlan'
    });
  },

  // 跳转到英雄分类页面
  goToHeroCategory() {
    wx.navigateTo({
      url: '../heroCategory/heroCategory'
    });
  },

  // 跳转到体验服方案页面
  goToBetaPlan() {
    wx.navigateTo({
      url: '../betaPlan/betaPlan'
    });
  },

  // 跳转到方案创作页面
  goToCreatePlan() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  }
}); 