// 攻略页面
import { CloudService } from '../../utils/cloud'

Page({
  data: {
    userInfo: null as any,
    plans: [] as any[],
    loading: false
  },

  // 生命周期函数--监听页面加载
  onLoad() {
    this.getUserInfo()
    this.getPlans()
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

  // 获取用户信息
  async getUserInfo() {
    try {
      const userInfo = await CloudService.callFunction('getUserInfo')
      this.setData({
        userInfo: userInfo
      })
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  // 获取方案列表
  async getPlans() {
    try {
      this.setData({ loading: true })
      const db = CloudService.getDatabase()
      const result = await db.collection('plans').get()
      this.setData({
        plans: result.data,
        loading: false
      })
    } catch (error) {
      console.error('获取方案列表失败:', error)
      this.setData({ loading: false })
    }
  },

  // 导航到方案创作页面
  navigateToCreate() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  }
}); 