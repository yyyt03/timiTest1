// 方案创作页面
Page({
  data: {
    // 英雄选择
    allHeroes: [] as string[],
    heroIndex: 0,
    selectedHero: '',
    
    // 流派核心
    selectedCore: null as number | null,
    
    // 特性天赋
    talents: [0, 1, 2, 3, 4, 5, 6, 7], // 8个特性天赋
    selectedTalents: [] as number[],
    talentSelected: [false, false, false, false, false, false, false, false], // 每个特性是否被选中
    
    // 出装推荐
    equipmentDesc: '',
    equipmentCode: '',
    
    // 方案思路
    planDesc: ''
  },

  // 生命周期函数--监听页面加载
  onLoad(options: any) {
    // 如果从英雄分类页面跳转过来，可以获取传递的英雄参数
    if (options && options.hero) {
      this.setData({
        selectedHero: options.hero
      });
      
      // 获取所有英雄列表
      this.getAllHeroes();
    } else {
      // 如果没有传入英雄参数，则自动跳转到英雄分类页面
      wx.navigateTo({
        url: '../heroCategory/heroCategory?source=createPlan'
      });
    }
  },
  
  // 获取所有英雄列表
  getAllHeroes() {
    // 这里可以从数据源获取英雄列表，现在先使用示例数据
    const heroCategories = {
      shooter: ['孙尚香', '马可波罗', '后羿', '狄仁杰', '鲁班七号'],
      support: ['东皇太一', '钟馗', '明世隐', '瑶'],
      assassin: ['赵云', '李白', '典韦', '孙悟空'],
      warrior: ['孙策', '司空震', '铠', '亚瑟', '程咬金', '吕布'],
      mage: ['杨玉环', '妲己', '诸葛亮', '安琪拉', '甄姬', '小乔', '武则天', '貂蝉']
    };
    
    // 合并所有英雄
    let allHeroes: string[] = [];
    Object.values(heroCategories).forEach(heroes => {
      allHeroes = allHeroes.concat(heroes);
    });
    
    this.setData({
      allHeroes
    });
  },
  
  // 跳转到英雄分类页面
  goToHeroCategory() {
    wx.navigateTo({
      url: '../heroCategory/heroCategory?source=createPlan'
    });
  },
  
  // 英雄选择变化
  onHeroChange(e: any) {
    const index = e.detail.value;
    this.setData({
      heroIndex: index,
      selectedHero: this.data.allHeroes[index],
      // 重置后续选择
      selectedCore: null,
      selectedTalents: [],
      talentSelected: [false, false, false, false, false, false, false, false]
    });
  },
  
  // 选择流派核心
  selectCore(e: any) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedCore: index,
      // 重置后续选择
      selectedTalents: [],
      talentSelected: [false, false, false, false, false, false, false, false]
    });
  },
  
  // 切换特性天赋选择
  toggleTalent(e: any) {
    const index = parseInt(e.currentTarget.dataset.index);
    let selectedTalents = [...this.data.selectedTalents];
    let talentSelected = [...this.data.talentSelected];
    
    console.log('当前选择的特性索引:', index);
    console.log('当前已选特性:', selectedTalents);
    console.log('当前特性选中状态:', talentSelected);
    
    // 如果已经选择了这个特性，则取消选择
    if (talentSelected[index]) {
      console.log('取消选择特性:', index);
      selectedTalents = selectedTalents.filter(i => i !== index);
      talentSelected[index] = false;
    } 
    // 如果还没有选满3个，则添加选择
    else if (selectedTalents.length < 3) {
      console.log('添加选择特性:', index);
      selectedTalents.push(index);
      talentSelected[index] = true;
    } 
    // 如果已经选满3个，则替换第一个
    else {
      console.log('替换第一个特性为:', index);
      const firstSelected = selectedTalents.shift();
      if (firstSelected !== undefined) {
        talentSelected[firstSelected] = false;
      }
      selectedTalents.push(index);
      talentSelected[index] = true;
    }
    
    console.log('更新后的已选特性:', selectedTalents);
    console.log('更新后的特性选中状态:', talentSelected);
    
    this.setData({
      selectedTalents,
      talentSelected
    });
  },
  
  // 出装推荐输入
  onEquipmentInput(e: any) {
    this.setData({
      equipmentDesc: e.detail.value
    });
  },
  
  // 装备密语输入
  onEquipmentCodeInput(e: any) {
    this.setData({
      equipmentCode: e.detail.value
    });
  },
  
  // 方案思路描述输入
  onPlanDescInput(e: any) {
    this.setData({
      planDesc: e.detail.value
    });
  },
  
  // 生成一图流
  generatePlan() {
    // 检查必填项
    if (!this.data.selectedHero) {
      wx.showToast({
        title: '请选择英雄',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.selectedCore === null) {
      wx.showToast({
        title: '请选择流派核心',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.selectedTalents.length === 0) {
      wx.showToast({
        title: '请至少选择一个特性天赋',
        icon: 'none'
      });
      return;
    }
    
    // 这里可以生成方案，例如生成图片或者保存到服务器
    wx.showLoading({
      title: '正在生成一图流...'
    });
    
    // 模拟生成过程
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '一图流生成成功',
        icon: 'success'
      });
    }, 2000);
  }
}); 