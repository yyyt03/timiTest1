// 生成一图流页面 - 优化头像获取
import { heroCache } from '../../utils/heroCache';

Page({
  data: {
    heroName: '',
    heroImageUrl: '',
    title: '',
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
        heroImageUrl: avatarUrl
      });
      
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      this.setData({
        heroImageUrl: '../images/unused/default-avatar.png'
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