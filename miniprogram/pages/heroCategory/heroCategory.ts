// 英雄分类页面
import { CloudService } from '../../utils/cloud'

Page({
  data: {
    heroCategories: {},
    loading: true,
    source: '' // 来源页面
  },

  // 生命周期函数--监听页面加载
  onLoad(options: any) {
    if (options && options.source) {
      this.setData({
        source: options.source
      });
    }
    this.getHeroList();
  },

  // 获取英雄列表
  async getHeroList() {
    try {
      this.setData({ loading: true });
      
      const result: any = await CloudService.callFunction('getHeroList');
      
      if (result && result.success) {
        // 批量获取所有英雄头像fileID
        const allHeroes = Object.values(result.data.categories).flatMap((cat: any) => cat.heroes);
        const fileIDs = allHeroes.map((hero: any) => hero.avatar).filter(Boolean);
        
        console.log('需要获取临时URL的fileIDs:', fileIDs);
        
        let tempURLs: string[] = [];
        try {
          tempURLs = await CloudService.getTempFileURLs(fileIDs);
          console.log('获取到的临时URLs:', tempURLs);
        } catch (tempURLError) {
          console.error('获取临时URL失败:', tempURLError);
          // 如果获取临时URL失败，使用空数组
          tempURLs = fileIDs.map(() => '');
        }
        
        // 替换hero.avatar为临时URL，如果失败则使用本地图片
        let urlIdx = 0;
        Object.values(result.data.categories).forEach((cat: any) => {
          cat.heroes.forEach((hero: any) => {
            if (hero.avatar) {
              if (tempURLs[urlIdx] && tempURLs[urlIdx].startsWith('http')) {
                // 使用临时URL
                hero.avatar = tempURLs[urlIdx];
                console.log(`英雄 ${hero.name} 使用临时URL:`, hero.avatar);
              } else {
                // 临时URL获取失败，使用本地图片作为备选
                const heroName = hero.name.toLowerCase().replace(/\s+/g, '');
                hero.avatar = `/pages/images/heroes/${heroName}.jpg`;
                console.log(`英雄 ${hero.name} 使用本地图片:`, hero.avatar);
              }
            }
            urlIdx++;
          });
        });
        
        this.setData({
          heroCategories: result.data.categories,
          loading: false
        });
        console.log('英雄分类数据:', result.data);
      } else {
        console.error('获取英雄列表失败:', result?.message || '未知错误');
        this.setData({ loading: false });
        wx.showToast({
          title: '获取英雄列表失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('调用云函数失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 选择英雄
  selectHero(e: any) {
    const hero = e.currentTarget.dataset.hero;
    wx.showToast({
      title: `已选择${hero.name}`,
      icon: 'none'
    });
    
    // 根据来源页面决定跳转目标
    if (this.data.source === 'createPlan') {
      // 如果是从方案创作页面进入的，则返回方案创作页面
      wx.navigateTo({
        url: `../createPlan/createPlan?hero=${hero.name}&heroId=${hero.id}`
      });
    } else {
      // 如果是从攻略页面或其他页面进入的，则跳转到方案查看页面
      wx.navigateTo({
        url: `../heroPlan/heroPlan?hero=${hero.name}&heroId=${hero.id}`
      });
    }
  }
}); 