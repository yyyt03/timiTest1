// 方案详情页面 - 优化头像获取
import { getHeroById, getHeroByName } from '../../data/localHeroData';
import { callFunction } from '../../utils/cloud';
import { cacheManager } from '../../utils/cacheManager';

interface PlanData {
  _id?: string;
  title?: string;
  heroName?: string;
  heroId?: string;
  heroAvatar?: string;
  skillOne?: any;
  skillTwo?: any;
  skillThree?: any;
  isFavorited?: boolean;
  [key: string]: any;
}

interface CloudFunctionResult {
  success?: boolean;
  data?: any;
  message?: string;
  [key: string]: any;
}

// 方案详情缓存数据接口
interface PlanDetailCacheData {
  plan: PlanData;
  timestamp: number;
  planId: string;
}

Page({
  data: {
    plan: {} as PlanData,
    loading: true,
    planId: ''
  },

  onLoad(options: any) {
    console.log('方案详情页面接收到的参数:', options);
    
    // 支持id和planId两种参数名
    const planId = options.id || options.planId;
    const forceRefresh = options.forceRefresh === 'true';
    // 如果从创建/编辑页传来初始数据，先展示，避免缓存延迟导致的不同步
    if (options.initialPlan) {
      try {
        const initialPlan = JSON.parse(decodeURIComponent(options.initialPlan));
        // 规范化优先字段，若已带 flags 则直接使用以优化首屏
        const normalizedPlan = (function normalize(p: any) {
          const skills = ['skillOne', 'skillTwo', 'skillThree'];
          const n: any = { ...p };
          skills.forEach((key) => {
            if (n[key]) {
              if (n[key].priorityCore !== undefined && n[key].priorityCore !== null) {
                const coreNum = Number(n[key].priorityCore);
                n[key].priorityCore = Number.isFinite(coreNum) ? coreNum : -1;
              }
              if (Array.isArray(n[key].priorityTalents)) {
                n[key].priorityTalents = n[key].priorityTalents.map((v: any) => Number(v)).filter((v: any) => Number.isFinite(v));
                // 先不直接生成 flags（plan.talents 是选中子集，priorityTalents 是全量索引）
              }
              if (!Array.isArray(n[key].priorityTalentsFlags)) {
                const total = Array.isArray(n[key].talents) ? n[key].talents.length : 0;
                n[key].priorityTalentsFlags = new Array(total).fill(false);
              }
            }
          });
          return n;
        })(initialPlan);

        this.setData({
          plan: normalizedPlan,
          loading: false
        });
        // 已带 flags 则首屏直接用；若为空再异步修正
        const needCompute = ['skillOne','skillTwo','skillThree'].some((k) =>
          Array.isArray((normalizedPlan as any)[k]?.priorityTalentsFlags) &&
          (normalizedPlan as any)[k].priorityTalentsFlags.length === 0
        );
        if (needCompute && normalizedPlan.heroId) {
          this.loadHeroSkillsAndComputeFlags(normalizedPlan.heroId, normalizedPlan);
        }
      } catch (e) {
        console.warn('解析 initialPlan 失败:', e);
      }
    }
    
    if (planId) {
      this.setData({
        planId: planId
      });
      
      // 如果有传递收藏状态，先设置到本地数据
      if (options.isFavorited !== undefined) {
        this.setData({
          'plan.isFavorited': options.isFavorited === 'true'
        });
      }
      
      this.loadPlanDetail(planId, forceRefresh);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 基于全量英雄技能数据计算“选中子集”的优选 flags
  computeFlagsForSkill(planSkill: any, heroSkillTalents: any[]): boolean[] {
    if (!planSkill || !Array.isArray(planSkill.talents) || !Array.isArray(heroSkillTalents)) {
      return new Array((planSkill?.talents || []).length).fill(false);
    }
    const flags = new Array(planSkill.talents.length).fill(false) as boolean[];
    for (let i = 0; i < planSkill.talents.length; i++) {
      const talentName = planSkill.talents[i]?.name;
      if (!talentName) continue;
      const absoluteIndex = heroSkillTalents.findIndex((t: any) => t?.name === talentName);
      if (absoluteIndex > -1 && Array.isArray(planSkill.priorityTalents) && planSkill.priorityTalents.indexOf(absoluteIndex) > -1) {
        flags[i] = true;
      }
    }
    return flags;
  },

  async loadHeroSkillsAndComputeFlags(heroId: string, planObj?: any) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getHeroSkills',
        data: { heroId }
      }) as any;
      if (result.result && result.result.success) {
        const skillsData = result.result.data?.skills;
        if (!skillsData) return;
        const plan: any = planObj || this.data.plan;
        const updated: any = { ...plan };
        if (updated.skillOne) {
          updated.skillOne.priorityTalentsFlags = this.computeFlagsForSkill(updated.skillOne, skillsData.skillOne.talents || []);
        }
        if (updated.skillTwo) {
          updated.skillTwo.priorityTalentsFlags = this.computeFlagsForSkill(updated.skillTwo, skillsData.skillTwo.talents || []);
        }
        if (updated.skillThree) {
          updated.skillThree.priorityTalentsFlags = this.computeFlagsForSkill(updated.skillThree, skillsData.skillThree.talents || []);
        }
        this.setData({ plan: updated });
      }
    } catch (e) {
      console.warn('加载英雄技能用于计算 flags 失败:', e);
    }
  },

  // 加载方案详情
  async loadPlanDetail(planId: string, forceRefresh: boolean = false) {
    this.setData({ loading: true });
    
    try {
      // 如果不是强制刷新，先尝试从缓存获取数据
      if (!forceRefresh) {
        const cacheKey = `plan_detail_${planId}`;
        const cachedData = cacheManager.get<PlanDetailCacheData>(cacheKey);
        
        if (cachedData && cachedData.plan && cachedData.plan._id === planId) {
          console.log('使用缓存的方案详情数据:', planId);
          // 保留传递过来的收藏状态，避免被缓存数据覆盖
          const currentIsFavorited = this.data.plan.isFavorited;
          const cachedPlan = {
            ...cachedData.plan,
            isFavorited: currentIsFavorited !== undefined ? currentIsFavorited : cachedData.plan.isFavorited
          };
          
          this.setData({
            plan: cachedPlan,
            loading: false
          });
          
          // 设置导航栏标题
          wx.setNavigationBarTitle({
            title: cachedPlan.title || cachedPlan.heroName + '的方案'
          });
          
          // 异步获取英雄头像，不阻塞页面显示
          this.getHeroAvatar(cachedPlan.heroName, cachedPlan.heroId);
          
          return;
        }
      }

      const result = await wx.cloud.callFunction({
        name: 'getPlanDetail',
        data: { planId, forceRefresh }
      }) as any;
      
      if (result.result && result.result.success) {
        const plan = result.result.data;
        
        console.log('获取到的方案数据:', plan);
        
        // 先规范化优先字段的类型，避免字符串与数字不一致导致前端 indexOf 失败
        const normalizePlan = (p: any) => {
          const skills = ['skillOne', 'skillTwo', 'skillThree'];
          const normalized: any = { ...p };
          skills.forEach((key) => {
            if (normalized[key]) {
              // 规范化 priorityCore
              if (normalized[key].priorityCore !== undefined && normalized[key].priorityCore !== null) {
                const coreNum = Number(normalized[key].priorityCore);
                normalized[key].priorityCore = Number.isFinite(coreNum) ? coreNum : -1;
              }
              // 规范化 priorityTalents
              if (Array.isArray(normalized[key].priorityTalents)) {
                normalized[key].priorityTalents = normalized[key].priorityTalents
                  .map((v: any) => Number(v))
                  .filter((v: any) => Number.isFinite(v));
              // 不在此处直接生成 flags，避免选中子集与全量索引错位
              }
            }
          });
          return normalized;
        };

        const normalizedPlan = normalizePlan(plan);

        // 先设置方案数据，避免页面空白
        // 保留传递过来的收藏状态，避免被服务器数据覆盖
        const currentIsFavorited = this.data.plan.isFavorited;
        const finalPlan = {
          ...normalizedPlan,
          isFavorited: currentIsFavorited !== undefined ? currentIsFavorited : normalizedPlan.isFavorited
        };
        
        this.setData({
          plan: finalPlan,
          loading: false
        });
        
        // 缓存方案详情数据，延长TTL到30分钟
        const cacheKey = `plan_detail_${planId}`;
        const cacheData: PlanDetailCacheData = {
          plan: finalPlan,
          timestamp: Date.now(),
          planId: planId
        };
        cacheManager.set(cacheKey, cacheData, 30 * 60 * 1000); // 30分钟TTL
        console.log('方案详情数据已缓存:', planId);
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: plan.title || plan.heroName + '的方案'
        });
        
        // 异步获取英雄头像，不阻塞页面显示
        this.getHeroAvatar(plan.heroName, plan.heroId);

        // 依据全量技能数据映射 flags，避免覆盖 initialPlan 的正确显示
        // 只有在没有缓存的情况下才调用云函数
        if (plan.heroId && !this.data.plan.skillOne?.priorityTalentsFlags?.length) {
          this.loadHeroSkillsAndComputeFlags(plan.heroId, this.data.plan);
        }
        
      } else {
        wx.showToast({
          title: '加载方案详情失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载方案详情失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 获取英雄头像 - 使用本地数据
  getHeroAvatar(heroName: string, heroId?: string) {
    try {
      let avatarUrl = null;
      
      // 优先使用heroId获取头像
      if (heroId) {
        console.log('使用heroId获取头像:', heroId);
        const hero = getHeroById(heroId);
        if (hero) {
          avatarUrl = hero.avatar;
        }
      }
      
      // 如果heroId没有找到，尝试通过英雄名称查找
      if (!avatarUrl && heroName) {
        console.log('通过英雄名称查找头像:', heroName);
        const hero = getHeroByName(heroName);
        if (hero) {
          avatarUrl = hero.avatar;
        }
      }
      
      // 如果还是没有找到，使用默认头像
      if (!avatarUrl) {
        console.log('使用默认头像');
        avatarUrl = '../images/unused/default-avatar.png';
      }
      
      // 更新头像
      this.setData({
        'plan.heroAvatar': avatarUrl
      });
      
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      this.setData({
        'plan.heroAvatar': '../images/unused/default-avatar.png'
      });
    }
  },





  // 切换收藏状态
  async toggleFavorite() {
    const plan = this.data.plan;
    const isFavorited = !plan.isFavorited;
    
    try {
      const result = await callFunction('toggleFavorite', {
        planId: plan._id,
        action: isFavorited ? 'add' : 'remove'
      }) as CloudFunctionResult;
      
      if (result && result.success) {
        this.setData({
          'plan.isFavorited': isFavorited
        });
        
        // 更新缓存中的收藏状态
        if (plan._id) {
          const cacheKey = `plan_detail_${plan._id}`;
          const cachedData = cacheManager.get<PlanDetailCacheData>(cacheKey);
          if (cachedData) {
            cachedData.plan.isFavorited = isFavorited;
            cacheManager.set(cacheKey, cachedData, 10 * 60 * 1000); // 保持原有TTL
            console.log('缓存中的收藏状态已更新:', isFavorited);
          }
        }
        
        wx.showToast({
          title: isFavorited ? '收藏成功' : '取消收藏',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 页面分享
  onShareAppMessage() {
    const plan = this.data.plan;
    return {
      title: `${plan.heroName} - ${plan.title}`,
      path: `/pages/planDetail/planDetail?planId=${plan._id}`
    };
  },

  // 页面卸载时缓存方案详情数据
  onUnload() {
    try {
      // 缓存当前方案详情数据，供其他页面使用
      const plan = this.data.plan;
      if (plan && plan._id) {
        const cacheKey = `plan_detail_${plan._id}`;
        const cacheData: PlanDetailCacheData = {
          plan: plan,
          timestamp: Date.now(),
          planId: plan._id
        };
        
        cacheManager.set(cacheKey, cacheData, 30 * 60 * 1000); // 30分钟TTL
        console.log('方案详情页面卸载，已缓存方案详情数据:', plan._id);
      }
    } catch (error) {
      console.warn('缓存方案详情数据失败:', error);
    }
  }
}); 