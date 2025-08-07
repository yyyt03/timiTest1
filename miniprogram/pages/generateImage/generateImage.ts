// 生成一图流页面 - 优化头像获取
import { getHeroByName, getHeroById } from '../../data/localHeroData';

Page({
  data: {
    heroName: '',
    heroImageUrl: '',
    title: '',
    authorName: '',
    skillOne: null,
    skillTwo: null,
    skillThree: null,
    equipment: [],
    strategy: ''
  },

  async onLoad(options: any) {
    console.log('生成一图流页面接收到的参数:', options);
    
    // 从页面参数中获取数据
    if (options.planData) {
      try {
        const planData = JSON.parse(decodeURIComponent(options.planData));
        
        // 先设置基本数据，避免页面空白
        this.setData({
          heroName: planData.heroName || '',
          title: planData.title || '',
          authorName: planData.authorName || '',
          skillOne: planData.skillOne || null,
          skillTwo: planData.skillTwo || null,
          skillThree: planData.skillThree || null,
          equipment: planData.equipment || [],
          strategy: planData.strategy || ''
        });
        
        // 异步获取英雄头像，不阻塞页面显示
        this.getHeroAvatar(planData.heroName, planData.heroId);
      } catch (error) {
        console.error('解析方案数据失败:', error);
        wx.showToast({
          title: '数据解析失败',
          icon: 'error'
        });
      }
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
        heroImageUrl: avatarUrl
      });
      
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      this.setData({
        heroImageUrl: '../images/unused/default-avatar.png'
      });
    }
  },

  // 返回编辑
  goBack() {
    wx.navigateBack();
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: `${this.data.heroName} - ${this.data.title}`,
      path: '/pages/generateImage/generateImage',
      imageUrl: this.data.heroImageUrl
    };
  },

  onShareTimeline() {
    return {
      title: `${this.data.heroName} - ${this.data.title}`,
      imageUrl: this.data.heroImageUrl
    };
  }
}); 