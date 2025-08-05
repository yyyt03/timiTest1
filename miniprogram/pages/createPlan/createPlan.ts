// 方案创作页面
Page({
  data: {
    hero: '',
    heroId: '',
    selectedHero: false, // 是否已选择英雄
    currentStep: 1, // 当前步骤：1-选择英雄，2-选择技能流派和天赋，3-出装推荐，4-方案思路
    heroCategories: {} as any,
    heroSkills: null as any, // 英雄技能数据
    selectedCores: {
      skillOne: -1,
      skillTwo: -1,
      skillThree: -1
    }, // 选中的核心技能索引
    selectedTalents: {
      skillOne: [] as number[],
      skillTwo: [] as number[],
      skillThree: [] as number[]
    }, // 选中的天赋索引数组
    talentSelected: {
      skillOne: [] as boolean[],
      skillTwo: [] as boolean[],
      skillThree: [] as boolean[]
    }, // 天赋是否被选中
    equipment: '', // 出装推荐
    equipmentCode: '', // 装备密语
    planDescription: '', // 方案思路描述
    loading: true,
    skillsLoading: false
  },

  onLoad(options: any) {
    if (options.hero) {
      this.setData({
        hero: options.hero,
        heroId: options.heroId || '',
        selectedHero: true, // 标记已选择英雄
        currentStep: 2 // 如果已经选择了英雄，直接进入步骤2（选择技能流派和天赋）
      });
      wx.setNavigationBarTitle({
        title: options.hero + ' - 方案创作'
      });
      this.loadHeroSkills();
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

  // 加载英雄技能数据
  async loadHeroSkills() {
    if (!this.data.heroId) {
      wx.showToast({
        title: '英雄ID不能为空',
        icon: 'none'
      });
      return;
    }

    this.setData({
      skillsLoading: true
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'getHeroSkills',
        data: {
          heroId: this.data.heroId
        }
      }) as any;

      if (result.result && result.result.success) {
        // 直接使用返回的技能数据结构
        const skillsData = result.result.data;
        
        // 初始化天赋选择状态
        const talentSelected = {
          skillOne: new Array(skillsData.skills.skillOne.talents.length).fill(false),
          skillTwo: new Array(skillsData.skills.skillTwo.talents.length).fill(false),
          skillThree: new Array(skillsData.skills.skillThree.talents.length).fill(false)
        };

        this.setData({
          heroSkills: skillsData.skills,
          talentSelected: talentSelected,
          skillsLoading: false
        });
      } else {
        // 如果云函数失败，使用本地数据作为回退方案
        console.log('云函数返回失败，使用本地数据:', result.result?.error);
        this.loadLocalHeroSkills();
      }
    } catch (error) {
      console.error('获取英雄技能数据失败:', error);
      // 如果网络错误，使用本地数据作为回退方案
      this.loadLocalHeroSkills();
    }
  },

  // 加载本地英雄技能数据（临时方案）
  loadLocalHeroSkills() {
    console.log('开始加载本地英雄技能数据');
    
    // 孙尚香的技能数据
    const sunshangxiangSkills = {
      skillOne: {
        cores: [
          {
            id: "skill_sunshangxiang_1_c_413",
            name: "重炮干金",
            tag: "特性",
            description: "孙尚香手握重炮作战,获得额外攻击力,每次普攻都是强化普攻",
            order: 1
          },
          {
            id: "skill_sunshangxiang_1_c_414",
            name: "枪林弹雨",
            tag: "特性",
            description: "孙尚香手持加特林作战,普攻转变为高速射击,攻速会增加加特林伤害",
            order: 2
          }
        ],
        talents: [
          {
            id: "skill_sunshangxiang_1_t_415",
            name: "钢铁炮火",
            tag: "强度",
            description: "暴击伤害增加40%",
            order: 1
          },
          {
            id: "skill_sunshangxiang_1_t_416",
            name: "能量爆发",
            tag: "强度",
            description: "翻滚后3秒内大幅提升暴击率",
            order: 2
          },
          {
            id: "skill_sunshangxiang_1_t_417",
            name: "叛逆反击",
            tag: "伤害",
            description: "发射三颗子弹自动追击周围的敌方英雄",
            order: 3
          },
          {
            id: "skill_sunshangxiang_1_t_418",
            name: "自成一派",
            tag: "距离",
            description: "攻击距离+1米",
            order: 4
          },
          {
            id: "skill_sunshangxiang_1_t_419",
            name: "冰雪聪明",
            tag: "特性",
            description: "翻滚以后获得一次技能抵挡",
            order: 5
          },
          {
            id: "skill_sunshangxiang_1_t_420",
            name: "信手拈来",
            tag: "强度",
            description: "翻滚后获得2秒超额攻速",
            order: 6
          },
          {
            id: "skill_sunshangxiang_1_t_421",
            name: "英姿潇洒",
            tag: "距离",
            description: "位移速度,距离+50%",
            order: 7
          },
          {
            id: "skill_sunshangxiang_1_t_422",
            name: "精怪古灵",
            tag: "段数",
            description: "技能可以释放2次",
            order: 8
          }
        ]
      },
      skillTwo: {
        cores: [
          {
            id: "skill_sunshangxiang_2_c_423",
            name: "指哪打哪",
            tag: "段数",
            description: "炸弹改为往范围内持续空投5秒,攻速会提升投弹频率",
            order: 1
          },
          {
            id: "skill_sunshangxiang_2_c_424",
            name: "捣乱冲动",
            tag: "特性",
            description: "炸弹命中后打上死亡标记,直接斩杀低于25%血量的敌人, 死亡时留下超级炸弹",
            order: 2
          }
        ],
        talents: [
          {
            id: "skill_sunshangxiang_2_t_425",
            name: "不准回血!",
            tag: "特性",
            description: "爆炸具有重伤效果,生命恢复降低100%",
            order: 1
          },
          {
            id: "skill_sunshangxiang_2_t_426",
            name: "战斗补给",
            tag: "生存",
            description: "普攻标记目标获得生命回复",
            order: 2
          },
          {
            id: "skill_sunshangxiang_2_t_427",
            name: "锁定瞄准",
            tag: "特性",
            description: "对目标普攻会刷新印记时间",
            order: 3
          },
          {
            id: "skill_sunshangxiang_2_t_428",
            name: "连环爆破",
            tag: "段数",
            description: "连锁爆破,命中目标会向周围敌方单位发射小型爆弹",
            order: 4
          },
          {
            id: "skill_sunshangxiang_2_t_429",
            name: "征服大小姐",
            tag: "强度",
            description: "碎甲效果提升40%",
            order: 5
          },
          {
            id: "skill_sunshangxiang_2_t_430",
            name: "掠夺干金",
            tag: "特性",
            description: "标记的目标死亡会给予孙尚香额外金钱(1%概率超级大奖)",
            order: 6
          },
          {
            id: "skill_sunshangxiang_2_t_431",
            name: "调皮公主",
            tag: "段数",
            description: "技能可以释放2次",
            order: 7
          },
          {
            id: "skill_sunshangxiang_2_t_432",
            name: "好战分子",
            tag: "范围",
            description: "技能范围提升20%",
            order: 8
          }
        ]
      },
      skillThree: {
        cores: [
          {
            id: "skill_sunshangxiang_3_c_433",
            name: "大小姐驾到!通通闪开",
            tag: "特性",
            description: "发射一个火箭自己会跟着火箭一起飞行,飞行时获得双抗。飞行时会持续投弹",
            order: 1
          },
          {
            id: "skill_sunshangxiang_3_c_434",
            name: "火力全开",
            tag: "段数",
            description: "连续发射5枚导弹(释放随攻速加快)",
            order: 2
          }
        ],
        talents: [
          {
            id: "skill_sunshangxiang_3_t_435",
            name: "致命射击",
            tag: "伤害",
            description: "大招可以暴击",
            order: 1
          },
          {
            id: "skill_sunshangxiang_3_t_436",
            name: "防身火力",
            tag: "生存",
            description: "大招击中敌人获得真伤护盾",
            order: 2
          },
          {
            id: "skill_sunshangxiang_3_t_437",
            name: "本小姐就是任性",
            tag: "生存",
            description: "大招期间获得霸体",
            order: 3
          },
          {
            id: "skill_sunshangxiang_3_t_438",
            name: "快速装填",
            tag: "特性",
            description: "普攻减少3技能CD",
            order: 4
          },
          {
            id: "skill_sunshangxiang_3_t_439",
            name: "惊险游戏",
            tag: "伤害",
            description: "获得60%伤害增强效果,每次死亡减少12%",
            order: 5
          },
          {
            id: "skill_sunshangxiang_3_t_440",
            name: "弱点识破",
            tag: "伤害",
            description: "大招附带真实伤害",
            order: 6
          },
          {
            id: "skill_sunshangxiang_3_t_441",
            name: "烈性炸药",
            tag: "伤害",
            description: "大招威力增加50%,但是会提升后坐力,发射时使自己后退",
            order: 7
          },
          {
            id: "skill_sunshangxiang_3_t_442",
            name: "超速驾驶",
            tag: "距离",
            description: "飞行速度,距离,转向速度+25%",
            order: 8
          }
        ]
      }
    };

    // 初始化天赋选择状态
    const talentSelected = {
      skillOne: new Array(sunshangxiangSkills.skillOne.talents.length).fill(false),
      skillTwo: new Array(sunshangxiangSkills.skillTwo.talents.length).fill(false),
      skillThree: new Array(sunshangxiangSkills.skillThree.talents.length).fill(false)
    };

    console.log('技能数据准备完成:', sunshangxiangSkills);

    this.setData({
      heroSkills: sunshangxiangSkills,
      talentSelected: talentSelected,
      skillsLoading: false
    });

    console.log('数据设置完成，heroSkills:', this.data.heroSkills);
    console.log('使用本地数据加载成功');
  },

  // 处理技能数据，转换为页面需要的格式
  processSkillsData(rawData: any[]) {
    // 这个方法现在不需要了，因为云函数直接返回正确的格式
    return rawData;
  },

  // 选择核心技能
  selectCore(e: any) {
    const { skillType, index } = e.currentTarget.dataset;
    const selectedCores = { ...this.data.selectedCores };
    selectedCores[skillType] = index;
    
    this.setData({
      selectedCores: selectedCores
    });
  },

  // 切换天赋选择
  toggleTalent(e: any) {
    const { skillType, index } = e.currentTarget.dataset;
    const selectedTalents = { ...this.data.selectedTalents };
    const talentSelected = { ...this.data.talentSelected };
    
    const currentSelected = selectedTalents[skillType].slice();
    const currentTalentSelected = talentSelected[skillType].slice();
    
    if (currentTalentSelected[index]) {
      // 取消选择
      currentTalentSelected[index] = false;
      const newSelected = currentSelected.filter(i => i !== index);
      selectedTalents[skillType] = newSelected;
    } else {
      // 选择天赋
      if (currentSelected.length >= 3) {
        // 最多只能选择3个天赋，移除第一个
        const firstSelected = currentSelected.shift();
        if (firstSelected !== undefined) {
          currentTalentSelected[firstSelected] = false;
        }
      }
      currentTalentSelected[index] = true;
      currentSelected.push(index);
      selectedTalents[skillType] = currentSelected;
    }
    
    talentSelected[skillType] = currentTalentSelected;
    
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
    if (currentStep < 4) {
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

  // 验证技能选择
  validateSkillSelection() {
    const { selectedCores, selectedTalents } = this.data;
    
    // 检查是否每个技能都选择了核心
    if (selectedCores.skillOne === -1 || selectedCores.skillTwo === -1 || selectedCores.skillThree === -1) {
      wx.showToast({
        title: '请为每个技能选择流派',
        icon: 'none'
      });
      return false;
    }
    
    // 检查是否每个技能都选择了3个天赋
    if (selectedTalents.skillOne.length !== 3 || selectedTalents.skillTwo.length !== 3 || selectedTalents.skillThree.length !== 3) {
      wx.showToast({
        title: '请为每个技能选择3个天赋',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 生成方案
  async generatePlan() {
    // 验证技能选择
    if (!this.validateSkillSelection()) {
      return;
    }
    
    // 验证必填字段
    if (!this.data.equipment.trim()) {
      wx.showToast({
        title: '请输入出装推荐',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.planDescription.trim()) {
      wx.showToast({
        title: '请输入方案思路',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '生成方案中...'
    });

    try {
      // 准备方案数据
      const { selectedCores, selectedTalents, heroSkills } = this.data;
      
      // 获取选中的核心和天赋名称
      const coreNames = {
        skillOne: heroSkills.skillOne.cores[selectedCores.skillOne]?.name || '',
        skillTwo: heroSkills.skillTwo.cores[selectedCores.skillTwo]?.name || '',
        skillThree: heroSkills.skillThree.cores[selectedCores.skillThree]?.name || ''
      };
      
      const talentNames = {
        skillOne: selectedTalents.skillOne.map(index => heroSkills.skillOne.talents[index]?.name || ''),
        skillTwo: selectedTalents.skillTwo.map(index => heroSkills.skillTwo.talents[index]?.name || ''),
        skillThree: selectedTalents.skillThree.map(index => heroSkills.skillThree.talents[index]?.name || '')
      };
      
      const planData = {
        heroId: this.data.heroId,
        heroName: this.data.hero,
        title: this.data.hero + ' - 技能流派方案',
        description: this.data.planDescription,
        cores: coreNames,
        talents: talentNames,
        equipment: this.data.equipment,
        equipmentCode: this.data.equipmentCode,
        strategy: this.data.planDescription
      };
      
      const result = await wx.cloud.callFunction({
        name: 'createPlan',
        data: planData
      }) as any;

      wx.hideLoading();
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '方案创建成功！',
          icon: 'success'
        });
        
        // 返回上一页并刷新
        setTimeout(() => {
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.loadPlans) {
            prevPage.loadPlans();
          }
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '创建失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('创建方案失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 从英雄分类中选择
  selectFromCategory() {
    wx.navigateTo({
      url: '../heroCategory/heroCategory?source=createPlan'
    });
  }
}); 