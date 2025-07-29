// 英雄方案页面
Page({
  data: {
    hero: '',
    heroId: '',
    plans: [] as any[],
    loading: true
  },

  onLoad(options: any) {
    if (options.hero) {
      this.setData({
        hero: options.hero,
        heroId: options.heroId || ''
      });
      wx.setNavigationBarTitle({
        title: options.hero + '的方案'
      });
    }
    this.loadPlans();
  },

  // 加载方案数据
  loadPlans() {
    var that = this;
    // 模拟加载延迟
    setTimeout(function() {
      that.setData({ loading: false });
    }, 1000);

    // 模拟数据加载完成
    setTimeout(function() {
      var demoPlans = [
        {
          id: 1,
          title: that.data.hero + '核心玩法',
          description: '专注于核心技能的强化，适合新手玩家',
          difficulty: '简单',
          winRate: '65%',
          createTime: '2025-07-27'
        },
        {
          id: 2,
          title: that.data.hero + '团战流',
          description: '强化团战能力，适合团队配合',
          difficulty: '中等',
          winRate: '72%',
          createTime: '2025-07-26'
        },
        {
          id: 3,
          title: that.data.hero + '发育流',
          description: '注重前期发育，后期carry',
          difficulty: '困难',
          winRate: '68%',
          createTime: '2025-07-25'
        }
      ];

      that.setData({
        plans: demoPlans
      });
    }, 1500);
  },

  // 查看方案详情
  viewPlan(e: any) {
    var planId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '方案详情功能开发中',
      icon: 'none'
    });
    
    // TODO: 跳转到方案详情页面
    // wx.navigateTo({
    //   url: '../planDetail/planDetail?id=' + planId
    // })
  },

  // 创建新方案
  createPlan() {
    wx.navigateTo({
      url: '../createPlan/createPlan?hero=' + this.data.hero
    });
  }
}); 