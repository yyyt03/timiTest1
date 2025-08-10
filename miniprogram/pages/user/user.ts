import { getFavoritePlanIcon, getCreatePlanIcon, getMyPlanIcon } from '../../utils/iconManager'
import { getTempFileURLs } from '../../utils/cloud'

// 用户页面
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '微信用户'
    },
    hasUserInfo: true,
    // 图标路径
    favoritePlanIcon: getFavoritePlanIcon(),
    createPlanIcon: getCreatePlanIcon(),
    myPlanIcon: getMyPlanIcon(),
    // 用户方案数据
    userPlans: [],
    userPlansCount: 0,
    // 环境控制
    isDevelopment: false
  },

  async onLoad() {
    // 获取默认头像的临时URL
    const defaultAvatarUrl = await this.getDefaultAvatarUrl();
    
    // 设置默认用户信息
    this.setData({
      userInfo: {
        avatarUrl: defaultAvatarUrl,
        nickName: '微信用户'
      }
    });
    
    // 检测环境
    this.detectEnvironment();
    
    // 获取用户方案数据
    this.getUserPlans();
  },

  // 检测环境
  detectEnvironment() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const version = accountInfo.miniProgram?.version || '';
      const envVersion = accountInfo.miniProgram?.envVersion || '';
      
      // 仅开发版显示管理员入口；trial 视作 release
      const isDev = envVersion === 'develop';
      
      this.setData({
        isDevelopment: isDev
      });
      
      console.log('用户页面环境检测结果:', {
        version,
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



  // 跳转到方案审核（仅开发者可见入口）
  goToPlanReview() {
    wx.navigateTo({
      url: '../myPlans/myPlans?admin=1'
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
      url: '../heroCategory/heroCategory?source=createPlan'
    });
  },

  // 跳转到我的方案页面
  goToMyPlans() {
    wx.navigateTo({
      url: '../myPlans/myPlans'
    });
  },



  // 获取默认头像URL
  async getDefaultAvatarUrl(): Promise<string> {
    try {
      const cloudPath = 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/default-avatar.png';
      const tempURLs = await getTempFileURLs([cloudPath]);
      
      if (tempURLs[0] && tempURLs[0].indexOf('http') === 0) {
        return tempURLs[0];
      } else {
        // 如果获取失败，使用本地默认头像
        return '../../pages/images/unused/default-avatar.png';
      }
    } catch (error) {
      console.error('获取默认头像失败:', error);
      // 如果获取失败，使用本地默认头像
      return '../../pages/images/unused/default-avatar.png';
    }
  },

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '觉醒天赋推荐 - 个人中心',
      path: '/pages/user/user',
      imageUrl: '/pages/images/share-user.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '觉醒天赋推荐 - 个人中心',
      imageUrl: '/pages/images/share-user.png'
    };
  }
}); 