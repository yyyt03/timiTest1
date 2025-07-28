import { CloudService } from '../../utils/cloud'

// 用户页面
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    cloudUserInfo: null
  },

  // 生命周期函数--监听页面加载
  onLoad() {
    this.getUserProfile();
    this.getCloudUserInfo();
  },

  // 获取用户信息
  getUserProfile() {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    // 开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        });
      },
      fail: () => {
        // 用户拒绝授权，使用默认头像和昵称
        console.log('用户拒绝授权获取头像昵称，使用默认信息');
      }
    });
  },

  // 获取云开发用户信息
  async getCloudUserInfo() {
    try {
      wx.showLoading({
        title: '获取用户信息中...'
      });
      
      const result: any = await CloudService.getUserInfo();
      
      if (result && result.success) {
        this.setData({
          cloudUserInfo: result.data
        });
        console.log('云开发用户信息:', result.data);
      } else {
        console.error('获取云开发用户信息失败:', result?.message || '未知错误');
      }
    } catch (error) {
      console.error('调用云函数失败:', error);
      // 不显示错误提示，因为云函数调用失败不影响基本功能
    } finally {
      wx.hideLoading();
    }
  },

  // 导航到收藏方案页面
  navigateToFavorites() {
    wx.showToast({
      title: '收藏方案功能开发中',
      icon: 'none'
    });
  },

  // 导航到创作方案页面
  navigateToCreations() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  }
}); 