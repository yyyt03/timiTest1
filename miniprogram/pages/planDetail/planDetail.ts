// 方案详情页面 - 优化头像获取
import { getHeroById, getHeroByName } from '../../data/localHeroData';

Page({
  data: {
    plan: {},
    loading: true,
    planId: ''
  },

  onLoad(options: any) {
    console.log('方案详情页面接收到的参数:', options);
    
    // 支持id和planId两种参数名
    const planId = options.id || options.planId;
    const forceRefresh = options.forceRefresh === 'true';
    
    if (planId) {
      this.setData({
        planId: planId
      });
      
      // 如果有传递收藏状态，先设置到本地数据
      if (options.isFavorited !== undefined) {
        this.setData({
          'plan.isFavorited': options.isFavorited === 'true'
        });
      }
      
      this.loadPlanDetail(planId, forceRefresh);
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
  async loadPlanDetail(planId: string, forceRefresh: boolean = false) {
    this.setData({ loading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlanDetail',
        data: { planId, forceRefresh }
      }) as any;
      
      if (result.result && result.result.success) {
        const plan = result.result.data;
        
        console.log('获取到的方案数据:', plan);
        
        // 先设置方案数据，避免页面空白
        // 保留传递过来的收藏状态，避免被服务器数据覆盖
        const currentIsFavorited = this.data.plan.isFavorited;
        this.setData({
          plan: {
            ...plan,
            isFavorited: currentIsFavorited !== undefined ? currentIsFavorited : plan.isFavorited
          },
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

  // 获取英雄头像 - 使用本地数据
  getHeroAvatar(heroName: string, heroId?: string) {
    try {
      let avatarUrl = null;
      
      // 优先使用heroId获取头像
      if (heroId) {
        console.log('使用heroId获取头像:', heroId);
        const hero = getHeroById(heroId);
        if (hero) {
          avatarUrl = hero.avatar;
        }
      }
      
      // 如果heroId没有找到，尝试通过英雄名称查找
      if (!avatarUrl && heroName) {
        console.log('通过英雄名称查找头像:', heroName);
        const hero = getHeroByName(heroName);
        if (hero) {
          avatarUrl = hero.avatar;
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
      path: `/pages/planDetail/planDetail?planId=${plan._id}`
    };
  }
}); 