import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById, getHeroByName } from '../../data/localHeroData';
import { avatarCache } from '../../utils/avatarCache';
import cacheManager from '../../utils/cacheManager';
import { CACHE_KEYS } from '../../utils/cacheKeys';
import { notifyFavoriteAdded, notifyFavoriteRemoved, notifyLikeAdded, notifyLikeRemoved, favoriteSyncManager, interactionSyncManager } from '../../utils/favoriteSync';
import { debounceOperation } from '../../utils/debounce';


// 推荐方案页面
Page({
  data: {
    // 页面数据
    recommendPlanIcon: getRecommendPlanIcon(),
    likeOutlineIcon: getLikeIcon(false),
    likeFilledIcon: getLikeIcon(true),
    favoriteOutlineIcon: getFavoriteIcon(false),
    favoriteFilledIcon: getFavoriteIcon(true),
    emptyIcon: getEmptyIcon('favorites'),
    
    // 筛选状态
    currentMode: 'hot', // recommended: 推荐方案, hot: 热门方案, latest: 最新方案
    selectedHero: 'all',
    showHeroSelector: false,
    
    // 加载状态
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
         // 英雄分类相关 - 为每个模式维护独立数据
     heroCategories: [] as any[], // 当前模式的英雄分类列表
     allRecommendPlans: [] as any[], // 当前模式的所有方案数据
     originalAllPlans: [] as any[], // 保存完整的hot模式数据，用于模式切换时恢复
     total: 0,
    
    // 推荐方案列表
    recommendPlans: [] as any[],
    
    // 为每个模式缓存数据，避免重复请求
    modeDataCache: {
      recommended: {
        heroCategories: [] as any[],
        allPlans: [] as any[],
        total: 0
      },
      hot: {
        heroCategories: [] as any[],
        allPlans: [] as any[],
        total: 0
      },
      latest: {
        heroCategories: [] as any[],
        allPlans: [] as any[],
        total: 0
      }
    },
    
    // 添加页面状态标记
    isDataLoaded: false, // 数据是否已加载
    lastLoadTime: 0, // 最后加载时间
    lastModeSwitchTime: 0, // 最后模式切换时间
    isFiltering: false, // 是否正在筛选
    lastFilterTime: 0, // 最后筛选时间
    filterDebounceTimer: null as any, // 防抖定时器
    
    // 添加请求状态管理
    currentRequestId: 0 // 当前请求ID，用于取消过期的请求
  },

  // 收藏状态变化处理器
  favoriteChangeHandler: null as any,
  // 点赞状态变化处理器
  likeChangeHandler: null as any,
  // 统一交互状态变化处理器
  interactionChangeHandler: null as any,

  // 防抖版本的筛选器切换函数
  debouncedSwitchFilter: null as any,
 
  // 生命周期函数--监听页面加载
  onLoad() {
    console.log('推荐方案页面 onLoad 触发');
    
    // 初始化时间状态，避免时间判断错误
    const now = Date.now();
    this.setData({
      lastLoadTime: now,
      lastModeSwitchTime: now
    });
    
    // 设置收藏状态变化监听器
    this.setupFavoriteChangeListener();
    // 设置点赞状态变化监听器
    this.setupLikeChangeListener();
    // 设置统一交互状态变化监听器
    this.setupInteractionChangeListener();
    
    // 初始化防抖版本的筛选器切换函数（500ms防抖，避免快速切换）
    this.debouncedSwitchFilter = debounceOperation('recommendSwitchFilter', this.switchFilter.bind(this), 500, {
      leading: false,
      trailing: true,
      maxWait: 2000 // 最大等待2秒
    });
    
    // 从strategy进入时，强制重置为全部英雄状态，不管之前是否有筛选
    console.log('从strategy进入，强制重置为全部英雄状态');
    this.resetFilterState();
    
    // 然后初始化页面数据 - 根据当前模式加载对应数据
    console.log('初始化页面数据，模式:', this.data.currentMode, '英雄:', this.data.selectedHero);
    this.initModeHeroList(this.data.currentMode, this.data.currentRequestId); // 根据当前模式初始化
    this.loadRecommendPlans(false, this.data.currentRequestId);
  },

  // 页面数据变化监听
  onDataChange() {
    // 页面数据变化监听
  },

  onShow() {
    console.log('推荐方案页面 onShow 触发');
    
    // 优先检查交互状态变化（收藏和点赞）
    if (this.checkInteractionChanges()) {
      console.log('检测到交互状态变化，需要刷新数据');
      this.loadRecommendPlans(false, this.data.currentRequestId);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastLoad = now - this.data.lastLoadTime;
    const timeSinceLastModeSwitch = now - this.data.lastModeSwitchTime;
    
    console.log('时间检查:', {
      timeSinceLastLoad: timeSinceLastLoad,
      timeSinceLastModeSwitch: timeSinceLastModeSwitch,
      isDataLoaded: this.data.isDataLoaded,
      currentMode: this.data.currentMode,
      selectedHero: this.data.selectedHero
    });
    
    // 等待状态稳定后再处理数据
    setTimeout(() => {
      // 只有在以下情况才重新加载：
      // 1. 数据未加载
      // 2. 距离上次加载超过10分钟
      // 3. 距离上次模式切换超过2分钟（确保模式切换后的数据同步）
      // 注意：如果lastModeSwitchTime为0或异常值，跳过模式切换时间检查
      const shouldReload = !this.data.isDataLoaded || 
          timeSinceLastLoad > 10 * 60 * 1000 || 
          (this.data.lastModeSwitchTime > 0 && timeSinceLastModeSwitch > 2 * 60 * 1000);
      
      if (shouldReload) {
        console.log('需要重新加载数据');
        this.loadRecommendPlans(false, this.data.currentRequestId);
      } else {
        console.log('数据已加载且未过期，保持现有数据');
        // 如果数据已加载且未过期，且当前有英雄筛选，需要重新筛选数据
        if (this.data.allRecommendPlans.length > 0 && this.data.selectedHero !== 'all') {
          console.log('当前有英雄筛选，重新筛选数据，当前数据量:', this.data.allRecommendPlans.length);
          this.filterRecommendPlansByHero();
        } else {
          console.log('当前显示全部英雄或无数据，跳过筛选');
        }
      }
    }, 50); // 等待50ms确保状态稳定
  },

  // 页面隐藏时保存筛选状态
  onHide() {
    console.log('推荐方案页面 onHide 触发，保存筛选状态');
    this.saveFilterState();
  },

  // 页面卸载时保存筛选状态
  onUnload() {
    console.log('推荐方案页面 onUnload 触发，保存筛选状态');
    this.saveFilterState();
    
    // 移除收藏状态变化监听器
    this.cleanupFavoriteChangeListener();
    // 移除点赞状态变化监听器
    this.cleanupLikeChangeListener();
    // 移除统一交互状态变化监听器
    this.cleanupInteractionChangeListener();
    
    // 清理防抖定时器
    if (this.debouncedSwitchFilter) {
      this.debouncedSwitchFilter.cancel();
      this.debouncedSwitchFilter = null;
      console.log('推荐方案防抖定时器已清理');
    }
    
    // 清理页面定时器
    if (this.data.filterDebounceTimer) {
      clearTimeout(this.data.filterDebounceTimer);
      this.setData({
        filterDebounceTimer: null
      });
      console.log('页面定时器已清理');
    }
  },

  // 保存筛选状态到本地存储
  saveFilterState() {
    try {
      const filterState = {
        currentMode: this.data.currentMode,
        selectedHero: this.data.selectedHero,
        timestamp: Date.now()
      };
      wx.setStorageSync('recommendPlan_filter_state', filterState);
      console.log('已保存筛选状态到本地存储:', filterState);
    } catch (error) {
      console.warn('保存筛选状态失败:', error);
    }
  },

  // 从本地存储恢复筛选状态
  restoreFilterState() {
    try {
      const filterState = wx.getStorageSync('recommendPlan_filter_state');
      console.log('尝试恢复筛选状态，当前状态:', {
        currentMode: this.data.currentMode,
        selectedHero: this.data.selectedHero,
        isDataLoaded: this.data.isDataLoaded
      });
      
      if (filterState && filterState.timestamp) {
        const now = Date.now();
        const timeDiff = now - filterState.timestamp;
        
        console.log('找到缓存的筛选状态:', filterState, '时间差:', timeDiff, 'ms');
        
        // 如果筛选状态在30分钟内，则恢复
        if (timeDiff < 30 * 60 * 1000) {
          let needUpdate = false;
          
          // 恢复模式
          if (filterState.currentMode && filterState.currentMode !== this.data.currentMode) {
            console.log('恢复模式:', this.data.currentMode, '->', filterState.currentMode);
            this.setData({
              currentMode: filterState.currentMode
            });
            needUpdate = true;
          }
          
          // 恢复英雄筛选
          if (filterState.selectedHero && filterState.selectedHero !== this.data.selectedHero) {
            console.log('恢复英雄筛选:', this.data.selectedHero, '->', filterState.selectedHero);
            this.setData({
              selectedHero: filterState.selectedHero
            });
            needUpdate = true;
          }
          
          if (needUpdate) {
            console.log('筛选状态已恢复，准备重新筛选数据');
            // 如果数据已加载，立即重新筛选
            if (this.data.isDataLoaded && this.data.allRecommendPlans.length > 0) {
              console.log('数据已加载，立即重新筛选，当前数据量:', this.data.allRecommendPlans.length);
              // 使用setTimeout确保状态更新完成后再筛选
              setTimeout(() => {
                this.filterRecommendPlansByHero();
              }, 0);
            } else {
              console.log('数据未加载或为空，等待数据加载完成');
            }
            return true; // 返回true表示恢复了筛选状态
          } else {
            console.log('筛选状态无需更新');
            return false; // 返回false表示无需更新
          }
        } else {
          console.log('筛选状态已过期，不恢复');
          // 清除过期的筛选状态
          try {
            wx.removeStorageSync('recommendPlan_filter_state');
            console.log('已清除过期的筛选状态');
          } catch (clearError) {
            console.warn('清除过期筛选状态失败:', clearError);
          }
          return false;
        }
      } else {
        console.log('未找到缓存的筛选状态');
        return false;
      }
    } catch (error) {
      console.warn('恢复筛选状态失败:', error);
      // 清除可能损坏的筛选状态
      try {
        wx.removeStorageSync('recommendPlan_filter_state');
        console.log('已清除损坏的筛选状态');
      } catch (clearError) {
        console.warn('清除损坏筛选状态失败:', clearError);
      }
      return false;
    }
  },

  // 重置筛选状态为默认值
  resetFilterState() {
    console.log('重置筛选状态为默认值');
    this.setData({
      currentMode: 'hot',
      selectedHero: 'all'
    });
    
    // 清除本地存储的筛选状态
    try {
      wx.removeStorageSync('recommendPlan_filter_state');
      console.log('已清除本地存储的筛选状态');
    } catch (error) {
      console.warn('清除本地存储筛选状态失败:', error);
    }
  },

  // 初始化英雄列表 - 基于已有方案
  async initHeroList() {
    try {
      // 获取所有推荐方案，从中提取英雄列表
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: 'hot',
          page: 1,
          pageSize: 100, // 获取更多数据以提取英雄列表
          includeBetaPlans: true // 包含体验服方案，确保isBetaPlan字段正确设置
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans } = result.result.data;
        
        // 保存所有方案数据用于分类
        this.setData({
          allRecommendPlans: plans,
          total: plans.length
        });
        
        // 生成英雄分类
        this.generateHeroCategories();
      }
    } catch (error) {
      console.error('初始化英雄列表失败:', error);
    }
  },

  // 初始化指定模式的英雄分类
  async initModeHeroList(mode: string, requestId: number) {
    try {
      console.log(`开始初始化${mode}模式的英雄分类，请求ID:`, requestId);
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过英雄分类初始化，请求ID:', requestId);
        return;
      }
      
      // 重要：英雄筛选器应该基于当前模式的实际数据，确保数据一致性
      // 对于recommended模式，英雄筛选器只显示实际有推荐方案的英雄
      let heroCategories: any[] = [];
      let allPlans: any[] = [];
      
      // 首先尝试从当前模式缓存获取数据
      const currentModeCacheKey = `timi:plan:data:herolist_${mode}:v1`;
      const currentModeCachedData = cacheManager.get(currentModeCacheKey) as any;
      
      if (currentModeCachedData && currentModeCachedData.heroCategories && currentModeCachedData.heroCategories.length > 0) {
        console.log(`使用${mode}模式缓存的英雄分类数据，确保数据一致性`);
        heroCategories = currentModeCachedData.heroCategories;
        allPlans = currentModeCachedData.allPlans || [];
        
        // 直接使用缓存数据，无需重新获取
        console.log(`使用缓存的${mode}模式数据，英雄数量:`, heroCategories.length);
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          originalAllPlans: allPlans,
          allRecommendPlans: allPlans,
          recommendPlans: allPlans,
          total: allPlans.length,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });
        
        // 更新缓存
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = heroCategories;
        modeCache.allPlans = allPlans;
        modeCache.total = allPlans.length;
        
        // 强制刷新页面数据，确保头像能正确显示
        setTimeout(() => {
          // 最后一次检查请求是否已被取消
          if (requestId !== this.data.currentRequestId) {
            console.log('请求已被取消，跳过页面数据更新，请求ID:', requestId);
            return;
          }
          
          this.setData({
            heroCategories: heroCategories
          });
          
          // 英雄分类初始化完成后，只有在当前有英雄筛选时才重新筛选
          if (this.data.selectedHero !== 'all') {
            console.log('英雄分类初始化完成，根据当前筛选状态重新筛选');
            setTimeout(() => {
              this.filterRecommendPlansByHero();
            }, 50);
          } else {
            console.log('英雄分类初始化完成，当前显示全部方案，无需筛选');
          }
        }, 100);
        
        return; // 成功使用缓存数据，直接返回
      }
      
      // 如果没有缓存数据，需要获取当前模式的数据
      console.log(`没有${mode}模式缓存，需要获取${mode}模式数据来生成英雄分类`);
      
      // 获取指定模式的所有方案数据
      const requestData: any = {
        page: 1,
        pageSize: 100, // 获取更多数据以提取英雄列表
        includeBetaPlans: true // 包含体验服方案，确保isBetaPlan字段正确设置
      };
      
      if (mode === 'recommended') {
        // recommended模式：获取审核标记为推荐的方案
        requestData.isRecommended = true;
        console.log('recommended模式：获取审核标记为推荐的方案，请求参数:', requestData);
      } else {
        // hot和latest模式：按模式获取方案
        requestData.mode = mode;
        console.log(`${mode}模式：按模式获取方案，请求参数:`, requestData);
      }
      
      console.log(`调用云函数getRecommendPlans，模式: ${mode}，请求参数:`, requestData);
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: requestData
      }) as any;
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过云函数结果处理，请求ID:', requestId);
        return;
      }
      
      console.log(`云函数getRecommendPlans返回结果:`, result);
      
      if (result.result && result.result.success) {
        const { plans } = result.result.data;
        console.log(`获取到${mode}模式数据，方案数量:`, plans.length);
        
        // 验证recommended模式的数据
        if (mode === 'recommended') {
          const recommendedPlans = plans.filter((plan: any) => plan.isRecommended === true);
          console.log(`recommended模式数据验证: 总方案数${plans.length}，推荐方案数${recommendedPlans.length}`);
          
          if (recommendedPlans.length === 0) {
            console.warn('recommended模式：未找到推荐方案，可能数据有问题');
          }
        }
        
        // 从当前模式数据生成英雄分类，确保英雄筛选器只显示实际有方案的英雄
        heroCategories = await this.generateHeroCategoriesFromPlans(plans);
        
        // 再次检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过英雄分类处理，请求ID:', requestId);
          return;
        }
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
        // 格式化时间
        allPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        // 更新缓存
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = heroCategories;
        modeCache.allPlans = allPlans;
        modeCache.total = plans.length;
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          allRecommendPlans: allPlans,
          originalAllPlans: allPlans, // 保存完整的原始数据
          total: plans.length,
          recommendPlans: allPlans, // 设置显示数据
          [`modeDataCache.${mode}`]: modeCache,
          isDataLoaded: true, // 标记数据已加载
          lastLoadTime: Date.now() // 更新加载时间
        });
        
        console.log(`${mode}模式数据加载完成:`, {
          heroCategoriesCount: heroCategories.length,
          allPlansCount: allPlans.length,
          total: plans.length
        });
        
        // 缓存英雄分类数据，延长TTL到30分钟
        // 为不同模式使用不同的缓存键，确保数据隔离
        const heroListCacheKey = `timi:plan:data:herolist_${mode}:v1`;
        cacheManager.set(heroListCacheKey, {
          heroCategories: heroCategories,
          allPlans: allPlans,
          total: plans.length,
          mode: mode, // 添加模式标识
          isRecommended: mode === 'recommended' // 添加推荐状态标识
        }, 30 * 60 * 1000); // 30分钟TTL
        
        console.log(`已缓存${mode}模式数据，缓存键:`, heroListCacheKey);
        
        // 强制刷新页面数据，确保头像能正确显示
        setTimeout(() => {
          // 最后一次检查请求是否已被取消
          if (requestId !== this.data.currentRequestId) {
            console.log('请求已被取消，跳过页面数据更新，请求ID:', requestId);
            return;
          }
          
          this.setData({
            heroCategories: heroCategories
          });
          
          // 英雄分类初始化完成后，只有在当前有英雄筛选时才重新筛选
          // 避免在显示全部方案时不必要的筛选操作
          if (this.data.selectedHero !== 'all') {
            console.log('英雄分类初始化完成，根据当前筛选状态重新筛选');
            // 使用setTimeout确保数据更新完成后再筛选
            setTimeout(() => {
              this.filterRecommendPlansByHero();
            }, 50);
          } else {
            console.log('英雄分类初始化完成，当前显示全部方案，无需筛选');
          }
        }, 100);
      } else {
        console.error(`${mode}模式数据获取失败:`, result);
      }
      

    } catch (error) {
      console.error(`初始化${mode}模式英雄列表失败:`, error);
    }
  },

  // 切换筛选类型
  // 优化：所有模式之间切换时都复用缓存数据，避免重复请求
  // 因为recommended模式是hot模式的子集，可以通过筛选获得
  async switchFilter(e: any) {
    try {
      const type = e.currentTarget.dataset.type;
      console.log('切换筛选类型:', type, '当前状态:', {
        currentMode: this.data.currentMode,
        selectedHero: this.data.selectedHero,
        isDataLoaded: this.data.isDataLoaded
      });
      
      // 生成新的请求ID，用于取消之前的请求
      const requestId = ++this.data.currentRequestId;
      this.setData({ currentRequestId: requestId });
      
      // 取消所有待处理的请求
      this.cancelPendingRequests();
      
      // 重置英雄选择为全部
      this.setData({
        currentMode: type,
        selectedHero: 'all',
        page: 1, // 重置页码
        lastModeSwitchTime: Date.now() // 记录模式切换时间
      });
      
             // 检查是否可以复用现有缓存数据
       // 所有模式都可以复用，因为recommended模式是hot模式的子集
       if (this.data.isDataLoaded && this.data.originalAllPlans.length > 0) {
         console.log('可以复用缓存数据，模式切换:', this.data.currentMode, '->', type);
         
         let filteredAndSortedPlans: any[];
         
         if (type === 'recommended') {
           // recommended模式：从完整数据中筛选出推荐方案
           console.log('recommended模式：从完整数据中筛选推荐方案');
           const recommendedPlans = this.data.originalAllPlans.filter(plan => plan.isRecommended === true);
           console.log('筛选结果：总方案数', this.data.originalAllPlans.length, '推荐方案数', recommendedPlans.length);
           
           // 对筛选后的方案进行排序
           filteredAndSortedPlans = this.sortPlansByMode(recommendedPlans, type);
           
           // 重要：为recommended模式重新生成英雄分类，确保英雄筛选器只显示有推荐方案的英雄
           const recommendedHeroCategories = await this.generateHeroCategoriesFromPlans(recommendedPlans);
           console.log('recommended模式：重新生成英雄分类，英雄数量:', recommendedHeroCategories.length);
           
           // 更新显示数据，recommended模式使用筛选后的数据
           this.setData({
             currentMode: type,
             recommendPlans: filteredAndSortedPlans,
             allRecommendPlans: filteredAndSortedPlans, // 筛选后的推荐方案数据
             total: filteredAndSortedPlans.length,
             heroCategories: recommendedHeroCategories // 更新英雄分类为推荐方案中的英雄
           });
           console.log('recommended模式：已更新allRecommendPlans和heroCategories，确保英雄筛选器只显示有推荐方案的英雄');
         } else {
           // hot和latest模式：使用完整的原始数据
           filteredAndSortedPlans = this.sortPlansByMode(this.data.originalAllPlans, type);
           
           // 重要：为hot/latest模式重新生成英雄分类，确保英雄筛选器显示所有英雄
           const allHeroCategories = await this.generateHeroCategoriesFromPlans(this.data.originalAllPlans);
           console.log(`${type}模式：重新生成英雄分类，英雄数量:`, allHeroCategories.length);
           
           // 更新显示数据，hot/latest模式使用完整数据
           this.setData({
             currentMode: type,
             recommendPlans: filteredAndSortedPlans,
             allRecommendPlans: this.data.originalAllPlans, // 恢复为完整的原始数据
             total: this.data.originalAllPlans.length,
             heroCategories: allHeroCategories // 更新英雄分类为所有英雄
           });
           console.log(`${type}模式：已恢复allRecommendPlans为完整数据，方案数量:`, this.data.originalAllPlans.length, '，英雄数量:', allHeroCategories.length);
         }
        
        console.log('模式切换完成，已复用缓存数据，新方案数量:', filteredAndSortedPlans.length);
        
        // 强制重新计算布局，确保页面比例正确
        setTimeout(() => {
          try {
            this.setData({
              _layoutUpdate: Date.now()
            });
            
            wx.createSelectorQuery()
              .select('.container')
              .boundingClientRect()
              .exec(() => {
                // 布局重新计算完成
              });
          } catch (layoutError) {
            console.warn('布局重新计算失败，但不影响主要功能:', layoutError);
          }
        }, 100);
        
        return; // 复用成功，直接返回
      }
      
      console.log('无法复用缓存数据，需要重新获取数据，模式:', type);
      
             // 重要：模式切换时，强制清除之前的数据状态，确保数据完全隔离
       this.setData({
         heroCategories: [],
         allRecommendPlans: [],
         originalAllPlans: [], // 清除原始数据
         recommendPlans: [],
         total: 0,
         isDataLoaded: false
       });
      
      // 清除相关缓存，确保获取新数据
      this.clearModeRelatedCache(type);
      
      // 直接调用云函数获取新模式的数据，不使用缓存复用
      console.log('模式切换，强制重新获取数据，不使用缓存复用');
      await this.initModeHeroList(type, requestId);
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过数据加载，请求ID:', requestId);
        return;
      }
      
      console.log('英雄分类初始化完成，开始加载数据，请求ID:', requestId);
      // 重新加载数据
      await this.loadRecommendPlans(false, requestId);
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过布局更新，请求ID:', requestId);
        return;
      }
      
      // 强制重新计算布局，确保页面比例正确
      // 使用setTimeout确保DOM更新完成后再触发重新渲染
      setTimeout(() => {
        try {
          // 触发页面重新渲染，确保布局正确
          this.setData({
            _layoutUpdate: Date.now()
          });
          
          // 强制页面重新计算样式
          wx.createSelectorQuery()
            .select('.container')
            .boundingClientRect()
            .exec(() => {
              // 布局重新计算完成
            });
        } catch (layoutError) {
          console.warn('布局重新计算失败，但不影响主要功能:', layoutError);
        }
      }, 100);
    } catch (error) {
      console.error('切换筛选器失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
    }
  },

  // 切换显示模式
  // 优化：所有模式之间切换时都复用缓存数据，避免重复请求
  // 因为recommended模式是hot模式的子集，可以通过筛选获得
  async switchMode(e: any) {
    try {
      const mode = e.currentTarget.dataset.mode;
      console.log('切换显示模式:', mode, '当前状态:', {
        currentMode: this.data.currentMode,
        selectedHero: this.data.selectedHero,
        isDataLoaded: this.data.isDataLoaded
      });
      
             // 如果数据已加载且只是切换模式，尝试复用缓存
       // 所有模式都可以复用，因为recommended模式是hot模式的子集
       if (this.data.isDataLoaded && this.data.originalAllPlans.length > 0) {
         console.log('数据已加载，尝试复用缓存数据，模式切换:', this.data.currentMode, '->', mode);
         
         let filteredAndSortedPlans: any[];
         
         if (mode === 'recommended') {
           // recommended模式：从完整数据中筛选出推荐方案
           console.log('recommended模式：从完整数据中筛选推荐方案');
           const recommendedPlans = this.data.originalAllPlans.filter(plan => plan.isRecommended === true);
           console.log('筛选结果：总方案数', this.data.originalAllPlans.length, '推荐方案数', recommendedPlans.length);
           
           // 对筛选后的方案进行排序
           filteredAndSortedPlans = this.sortPlansByMode(recommendedPlans, mode);
           
           // 重要：为recommended模式重新生成英雄分类，确保英雄筛选器只显示有推荐方案的英雄
           const recommendedHeroCategories = await this.generateHeroCategoriesFromPlans(recommendedPlans);
           console.log('recommended模式：重新生成英雄分类，英雄数量:', recommendedHeroCategories.length);
           
           // 更新显示数据，recommended模式使用筛选后的数据
           this.setData({
             currentMode: mode,
             page: 1, // 重置页码
             lastModeSwitchTime: Date.now(), // 记录模式切换时间
             recommendPlans: filteredAndSortedPlans,
             allRecommendPlans: filteredAndSortedPlans, // 筛选后的推荐方案数据
             heroCategories: recommendedHeroCategories // 更新英雄分类为推荐方案中的英雄
           });
           console.log('recommended模式：已更新allRecommendPlans和heroCategories，确保英雄筛选器只显示有推荐方案的英雄');
         } else {
           // hot和latest模式：使用完整的原始数据
           filteredAndSortedPlans = this.sortPlansByMode(this.data.originalAllPlans, mode);
           
           // 重要：为hot/latest模式重新生成英雄分类，确保英雄筛选器显示所有英雄
           const allHeroCategories = await this.generateHeroCategoriesFromPlans(this.data.originalAllPlans);
           console.log(`${mode}模式：重新生成英雄分类，英雄数量:`, allHeroCategories.length);
           
           // 更新显示数据，hot/latest模式使用完整数据
           this.setData({
             currentMode: mode,
             page: 1, // 重置页码
             lastModeSwitchTime: Date.now(), // 记录模式切换时间
             recommendPlans: filteredAndSortedPlans,
             allRecommendPlans: this.data.originalAllPlans, // 恢复为完整的原始数据
             heroCategories: allHeroCategories // 更新英雄分类为所有英雄
           });
           console.log(`${mode}模式：已恢复allRecommendPlans为完整数据，方案数量:`, this.data.originalAllPlans.length, '，英雄数量:', allHeroCategories.length);
         }
        
        console.log('模式切换完成，已复用缓存数据，新方案数量:', filteredAndSortedPlans.length);
        return;
      }
      
      // 检查是否可以从其他模式的缓存中复用数据
      // hot和latest模式之间可以相互复用数据
      if (mode !== 'recommended' && this.data.currentMode !== 'recommended') {
        // 尝试从其他模式的缓存中获取数据
        const otherMode = mode === 'hot' ? 'latest' : 'hot';
        const cacheKey = `timi:plan:data:herolist_${otherMode}:v1`;
        const cachedData = cacheManager.get(cacheKey) as any;
        
        if (cachedData && cachedData.allPlans && cachedData.allPlans.length > 0) {
          console.log(`从${otherMode}模式缓存中复用数据，模式切换:`, this.data.currentMode, '->', mode);
          
          // 根据新模式重新排序缓存数据
          const sortedPlans = this.sortPlansByMode(cachedData.allPlans, mode);
          
          // 重要：确保英雄分类也正确更新
          const heroCategories = cachedData.heroCategories || [];
          console.log(`从${otherMode}模式缓存复用的英雄分类，英雄数量:`, heroCategories.length);
          
          // 更新显示数据
          this.setData({
            currentMode: mode,
            page: 1, // 重置页码
            lastModeSwitchTime: Date.now(), // 记录模式切换时间
            recommendPlans: sortedPlans,
            allRecommendPlans: cachedData.allPlans,
            total: cachedData.total,
            heroCategories: heroCategories, // 确保英雄分类正确更新
            isDataLoaded: true
          });
          
          console.log('模式切换完成，已从其他模式缓存复用数据，新方案数量:', sortedPlans.length, '，英雄数量:', heroCategories.length);
          return;
        }
      }
      
      // recommended模式需要重新获取数据，因为数据源不同
      if (mode === 'recommended') {
        console.log('recommended模式：数据源不同，需要重新获取数据');
      }
      
      // 如果没有缓存数据，才重新加载
      console.log('没有缓存数据，需要重新加载数据');
      this.setData({
        currentMode: mode,
        page: 1, // 重置页码
        lastModeSwitchTime: Date.now() // 记录模式切换时间
      });
      // 重新加载数据
      await this.loadRecommendPlans(false, this.data.currentRequestId);
    } catch (error) {
      console.error('切换模式失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
    }
  },

  // 切换英雄选择器显示状态
  toggleHeroSelector() {
    this.setData({
      showHeroSelector: !this.data.showHeroSelector
    });
  },

  // 选择英雄分类
  selectHero(e: any) {
    const heroName = e.currentTarget.dataset.hero;
    console.log('选择英雄:', heroName, '当前状态:', {
      currentMode: this.data.currentMode,
      selectedHero: this.data.selectedHero,
      allRecommendPlansLength: this.data.allRecommendPlans.length
    });
    
    this.setData({
      selectedHero: heroName,
      showHeroSelector: false
    });
    
    console.log('英雄选择完成，开始筛选数据');
    // 使用防抖机制，避免频繁筛选
    this.filterRecommendPlansByHero();
  },

  // 防抖定时器
  filterDebounceTimer: null as any,

  // 根据英雄筛选推荐方案
  async filterRecommendPlansByHero() {
    // 检查是否正在筛选，避免重复操作
    if (this.data.isFiltering) {
      console.log('正在筛选中，跳过重复调用');
      return;
    }
    
    // 检查距离上次筛选的时间，避免频繁筛选
    const now = Date.now();
    if (now - this.data.lastFilterTime < 200) { // 200ms内不重复筛选
      console.log('距离上次筛选时间过短，跳过重复调用');
      return;
    }
    
    // 清除之前的防抖定时器
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }
    
    // 设置防抖，避免频繁筛选
    this.filterDebounceTimer = setTimeout(async () => {
      await this._performFilter();
    }, 100);
  },

  // 实际执行筛选的方法
  async _performFilter() {
    // 设置筛选状态
    this.setData({
      isFiltering: true,
      lastFilterTime: Date.now()
    });
    
    try {
      const { allRecommendPlans, selectedHero, currentMode } = this.data;
      
      console.log('开始筛选推荐方案:', {
        selectedHero,
        currentMode,
        allRecommendPlansLength: allRecommendPlans.length,
        currentRecommendPlansLength: this.data.recommendPlans.length
      });
      
      if (selectedHero === 'all') {
        console.log('显示全部推荐方案');
        // 显示全部推荐方案，根据当前模式使用不同的排序逻辑
        let sortedPlans = [...allRecommendPlans];
        
        if (currentMode === 'hot') {
          // 热门方案按点赞收藏总和降序排序
          sortedPlans = this.sortPlansByLikeAndFavorite(sortedPlans);
          console.log('热门模式排序完成，方案数量:', sortedPlans.length);
        } else if (currentMode === 'latest') {
          // 最新方案按创建时间降序排序
          sortedPlans = this.sortPlansByCreateTime(sortedPlans);
          console.log('最新模式排序完成，方案数量:', sortedPlans.length);
        } else {
          // 推荐方案按推荐权重排序（如果有的话）
          sortedPlans = this.sortPlansByRecommendation(sortedPlans);
          console.log('推荐模式排序完成，方案数量:', sortedPlans.length);
        }
        
        // 确保全部方案数据包含英雄头像
        const processedPlans = await this.processPlansWithAvatars(sortedPlans);
        
        // 格式化时间
        const formattedPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        console.log('设置全部方案数据，数量:', formattedPlans.length);
        this.setData({
          recommendPlans: formattedPlans,
          total: formattedPlans.length
        });
        
        // 强制更新页面UI
        this.setData({
          _forceUpdate: Date.now()
        });
      } else {
        console.log('筛选指定英雄的方案:', selectedHero);
        // 筛选指定英雄的推荐方案，根据当前模式使用不同的排序逻辑
        const filteredPlans = allRecommendPlans.filter(plan => plan.heroName === selectedHero);
        console.log('筛选结果:', {
          heroName: selectedHero,
          filteredCount: filteredPlans.length,
          allPlansCount: allRecommendPlans.length
        });
        
        let sortedPlans = [...filteredPlans];
        
        if (currentMode === 'hot') {
          // 热门方案按点赞收藏总和降序排序
          sortedPlans = this.sortPlansByLikeAndFavorite(sortedPlans);
          console.log('热门模式排序完成，筛选后方案数量:', sortedPlans.length);
        } else if (currentMode === 'latest') {
          // 最新方案按创建时间降序排序
          sortedPlans = this.sortPlansByCreateTime(sortedPlans);
          console.log('最新模式排序完成，筛选后方案数量:', sortedPlans.length);
        } else {
          // 推荐方案按推荐权重排序（如果有的话）
          sortedPlans = this.sortPlansByRecommendation(sortedPlans);
          console.log('推荐模式排序完成，筛选后方案数量:', sortedPlans.length);
        }
        
        // 确保筛选后的方案数据包含英雄头像
        const processedPlans = await this.processPlansWithAvatars(sortedPlans);
        
        // 格式化时间
        const formattedPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        console.log('设置筛选后的方案数据，数量:', formattedPlans.length);
        this.setData({
          recommendPlans: formattedPlans,
          total: formattedPlans.length
        });
        
        // 强制更新页面UI
        this.setData({
          _forceUpdate: Date.now()
        });
      }
      
      console.log('筛选完成，最终方案数量:', this.data.recommendPlans.length);
      
      // 使用setTimeout确保UI更新完成
      setTimeout(() => {
        console.log('UI更新完成，当前显示方案数量:', this.data.recommendPlans.length);
      }, 100);
    } finally {
      // 重置筛选状态
      this.setData({
        isFiltering: false
      });
    }
  },

  // 按点赞收藏总和降序排序方案
  sortPlansByLikeAndFavorite(plans: any[]) {
    return plans.sort((a, b) => {
      const aScore = (a.likeCount || 0) + (a.favoriteCount || 0);
      const bScore = (b.likeCount || 0) + (b.favoriteCount || 0);
      return bScore - aScore;
    });
  },

  // 按创建时间降序排序方案
  sortPlansByCreateTime(plans: any[]) {
    return plans.sort((a, b) => {
      const dateA = this.parseDateString(b.createTime);
      const dateB = this.parseDateString(a.createTime);
      return dateA.getTime() - dateB.getTime();
    });
  },

  // 按推荐权重排序方案 (如果有)
  sortPlansByRecommendation(plans: any[]) {
    // 假设有一个推荐权重字段，例如 'recommendationWeight'
    // 如果没有，则不排序
    if (plans.length > 0 && plans[0].recommendationWeight) {
      return plans.sort((a, b) => (b.recommendationWeight as number) - (a.recommendationWeight as number));
    }
    return plans;
  },

  // 根据模式对方案进行排序
  sortPlansByMode(plans: any[], mode: string) {
    if (!plans || plans.length === 0) {
      return plans;
    }
    
    console.log(`根据模式 ${mode} 对方案进行排序，方案数量: ${plans.length}`);
    
    let sortedPlans = [...plans];
    
    switch (mode) {
      case 'hot':
        // 热门方案按点赞收藏总和降序排序
        sortedPlans = this.sortPlansByLikeAndFavorite(sortedPlans);
        console.log('热门模式排序完成，方案数量:', sortedPlans.length);
        break;
      case 'latest':
        // 最新方案按创建时间降序排序
        sortedPlans = this.sortPlansByCreateTime(sortedPlans);
        console.log('最新模式排序完成，方案数量:', sortedPlans.length);
        break;
      case 'recommended':
        // 推荐方案按推荐权重排序（如果有的话）
        sortedPlans = this.sortPlansByRecommendation(sortedPlans);
        console.log('推荐模式排序完成，方案数量:', sortedPlans.length);
        break;
      default:
        console.log('未知模式，使用默认排序');
        break;
    }
    
    return sortedPlans;
  },

  // 生成英雄分类列表
  generateHeroCategories() {
    const { allRecommendPlans } = this.data;
    const heroMap = new Map();
    
    // 统计每个英雄的方案数量
    allRecommendPlans.forEach(plan => {
      const heroName = plan.heroName || '未知英雄';
      if (heroMap.has(heroName)) {
        heroMap.set(heroName, heroMap.get(heroName) + 1);
      } else {
        heroMap.set(heroName, 1);
      }
    });
    
    // 转换为数组格式
    const heroCategories = Array.from(heroMap.entries()).map(([heroName, count]) => ({
      heroName,
      count
    }));
    
    // 按方案数量排序
    heroCategories.sort((a, b) => (b.count as number) - (a.count as number));
    
    this.setData({
      heroCategories
    });
  },

  // 生成英雄分类列表 (从方案数据中提取)
  async generateHeroCategoriesFromPlans(plans: any[]) {
    const heroMap = new Map();
    
    // 统计每个英雄的方案数量
    plans.forEach(plan => {
      const heroName = plan.heroName || '未知英雄';
      if (heroMap.has(heroName)) {
        const existing = heroMap.get(heroName);
        existing.count = existing.count + 1;
        // 如果当前方案有英雄头像，则使用它
        if (plan.heroAvatar && !existing.heroAvatar) {
          existing.heroAvatar = plan.heroAvatar;
        }
      } else {
        heroMap.set(heroName, {
          heroName,
          count: 1,
          heroAvatar: plan.heroAvatar || null
        });
      }
    });
    
    // 转换为数组格式
    const heroCategories = Array.from(heroMap.values());
    
    // 按方案数量排序
    heroCategories.sort((a, b) => b.count - a.count);
    
    // 为没有头像的英雄获取头像
    const heroCategoriesWithAvatars = await this.processHeroAvatars(heroCategories);
    
    return heroCategoriesWithAvatars;
  },

  // 处理英雄头像
  async processHeroAvatars(heroCategories: any[]) {
    try {
      console.log('recommendPlan: 开始处理英雄头像，英雄数量:', heroCategories.length);
      
      // 为每个英雄分类添加头像信息
      const processedCategories = heroCategories.map(heroCategory => {
        const hero = getHeroByName(heroCategory.heroName);
        
        if (hero && hero.avatar) {
          console.log(`recommendPlan: 英雄 ${heroCategory.heroName} 找到头像:`, hero.avatar);
          return {
            ...heroCategory,
            heroAvatar: hero.avatar
          };
        } else {
          console.log(`recommendPlan: 英雄 ${heroCategory.heroName} 未找到头像，使用默认头像`);
          return {
            ...heroCategory,
            heroAvatar: '/images/unused/default-avatar.png'
          };
        }
      });
      
      // 使用新的头像缓存管理器批量获取头像临时URL
      const avatarUrls = processedCategories
        .map(hero => hero.heroAvatar)
        .filter(avatar => avatar && !avatar.startsWith('http') && !avatar.startsWith('/'));
      
      console.log('recommendPlan: 需要处理的头像URL数量:', avatarUrls.length);
      console.log('recommendPlan: 头像URL列表:', avatarUrls);
      
      if (avatarUrls.length > 0) {
        try {
          console.log('recommendPlan: 开始获取英雄头像临时URL，数量:', avatarUrls.length);
          const avatarUrlMap = await avatarCache.getAvatarUrls(avatarUrls);
          console.log('recommendPlan: 头像临时URL获取完成，结果:', avatarUrlMap);
          
          // 更新头像URL
          processedCategories.forEach(heroCategory => {
            if (heroCategory.heroAvatar && !heroCategory.heroAvatar.startsWith('http') && !heroCategory.heroAvatar.startsWith('/')) {
              const tempUrl = avatarUrlMap[heroCategory.heroAvatar];
              if (tempUrl && tempUrl.startsWith('http')) {
                console.log(`recommendPlan: 英雄 ${heroCategory.heroName} 头像URL更新成功:`, tempUrl);
                heroCategory.heroAvatar = tempUrl;
              } else {
                console.warn(`recommendPlan: 英雄 ${heroCategory.heroName} 头像临时URL获取失败，使用默认头像`);
                heroCategory.heroAvatar = '/images/unused/default-avatar.png';
              }
            }
          });
        } catch (error) {
          console.error('recommendPlan: 获取头像临时URL失败:', error);
          // 如果获取失败，使用默认头像
          processedCategories.forEach(heroCategory => {
            if (heroCategory.heroAvatar && !heroCategory.heroAvatar.startsWith('http') && !heroCategory.heroAvatar.startsWith('/')) {
              heroCategory.heroAvatar = '/images/unused/default-avatar.png';
            }
          });
        }
      }
      
      console.log('recommendPlan: 英雄头像处理完成，结果:', processedCategories);
      return processedCategories;
    } catch (error) {
      console.error('recommendPlan: 处理英雄头像失败:', error);
      // 如果处理失败，返回原始数据
      return heroCategories;
    }
  },

  // 头像加载失败处理
  onHeroAvatarError(e: any) {
    const heroName = e.currentTarget.dataset.heroName;
    
    // 找到对应的英雄分类，清除头像信息，这样会显示首字母
    const { heroCategories } = this.data;
    const updatedCategories = heroCategories.map(hero => {
      if (hero.heroName === heroName) {
        return {
          ...hero,
          heroAvatar: null
        };
      }
      return hero;
    });
    
    this.setData({
      heroCategories: updatedCategories
    });
  },


  // 查看方案详情
  viewPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.navigateTo({
      url: `/pages/planDetail/planDetail?id=${plan._id}`
    });
  },

  // 切换点赞状态
  async toggleLike(e: any) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const plan = e.currentTarget.dataset.plan;
    const planIndex = e.currentTarget.dataset.index;
    const isLiked = !plan.isLiked;
    
    // 立即更新本地状态，提升响应速度
    const updatedPlans = [...this.data.recommendPlans];
    const currentLikeCount = updatedPlans[planIndex].likeCount || 0;
    
    // 立即切换状态
    updatedPlans[planIndex] = {
      ...updatedPlans[planIndex],
      isLiked: isLiked,
      likeCount: isLiked ? currentLikeCount + 1 : currentLikeCount - 1
    };
    
    this.setData({
      recommendPlans: updatedPlans
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: {
          planId: plan._id
        }
      }) as any;
      
      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isLiked: result.result.data.isLiked,
          likeCount: result.result.data.likeCount
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        // 通知点赞状态变化，确保其他页面数据同步
        if (result.result.data.isLiked) {
          notifyLikeAdded(plan._id);
        } else {
          notifyLikeRemoved(plan._id);
        }
        
        // 清除相关缓存，确保数据一致性
        this.clearLikeRelatedCache();
        
        wx.showToast({
          title: result.result.message,
          icon: 'success'
        });
      } else {
        // 如果服务器操作失败，回滚本地状态
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isLiked: !isLiked,
          likeCount: currentLikeCount
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      // 网络错误时回滚本地状态
      updatedPlans[planIndex] = {
        ...updatedPlans[planIndex],
        isLiked: !isLiked,
        likeCount: currentLikeCount
      };
      
      this.setData({
        recommendPlans: updatedPlans
      });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 切换收藏状态
  async toggleFavorite(e: any) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const plan = e.currentTarget.dataset.plan;
    const planIndex = e.currentTarget.dataset.index;
    const isFavorited = !plan.isFavorited;
    
    // 立即更新本地状态，提升响应速度
    const updatedPlans = [...this.data.recommendPlans];
    const currentFavoriteCount = updatedPlans[planIndex].favoriteCount || 0;
    
    // 立即切换状态
    updatedPlans[planIndex] = {
      ...updatedPlans[planIndex],
      isFavorited: isFavorited,
      favoriteCount: isFavorited ? currentFavoriteCount + 1 : currentFavoriteCount - 1
    };
    
    this.setData({
      recommendPlans: updatedPlans
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: {
          planId: plan._id
        }
      }) as any;
      
      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isFavorited: result.result.data.isFavorited,
          favoriteCount: result.result.data.favorites
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        // 通知其他页面收藏状态变化
        if (isFavorited) {
          notifyFavoriteAdded(plan._id);
        } else {
          notifyFavoriteRemoved(plan._id);
        }
        
        // 清除相关缓存，确保数据一致性
        this.clearFavoriteRelatedCache();
        
        wx.showToast({
          title: isFavorited ? '收藏成功' : '取消收藏',
          icon: 'success'
        });
      } else {
        // 如果服务器操作失败，回滚本地状态
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isFavorited: !isFavorited,
          favoriteCount: currentFavoriteCount
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      // 网络错误时回滚本地状态
      updatedPlans[planIndex] = {
        ...updatedPlans[planIndex],
        isFavorited: !isFavorited,
        favoriteCount: currentFavoriteCount
      };
      
      this.setData({
        recommendPlans: updatedPlans
      });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 加载推荐方案数据
  async loadRecommendPlans(isLoadMore = false, requestId?: number) {
    // 如果没有提供requestId，使用当前请求ID
    const currentRequestId = requestId || this.data.currentRequestId;
    
    console.log(`开始加载推荐方案数据，模式: ${this.data.currentMode}，英雄: ${this.data.selectedHero}，是否加载更多: ${isLoadMore}`);
    
    if (isLoadMore) {
      if (!this.data.hasMore || this.data.loadingMore) {
        return;
      }
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }

    try {
      // 如果不是加载更多，先尝试从缓存获取数据
      if (!isLoadMore) {
        const cacheKey = `timi:plan:data:recommend_${this.data.currentMode}_${this.data.selectedHero}:v1`;
        const cachedData = cacheManager.get<any>(cacheKey);
        
        if (cachedData && cachedData.plans && cachedData.plans.length > 0) {
          // 对于recommended模式，需要验证缓存数据是否包含推荐方案
          if (this.data.currentMode === 'recommended' && (!cachedData.isRecommended || !cachedData.mode || cachedData.mode !== 'recommended')) {
            console.log('recommended模式：缓存数据无效或不是推荐方案数据，需要重新获取');
            console.log('缓存数据详情:', {
              isRecommended: cachedData.isRecommended,
              mode: cachedData.mode,
              plansCount: cachedData.plans.length
            });
          } else {
            // 检查请求是否已被取消
            if (currentRequestId !== this.data.currentRequestId) {
              console.log('请求已被取消，跳过缓存数据使用，请求ID:', currentRequestId);
              return;
            }
            
            console.log('使用缓存的推荐方案数据:', cacheKey);
            this.setData({
              recommendPlans: cachedData.plans,
              page: cachedData.page || 1,
              hasMore: cachedData.hasMore !== undefined ? cachedData.hasMore : true,
              loading: false,
              loadingMore: false,
              isDataLoaded: true,
              lastLoadTime: Date.now()
            });
            return;
          }
        }
      }

      // recommended模式需要特殊处理，获取审核标记为推荐的方案
      const requestData: any = {
        heroId: this.data.selectedHero === 'all' ? null : this.data.selectedHero,
        page: isLoadMore ? this.data.page + 1 : 1,
        pageSize: this.data.pageSize,
        includeBetaPlans: true // 包含体验服方案，确保isBetaPlan字段正确设置
      };
      
      if (this.data.currentMode === 'recommended') {
        // recommended模式：获取审核标记为推荐的方案
        requestData.isRecommended = true;
        console.log('recommended模式：获取审核标记为推荐的方案，请求参数:', requestData);
      } else {
        // hot和latest模式：按模式获取方案
        requestData.mode = this.data.currentMode;
        console.log(`${this.data.currentMode}模式：按模式获取方案，请求参数:`, requestData);
      }
      
      console.log(`调用云函数getRecommendPlans，模式: ${this.data.currentMode}，请求参数:`, requestData);
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: requestData
      }) as any;
      
      // 检查请求是否已被取消
      if (currentRequestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过云函数结果处理，请求ID:', currentRequestId);
        return;
      }
      
      console.log(`云函数getRecommendPlans返回结果:`, result);
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        console.log(`获取到${this.data.currentMode}模式数据，方案数量:`, plans.length);
        
        // 验证recommended模式的数据
        if (this.data.currentMode === 'recommended') {
          const recommendedPlans = plans.filter((plan: any) => plan.isRecommended === true);
          console.log(`recommended模式数据验证: 总方案数${plans.length}，推荐方案数${recommendedPlans.length}`);
          
          if (recommendedPlans.length === 0) {
            console.warn('recommended模式：未找到推荐方案，可能数据有问题');
          }
        }
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
        // 再次检查请求是否已被取消
        if (currentRequestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过方案数据处理，请求ID:', currentRequestId);
          return;
        }
        
        // 根据当前模式使用不同的排序逻辑
        let sortedPlans = processedPlans;
        if (this.data.currentMode === 'hot') {
          sortedPlans = this.sortPlansByLikeAndFavorite(processedPlans);
          console.log('热门模式排序完成，方案数量:', sortedPlans.length);
        } else if (this.data.currentMode === 'latest') {
          sortedPlans = this.sortPlansByCreateTime(processedPlans);
          console.log('最新模式排序完成，方案数量:', sortedPlans.length);
        } else {
          sortedPlans = this.sortPlansByRecommendation(processedPlans);
          console.log('推荐模式排序完成，方案数量:', sortedPlans.length);
        }
        
        // 格式化时间
        const formattedPlans = sortedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

                 console.log(`设置${this.data.currentMode}模式数据，最终方案数量:`, formattedPlans.length);
         this.setData({
           recommendPlans: isLoadMore ? [...this.data.recommendPlans, ...formattedPlans] : formattedPlans,
           page: page,
           hasMore: hasMore,
           loading: false,
           loadingMore: false,
           isDataLoaded: true,
           lastLoadTime: Date.now()
         });
         
         // 如果不是加载更多，更新allRecommendPlans和originalAllPlans
         if (!isLoadMore) {
           this.setData({
             allRecommendPlans: formattedPlans,
             originalAllPlans: formattedPlans // 保存完整的原始数据
           });
         }

        // 如果不是加载更多，则缓存数据
        if (!isLoadMore) {
          // 缓存当前筛选结果，延长TTL到10分钟
          const cacheKey = `timi:plan:data:recommend_${this.data.currentMode}_${this.data.selectedHero}:v1`;
          const cacheData = {
            plans: formattedPlans,
            page: page,
            hasMore: hasMore,
            timestamp: Date.now(),
            mode: this.data.currentMode,
            heroId: this.data.selectedHero,
            isRecommended: this.data.currentMode === 'recommended' // 添加推荐状态标识
          };
          cacheManager.set(cacheKey, cacheData, 10 * 60 * 1000); // 10分钟TTL
          console.log(`已缓存${this.data.currentMode}模式数据，缓存键:`, cacheKey);
        }
      } else {
        console.error(`${this.data.currentMode}模式数据获取失败:`, result);
        wx.showToast({
          title: (result.result && result.result.message) || '加载失败',
          icon: 'none'
        });
        this.setData({
          loading: false,
          loadingMore: false
        });
      }
    } catch (error) {
      console.error(`加载${this.data.currentMode}模式推荐方案失败:`, error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({
        loading: false,
        loadingMore: false
      });
    }
  },

  // 处理方案数据，添加英雄头像
  async processPlansWithAvatars(plans: any[]) {
    // 收集所有需要处理的头像URL
    const avatarUrls: string[] = [];
    const heroMap = new Map();
    
    plans.forEach(plan => {
      const hero = getHeroById(plan.heroId);
      if (hero && hero.avatar) {
        avatarUrls.push(hero.avatar);
        heroMap.set(plan._id, hero.avatar);
      }
    });
    
    // 使用新的头像缓存管理器批量获取临时URL
    let avatarUrlMap: Record<string, string> = {};
    if (avatarUrls.length > 0) {
      try {
        avatarUrlMap = await avatarCache.getAvatarUrls(avatarUrls);
      } catch (error) {
        console.error('获取头像临时URL失败:', error);
        // 如果获取失败，使用原始URL
        avatarUrls.forEach(url => {
          avatarUrlMap[url] = url;
        });
      }
    }
    
    // 处理方案数据
    return plans.map(plan => {
      const hero = getHeroById(plan.heroId);
      const originalAvatar = hero ? hero.avatar : '';
      const heroAvatar = avatarUrlMap[originalAvatar] || originalAvatar;
      
      return {
        ...plan,
        heroAvatar: heroAvatar
      };
    });
  },

  // 格式化时间
  formatTime(timestamp: any) {
    if (!timestamp) return '';
    
    let date: Date;
    
    // 处理不同类型的输入，确保 iOS 兼容性
    if (typeof timestamp === 'string') {
      // 处理 MongoDB 的日期格式
      if (timestamp.includes('$date')) {
        try {
          const dateObj = JSON.parse(timestamp);
          date = new Date(dateObj.$date);
        } catch (e) {
          // 如果解析失败，尝试标准化格式
          date = this.parseDateString(timestamp);
        }
      } else {
        // 标准化字符串格式，确保 iOS 兼容性
        date = this.parseDateString(timestamp);
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // 处理时间戳或其他类型
      date = new Date(timestamp);
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // 标准格式：年月日+小时分钟
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 解析日期字符串，确保 iOS 兼容性
  parseDateString(dateString: string): Date {
    if (!dateString) {
      return new Date();
    }
    
    // 移除多余的空格
    const cleanString = dateString.trim();
    
    // 优先使用 iOS 完全兼容的格式
    // iOS 支持的格式：yyyy/MM/dd、yyyy/MM/dd HH:mm:ss、yyyy-MM-dd、yyyy-MM-ddTHH:mm:ss、yyyy-MM-ddTHH:mm:ss+HH:mm
    
    // 1. 处理 "2025-08-09 18:20" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T') + ':00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 2. 处理 "2025-08-09 18:20:30" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T');
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 3. 处理 "2025/08/09 18:20" 格式，转换为 ISO 格式
    if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T').replace(/\//g, '-') + ':00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 4. 处理 "2025/08/09 18:20:30" 格式，转换为 ISO 格式
    if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T').replace(/\//g, '-');
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 5. 处理 "2025-08-09" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanString)) {
      const isoString = cleanString + 'T00:00:00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 6. 处理 "2025/08/09" 格式，转换为 ISO 格式
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(/\//g, '-') + 'T00:00:00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 7. 尝试直接解析（对于已经是 ISO 格式的字符串）
    const directDate = new Date(cleanString);
    if (!isNaN(directDate.getTime())) {
      return directDate;
    }
    
    // 8. 最后的尝试：解析失败时返回当前时间
    console.warn('无法解析日期字符串:', dateString, '，使用当前时间');
    return new Date();
  },

  // 加载更多数据
  async loadMorePlans() {
    await this.loadRecommendPlans(true, this.data.currentRequestId);
  },

  // 页面相关事件处理函数--监听用户下拉动作
  async onPullDownRefresh() {
    try {
      // 清除当前模式的缓存数据
      const cacheKey = CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_${this.data.selectedHero}`);
      cacheManager.delete(cacheKey);
      console.log('下拉刷新，已清除缓存:', cacheKey);
      
             this.setData({ 
         page: 1, // 重置页码
         originalAllPlans: [] // 清除原始数据
       }); 
       await this.loadRecommendPlans(false, this.data.currentRequestId);
    } catch (error) {
      console.error('下拉刷新失败:', error);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 页面上拉触底事件的处理函数
  async onReachBottom() {
    await this.loadMorePlans();
  },

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '攻略方案 - 推荐/热门/最新',
      path: '/pages/recommendPlan/recommendPlan',
      imageUrl: '/pages/images/share-recommend-plan.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '攻略方案 - 推荐/热门/最新',
      imageUrl: '/pages/images/share-recommend-plan.png'
    };
  },

  // 设置收藏状态变化监听器
  setupFavoriteChangeListener() {
    this.favoriteChangeHandler = (event: any) => {
      console.log('收到收藏状态变化事件:', event);
      // 当收到收藏状态变化事件时，立即清除相关缓存并标记数据需要刷新
      this.clearFavoriteRelatedCache();
      this.setData({
        lastLoadTime: 0 // 强制下次onShow时刷新数据
      });
    };
    
    favoriteSyncManager.addListener(this.favoriteChangeHandler);
    console.log('收藏状态变化监听器已设置');
  },

  // 清理收藏状态变化监听器
  cleanupFavoriteChangeListener() {
    if (this.favoriteChangeHandler) {
      favoriteSyncManager.removeListener(this.favoriteChangeHandler);
      this.favoriteChangeHandler = null;
      console.log('收藏状态变化监听器已清理');
    }
  },

  // 设置点赞状态变化监听器
  setupLikeChangeListener() {
    this.likeChangeHandler = (event: any) => {
      console.log('收到点赞状态变化事件:', event);
      // 当收到点赞状态变化事件时，立即清除相关缓存并标记数据需要刷新
      this.clearLikeRelatedCache();
      this.setData({
        lastLoadTime: 0 // 强制下次onShow时刷新数据
      });
    };
    
    interactionSyncManager.addLikeListener(this.likeChangeHandler);
    console.log('点赞状态变化监听器已设置');
  },

  // 清理点赞状态变化监听器
  cleanupLikeChangeListener() {
    if (this.likeChangeHandler) {
      interactionSyncManager.removeLikeListener(this.likeChangeHandler);
      this.likeChangeHandler = null;
      console.log('点赞状态变化监听器已清理');
    }
  },

  // 设置统一交互状态变化监听器
  setupInteractionChangeListener() {
    this.interactionChangeHandler = (event: any) => {
      console.log('收到统一交互状态变化事件:', event);
      // 当收到统一交互状态变化事件时，立即清除相关缓存并标记数据需要刷新
      this.clearInteractionRelatedCache();
      this.setData({
        lastLoadTime: 0 // 强制下次onShow时刷新数据
      });
    };
    
    interactionSyncManager.addInteractionListener(this.interactionChangeHandler);
    console.log('统一交互状态变化监听器已设置');
  },

  // 清理统一交互状态变化监听器
  cleanupInteractionChangeListener() {
    if (this.interactionChangeHandler) {
      interactionSyncManager.removeInteractionListener(this.interactionChangeHandler);
      this.interactionChangeHandler = null;
      console.log('统一交互状态变化监听器已清理');
    }
  },

  // 检查收藏状态变化
  checkFavoriteChanges(): boolean {
    try {
      const lastGlobalChange = wx.getStorageSync('last_global_favorite_change') || 0;
      const lastLocalUpdate = this.data.lastLoadTime || 0;
      
      if (lastGlobalChange > lastLocalUpdate) {
        console.log('检测到全局收藏状态变化，时间戳:', {
          global: lastGlobalChange,
          local: lastLocalUpdate,
          diff: lastGlobalChange - lastLocalUpdate
        });
        
        // 清除相关缓存，确保获取最新数据
        this.clearFavoriteRelatedCache();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('检查收藏状态变化失败:', error);
      return false;
    }
  },

  // 检查点赞状态变化
  checkLikeChanges(): boolean {
    try {
      const lastGlobalChange = wx.getStorageSync('last_global_like_change') || 0;
      const lastLocalUpdate = this.data.lastLoadTime || 0;
      
      if (lastGlobalChange > lastLocalUpdate) {
        console.log('检测到全局点赞状态变化，时间戳:', {
          global: lastGlobalChange,
          local: lastLocalUpdate,
          diff: lastGlobalChange - lastLocalUpdate
        });
        
        // 清除相关缓存，确保获取最新数据
        this.clearLikeRelatedCache();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('检查点赞状态变化失败:', error);
      return false;
    }
  },

  // 检查统一交互状态变化
  checkInteractionChanges(): boolean {
    return this.checkFavoriteChanges() || this.checkLikeChanges();
  },

  // 清除收藏相关的缓存
  clearFavoriteRelatedCache() {
    try {
      // 清除当前模式的所有英雄筛选缓存
      const cacheKeys = [
        CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_all`),
        CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_${this.data.selectedHero}`),
        CACHE_KEYS.PLAN_LIST_DATA.replace('plan:data:list', `plan:data:hero_list_${this.data.currentMode}`)
      ];
      
      // 清除所有模式的缓存，因为收藏状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${mode}_all`),
          CACHE_KEYS.PLAN_LIST_DATA.replace('plan:data:list', `plan:data:hero_list_${mode}`)
        );
      });
      
      cacheKeys.forEach(key => {
        if (cacheManager.has(key)) {
          cacheManager.delete(key);
          console.log('已清除收藏相关缓存:', key);
        }
      });
      
             // 清除模式数据缓存
       this.setData({
         modeDataCache: {
           recommended: { heroCategories: [], allPlans: [], total: 0 },
           hot: { heroCategories: [], allPlans: [], total: 0 },
           latest: { heroCategories: [], allPlans: [], total: 0 }
         },
         originalAllPlans: [] // 清除原始数据
       });
      
      console.log('已清除收藏相关的所有缓存数据');
    } catch (error) {
      console.warn('清除收藏相关缓存失败:', error);
    }
  },

  // 清除点赞相关的缓存
  clearLikeRelatedCache() {
    try {
      // 清除当前模式的所有英雄筛选缓存
      const cacheKeys = [
        CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_all`),
        CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_${this.data.selectedHero}`)
      ];
      
      // 清除所有模式的缓存，因为点赞状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${mode}_all`),
          CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${mode}_${this.data.selectedHero}`)
        );
      });
      
      cacheKeys.forEach(key => {
        if (cacheManager.has(key)) {
          cacheManager.delete(key);
          console.log('已清除点赞相关缓存:', key);
        }
      });
      
             // 清除原始数据
       this.setData({
         originalAllPlans: []
       });
       
       console.log('已清除点赞相关的所有缓存数据');
     } catch (error) {
       console.warn('清除点赞相关缓存失败:', error);
     }
   },

  // 清除统一交互相关的缓存
  clearInteractionRelatedCache() {
    this.clearFavoriteRelatedCache();
    this.clearLikeRelatedCache();
    console.log('已清除统一交互相关的所有缓存数据');
  },

  // 防抖版本的筛选器切换事件处理
  onFilterSwitch(e: any) {
    console.log('筛选器切换事件触发，使用防抖处理');
    
    // 如果正在筛选中，显示提示
    if (this.data.isFiltering) {
      wx.showToast({
        title: '正在处理中，请稍候...',
        icon: 'none',
        duration: 1000
      });
      return;
    }
    
    // 使用防抖版本的筛选器切换函数
    if (this.debouncedSwitchFilter) {
      this.debouncedSwitchFilter(e);
    } else {
      // 如果防抖函数未初始化，使用原始函数
      console.warn('防抖函数未初始化，使用原始筛选器切换函数');
      this.switchFilter(e);
    }
  },

  // 取消所有待处理的请求
  cancelPendingRequests() {
    // 简化实现：只记录请求ID，不存储复杂的请求对象
    console.log('取消所有待处理的请求，当前请求ID:', this.data.currentRequestId);
  },

  // 测试函数：验证recommended模式数据
  async testRecommendedMode() {
    console.log('开始测试recommended模式数据加载...');
    
    try {
      // 切换到recommended模式
      this.setData({
        currentMode: 'recommended',
        selectedHero: 'all',
        page: 1,
        lastModeSwitchTime: Date.now()
      });
      
      // 清除所有缓存
      this.clearModeRelatedCache('recommended');
      
      // 强制重新加载数据
      await this.initModeHeroList('recommended', this.data.currentRequestId);
      await this.loadRecommendPlans(false, this.data.currentRequestId);
      
      console.log('recommended模式测试完成，当前数据状态:', {
        currentMode: this.data.currentMode,
        allRecommendPlansLength: this.data.allRecommendPlans.length,
        recommendPlansLength: this.data.recommendPlans.length,
        total: this.data.total
      });
      
      // 验证数据是否为推荐方案
      if (this.data.allRecommendPlans.length > 0) {
        const recommendedPlans = this.data.allRecommendPlans.filter(plan => plan.isRecommended === true);
        console.log('推荐方案验证结果:', {
          totalPlans: this.data.allRecommendPlans.length,
          recommendedPlans: recommendedPlans.length,
          isAllRecommended: recommendedPlans.length === this.data.allRecommendPlans.length
        });
      }
    } catch (error) {
      console.error('recommended模式测试失败:', error);
    }
  },

  // 清除模式相关的缓存
  clearModeRelatedCache(mode: string) {
    // 所有模式之间切换都可以复用缓存，因为recommended模式是hot模式的子集
    console.log('模式切换，保留所有模式缓存，只清除当前模式缓存');
    
    // 只清除当前模式的缓存
    const currentModeCacheKeys = [
      CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_all`),
      CACHE_KEYS.PLAN_RECOMMEND_DATA.replace('plan:data:recommend', `plan:data:recommend_${this.data.currentMode}_${this.data.selectedHero}`),
      CACHE_KEYS.PLAN_LIST_DATA.replace('plan:data:list', `plan:data:hero_list_${this.data.currentMode}`)
    ];
    
    currentModeCacheKeys.forEach(key => {
      if (cacheManager.has(key)) {
        cacheManager.delete(key);
        console.log('已清除当前模式缓存:', key);
      }
    });
    
         // 只清除当前模式的模式数据缓存
     this.setData({
       [`modeDataCache.${this.data.currentMode}`]: { heroCategories: [], allPlans: [], total: 0 }
     });
     
     // 清除原始数据
     this.setData({
       originalAllPlans: []
     });
    
    console.log('已清除当前模式的缓存数据，保留其他模式缓存');
  }
});