// 英雄分类页面
import { CloudService } from '../../utils/cloud'

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

  // 获取英雄列表
  getHeroList: function() {
    var that = this;
    try {
      this.setData({ loading: true });
      
      console.log('开始调用云函数getHeroList...');
      
      CloudService.callFunction('getHeroList').then(function(result: any) {
  
        
        if (result && result.success && result.data) {
          // 批量获取所有英雄头像fileID
          var allHeroes: any[] = [];
          Object.values(result.data.categories).forEach(function(cat: any) {
            allHeroes = allHeroes.concat(cat.heroes);
          });
          
          var fileIDs = allHeroes.map(function(hero: any) {
            return hero.avatar;
          }).filter(function(avatar: any) {
            return avatar;
          });
          
          CloudService.getTempFileURLs(fileIDs).then(function(tempURLs: string[]) {
            
            // 替换hero.avatar为临时URL，如果失败则使用本地图片
            var urlIdx = 0;
            Object.values(result.data.categories).forEach(function(cat: any) {
              cat.heroes.forEach(function(hero: any) {
                if (hero.avatar) {
                  if (tempURLs[urlIdx] && tempURLs[urlIdx].indexOf('http') === 0) {
                    // 使用临时URL
                    hero.avatar = tempURLs[urlIdx];
                  } else {
                    // 临时URL获取失败，使用默认图片
                    hero.avatar = '/images/default-avatar.png';
                  }
                }
                urlIdx++;
              });
            });
            
            that.setData({
              heroCategories: result.data.categories,
              loading: false
            });
          }).catch(function(tempURLError: any) {
            console.error('获取临时URL失败:', tempURLError);
            // 如果获取临时URL失败，使用本地图片
            var urlIdx = 0;
            Object.values(result.data.categories).forEach(function(cat: any) {
              cat.heroes.forEach(function(hero: any) {
                if (hero.avatar) {
                  hero.avatar = '/images/default-avatar.png';
                }
                urlIdx++;
              });
            });
            
            that.setData({
              heroCategories: result.data.categories,
              loading: false
            });
          });
        } else {
          console.error('获取英雄列表失败，返回结果:', result);
          console.error('错误信息:', result && result.message ? result.message : '未知错误');
          
          wx.showToast({
            title: '获取英雄列表失败',
            icon: 'none'
          });
          
          that.setData({
            loading: false
          });
        }
      }).catch(function(error: any) {
        console.error('调用云函数失败，详细错误:', error);
        
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
        
        that.setData({
          loading: false
        });
      });
    } catch (error) {
      console.error('getHeroList函数执行异常:', error);
      
      wx.showToast({
        title: '系统错误',
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