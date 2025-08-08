// 方案创作页面
Page({
  data: {
    hero: '',
    heroId: '',
    selectedHero: false, // 是否已选择英雄
    currentStep: 1, // 当前步骤：1-选择英雄，2-选择技能流派和天赋，3-出装推荐，4-方案思路，5-方案名称，6-作者信息
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
    equipment: '', // 出装推荐（保留兼容性）
    equipmentList: [
      { name: '', imageUrl: '', matched: false, suggestions: [] },
      { name: '', imageUrl: '', matched: false, suggestions: [] },
      { name: '', imageUrl: '', matched: false, suggestions: [] },
      { name: '', imageUrl: '', matched: false, suggestions: [] },
      { name: '', imageUrl: '', matched: false, suggestions: [] },
      { name: '', imageUrl: '', matched: false, suggestions: [] }
    ], // 新的装备列表数据结构

    planDescription: '', // 方案思路描述
    planTitle: '', // 方案名称
    authorName: '', // 作者名称
    isBetaPlan: false, // 是否为体验服方案，默认选择否
    loading: true,
    skillsLoading: false,
    isDevelopment: false, // 是否为开发环境
    editMode: false, // 是否为编辑模式
    planId: '' // 编辑时的方案ID
  },

  onLoad(options: any) {
    // 检测环境
    this.detectEnvironment();
    
    // 检查是否为编辑模式
    if (options.editMode === 'true' && options.planId) {
      this.setData({
        editMode: true,
        planId: options.planId
      });
      wx.setNavigationBarTitle({
        title: '编辑方案'
      });
      this.loadPlanForEdit(options.planId);
    } else if (options.hero) {
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

  // 检测环境
  detectEnvironment() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const version = accountInfo.miniProgram?.version || '';
      const envVersion = accountInfo.miniProgram?.envVersion || '';
      
      // 开发环境判断逻辑 - 只在develop环境下显示开发模式
      const isDev = envVersion === 'develop';
      
      this.setData({
        isDevelopment: isDev
      });
      
      console.log('方案创作页面环境检测结果:', {
        version,
        envVersion,
        isDevelopment: isDev
      });
    } catch (error) {
      console.error('环境检测失败:', error);
      // 如果检测失败，默认设置为非开发环境
      this.setData({
        isDevelopment: false
      });
    }
  },

  // 查找核心技能索引
  findCoreIndex(coreData: any): number {
    if (!coreData || !this.data.heroSkills) {
      return 0;
    }
    
    // 遍历所有技能的核心，找到匹配的
    const skills = ['skillOne', 'skillTwo', 'skillThree'];
    for (const skillKey of skills) {
      const skill = this.data.heroSkills[skillKey];
      if (skill && skill.cores) {
        for (let i = 0; i < skill.cores.length; i++) {
          if (skill.cores[i] && skill.cores[i].name === coreData.name) {
            return i;
          }
        }
      }
    }
    
    return 0; // 默认返回第一个
  },

  // 查找天赋索引
  findTalentIndexes(talentsData: any[]): number[] {
    if (!talentsData || !Array.isArray(talentsData) || !this.data.heroSkills) {
      return [];
    }
    
    const result: number[] = [];
    
    // 遍历所有技能的天赋，找到匹配的
    const skills = ['skillOne', 'skillTwo', 'skillThree'];
    for (const skillKey of skills) {
      const skill = this.data.heroSkills[skillKey];
      if (skill && skill.talents) {
        for (let i = 0; i < skill.talents.length; i++) {
          const talent = skill.talents[i];
          if (talent && talentsData.some(t => t.name === talent.name)) {
            result.push(i);
          }
        }
      }
    }
    
    return result;
  },

  // 加载方案数据用于编辑
  async loadPlanForEdit(planId: string) {
    try {
      wx.showLoading({ title: '加载方案数据...' });
      
      const result = await wx.cloud.callFunction({
        name: 'getPlanDetail',
        data: { planId }
      }) as any;
      
      if (result.result && result.result.success) {
        const plan = result.result.data;
        
        // 设置英雄信息
        this.setData({
          hero: plan.heroName,
          heroId: plan.heroId,
          selectedHero: true,
          currentStep: 2
        });
        
        // 设置方案数据
        this.setData({
          planTitle: plan.title || '',
          planDescription: plan.description || '',
          authorName: plan.authorName || plan.creatorName || ''
        });
        
        // 加载英雄技能数据
        await this.loadHeroSkills();
        
        // 等待技能数据加载完成后设置技能选择
        setTimeout(() => {
          if (plan.skillOne) {
            // 找到对应的核心技能索引
            const skillOneCoreIndex = this.findCoreIndex(plan.skillOne.core);
            const skillTwoCoreIndex = this.findCoreIndex(plan.skillTwo?.core);
            const skillThreeCoreIndex = this.findCoreIndex(plan.skillThree?.core);
            
            // 找到对应的天赋索引
            const skillOneTalentIndexes = this.findTalentIndexes(plan.skillOne.talents);
            const skillTwoTalentIndexes = this.findTalentIndexes(plan.skillTwo?.talents);
            const skillThreeTalentIndexes = this.findTalentIndexes(plan.skillThree?.talents);
            
            // 设置天赋选中状态
            const talentSelected = {
              skillOne: new Array(9).fill(false),
              skillTwo: new Array(9).fill(false),
              skillThree: new Array(9).fill(false)
            };
            
            // 设置选中的天赋
            skillOneTalentIndexes.forEach(index => {
              if (index >= 0 && index < 9) talentSelected.skillOne[index] = true;
            });
            skillTwoTalentIndexes.forEach(index => {
              if (index >= 0 && index < 9) talentSelected.skillTwo[index] = true;
            });
            skillThreeTalentIndexes.forEach(index => {
              if (index >= 0 && index < 9) talentSelected.skillThree[index] = true;
            });
            
            this.setData({
              'selectedCores.skillOne': skillOneCoreIndex,
              'selectedCores.skillTwo': skillTwoCoreIndex,
              'selectedCores.skillThree': skillThreeCoreIndex,
              'selectedTalents.skillOne': skillOneTalentIndexes,
              'selectedTalents.skillTwo': skillTwoTalentIndexes,
              'selectedTalents.skillThree': skillThreeTalentIndexes,
              'talentSelected': talentSelected
            });
          }
        }, 500); // 等待500ms确保技能数据已加载
        
        // 设置装备数据
        if (plan.equipment && Array.isArray(plan.equipment)) {
          const equipmentList = plan.equipment.map((item: any, index: number) => ({
            name: item.name || '',
            imageUrl: item.imageUrl || '',
            matched: true,
            suggestions: []
          }));
          
          this.setData({
            equipmentList: equipmentList
          });
        }
        
        wx.hideLoading();
      } else {
        wx.showToast({
          title: '加载方案失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载方案数据失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载方案失败',
        icon: 'none'
      });
    }
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
    const selectedCores = Object.assign({}, this.data.selectedCores);
    selectedCores[skillType] = index;
    
    this.setData({
      selectedCores: selectedCores
    });
  },

  // 切换天赋选择
  toggleTalent(e: any) {
    const { skillType, index } = e.currentTarget.dataset;
    const selectedTalents = Object.assign({}, this.data.selectedTalents);
    const talentSelected = Object.assign({}, this.data.talentSelected);
    
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

  // 装备输入处理
  onEquipmentInput(e: any) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    // 更新装备名称
    const equipmentList = this.data.equipmentList.slice();
    equipmentList[index].name = value;

    // 如果输入为空，清空相关数据
    if (!value.trim()) {
      equipmentList[index].imageUrl = '';
      equipmentList[index].matched = false;
      equipmentList[index].suggestions = [];
    } else {
      // 实时匹配装备
      this.matchEquipment(index, value);
    }

    this.setData({
      equipmentList: equipmentList
    });

    // 保持兼容性
    this.setData({
      equipment: this.getEquipmentText()
    });
  },

  // 装备失焦处理
  onEquipmentBlur(e: any) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;

    if (value.trim()) {
      // 失焦时进行最终匹配
      this.finalizeEquipmentMatch(index, value);
    }
  },

  // 实时装备匹配
  async matchEquipment(index: number, equipmentName: string) {
    if (!equipmentName.trim()) return;

    try {
      const equipmentList = this.data.equipmentList.slice();

      // 如果输入少于2个字符，不进行匹配，但显示提示
      if (equipmentName.trim().length < 2) {
        equipmentList[index].matched = false;
        equipmentList[index].imageUrl = '';
        equipmentList[index].suggestions = [];
        this.setData({
          equipmentList: equipmentList
        });
        return;
      }

      // 导入装备匹配功能
      const { findEquipmentByName, getEquipmentImageUrl } = require('../../utils/equipmentMatcher');

      // 查找匹配的装备
      const matchedEquipment = findEquipmentByName(equipmentName);

      if (matchedEquipment) {
        // 找到匹配的装备
        equipmentList[index].matched = true;
        equipmentList[index].imageUrl = await getEquipmentImageUrl(equipmentName);
        equipmentList[index].suggestions = [];
      } else {
        // 未找到匹配，生成建议
        equipmentList[index].matched = false;
        equipmentList[index].imageUrl = '';
        equipmentList[index].suggestions = this.generateEquipmentSuggestions(equipmentName);
      }

      this.setData({
        equipmentList: equipmentList
      });
    } catch (error) {
      console.error('装备匹配失败:', error);
    }
  },

  // 最终装备匹配
  async finalizeEquipmentMatch(index: number, equipmentName: string) {
    if (!equipmentName.trim()) return;

    try {
      // 导入装备匹配功能
      const { findEquipmentByName, getEquipmentImageUrl } = require('../../utils/equipmentMatcher');

      const matchedEquipment = findEquipmentByName(equipmentName);

      const equipmentList = this.data.equipmentList.slice();

      if (matchedEquipment) {
        equipmentList[index].matched = true;
        equipmentList[index].imageUrl = await getEquipmentImageUrl(equipmentName);
        equipmentList[index].suggestions = [];
      } else {
        equipmentList[index].matched = false;
        equipmentList[index].imageUrl = '';
        equipmentList[index].suggestions = [];
      }

      this.setData({
        equipmentList: equipmentList
      });
    } catch (error) {
      console.error('最终装备匹配失败:', error);
    }
  },

  // 生成装备建议
  generateEquipmentSuggestions(input: string): any[] {
    if (!input || input.trim().length < 2) return [];

    // 导入装备建议功能
    const { getEquipmentSuggestions } = require('../../utils/equipmentMatcher');

    try {
      const suggestions = getEquipmentSuggestions(input, 3); // 最多显示3个建议
      return suggestions.map(equipment => ({
        name: equipment.name,
        imageUrl: '../images/unused/default-avatar.png'      
      }));
    } catch (error) {
      console.error('生成装备建议失败:', error);
      return [];
    }
  },

  // 选择装备建议
  selectEquipmentSuggestion(e: any) {
    const mainIndex = e.currentTarget.dataset.mainIndex;
    const suggestionName = e.currentTarget.dataset.suggestionName;

    const equipmentList = this.data.equipmentList.slice();
    equipmentList[mainIndex].name = suggestionName;
    equipmentList[mainIndex].matched = true;
    equipmentList[mainIndex].suggestions = [];

    // 导入装备匹配功能
    const { getEquipmentImageUrl } = require('../../utils/equipmentMatcher');

    // 获取装备图片
    getEquipmentImageUrl(suggestionName).then(imageUrl => {
      equipmentList[mainIndex].imageUrl = imageUrl;
      this.setData({
        equipmentList: equipmentList
      });
    });

    this.setData({
      equipmentList: equipmentList
    });

    // 保持兼容性
    this.setData({
      equipment: this.getEquipmentText()
    });
  },

  // 获取装备文本
  getEquipmentText(): string {
    return this.data.equipmentList
      .map(item => item.name)
      .filter(name => name && name.trim())
      .join('、');
  },

  // 输入方案思路
  onDescriptionInput(e: any) {
    this.setData({
      planDescription: e.detail.value
    });
  },

  // 输入方案名称
  onTitleInput(e: any) {
    this.setData({
      planTitle: e.detail.value
    });
  },

  // 输入作者名称
  onAuthorInput(e: any) {
    this.setData({
      authorName: e.detail.value
    });
  },

  // 选择体验服选项
  selectBetaOption(e: any) {
    const value = e.currentTarget.dataset.value === 'true';
    this.setData({
      isBetaPlan: value
    });
  },

  // 下一步
  nextStep() {
    var currentStep = this.data.currentStep;
    if (currentStep < 6) {
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
    const { selectedCores, selectedTalents, equipmentList, planDescription, planTitle, authorName } = this.data;
    
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
    
    // 检查装备是否填写
    const equipmentNames = equipmentList
      .map(item => item.name)
      .filter(name => name.trim());
    
    if (equipmentNames.length === 0) {
      wx.showToast({
        title: '请输入出装推荐',
        icon: 'none'
      });
      return false;
    }
    
    // 检查装备名称是否有效（不能都是相同的简单字符）
    const uniqueNames = Array.from(new Set(equipmentNames)) as string[];
    if (uniqueNames.length === 1 && uniqueNames[0].length <= 2) {
      wx.showToast({
        title: '请输入有效的装备名称',
        icon: 'none'
      });
      return false;
    }
    
    // 检查方案思路是否填写
    if (!planDescription.trim()) {
      wx.showToast({
        title: '请输入方案思路',
        icon: 'none'
      });
      return false;
    }

    // 检查方案名称是否填写
    if (!planTitle.trim()) {
      wx.showToast({
        title: '请输入方案名称',
        icon: 'none'
      });
      return false;
    }

    // 检查作者名称是否填写
    if (!authorName.trim()) {
      wx.showToast({
        title: '请输入作者名称',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 生成方案
  async generatePlan() {
    try {
      // 验证技能选择
      if (!this.validateSkillSelection()) {
        return;
      }

      // 获取核心技能名称
      const coreNames = {
        skillOne: this.data.heroSkills.skillOne.cores[this.data.selectedCores.skillOne]?.name || '',
        skillTwo: this.data.heroSkills.skillTwo.cores[this.data.selectedCores.skillTwo]?.name || '',
        skillThree: this.data.heroSkills.skillThree.cores[this.data.selectedCores.skillThree]?.name || ''
      };
      
      // 获取天赋名称
      const talentNames = {
        skillOne: this.data.selectedTalents.skillOne.map(index => this.data.heroSkills.skillOne.talents[index]?.name || ''),
        skillTwo: this.data.selectedTalents.skillTwo.map(index => this.data.heroSkills.skillTwo.talents[index]?.name || ''),
        skillThree: this.data.selectedTalents.skillThree.map(index => this.data.heroSkills.skillThree.talents[index]?.name || '')
      };
      
      // 获取装备数据
      const equipmentData = this.data.equipmentList.map(item => ({
        name: item.name,
        imageUrl: item.imageUrl
      }));



      const planData = {
        heroId: this.data.heroId,
        heroName: this.data.hero,
        title: this.data.planTitle || this.data.hero + ' - 技能流派方案',
        description: this.data.planDescription,
        // 修改数据格式以匹配方案详情页期望的格式
        skillOne: {
          core: this.data.heroSkills.skillOne.cores[this.data.selectedCores.skillOne],
          talents: this.data.selectedTalents.skillOne.map(index => this.data.heroSkills.skillOne.talents[index])
        },
        skillTwo: {
          core: this.data.heroSkills.skillTwo.cores[this.data.selectedCores.skillTwo],
          talents: this.data.selectedTalents.skillTwo.map(index => this.data.heroSkills.skillTwo.talents[index])
        },
        skillThree: {
          core: this.data.heroSkills.skillThree.cores[this.data.selectedCores.skillThree],
          talents: this.data.selectedTalents.skillThree.map(index => this.data.heroSkills.skillThree.talents[index])
        },
        equipment: equipmentData,
        equipmentText: this.getEquipmentText(),
        strategy: this.data.planDescription,
        authorName: this.data.authorName,
        isBetaPlan: this.data.isBetaPlan
      };

      // 根据模式决定处理方式
      if (this.data.editMode) {
        // 编辑模式：更新方案
        const result = await wx.cloud.callFunction({
          name: 'updatePlan',
          data: {
            planId: this.data.planId,
            planData: planData
          }
        }) as any;

        if (result.result && result.result.success) {
          wx.showToast({
            title: '方案更新成功',
            icon: 'success'
          });
          
          // 编辑模式保存成功后跳转到方案详情页，传递强制刷新参数
          setTimeout(() => {
            wx.redirectTo({
              url: `../planDetail/planDetail?planId=${this.data.planId}&forceRefresh=true`
            });
          }, 1500);
        } else {
          wx.showToast({
            title: result.result?.message || '更新失败',
            icon: 'error'
          });
        }
      } else if (this.data.isDevelopment) {
        // 开发环境：上传到数据库
        const result = await wx.cloud.callFunction({
          name: 'createPlan',
          data: planData
        }) as any;

        if (result.result && result.result.success) {
          wx.showToast({
            title: '方案创建成功',
            icon: 'success'
          });
          
          // 准备跳转到生成一图流页面的数据
          const imageData = {
            heroName: this.data.hero,
            heroImageUrl: this.data.heroImageUrl || '../images/unused/default-avatar.png',
            title: this.data.planTitle || this.data.hero + ' - 技能流派方案',
            authorName: this.data.authorName,
            skillOne: {
              core: this.data.heroSkills.skillOne.cores[this.data.selectedCores.skillOne],
              talents: this.data.selectedTalents.skillOne.map(index => this.data.heroSkills.skillOne.talents[index])
            },
            skillTwo: {
              core: this.data.heroSkills.skillTwo.cores[this.data.selectedCores.skillTwo],
              talents: this.data.selectedTalents.skillTwo.map(index => this.data.heroSkills.skillTwo.talents[index])
            },
            skillThree: {
              core: this.data.heroSkills.skillThree.cores[this.data.selectedCores.skillThree],
              talents: this.data.selectedTalents.skillThree.map(index => this.data.heroSkills.skillThree.talents[index])
            },
            equipment: equipmentData,
            strategy: this.data.planDescription
          };
          
          // 跳转到生成一图流页面
          wx.navigateTo({
            url: `/pages/generateImage/generateImage?planData=${encodeURIComponent(JSON.stringify(imageData))}`
          });
        } else {
          wx.showToast({
            title: result.result?.message || '创建失败',
            icon: 'error'
          });
        }
      } else {
        // 用户环境：只生成一图流浏览
        wx.showToast({
          title: '方案生成成功',
          icon: 'success'
        });
        
        // 准备跳转到生成一图流页面的数据
        const imageData = {
          heroName: this.data.hero,
          heroImageUrl: this.data.heroImageUrl || '../images/unused/default-avatar.png',
          title: this.data.planTitle || this.data.hero + ' - 技能流派方案',
          authorName: this.data.authorName,
          skillOne: {
            core: this.data.heroSkills.skillOne.cores[this.data.selectedCores.skillOne],
            talents: this.data.selectedTalents.skillOne.map(index => this.data.heroSkills.skillOne.talents[index])
          },
          skillTwo: {
            core: this.data.heroSkills.skillTwo.cores[this.data.selectedCores.skillTwo],
            talents: this.data.selectedTalents.skillTwo.map(index => this.data.heroSkills.skillTwo.talents[index])
          },
          skillThree: {
            core: this.data.heroSkills.skillThree.cores[this.data.selectedCores.skillThree],
            talents: this.data.selectedTalents.skillThree.map(index => this.data.heroSkills.skillThree.talents[index])
          },
          equipment: equipmentData,
          strategy: this.data.planDescription
        };
        
        // 跳转到生成一图流页面
        wx.navigateTo({
          url: `/pages/generateImage/generateImage?planData=${encodeURIComponent(JSON.stringify(imageData))}`
        });
      }
    } catch (error) {
      wx.showToast({
        title: '创建失败',
        icon: 'error'
      });
    }
  },

  // 显示装备提示
  showEquipmentHint() {
    wx.showModal({
      title: '装备匹配规则',
      content: '1. 输入装备名称即可自动匹配\n\n2. 输入至少2个字符开始匹配\n\n3. 如果2个字符匹配不到，请继续输入更多字符\n\n4. 匹配成功会显示装备图标\n\n5. 每个装备最多输入10个字符',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 从英雄分类中选择
  selectFromCategory() {
    wx.navigateTo({
      url: '../heroCategory/heroCategory?source=createPlan'
    });
  }
}); 