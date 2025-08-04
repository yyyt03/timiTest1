// 英雄分类页面
import { getTempFileURLs } from '../../utils/cloud'
import { heroCache } from '../../utils/heroCache'

Page({
  data: {
    heroCategories: {},
    loading: true,
    source: '' // 来源页面
  },

  // 生命周期函数--监听页面加载
  onLoad: function(options: any) {
    if (options && options.source) {
      this.setData({
        source: options.source
      });
    }
    this.getHeroList();
  },

  // 获取英雄列表（优化版本）
  async getHeroList() {
    const that = this;
    
    try {
      this.setData({ loading: true });
      
      // 首先检查本地缓存
      const cachedData = heroCache.getCache();
      if (cachedData) {
        console.log('使用本地缓存的英雄数据');
        
        this.setData({
          heroCategories: cachedData.categories,
          loading: false
        });
        return;
      }
      
      console.log('本地缓存未命中，从云函数获取数据');
      
      // 调用云函数获取数据
      const result: any = await wx.cloud.callFunction({
        name: 'getHeroList'
      });
      
      if (result && result.result && result.result.success && result.result.data) {
        // 深拷贝数据，避免修改原始数据
        const categoriesData = JSON.parse(JSON.stringify(result.result.data.categories));
        
        // 批量获取所有英雄头像fileID
        var allHeroes: any[] = [];
        Object.values(categoriesData).forEach(function(cat: any) {
          allHeroes = allHeroes.concat(cat.heroes);
        });
        
        var fileIDs = allHeroes.map(function(hero: any) {
          return hero.avatar;
        }).filter(function(avatar: any) {
          return avatar;
        });
        
        // 获取临时URL并缓存
        const tempURLs = await getTempFileURLs(fileIDs);
        
        // 构建头像URL映射
        const avatarURLs: { [key: string]: string } = {};
        let urlIdx = 0;
        
        Object.values(categoriesData).forEach(function(cat: any) {
          cat.heroes.forEach(function(hero: any) {
            if (hero.avatar) {
              if (tempURLs[urlIdx] && tempURLs[urlIdx].indexOf('http') === 0) {
                // 使用临时URL
                hero.avatar = tempURLs[urlIdx];
                avatarURLs[hero.id] = tempURLs[urlIdx];
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
        
        that.setData({
          heroCategories: categoriesData,
          loading: false
        });
        
      } else {
        console.error('获取英雄列表失败，返回结果:', result);
        console.error('错误信息:', result && result.result && result.result.message ? result.result.message : '未知错误');
        
        wx.showToast({
          title: '获取英雄列表失败',
          icon: 'none'
        });
        
        that.setData({
          loading: false
        });
      }
      
    } catch (error: any) {
      console.error('调用云函数失败，详细错误:', error);
      
      wx.showToast({
        title: '网络连接失败',
        icon: 'none'
      });
      
      this.setData({
        loading: false
      });
    }
  },



  // 选择英雄
  selectHero: function(e: any) {
    var hero = e.currentTarget.dataset.hero;
    wx.showToast({
      title: '已选择' + hero.name,
      icon: 'none'
    });
    
    // 根据来源页面决定跳转目标
    if (this.data.source === 'createPlan') {
      // 如果是从方案创作页面进入的，则返回方案创作页面
      wx.navigateTo({
        url: '../createPlan/createPlan?hero=' + hero.name + '&heroId=' + hero.id
      });
    } else {
      // 如果是从攻略页面或其他页面进入的，则跳转到方案查看页面
      wx.navigateTo({
        url: '../heroPlan/heroPlan?hero=' + hero.name + '&heroId=' + hero.id
      });
    }
  }
}); 