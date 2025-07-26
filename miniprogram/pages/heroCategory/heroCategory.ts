// 英雄分类页面
Page({
  data: {
    showHeroList: false,
    currentCategoryName: '',
    heroList: [] as string[],
    heroCategories: {
      shooter: {
        name: '射手',
        heroes: ['孙尚香', '马可波罗', '后羿', '狄仁杰', '鲁班七号']
      },
      support: {
        name: '辅助',
        heroes: ['东皇太一', '钟馗', '明世隐', '瑶']
      },
      assassin: {
        name: '刺客',
        heroes: ['赵云', '李白', '典韦', '孙悟空']
      },
      warrior: {
        name: '战士',
        heroes: ['孙策', '司空震', '铠', '亚瑟', '程咬金', '吕布']
      },
      mage: {
        name: '法师',
        heroes: ['杨玉环', '妲己', '诸葛亮', '安琪拉', '甄姬', '小乔', '武则天', '貂蝉']
      }
    }
  },

  // 显示对应分类的英雄列表
  showHeroes(e: any) {
    const type = e.currentTarget.dataset.type;
    const category = this.data.heroCategories[type as keyof typeof this.data.heroCategories];
    
    if (category) {
      this.setData({
        showHeroList: true,
        currentCategoryName: category.name,
        heroList: category.heroes
      });
    }
  },

  // 选择英雄
  selectHero(e: any) {
    const hero = e.currentTarget.dataset.hero;
    wx.showToast({
      title: `已选择${hero}`,
      icon: 'none'
    });
    
    // 可以在这里跳转到英雄详情页或方案创作页
    // wx.navigateTo({
    //   url: `../createPlan/createPlan?hero=${hero}`
    // });
  }
}); 