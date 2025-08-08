import { getUserInfo } from '../../utils/cloud'
import { getFavoritePlanIcon, getCreatePlanIcon, getMyPlanIcon } from '../../utils/iconManager'
import { getTempFileURLs } from '../../utils/cloud'

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
    userPlansCount: 0,
    // 环境控制
    isDevelopment: false,
    // 用户状态
    isLoggedIn: false,
    loginStatus: '未登录' // 未登录、登录中、已登录、登录失败
  },

  async onLoad() {
    // 获取默认头像的临时URL
    const defaultAvatarUrl = await this.getDefaultAvatarUrl();
    
    // 页面加载时显示默认状态，用户需要主动点击获取信息
    this.setData({
      userInfo: {
        avatarUrl: defaultAvatarUrl,
        nickName: '微信用户'
      },
      hasUserInfo: false,
      isLoggedIn: false,
      loginStatus: '未登录'
    });
    
    // 检测环境
    this.detectEnvironment();
    
    // 尝试获取云开发用户信息
    this.tryGetCloudUserInfo();
    
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

  // 尝试获取云开发用户信息
  async tryGetCloudUserInfo() {
    try {
      this.setData({ loginStatus: '登录中' });
      
      // 获取微信云开发用户身份
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: { action: 'get' }
      });
      
      if (result && (result as any).success && (result as any).data) {
        // 有用户信息，设置登录状态，但确保有默认头像
        const defaultAvatarUrl = await this.getDefaultAvatarUrl();
        const userData = (result as any).data;
        const userInfo = {
          ...userData,
          avatarUrl: userData.avatarUrl || defaultAvatarUrl,
          nickName: userData.nickName || '微信用户'
        };
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          isLoggedIn: true,
          loginStatus: '已登录'
        });
        console.log('获取到云开发用户信息:', userInfo);
      } else {
        // 没有用户信息，保持未登录状态
        this.setData({
          loginStatus: '未登录'
        });
      }
    } catch (error) {
      console.error('获取云开发用户信息失败:', error);
      this.setData({
        loginStatus: '未登录'
      });
    }
  },

  // 获取用户信息（优化版本）
  async getUserInfo() {
    try {
      this.setData({ loginStatus: '登录中' });
      
      // 首先尝试获取微信云开发用户身份
      const { result } = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: { action: 'get' }
      });
      
      if (result && (result as any).success && (result as any).data) {
        // 已有用户信息，确保有默认头像
        const defaultAvatarUrl = await this.getDefaultAvatarUrl();
        const userData = (result as any).data;
        const userInfo = {
          ...userData,
          avatarUrl: userData.avatarUrl || defaultAvatarUrl,
          nickName: userData.nickName || '微信用户'
        };
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          isLoggedIn: true,
          loginStatus: '已登录'
        });
        
        // 登录成功后，不再弹出提示，仅在界面右侧按钮展示状态
        return;
      }
      
      // 检查是否在开发工具中
      const systemInfo = await wx.getSystemInfo();
      
      if (systemInfo.platform === 'devtools') {
        // 开发工具环境下的处理
        wx.showModal({
          title: '开发工具提示',
          content: '在开发工具中无法获取真实用户信息，但您可以继续使用应用功能。',
          showCancel: false,
          confirmText: '知道了',
                  success: async () => {
          // 在开发工具中提供模拟登录体验
          const defaultAvatarUrl = await this.getDefaultAvatarUrl();
          this.setData({
            userInfo: {
              avatarUrl: defaultAvatarUrl,
              nickName: '开发者用户'
            },
            hasUserInfo: true,
            isLoggedIn: true,
            loginStatus: '已登录(开发模式)'
          });
          // 开发模式下不再弹出多余的成功提示
        }
        });
      } else {
        // 真机环境，尝试调用getUserProfile
        try {
          const userProfile = await wx.getUserProfile({
            desc: '用于完善用户资料'
          });
          
          this.setData({
            userInfo: userProfile.userInfo,
            hasUserInfo: true,
            isLoggedIn: true,
            loginStatus: '已登录'
          });
          
          // 同步用户信息到云端
          await this.syncUserInfoToCloud(userProfile.userInfo);
          
          // 获取用户信息成功后不再弹出提示
        } catch (err) {
          console.error('获取用户信息失败:', err);
          
          // 即使获取用户信息失败，也提供基本的登录体验
          const defaultAvatarUrl = await this.getDefaultAvatarUrl();
          this.setData({
            userInfo: {
              avatarUrl: defaultAvatarUrl,
              nickName: '微信用户'
            },
            hasUserInfo: true,
            isLoggedIn: true,
            loginStatus: '已登录(基础模式)'
          });
          
          // 基础模式登录成功后不再弹出提示
        }
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      this.setData({
        loginStatus: '登录失败'
      });
      
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
  },

  // 跳转到方案审核（仅开发者可见入口）
  goToPlanReview() {
    wx.navigateTo({
      url: '../myPlans/myPlans?admin=1'
    });
  },

  // 同步用户信息到云端
  async syncUserInfoToCloud(userInfo: any) {
    try {
      await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: {
          action: 'update',
          userInfo: userInfo
        }
      });
      console.log('用户信息同步成功');
    } catch (err) {
      console.error('同步用户信息失败:', err);
    }
  },

  // 获取云开发用户信息
  getCloudUserInfo() {
    var that = this;
    getUserInfo().then(function(result: any) {
      that.setData({
        userInfo: result,
        hasUserInfo: true,
        isLoggedIn: true,
        loginStatus: '已登录'
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
  }
}); 