// 方案详情页面 - 优化头像获取
import { heroCache } from '../../utils/heroCache';

Page({
  data: {
    plan: {},
    loading: true,
    planId: ''
  },

  onLoad(options: any) {
    console.log('方案详情页面接收到的参数:', options);
    
    if (options.id) {
      this.setData({
        planId: options.id
      });
      this.loadPlanDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载方案详情
  async loadPlanDetail(planId: string) {
    this.setData({ loading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlanDetail',
        data: { planId }
      }) as any;
      
      if (result.result && result.result.success) {
        const plan = result.result.data;
        
        console.log('获取到的方案数据:', plan);
        
        // 先设置方案数据，避免页面空白
        this.setData({
          plan: plan,
          loading: false
        });
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: plan.title || plan.heroName + '的方案'
        });
        
        // 异步获取英雄头像，不阻塞页面显示
        this.getHeroAvatar(plan.heroName, plan.heroId);
        
      } else {
        wx.showToast({
          title: '加载方案详情失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载方案详情失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 获取英雄头像 - 使用heroCache优化
  async getHeroAvatar(heroName: string, heroId?: string) {
    try {
      let avatarUrl = null;
      
      // 检查heroCache是否有数据，如果没有则初始化
      const cache = heroCache.getCache();
      if (!cache) {
        console.log('heroCache中没有数据，正在初始化...');
        await this.initHeroCache();
      }
      
      // 优先使用heroCache获取头像
      if (heroId) {
        console.log('使用heroCache获取头像:', heroId);
        avatarUrl = await heroCache.getAvatarUrl(heroId);
      }
      
      // 如果heroCache没有找到，尝试通过英雄名称查找
      if (!avatarUrl && heroName) {
        console.log('通过英雄名称查找头像:', heroName);
        const hero = await heroCache.getHeroByName(heroName);
        if (hero && hero.id) {
          avatarUrl = await heroCache.getAvatarUrl(hero.id);
        }
      }
      
      // 如果还是没有找到，使用默认头像
      if (!avatarUrl) {
        console.log('使用默认头像');
        avatarUrl = '../images/unused/default-avatar.png';
      }
      
      // 更新头像
      this.setData({
        'plan.heroAvatar': avatarUrl
      });
      
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      this.setData({
        'plan.heroAvatar': '../images/unused/default-avatar.png'
      });
    }
  },

  // 初始化heroCache
  async initHeroCache() {
    try {
      console.log('开始初始化heroCache...');
      
      // 调用云函数获取英雄数据
      const result = await wx.cloud.callFunction({
        name: 'getHeroList'
      }) as any;
      
      if (result.result && result.result.success && result.result.data) {
        // 深拷贝数据
        const categoriesData = JSON.parse(JSON.stringify(result.result.data.categories));
        
        // 批量获取所有英雄头像fileID
        let allHeroes: any[] = [];
        Object.values(categoriesData).forEach((cat: any) => {
          allHeroes = allHeroes.concat(cat.heroes);
        });
        
        let fileIDs = allHeroes.map((hero: any) => {
          return hero.avatar;
        }).filter((avatar: any) => {
          return avatar;
        });
        
        // 获取临时URL
        const tempURLs = await wx.cloud.getTempFileURL({
          fileList: fileIDs
        });
        
        // 构建头像URL映射
        const avatarURLs: { [key: string]: string } = {};
        let urlIdx = 0;
        
        Object.values(categoriesData).forEach((cat: any) => {
          cat.heroes.forEach((hero: any) => {
            if (hero.avatar) {
              if (tempURLs.fileList && tempURLs.fileList[urlIdx] && tempURLs.fileList[urlIdx].tempFileURL) {
                // 使用临时URL
                hero.avatar = tempURLs.fileList[urlIdx].tempFileURL;
                avatarURLs[hero.id] = tempURLs.fileList[urlIdx].tempFileURL;
              } else {
                // 临时URL获取失败，使用默认图片
                hero.avatar = '../images/unused/default-avatar.png';
                avatarURLs[hero.id] = '../images/unused/default-avatar.png';
              }
            }
            urlIdx++;
          });
        });
        
        // 缓存数据
        heroCache.setCache(result.result.data, avatarURLs);
        console.log('heroCache初始化完成');
        
      } else {
        console.error('获取英雄数据失败');
      }
    } catch (error) {
      console.error('初始化heroCache失败:', error);
    }
  },

  // 分享方案
  sharePlan() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // 切换收藏状态
  async toggleFavorite() {
    const plan = this.data.plan;
    const isFavorited = !plan.isFavorited;
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: {
          planId: plan._id,
          action: isFavorited ? 'add' : 'remove'
        }
      }) as any;
      
      if (result.result && result.result.success) {
        this.setData({
          'plan.isFavorited': isFavorited
        });
        
        wx.showToast({
          title: isFavorited ? '收藏成功' : '取消收藏',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 页面分享
  onShareAppMessage() {
    const plan = this.data.plan;
    return {
      title: `${plan.heroName} - ${plan.title}`,
      path: `/pages/planDetail/planDetail?id=${plan._id}`
    };
  }
}); 