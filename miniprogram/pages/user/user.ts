import { CloudService } from '../../utils/cloud'
import { getFavoritePlanIcon, getCreatePlanIcon } from '../../utils/iconManager'

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
    createPlanIcon: getCreatePlanIcon()
  },

  onLoad() {
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo() {
    var that = this;
    
    // 先尝试从本地存储获取用户信息
    const localUserInfo = wx.getStorageSync('userInfo');
    if (localUserInfo && localUserInfo.avatarUrl && localUserInfo.nickName) {
      that.setData({
        userInfo: localUserInfo,
        hasUserInfo: true
      });
      return;
    }
    
    // 如果没有本地信息，显示默认信息
    that.setData({
      userInfo: {
        avatarUrl: '../images/unused/default-avatar.png',
        nickName: '微信用户'
      },
      hasUserInfo: false
    });
  },

  // 获取微信用户信息（需要用户授权）
  getWechatUserInfo() {
    var that = this;
    
    // 检查是否在开发工具中
    const systemInfo = wx.getSystemInfoSync();
    console.log('当前环境:', systemInfo.platform);
    
    if (systemInfo.platform === 'devtools') {
      wx.showModal({
        title: '开发工具提示',
        content: '在开发工具中无法获取真实用户信息，请在真机上测试。当前显示默认头像。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    
    // 检查是否支持getUserProfile
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          console.log('获取用户信息成功:', res.userInfo);
          
          // 保存到本地存储
          wx.setStorageSync('userInfo', res.userInfo);
          
          // 更新页面数据
          that.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          });
          
          // 同步到云数据库
          that.syncUserInfoToCloud(res.userInfo);
          
          wx.showToast({
            title: '获取用户信息成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err);
          wx.showModal({
            title: '获取失败',
            content: '用户拒绝授权或获取失败，将显示默认头像。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    } else {
      // 兼容旧版本
      wx.getUserInfo({
        success: (res) => {
          console.log('获取用户信息成功:', res.userInfo);
          
          wx.setStorageSync('userInfo', res.userInfo);
          
          that.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          });
          
          that.syncUserInfoToCloud(res.userInfo);
          
          wx.showToast({
            title: '获取用户信息成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err);
          wx.showModal({
            title: '获取失败',
            content: '用户拒绝授权或获取失败，将显示默认头像。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    }
  },

  // 同步用户信息到云数据库
  syncUserInfoToCloud(userInfo: any) {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: {
        userInfo: userInfo,
        forceUpdate: true
      },
      success: (res) => {
        console.log('同步用户信息到云端成功:', res);
      },
      fail: (err) => {
        console.error('同步用户信息到云端失败:', err);
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