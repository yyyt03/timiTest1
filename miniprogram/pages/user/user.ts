import { getUserInfo } from '../../utils/cloud'
import { getFavoritePlanIcon, getCreatePlanIcon, getMyPlanIcon } from '../../utils/iconManager'

// 用户页面
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    hasUserInfo: false,
    // 图标路径
    favoritePlanIcon: getFavoritePlanIcon(),
    createPlanIcon: getCreatePlanIcon(),
    myPlanIcon: getMyPlanIcon(),
    // 用户方案数据
    userPlans: [],
    userPlansCount: 0
  },

  onLoad() {
    // 页面加载时显示默认状态，用户需要主动点击获取信息
    this.setData({
      userInfo: {
        avatarUrl: '',
        nickName: '微信用户'
      },
      hasUserInfo: false
    });
    
    // 获取用户方案数据
    this.getUserPlans();
  },

  // 获取用户信息
  getUserInfo() {
    // 检查是否在开发工具中
    (wx as any).getSystemInfo({
      success: (systemInfo: any) => {
        if (systemInfo.platform === 'devtools') {
          // 开发工具环境下的处理
          wx.showModal({
            title: '开发工具提示',
            content: '在开发工具中无法获取真实用户信息，请在真机上测试。',
            showCancel: false,
            confirmText: '知道了'
          });
        } else {
          // 真机环境，调用getUserProfile
          wx.getUserProfile({
            desc: '用于完善用户资料',
            success: (res) => {
              this.setData({
                userInfo: res.userInfo,
                hasUserInfo: true
              });
              
              // 同步用户信息到云端
              this.syncUserInfoToCloud(res.userInfo);
              
              wx.showToast({
                title: '获取用户信息成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('获取用户信息失败:', err);
              wx.showToast({
                title: '获取用户信息失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 同步用户信息到云端
  syncUserInfoToCloud(userInfo: any) {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: {
        action: 'update',
        userInfo: userInfo
      },
      success: (_res) => {
        // 用户信息同步成功
      },
      fail: (err) => {
        console.error('同步用户信息失败:', err);
      }
    });
  },

  // 获取云开发用户信息
  getCloudUserInfo() {
    var that = this;
    getUserInfo().then(function(result: any) {
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

  // 获取用户方案数据
  getUserPlans() {
    wx.cloud.callFunction({
      name: 'getUserPlans',
      data: {
        page: 1,
        pageSize: 20
      },
      success: (res: any) => {
        if (res.result.success) {
          this.setData({
            userPlans: res.result.data.plans,
            userPlansCount: res.result.data.total
          });
        }
      },
      fail: (err) => {
        console.error('获取用户方案失败:', err);
      }
    });
  },

  // 跳转到创作方案页面
  goToCreatePlan() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  },

  // 跳转到我的方案页面
  goToMyPlans() {
    wx.navigateTo({
      url: '../myPlans/myPlans'
    });
  }
}); 