// 方案创作页面
Page({
  data: {
    hero: '',
    heroId: '',
    currentStep: 1, // 当前步骤：1-选择英雄，2-选择核心，3-选择天赋，4-出装推荐，5-方案思路
    heroCategories: {} as any,
    selectedCore: -1, // 选中的核心技能索引
    selectedTalents: [] as number[], // 选中的特性天赋索引数组
    talentSelected: [] as boolean[], // 天赋是否被选中
    equipment: '', // 出装推荐
    equipmentCode: '', // 装备密语
    planDescription: '', // 方案思路描述
    loading: true
  },

  onLoad(options: any) {
    if (options.hero) {
      this.setData({
        hero: options.hero,
        heroId: options.heroId || ''
      });
      wx.setNavigationBarTitle({
        title: options.hero + ' - 方案创作'
      });
    }
    this.loadHeroData();
  },

  // 加载英雄数据
  loadHeroData() {
    var that = this;
    // 模拟英雄分类数据
    var heroCategories = {
      '射手': ['孙尚香', '马可波罗', '后羿', '狄仁杰', '鲁班七号'],
      '辅助': ['东皇太一', '钟馗', '明世隐', '瑶'],
      '刺客': ['赵云', '李白', '典韦', '孙悟空'],
      '战士': ['孙策', '司空震', '铠', '亚瑟', '程咬金', '吕布'],
      '法师': ['杨玉环', '妲己', '诸葛亮', '安琪拉', '甄姬', '小乔', '武则天', '貂蝉']
    };

    // 获取所有英雄列表
    var allHeroes: string[] = [];
    Object.values(heroCategories).forEach(function(heroes: string[]) {
      allHeroes = allHeroes.concat(heroes);
    });

    that.setData({
      heroCategories: heroCategories,
      loading: false
    });
  },

  // 选择核心技能
  selectCore(e: any) {
    var index = e.detail.value;
    this.setData({
      selectedCore: index
    });
  },

  // 切换特性天赋选择
  toggleTalent(e: any) {
    var index = parseInt(e.currentTarget.dataset.index);
    var selectedTalents = this.data.selectedTalents.slice();
    var talentSelected = this.data.talentSelected.slice();
    
    if (talentSelected[index]) {
      // 取消选择
      talentSelected[index] = false;
      selectedTalents = selectedTalents.filter(function(i: number) {
        return i !== index;
      });
    } else {
      // 选择天赋
      if (selectedTalents.length >= 3) {
        // 最多只能选择3个天赋，移除第一个
        var firstSelected = selectedTalents.shift();
        if (firstSelected !== undefined) {
          talentSelected[firstSelected] = false;
        }
      }
      talentSelected[index] = true;
      selectedTalents.push(index);
    }
    
    this.setData({
      selectedTalents: selectedTalents,
      talentSelected: talentSelected
    });
  },

  // 输入出装推荐
  onEquipmentInput(e: any) {
    this.setData({
      equipment: e.detail.value
    });
  },

  // 输入装备密语
  onEquipmentCodeInput(e: any) {
    this.setData({
      equipmentCode: e.detail.value
    });
  },

  // 输入方案思路
  onDescriptionInput(e: any) {
    this.setData({
      planDescription: e.detail.value
    });
  },

  // 下一步
  nextStep() {
    var currentStep = this.data.currentStep;
    if (currentStep < 5) {
      this.setData({
        currentStep: currentStep + 1
      });
    }
  },

  // 上一步
  prevStep() {
    var currentStep = this.data.currentStep;
    if (currentStep > 1) {
      this.setData({
        currentStep: currentStep - 1
      });
    }
  },

  // 生成方案
  generatePlan() {
    var that = this;
    wx.showLoading({
      title: '生成方案中...'
    });

    setTimeout(function() {
      wx.hideLoading();
      wx.showToast({
        title: '方案生成成功！',
        icon: 'success'
      });
      
      // TODO: 跳转到方案详情页面
      // wx.navigateTo({
      //   url: '../planDetail/planDetail'
      // });
    }, 2000);
  },

  // 从英雄分类中选择
  selectFromCategory() {
    wx.navigateTo({
      url: '../heroCategory/heroCategory?source=createPlan'
    });
  }
}); 