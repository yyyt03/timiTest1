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
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: function(res) {
        that.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      },
      fail: function() {
        console.log('获取用户信息失败');
      }
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