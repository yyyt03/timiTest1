// 用户页面
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    }
  },

  // 生命周期函数--监听页面加载
  onLoad() {
    this.getUserProfile();
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
        console.log('获取用户信息失败');
      }
    });
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