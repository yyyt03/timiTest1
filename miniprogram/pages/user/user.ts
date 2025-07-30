// 用户页面
import { CloudService } from '../../utils/cloud'

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    hasUserInfo: false
  },

  onLoad() {
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo() {
    var that = this;
    // 使用云函数获取用户信息，避免wx.getUserProfile的废弃问题
    CloudService.callFunction('getUserInfo').then(function(result: any) {
      if (result && result.success) {
        that.setData({
          userInfo: {
            avatarUrl: '../images/unused/user.png', // 默认头像
            nickName: '微信用户'
          },
          hasUserInfo: true
        });
      } else {
        console.log('获取用户信息失败');
      }
    }).catch(function(error) {
      console.error('获取用户信息失败:', error);
    });
  },

  // 获取云开发用户信息
  getCloudUserInfo() {
    var that = this;
    CloudService.getUserInfo().then(function(result: any) {
      that.setData({
        userInfo: result,
        hasUserInfo: true
      });
    }).catch(function(error) {
      console.error('获取云开发用户信息失败:', error);
    });
  },

  // 跳转到收藏方案页面
  goToFavorites() {
    wx.navigateTo({
      url: '../favorites/favorites'
    });
  },

  // 跳转到创作方案页面
  goToCreatePlan() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  }
}); 