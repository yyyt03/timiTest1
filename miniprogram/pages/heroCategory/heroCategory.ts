// 英雄分类页面
Page({
  data: {
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
    },
    source: '' // 来源页面
  },

  // 生命周期函数--监听页面加载
  onLoad(options: any) {
    if (options && options.source) {
      this.setData({
        source: options.source
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
    
    // 根据来源页面决定跳转目标
    if (this.data.source === 'createPlan') {
      // 如果是从方案创作页面进入的，则返回方案创作页面
      wx.navigateTo({
        url: `../createPlan/createPlan?hero=${hero}`
      });
    } else {
      // 如果是从攻略页面或其他页面进入的，则跳转到方案查看页面
      wx.navigateTo({
        url: `../heroPlan/heroPlan?hero=${hero}`
      });
    }
  }
}); 