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
    }
    
    // 获取所有英雄列表
    this.getAllHeroes();
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
  
  // 英雄选择变化
  onHeroChange(e: any) {
    const index = e.detail.value;
    this.setData({
      heroIndex: index,
      selectedHero: this.data.allHeroes[index],
      // 重置后续选择
      selectedCore: null,
      selectedTalents: []
    });
  },
  
  // 选择流派核心
  selectCore(e: any) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      selectedCore: index,
      // 重置后续选择
      selectedTalents: []
    });
  },
  
  // 切换特性天赋选择
  toggleTalent(e: any) {
    const index = parseInt(e.currentTarget.dataset.index);
    let selectedTalents = [...this.data.selectedTalents];
    
    // 如果已经选择了这个特性，则取消选择
    if (selectedTalents.includes(index)) {
      selectedTalents = selectedTalents.filter(i => i !== index);
    } 
    // 如果还没有选满3个，则添加选择
    else if (selectedTalents.length < 3) {
      selectedTalents.push(index);
    } 
    // 如果已经选满3个，则替换第一个
    else {
      selectedTalents.shift();
      selectedTalents.push(index);
    }
    
    this.setData({
      selectedTalents
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
  
  // 生成方案
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
    
    if (!this.data.equipmentDesc) {
      wx.showToast({
        title: '请输入出装推荐',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.planDesc) {
      wx.showToast({
        title: '请输入方案思路描述',
        icon: 'none'
      });
      return;
    }
    
    // 这里可以生成方案，例如生成图片或者保存到服务器
    wx.showLoading({
      title: '正在生成方案...'
    });
    
    // 模拟生成过程
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '方案生成成功',
        icon: 'success'
      });
    }, 2000);
  }
}); 