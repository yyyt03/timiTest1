// 英雄方案查看页面
Page({
  data: {
    hero: '',
    plans: [] as any[], // 存储该英雄的所有方案
    loading: true,
    noPlans: false
  },

  // 生命周期函数--监听页面加载
  onLoad(options: any) {
    if (options && options.hero) {
      this.setData({
        hero: options.hero
      });
      
      wx.setNavigationBarTitle({
        title: `${options.hero}的方案`
      });
      
      // 获取该英雄的方案
      this.getHeroPlans(options.hero);
    } else {
      wx.showToast({
        title: '未指定英雄',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 获取英雄方案
  getHeroPlans(hero: string) {
    // 这里应该从服务器或本地存储获取方案
    // 现在先使用模拟数据
    setTimeout(() => {
      // 模拟方案数据
      const demoPlans = [
        {
          id: 1,
          title: `${hero}核心玩法`,
          core: '技能1核心',
          talents: ['特性1', '特性3', '特性5'],
          equipment: '破军、宗师之力、暗影战斧、反伤刺甲、名刀·司命、抵抗之靴',
          equipmentCode: '10106',
          description: '前期发育为主，中期抓单，后期团战切后排。利用一技能的高爆发迅速击杀敌方脆皮。',
          author: '游戏高手',
          createTime: '2023-07-26',
          likes: 128
        },
        {
          id: 2,
          title: `${hero}团战流`,
          core: '技能3核心',
          talents: ['特性2', '特性4', '特性7'],
          equipment: '破军、无尽战刃、宗师之力、暗影战斧、名刀·司命、抵抗之靴',
          equipmentCode: '10206',
          description: '以团战为主，大招可以控制多个敌人，配合队友进行输出。',
          author: '职业选手',
          createTime: '2023-07-25',
          likes: 96
        }
      ];
      
      // 判断是否有方案
      if (demoPlans.length > 0) {
        this.setData({
          plans: demoPlans,
          loading: false,
          noPlans: false
        });
      } else {
        this.setData({
          loading: false,
          noPlans: true
        });
      }
    }, 1000);
  },
  
  // 查看方案详情
  viewPlanDetail(e: any) {
    const planId = e.currentTarget.dataset.id;
    // 跳转到方案详情页
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
    // 实际应该跳转到详情页
    // wx.navigateTo({
    //   url: `../planDetail/planDetail?id=${planId}`
    // });
  },
  
  // 创建新方案
  createNewPlan() {
    wx.navigateTo({
      url: `../createPlan/createPlan?hero=${this.data.hero}`
    });
  }
}); 