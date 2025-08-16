import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getHeroById, getHeroByName } from '../../data/localHeroData';
import { avatarCache } from '../../utils/avatarCache';
import cacheManager from '../../utils/cacheManager';
import { CACHE_KEYS } from '../../utils/cacheKeys';
import { smartCacheManager } from '../../utils/smartCacheManager';
import { notifyFavoriteAdded, notifyFavoriteRemoved, notifyLikeAdded, notifyLikeRemoved, favoriteSyncManager, interactionSyncManager } from '../../utils/favoriteSync';
import { debounceOperation } from '../../utils/debounce';
import { planService } from '../../utils/planService';


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
     currentFilteredPlans: [] as any[], // 当前筛选结果的完整数据，用于分页
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
    currentRequestId: 0, // 当前请求ID，用于取消过期的请求
    
    // 添加云函数调用计数器，确保只调用一次
    cloudFunctionCallCount: 0, // 云函数调用次数
    hasInitialized: false, // 是否已经完成初始化
    isInitializing: false, // 是否正在初始化中
    
    // 添加交互状态同步标记
    needSyncInteractionStates: false // 是否需要同步交互状态
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
    
    // 检查是否已经初始化过，避免重复初始化
    if (this.data.hasInitialized) {
      console.log('页面已经初始化过，跳过重复初始化');
      return;
    }
    
    // 初始化时间状态，避免时间判断错误
    const now = Date.now();
    this.setData({
      lastLoadTime: now,
      lastModeSwitchTime: now,
      hasInitialized: true, // 标记已初始化
      isInitializing: true, // 标记正在初始化
      loading: true // 设置初始加载状态
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
    
    // 初始化交互状态数据
    this.initInteractionStates();
    
    // 从strategy进入时，强制重置为热门方案TAB，不管之前是否有筛选
    console.log('从strategy进入，强制重置为热门方案TAB');
    this.resetFilterState();
    
    // 初始化页面数据
    console.log('初始化页面数据，模式:', this.data.currentMode, '英雄:', this.data.selectedHero);
    // 异步调用并在完成后标记初始化结束
    this.initModeHeroList(this.data.currentMode, this.data.currentRequestId).then(() => {
      this.setData({
        isInitializing: false // 初始化完成
      });
    }).catch(() => {
      this.setData({
        isInitializing: false // 初始化完成（即使失败）
      });
    });
  },

  // 页面数据变化监听
  onDataChange() {
    // 页面数据变化监听
  },

  onShow() {
    console.log('推荐方案页面 onShow 触发');
    
    // 如果正在初始化中，跳过后续逻辑，避免重复调用云函数
    if (this.data.isInitializing) {
      console.log('页面正在初始化中，跳过onShow数据加载，避免重复调用云函数');
      return;
    }
    
    // 优先检查交互状态变化（收藏和点赞）
    if (this.checkInteractionChanges()) {
      console.log('检测到交互状态变化，重新加载数据以确保数字正确');
      this.clearInteractionRelatedCache();
      this.loadRecommendPlans(false, this.data.currentRequestId);
      return;
    }
    
    const now = Date.now();
    const timeSinceLastLoad = now - this.data.lastLoadTime;
    const timeSinceLastModeSwitch = now - this.data.lastModeSwitchTime;
    
    console.log('时间检查:', {
      timeSinceLastLoad,
      timeSinceLastModeSwitch,
      isDataLoaded: this.data.isDataLoaded,
      currentMode: this.data.currentMode,
      selectedHero: this.data.selectedHero
    });
    
    // 等待状态稳定后再处理数据
    setTimeout(async () => {
      let needsDataReload = false;
      
      // 检查是否需要重新加载数据
      if (!this.data.isDataLoaded) {
        needsDataReload = true;
        console.log('数据未加载，需要重新加载');
      } else if (timeSinceLastLoad > 10 * 60 * 1000) {
        needsDataReload = true;
        console.log('数据过期，需要重新加载');
      } else if (this.data.lastModeSwitchTime > 0 && timeSinceLastModeSwitch > 2 * 60 * 1000) {
        needsDataReload = true;
        console.log('模式切换后时间过长，需要重新加载');
      }
      
      // 执行数据加载或筛选
      if (needsDataReload) {
        if (this.data.cloudFunctionCallCount === 0) {
          await this.initModeHeroList(this.data.currentMode, this.data.currentRequestId);
        } else {
          await this.loadRecommendPlans(false, this.data.currentRequestId);
        }
      } else {
        console.log('数据已加载且未过期，跳过重新加载');
        // 处理英雄筛选
        if (this.data.allRecommendPlans.length > 0 && this.data.selectedHero !== 'all') {
          this.filterRecommendPlansByHero();
        }
      }
      
      // 统一进行状态同步（只调用一次）
      await this.syncInteractionStates();
    }, 50);
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
  initFilterState() {
    try {
      const filterState = wx.getStorageSync('recommendPlan_filter_state');
      console.log('初始化筛选状态，尝试恢复保存的状态');
      
      if (filterState && filterState.timestamp) {
        const now = Date.now();
        const timeDiff = now - filterState.timestamp;
        
        // 如果筛选状态在30分钟内，则恢复
        if (timeDiff < 30 * 60 * 1000) {
          console.log('恢复保存的筛选状态:', filterState);
          this.setData({
            currentMode: filterState.currentMode || 'hot',
            selectedHero: filterState.selectedHero || 'all'
          });
          return;
        } else {
          console.log('保存的筛选状态已过期，使用默认状态');
        }
      } else {
        console.log('没有保存的筛选状态，使用默认状态');
      }
      
      // 没有有效的保存状态，使用默认状态
      this.setData({
        currentMode: 'hot',
        selectedHero: 'all'
      });
    } catch (error) {
      console.warn('初始化筛选状态失败:', error);
      // 出错时使用默认状态
      this.setData({
        currentMode: 'hot',
        selectedHero: 'all'
      });
    }
  },

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
      console.log(`本次调用将同时完成英雄分类初始化和推荐方案显示，避免重复调用云函数`);
      
      // 第一步：尝试使用智能缓存复用
      const reusableData = smartCacheManager.getBetaPlansFromRecommend(mode);
      if (reusableData && reusableData.length > 0) {
        console.log(`发现可复用的${mode}模式数据，数量:`, reusableData.length);
        
        // 重要：复用数据也需要进行头像处理，确保头像正确显示
        const processedReusableData = await this.processPlansWithAvatars(reusableData);
        
        // 使用复用数据，跳过云函数调用
        const heroCategories = await this.generateHeroCategoriesFromPlans(processedReusableData);
        
        this.setData({
          heroCategories,
          allRecommendPlans: processedReusableData, // 保存完整数据，用于英雄筛选
          originalAllPlans: processedReusableData,
          total: processedReusableData.length,
          recommendPlans: processedReusableData.slice(0, this.data.pageSize),
          isDataLoaded: true,
          loading: false
        });
        
        await this.syncInteractionStates();
        console.log(`${mode}模式数据复用成功，英雄数量: ${heroCategories.length}，方案数: ${processedReusableData.length}`);
        return;
      }
      
      // 检查是否已经调用过云函数，避免重复调用
      if (this.data.cloudFunctionCallCount > 0) {
        console.log(`[优化] 云函数已经调用过${this.data.cloudFunctionCallCount}次，跳过重复调用`);
        return;
      }
      
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
      // 首先检查是否有最新的全局缓存数据
      const globalAllPlansCache = cacheManager.get<any[]>(CACHE_KEYS.ALL_PLANS_CACHE_KEY);
      const currentModeCachedData = cacheManager.get(currentModeCacheKey) as any;
      
      // 优先使用全局缓存，确保数据是最新的
      if (globalAllPlansCache && globalAllPlansCache.length > 0) {
        console.log(`使用全局缓存数据，确保数据最新，总方案数: ${globalAllPlansCache.length}`);
        allPlans = globalAllPlansCache;
        
        // 重要：缓存数据也需要进行头像处理，确保头像正确显示
        const processedAllPlans = await this.processPlansWithAvatars(allPlans);
        
        // 重要：基于完整数据重新生成heroCategories，确保包含全部英雄
        heroCategories = await this.generateHeroCategoriesFromPlans(processedAllPlans);
        
        console.log(`使用全局缓存数据，重新生成英雄数量:`, heroCategories.length, '，方案数:', processedAllPlans.length);
        
        // 更新特定模式缓存，确保一致性
        cacheManager.set(currentModeCacheKey, {
          heroCategories: heroCategories,
          allPlans: globalAllPlansCache,
          total: globalAllPlansCache.length,
          mode: mode,
          isRecommended: mode === 'recommended',
          timestamp: Date.now()
        }, 30 * 60 * 1000);
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          originalAllPlans: processedAllPlans,
          allRecommendPlans: processedAllPlans, // 保存完整数据，用于英雄筛选
          recommendPlans: processedAllPlans.slice(0, this.data.pageSize),
          total: processedAllPlans.length,
          page: 1,
          hasMore: processedAllPlans.length > this.data.pageSize,
          isDataLoaded: true,
          lastLoadTime: Date.now(),
          loading: false
        });
        
        await this.syncInteractionStates();
        console.log(`${mode}模式全局缓存数据使用成功，英雄数量: ${heroCategories.length}，方案数: ${processedAllPlans.length}`);
        return;
      }
      // 如果没有全局缓存，则使用特定模式缓存
      else if (currentModeCachedData && currentModeCachedData.heroCategories && currentModeCachedData.heroCategories.length > 0) {
        console.log(`使用${mode}模式缓存的英雄分类数据，确保数据一致性`);
        // heroCategories = currentModeCachedData.heroCategories; // 不直接使用缓存的heroCategories，可能被其他页面污染
        allPlans = currentModeCachedData.allPlans || [];
        
        // 重要：缓存数据也需要进行头像处理，确保头像正确显示
        const processedAllPlans = await this.processPlansWithAvatars(allPlans);
        
        // 重要：基于完整数据重新生成heroCategories，确保包含全部英雄
        // 不直接使用缓存中的heroCategories，因为可能被betaPlan等页面污染
        heroCategories = await this.generateHeroCategoriesFromPlans(processedAllPlans);
        
        // 直接使用缓存数据，无需重新获取
        console.log(`使用缓存的${mode}模式数据，重新生成英雄数量:`, heroCategories.length, '，方案数:', processedAllPlans.length);
        
        // 更新缓存的timestamp，确保needsCountRefresh能正确判断
        cacheManager.set(currentModeCacheKey, {
          ...currentModeCachedData,
          timestamp: Date.now() // 更新时间戳
        }, 30 * 60 * 1000);
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          originalAllPlans: processedAllPlans, // 使用处理过头像的数据
          allRecommendPlans: processedAllPlans, // 保存完整数据，用于英雄筛选
          recommendPlans: processedAllPlans.slice(0, this.data.pageSize), // 使用处理过头像的数据
          total: processedAllPlans.length,
          page: 1, // 重置页码
          hasMore: processedAllPlans.length > this.data.pageSize, // 设置是否有更多数据
          isDataLoaded: true,
          lastLoadTime: Date.now(),
          loading: false // 清除加载状态
        });
        
        // 更新缓存
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = heroCategories;
        modeCache.allPlans = processedAllPlans; // 缓存处理过头像的数据
        modeCache.total = processedAllPlans.length;
        
        // 立即同步交互状态，确保缓存数据包含正确的状态
        await this.syncInteractionStates();
        
        // 检查是否需要刷新数字数据（缓存中的数字可能过时）
        if (this.needsCountRefresh()) {
          console.log('缓存数据中的数字可能过时，刷新数字数据');
          await this.refreshPlanCounts();
        }
        
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
        
        console.log(`${mode}模式数据加载完成，英雄数量: ${heroCategories.length}，方案数: ${allPlans.length}`);
        
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
      
      // 增加云函数调用计数
      this.setData({
        cloudFunctionCallCount: this.data.cloudFunctionCallCount + 1
      });
      console.log(`[优化] 云函数调用计数增加，当前次数: ${this.data.cloudFunctionCallCount}`);
      
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
          originalAllPlans: allPlans.slice(0, this.data.pageSize), // 只显示前pageSize条数据
          total: plans.length,
          recommendPlans: allPlans.slice(0, this.data.pageSize), // 只显示前pageSize条数据
          [`modeDataCache.${mode}`]: modeCache,
          isDataLoaded: true, // 标记数据已加载
          lastLoadTime: Date.now(), // 更新加载时间
          loading: false // 清除加载状态
        });
        
        console.log(`${mode}模式数据加载完成:`, {
          heroCategoriesCount: heroCategories.length,
          allPlansCount: allPlans.length,
          total: plans.length
        });
        
        // 缓存英雄分类数据，延长TTL到30分钟
        // 为不同模式使用不同的缓存键，确保数据隔离
        const heroListCacheKey = `timi:plan:data:herolist_${mode}:v1`;
        
        // 重要：heroPlan缓存应该包含完整数据，而不是当前模式的筛选数据
        // 从统一缓存获取完整数据，如果不存在则使用当前数据
        const completeAllPlans = cacheManager.get<any[]>(CACHE_KEYS.ALL_PLANS_CACHE_KEY) || allPlans;
        const completeTotalCount = completeAllPlans.length;
        
        cacheManager.set(heroListCacheKey, {
          heroCategories: heroCategories,
          allPlans: completeAllPlans, // 使用完整数据，确保其他页面获得完整数据
          total: completeTotalCount, // 使用完整数据的数量
          mode: mode, // 添加模式标识
          isRecommended: mode === 'recommended', // 添加推荐状态标识
          timestamp: Date.now() // 添加时间戳，用于数字刷新判断
        }, 30 * 60 * 1000); // 30分钟TTL
        
        console.log(`已缓存${mode}模式数据，缓存键:`, heroListCacheKey, `，完整数据量: ${completeTotalCount}`);
        
        // 重要：额外设置统一的全局缓存，实现与betaPlan等页面的缓存共享
        // 这样可以统一所有页面的缓存机制
        console.log(`[recommendPlan] 正在设置全局缓存，键名: "${CACHE_KEYS.ALL_PLANS_CACHE_KEY}"`);
        console.log(`[recommendPlan] 缓存数据量: ${allPlans.length}，前3个方案:`, allPlans.slice(0, 3).map(p => ({ id: p._id, title: p.title })));
        
        // 使用内存缓存
        cacheManager.set(CACHE_KEYS.ALL_PLANS_CACHE_KEY, allPlans, 30 * 60 * 1000); // 30分钟TTL
        
        // 同时使用微信存储作为备份，确保页面切换时不丢失
        try {
          const cacheData = {
            data: allPlans,
            timestamp: Date.now(),
            ttl: 30 * 60 * 1000, // 30分钟
            version: 'v1'
          };
          wx.setStorageSync('global_all_plans_cache', cacheData);
          console.log(`[recommendPlan] 已同时设置持久化缓存备份，数据量: ${allPlans.length}`);
        } catch (error) {
          console.warn('[recommendPlan] 设置持久化缓存失败:', error);
        }
        
        // 立即验证缓存是否设置成功
        const verifyCache = cacheManager.get(CACHE_KEYS.ALL_PLANS_CACHE_KEY) as any[];
        console.log(`[recommendPlan] 缓存设置验证: ${verifyCache ? `成功，数量: ${verifyCache.length}` : '失败'}`);
        console.log(`[recommendPlan] 已设置统一全局缓存: ${CACHE_KEYS.ALL_PLANS_CACHE_KEY}，数据量: ${allPlans.length}`);
        
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
        
        // 缓存数据使用完成后同步交互状态
        setTimeout(async () => {
          await this.syncInteractionStates();
        }, 150);
        
        // 添加优化完成日志
        console.log(`[优化] ${mode}模式数据加载完成，一次云函数调用完成两个功能:`);
        console.log(`[优化] - 英雄分类初始化完成，英雄数量: ${heroCategories.length}`);
        console.log(`[优化] - 推荐方案显示完成，总方案数: ${allPlans.length}，显示数量: ${this.data.pageSize}`);
        console.log(`[优化] - 避免了重复调用云函数，提升了页面加载性能`);
        console.log(`[优化] - 云函数调用次数: ${this.data.cloudFunctionCallCount}，目标: 1次`);
      } else {
        console.error(`${mode}模式数据获取失败:`, result);
        // 设置加载失败状态
        this.setData({
          loading: false,
          isDataLoaded: false
        });
      }
      

    } catch (error) {
      console.error(`初始化${mode}模式英雄列表失败:`, error);
      // 设置加载失败状态
      this.setData({
        loading: false,
        isDataLoaded: false
      });
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
        
        // 更新缓存的timestamp，确保needsCountRefresh能正确判断
        const cacheKey = CACHE_KEYS.PLAN_RECOMMEND_MODE(type, 'all');
        const existingCache = cacheManager.get<any>(cacheKey);
        if (existingCache) {
          cacheManager.set(cacheKey, {
            ...existingCache,
            timestamp: Date.now() // 更新时间戳
          }, 30 * 60 * 1000);
          console.log('已更新模式切换后的缓存时间戳:', cacheKey);
        }
        
        // 重要：确保数据状态一致，避免筛选器操作后数据为空
        setTimeout(() => {
          // 验证数据状态
          console.log('模式切换后数据状态验证:', {
            currentMode: this.data.currentMode,
            allRecommendPlansLength: this.data.allRecommendPlans.length,
            recommendPlansLength: this.data.recommendPlans.length,
            heroCategoriesLength: this.data.heroCategories.length
          });
          
          // 如果数据为空，尝试从缓存恢复
          if (this.data.allRecommendPlans.length === 0 && this.data.originalAllPlans.length > 0) {
            console.log('检测到数据不一致，从originalAllPlans恢复数据');
            this.setData({
              allRecommendPlans: this.data.originalAllPlans
            });
          }
        }, 100);
        
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
      
      // 设置加载状态
      this.setData({
        loading: true
      });
      
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
      // 清除加载状态
      this.setData({
        loading: false
      });
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
        
        // 重要：确保数据状态一致，避免筛选器操作后数据为空
        setTimeout(() => {
          // 验证数据状态
          console.log('模式切换后数据状态验证:', {
            currentMode: this.data.currentMode,
            allRecommendPlansLength: this.data.allRecommendPlans.length,
            recommendPlansLength: this.data.recommendPlans.length,
            heroCategoriesLength: this.data.heroCategories.length
          });
          
          // 如果数据为空，尝试从缓存恢复
          if (this.data.allRecommendPlans.length === 0 && this.data.originalAllPlans.length > 0) {
            console.log('检测到数据不一致，从originalAllPlans恢复数据');
            this.setData({
              allRecommendPlans: this.data.originalAllPlans
            });
          }
        }, 100);
        
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
            originalAllPlans: cachedData.allPlans, // 重要：更新原始数据
            total: cachedData.total,
            heroCategories: heroCategories, // 确保英雄分类正确更新
            isDataLoaded: true
          });
          
          // 重要：确保数据状态一致
          setTimeout(() => {
            console.log('从其他模式缓存复用后数据状态验证:', {
              currentMode: this.data.currentMode,
              allRecommendPlansLength: this.data.allRecommendPlans.length,
              recommendPlansLength: this.data.recommendPlans.length,
              originalAllPlansLength: this.data.originalAllPlans.length
            });
          }, 100);
          
          return;
        }
      }
      
      // 如果无法复用缓存数据，需要重新获取
      console.log('无法复用缓存数据，需要重新获取数据，模式:', mode);
      
      // 设置加载状态
      this.setData({
        loading: true
      });
      
      // 清除当前数据状态
      this.setData({
        heroCategories: [],
        allRecommendPlans: [],
        originalAllPlans: [],
        recommendPlans: [],
        total: 0,
        isDataLoaded: false
      });
      
      // 重新获取数据
      await this.initModeHeroList(mode, this.data.currentRequestId);
    } catch (error) {
      console.error('切换显示模式失败:', error);
      // 清除加载状态
      this.setData({
        loading: false
      });
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
      
      // 重要：确保allRecommendPlans有数据
      if (!allRecommendPlans || allRecommendPlans.length === 0) {
        console.warn('allRecommendPlans为空，无法进行筛选');
        // 尝试从缓存恢复数据
        const modeCache = this.data.modeDataCache[currentMode as keyof typeof this.data.modeDataCache];
        if (modeCache && modeCache.allPlans && modeCache.allPlans.length > 0) {
          console.log('从缓存恢复数据用于筛选');
          this.setData({
            allRecommendPlans: modeCache.allPlans
          });
        } else {
          console.error('无法恢复数据，筛选失败');
          this.setData({
            recommendPlans: [],
            total: 0
          });
          return;
        }
      }
      
      if (selectedHero === 'all') {
        console.log('显示全部推荐方案');
        // 显示全部推荐方案，使用原始完整数据，根据当前模式使用不同的排序逻辑
        let sortedPlans = [...this.data.originalAllPlans]; // 使用原始完整数据，不是当前的allRecommendPlans
        
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
          allRecommendPlans: formattedPlans, // 重要：同时更新allRecommendPlans，确保加载更多功能正常
          currentFilteredPlans: [], // 清除筛选结果
          total: formattedPlans.length,
          page: 1, // 重置页码
          hasMore: formattedPlans.length > this.data.pageSize // 根据数据量设置是否有更多
        });
        
        // 强制更新页面UI
        this.setData({
          _forceUpdate: Date.now()
        });
      } else {
        console.log('筛选指定英雄的方案:', selectedHero);
        // 筛选指定英雄的推荐方案，根据当前模式使用不同的排序逻辑
        const filteredPlans = this.data.allRecommendPlans.filter(plan => plan.heroName === selectedHero);
        console.log('筛选结果:', {
          heroName: selectedHero,
          filteredCount: filteredPlans.length,
          allPlansCount: this.data.allRecommendPlans.length
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
          recommendPlans: formattedPlans.slice(0, this.data.pageSize), // 只显示第一页
          // 重要：allRecommendPlans不应该被筛选操作修改，它应该保持完整数据供加载更多使用
          // allRecommendPlans: formattedPlans, // ❌ 错误：这会导致后续筛选失败
          total: formattedPlans.length,
          page: 1, // 重置页码
          hasMore: formattedPlans.length > this.data.pageSize, // 根据筛选结果设置是否有更多
          // 临时存储当前筛选结果，供分页使用
          currentFilteredPlans: formattedPlans
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
      // 简化日志，只保留关键信息
      console.log('recommendPlan: 开始处理英雄头像，英雄数量:', heroCategories.length);
      
      // 为每个英雄分类添加头像信息
      const processedCategories = heroCategories.map(heroCategory => {
        const hero = getHeroByName(heroCategory.heroName);
        
        if (hero && hero.avatar) {
          // 移除每个英雄的详细日志
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
      
      // 简化日志输出
      if (avatarUrls.length > 0) {
        const avatarUrlMap = await avatarCache.getAvatarUrls(avatarUrls);
        console.log('recommendPlan: 头像临时URL获取完成，处理数量:', avatarUrls.length);
        
        // 更新英雄头像URL
        processedCategories.forEach(heroCategory => {
          if (heroCategory.heroAvatar && avatarUrlMap[heroCategory.heroAvatar]) {
            heroCategory.heroAvatar = avatarUrlMap[heroCategory.heroAvatar];
          }
        });
      }
      
      return processedCategories;
    } catch (error) {
      console.error('recommendPlan: 处理英雄头像失败:', error);
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
        
        // 同步更新allRecommendPlans数组中的状态
        this.syncPlanStateInAllPlans(plan._id, {
          isLiked: result.result.data.isLiked,
          likeCount: result.result.data.likeCount
        });
        
        // 更新本地存储中的点赞状态
        try {
          const currentLikes = wx.getStorageSync('user_liked_plans') || [];
          let newLikes: string[];
          
          if (result.result.data.isLiked) {
            // 添加到点赞列表
            if (!currentLikes.includes(plan._id)) {
              newLikes = [...currentLikes, plan._id];
            } else {
              newLikes = currentLikes;
            }
          } else {
            // 从点赞列表移除
            newLikes = currentLikes.filter((id: string) => id !== plan._id);
          }
          
          wx.setStorageSync('user_liked_plans', newLikes);
          console.log('已更新本地点赞状态:', {
            planId: plan._id,
            isLiked: result.result.data.isLiked,
            totalLikes: newLikes.length
          });
        } catch (error) {
          console.warn('更新本地点赞状态失败:', error);
        }
        
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
        
        // 一次性同步所有状态和数字到allRecommendPlans数组和模式缓存
        this.syncPlanStateInAllPlans(plan._id, {
          isFavorited: result.result.data.isFavorited,
          favoriteCount: result.result.data.favorites
        });
        
        // 更新当前显示数据的数字（已经在syncPlanStateInAllPlans中处理了缓存）
        this.updatePlanCountsInCurrentDisplay(plan._id, {
          favoriteCount: result.result.data.favorites
        });
        
        // 更新本地存储中的收藏状态
        try {
          const currentFavorites = wx.getStorageSync('user_favorite_plans') || [];
          let newFavorites: string[];
          
          if (result.result.data.isFavorited) {
            // 添加到收藏列表
            if (!currentFavorites.includes(plan._id)) {
              newFavorites = [...currentFavorites, plan._id];
            } else {
              newFavorites = currentFavorites;
            }
          } else {
            // 从收藏列表移除
            newFavorites = currentFavorites.filter((id: string) => id !== plan._id);
          }
          
          wx.setStorageSync('user_favorite_plans', newFavorites);
          console.log('已更新本地收藏状态:', {
            planId: plan._id,
            isFavorited: result.result.data.isFavorited,
            totalFavorites: newFavorites.length
          });
        } catch (error) {
          console.warn('更新本地收藏状态失败:', error);
        }
        
        // 通知其他页面收藏状态变化
        if (isFavorited) {
          notifyFavoriteAdded(plan._id);
        } else {
          notifyFavoriteRemoved(plan._id);
        }
        
        // 更新lastLoadTime为当前时间，避免下次进入时重新加载导致状态不一致
        this.setData({
          lastLoadTime: Date.now()
        });
        
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
  async loadRecommendPlans(isLoadMore = false, requestId?: number, forceRefresh = false) {
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
      // 检查请求是否已被取消
      if (currentRequestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过数据加载，请求ID:', currentRequestId);
        this.setData({ 
          loading: false,
          loadingMore: false 
        });
        return;
      }

      // 使用新的 planService 获取推荐方案
      console.log(`使用planService获取${this.data.currentMode}模式数据${forceRefresh ? '(强制刷新)' : ''}`);
      const plans = await planService.getRecommendPlans(this.data.currentMode, forceRefresh);
      
      // 再次检查请求是否已被取消
      if (currentRequestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过方案数据处理，请求ID:', currentRequestId);
        this.setData({ 
          loading: false,
          loadingMore: false 
        });
        return;
      }

      // 根据选定的英雄进行筛选
      let filteredPlans = plans;
      if (this.data.selectedHero !== 'all') {
        filteredPlans = plans.filter(plan => plan.heroName === this.data.selectedHero);
        console.log(`英雄筛选后方案数量: ${filteredPlans.length} (原始: ${plans.length})`);
      }

      // 处理分页
      const pageSize = this.data.pageSize;
      const startIndex = isLoadMore ? this.data.page * pageSize : 0;
      const endIndex = startIndex + pageSize;
      const paginatedPlans = filteredPlans.slice(startIndex, endIndex);
      const hasMore = endIndex < filteredPlans.length;

      console.log(`分页处理: 起始${startIndex}, 结束${endIndex}, 当前页${paginatedPlans.length}个, 还有更多: ${hasMore}`);

      // 处理方案数据，添加英雄头像
      const processedPlans = await this.processPlansWithAvatars(paginatedPlans);
      
      // 最后检查请求是否已被取消
      if (currentRequestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过最终数据更新，请求ID:', currentRequestId);
        this.setData({ 
          loading: false,
          loadingMore: false 
        });
        return;
      }
      
      // 格式化时间
      const formattedPlans = processedPlans.map((plan: any) => ({
        ...plan,
        createTime: this.formatTime(plan.createTime)
      }));
      
      // 更新数据
      if (isLoadMore) {
        // 加载更多：追加到现有数据，使用去重确保wx:key唯一性
        const newPlans = this.deduplicatePlans(this.data.recommendPlans, formattedPlans);
        this.setData({
          recommendPlans: newPlans,
          page: this.data.page + 1,
          hasMore: hasMore,
          loadingMore: false
        });
        console.log(`加载更多完成，当前总方案数: ${newPlans.length}`);
      } else {
        // 首次加载：替换现有数据
        this.setData({
          recommendPlans: formattedPlans,
          allRecommendPlans: plans, // 保存当前模式的完整数据，用于英雄筛选
          originalAllPlans: plans, // 保存未筛选的完整数据，用于切换到"全部"时恢复
          page: 1,
          hasMore: hasMore,
          loading: false,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });
        
        // 确保全局缓存包含完整数据（planService内部已经设置，这里只是确保一致性）
        // 获取并验证全局缓存是否正确设置
        const globalCache = cacheManager.get(CACHE_KEYS.ALL_PLANS_CACHE_KEY) as any[];
        if (!globalCache || !Array.isArray(globalCache)) {
          console.warn('全局缓存未正确设置，尝试从planService获取完整数据');
          try {
            const allOriginalPlans = await planService.getAllPlans(false); // 不强制刷新，应该有缓存
            cacheManager.set(CACHE_KEYS.ALL_PLANS_CACHE_KEY, allOriginalPlans, 30 * 60 * 1000);
            console.log(`[备用方案] 已设置全局缓存，数据量: ${allOriginalPlans.length}`);
          } catch (error) {
            console.warn('备用全局缓存设置失败:', error);
          }
        } else {
          console.log(`[验证] 全局缓存已存在，数据量: ${globalCache.length}`);
        }
        
        console.log(`首次加载完成，方案数: ${formattedPlans.length}, 总筛选数: ${filteredPlans.length}, 完整数据: ${plans.length}`);
      }
      
    } catch (error) {
      console.error(`获取${this.data.currentMode}模式数据失败:`, error);
      // 设置加载失败状态
      this.setData({
        loading: false,
        loadingMore: false,
      });
      
      // 显示错误提示
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 去重函数：基于_id去重，确保wx:key唯一性，避免渲染警告
  deduplicatePlans(existingPlans: any[], newPlans: any[]): any[] {
    console.log('执行数据去重，现有数据量:', existingPlans.length, '新增数据量:', newPlans.length);
    const existingIds = new Set(existingPlans.map((plan: any) => plan._id));
    const uniqueNewPlans = newPlans.filter((plan: any) => !existingIds.has(plan._id));
    console.log('去重完成，实际新增数据量:', uniqueNewPlans.length);
    return [...existingPlans, ...uniqueNewPlans];
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
    
    // 获取当前用户的交互状态
    const favoritePlans = wx.getStorageSync('user_favorite_plans') || [];
    const likedPlans = wx.getStorageSync('user_liked_plans') || [];
    
    // 处理方案数据
    return plans.map(plan => {
      const hero = getHeroById(plan.heroId);
      const originalAvatar = hero ? hero.avatar : '';
      const heroAvatar = avatarUrlMap[originalAvatar] || originalAvatar;
      
      // 初始化交互状态
      const isFavorite = favoritePlans.includes(plan._id);
      const isLiked = likedPlans.includes(plan._id);
      
      return {
        ...plan,
        heroAvatar: heroAvatar,
        isFavorite: plan.isFavorite !== undefined ? plan.isFavorite : isFavorite,
        isLiked: plan.isLiked !== undefined ? plan.isLiked : isLiked
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
    // 优化：根据当前状态选择数据源
    let dataSource = this.data.allRecommendPlans;
    
    // 如果当前是筛选状态，使用筛选结果
    if (this.data.selectedHero !== 'all' && this.data.currentFilteredPlans.length > 0) {
      dataSource = this.data.currentFilteredPlans;
      console.log('从筛选结果加载更多，筛选英雄:', this.data.selectedHero);
    } else {
      console.log('从全部数据加载更多');
    }
    
    // 优先从本地缓存数据中加载更多
    if (dataSource.length > 0 && this.data.recommendPlans.length < dataSource.length) {
      console.log('从本地缓存数据加载更多');
      const currentLength = this.data.recommendPlans.length;
      const nextPageData = dataSource.slice(currentLength, currentLength + this.data.pageSize);
      
      if (nextPageData.length > 0) {
        // 使用去重函数确保wx:key唯一性
        const newPlans = this.deduplicatePlans(this.data.recommendPlans, nextPageData);
        this.setData({
          recommendPlans: newPlans,
          page: this.data.page + 1,
          hasMore: currentLength + nextPageData.length < dataSource.length
        });
        console.log('本地加载更多完成，当前显示数量:', newPlans.length);
        return;
      }
    }
    
    // 如果本地数据不足，才调用云函数
    console.log('本地数据不足，调用云函数加载更多');
    await this.loadRecommendPlans(true, this.data.currentRequestId);
  },

  // 页面相关事件处理函数--监听用户下拉动作
  async onPullDownRefresh() {
    try {
      // 清除当前模式的缓存数据
      const cacheKey = CACHE_KEYS.PLAN_RECOMMEND_MODE(this.data.currentMode, this.data.selectedHero);
      cacheManager.delete(cacheKey);
      console.log('下拉刷新，已清除缓存:', cacheKey);
      
      this.setData({ 
        page: 1, // 重置页码
        originalAllPlans: [] // 清除原始数据
      }); 
      await this.loadRecommendPlans(false, this.data.currentRequestId, true); // 强制刷新
      
      // 下拉刷新后重新应用当前的筛选状态
      if (this.data.selectedHero !== 'all') {
        this.selectHero({ currentTarget: { dataset: { hero: this.data.selectedHero } } });
      }
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
      
      // 检查是否是来自当前页面的变化
      const isFromCurrentPage = this.data.recommendPlans && 
        this.data.recommendPlans.some(plan => plan._id === event.planId);
        
      if (isFromCurrentPage) {
        console.log('收藏变化来自当前页面，跳过重新加载避免状态冲突');
        return;
      }
      
      // 添加调试信息：检查当前方案的收藏状态
      if (this.data.recommendPlans && this.data.recommendPlans.length > 0) {
        const targetPlan = this.data.recommendPlans.find(plan => plan._id === event.planId);
        if (targetPlan) {
          console.log('目标方案当前状态:', {
            planId: targetPlan._id,
            isFavorite: targetPlan.isFavorite,
            action: event.action
          });
        }
      }
      
      // 来自其他页面的收藏变化，需要彻底清除缓存确保获取最新数据
      console.log('收到来自其他页面的收藏状态变化，清除所有相关缓存');
      
      // 彻底清除所有缓存，包括模式数据缓存
      this.clearFavoriteRelatedCache();
      this.setData({
        modeDataCache: {
          recommended: { heroCategories: [], allPlans: [], total: 0 },
          hot: { heroCategories: [], allPlans: [], total: 0 },
          latest: { heroCategories: [], allPlans: [], total: 0 }
        },
        allRecommendPlans: [],
        lastLoadTime: 0 // 强制下次onShow时重新加载数据
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
      
      // 添加调试信息：检查当前方案的点赞状态
      if (this.data.recommendPlans && this.data.recommendPlans.length > 0) {
        const targetPlan = this.data.recommendPlans.find(plan => plan._id === event.planId);
        if (targetPlan) {
          console.log('目标方案当前状态:', {
            planId: targetPlan._id,
            isLiked: targetPlan.isLiked,
            action: event.action
          });
        }
      }
      
      // 当收到点赞状态变化事件时，立即清除相关缓存并标记数据需要刷新
      this.clearLikeRelatedCache();
      // 立即同步交互状态到显示数据
      setTimeout(async () => {
        await this.syncInteractionStates();
      }, 100);
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
      // 立即同步交互状态到显示数据
      setTimeout(async () => {
        await this.syncInteractionStates();
      }, 100);
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

  // 刷新交互数字数据（收藏数和点赞数）
  async refreshInteractionCounts() {
    try {
      console.log('开始刷新交互数字数据');
      
      if (!this.data.recommendPlans || this.data.recommendPlans.length === 0) {
        console.log('没有方案数据，跳过数字刷新');
        return;
      }
      
      // 获取当前显示方案的ID列表
      const planIds = this.data.recommendPlans.map((plan: any) => plan._id);
      
      // 调用云函数获取最新的数字数据
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: 'count_only',  // 只获取数字数据的特殊模式
          planIds: planIds,
          page: 1,
          pageSize: planIds.length
        }
      }) as any;
      
      if (result.result && result.result.success && result.result.data.plans) {
        const plansWithNewCounts = result.result.data.plans;
        
        // 更新当前显示的数据，保持原有顺序和状态，只更新数字
        const updatedPlans = this.data.recommendPlans.map((currentPlan: any) => {
          const newCountData = plansWithNewCounts.find((p: any) => p._id === currentPlan._id);
          if (newCountData) {
            return {
              ...currentPlan,
              likeCount: newCountData.likeCount || 0,
              favoriteCount: newCountData.favoriteCount || 0
            };
          }
          return currentPlan;
        });
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        console.log('交互数字数据刷新完成');
      } else {
        console.warn('获取数字数据失败:', result);
      }
    } catch (error) {
      console.warn('刷新交互数字数据失败:', error);
    }
  },

  // 刷新方案的数字数据（收藏数和点赞数）
  async refreshPlanCounts() {
    try {
      console.log('开始刷新方案的数字数据');
      
      if (!this.data.recommendPlans || this.data.recommendPlans.length === 0) {
        console.log('没有方案数据，跳过数字刷新');
        return;
      }
      
      // 使用简单的方法：重新加载数据以获取最新的数字
      // 这样可以确保数字是最新的，而且不需要新的云函数
      console.log('重新加载数据以获取最新的收藏数和点赞数');
      await this.loadRecommendPlans(false, this.data.currentRequestId);
      
    } catch (error) {
      console.warn('刷新方案数字数据失败:', error);
      // 如果重新加载失败，保持现有状态
    }
  },

  // 检查是否需要刷新数字数据
  needsCountRefresh(): boolean {
    try {
      // 检查是否有最近的收藏/点赞操作需要更新数字
      const lastFavoriteChange = wx.getStorageSync('last_global_favorite_change') || 0;
      const lastLikeChange = wx.getStorageSync('last_global_like_change') || 0;
      
      // 获取缓存数据的时间戳，使用与设置缓存时相同的键格式
      const heroListCacheKey = `timi:plan:data:herolist_${this.data.currentMode}:v1`;
      const cachedData = cacheManager.get<any>(heroListCacheKey);
      const cacheTimestamp = cachedData?.timestamp || 0;
      
      // 只有在过去10分钟内有交互变化且比缓存数据新时才刷新
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000; // 10分钟前
      
      const hasRecentFavoriteChange = lastFavoriteChange > tenMinutesAgo && lastFavoriteChange > cacheTimestamp;
      const hasRecentLikeChange = lastLikeChange > tenMinutesAgo && lastLikeChange > cacheTimestamp;
      
      // 如果有比缓存数据更新的交互变化，则需要刷新数字
      const needsRefresh = hasRecentFavoriteChange || hasRecentLikeChange;
      
      console.log('检查数字刷新需求:', {
        lastFavoriteChange,
        lastLikeChange,
        cacheTimestamp,
        tenMinutesAgo,
        hasRecentFavoriteChange,
        hasRecentLikeChange,
        needsRefresh,
        cacheKey: heroListCacheKey
      });
      
      return needsRefresh;
    } catch (error) {
      console.warn('检查数字刷新需求失败:', error);
      return false; // 出错时不刷新，避免不必要的调用
    }
  },

  // 检查是否需要重新加载数据
  needsDataReload(): boolean {
    try {
      // 检查本地存储的收藏状态是否与显示数据一致
      const localFavorites = wx.getStorageSync('user_favorite_plans') || [];
      
      if (this.data.recommendPlans && this.data.recommendPlans.length > 0) {
        for (const plan of this.data.recommendPlans) {
          const shouldBeFavorited = localFavorites.includes(plan._id);
          if (plan.isFavorited !== shouldBeFavorited) {
            console.log('发现收藏状态不一致:', {
              planId: plan._id,
              displayState: plan.isFavorited,
              actualState: shouldBeFavorited
            });
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn('检查数据重新加载需求失败:', error);
      return false;
    }
  },

  // 检查统一交互状态变化
  checkInteractionChanges(): boolean {
    return this.checkFavoriteChanges() || this.checkLikeChanges();
  },

  // 通用的缓存清除方法
  clearInteractionRelatedCache(reason = '交互状态变化') {
    try {
      console.log(`检测到${reason}，清除相关缓存以确保获取最新状态`);
      
      // 构建需要清除的缓存键数组 - 使用标准化的缓存键生成器
      const cacheKeys = [
        CACHE_KEYS.PLAN_RECOMMEND_MODE(this.data.currentMode, 'all'),
        CACHE_KEYS.PLAN_RECOMMEND_MODE(this.data.currentMode, this.data.selectedHero)
      ];
      
      // 清除所有模式的推荐方案缓存，但保留英雄分类数据
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          CACHE_KEYS.PLAN_RECOMMEND_MODE(mode, 'all'),
          CACHE_KEYS.PLAN_RECOMMEND_MODE(mode, this.data.selectedHero)
        );
      });
      
      // 使用批量删除，提高效率
      const deletedCount = cacheManager.deleteBatch(cacheKeys);
      console.log(`已清除${deletedCount}个交互相关缓存，保留英雄分类数据`);
      
      // 标记需要同步交互状态
      this.setData({
        needSyncInteractionStates: true
      });
    } catch (error) {
      console.warn('清除交互相关缓存失败:', error);
    }
  },

  // 为了兼容性保留的方法（调用通用方法）
  clearFavoriteRelatedCache() {
    this.clearInteractionRelatedCache('收藏状态变化');
  },

  clearLikeRelatedCache() {
    this.clearInteractionRelatedCache('点赞状态变化');
  },

  // 更新所有模式缓存中的方案数量
  updatePlanCountsInAllModeCache(planId: string, counts: { likeCount?: number, favoriteCount?: number }) {
    try {
      const modes = ['recommended', 'hot', 'latest'] as const;
      let hasUpdated = false;
      
      modes.forEach(mode => {
        const modeCache = this.data.modeDataCache[mode];
        if (modeCache && modeCache.allPlans && modeCache.allPlans.length > 0) {
          const planIndex = modeCache.allPlans.findIndex((p: any) => p._id === planId);
          if (planIndex !== -1) {
            const updatedModePlans = [...modeCache.allPlans];
            updatedModePlans[planIndex] = {
              ...updatedModePlans[planIndex],
              ...counts
            };
            
            const updatedModeDataCache = { ...this.data.modeDataCache };
            (updatedModeDataCache as any)[mode] = {
              ...(updatedModeDataCache as any)[mode],
              allPlans: updatedModePlans
            };
            
            this.setData({
              modeDataCache: updatedModeDataCache
            });
            
            hasUpdated = true;
            console.log(`已更新${mode}模式缓存中的方案数量:`, {
              planId,
              counts,
              index: planIndex
            });
          }
        }
      });
      
      if (hasUpdated) {
        console.log('所有模式缓存中的方案数量已更新');
      }
    } catch (error) {
      console.warn('更新模式缓存中的方案数量失败:', error);
    }
  },

  // 更新当前显示数据中的方案数量
  updatePlanCountsInCurrentDisplay(planId: string, counts: { likeCount?: number, favoriteCount?: number }) {
    try {
      if (this.data.recommendPlans && this.data.recommendPlans.length > 0) {
        const planIndex = this.data.recommendPlans.findIndex((p: any) => p._id === planId);
        if (planIndex !== -1) {
          const updatedPlans = [...this.data.recommendPlans];
          updatedPlans[planIndex] = {
            ...updatedPlans[planIndex],
            ...counts
          };
          
          this.setData({
            recommendPlans: updatedPlans
          });
          
          console.log('已更新当前显示数据中的方案数量:', {
            planId,
            counts,
            index: planIndex
          });
        }
      }
    } catch (error) {
      console.warn('更新当前显示数据中的方案数量失败:', error);
    }
  },

  // 同步方案状态到allRecommendPlans数组
  syncPlanStateInAllPlans(planId: string, state: { isLiked?: boolean, isFavorited?: boolean, likeCount?: number, favoriteCount?: number }) {
    try {
      // 更新allRecommendPlans数组中的状态
      if (this.data.allRecommendPlans && this.data.allRecommendPlans.length > 0) {
        const planIndex = this.data.allRecommendPlans.findIndex((p: any) => p._id === planId);
        if (planIndex !== -1) {
          const updatedAllPlans = [...this.data.allRecommendPlans];
          updatedAllPlans[planIndex] = {
            ...updatedAllPlans[planIndex],
            ...state
          };
          
          this.setData({
            allRecommendPlans: updatedAllPlans
          });
          
          console.log('已同步方案状态到allRecommendPlans:', {
            planId,
            state,
            index: planIndex
          });
        }
      }
      
      // 更新所有模式缓存中的状态
      ['recommended', 'hot', 'latest'].forEach(mode => {
        const modeData = (this.data.modeDataCache as any)[mode];
        if (modeData && modeData.allPlans) {
          const modePlanIndex = modeData.allPlans.findIndex((p: any) => p._id === planId);
          if (modePlanIndex !== -1) {
            const updatedModePlans = [...modeData.allPlans];
            updatedModePlans[modePlanIndex] = {
              ...updatedModePlans[modePlanIndex],
              ...state
            };
            
            const updatedModeDataCache = { ...this.data.modeDataCache };
            (updatedModeDataCache as any)[mode] = {
              ...(updatedModeDataCache as any)[mode],
              allPlans: updatedModePlans
            };
            
            this.setData({
              modeDataCache: updatedModeDataCache
            });
            
            console.log(`已同步方案状态到${mode}模式缓存:`, {
              planId,
              state,
              index: modePlanIndex
            });
          }
        }
      });
    } catch (error) {
      console.warn('同步方案状态失败:', error);
    }
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
  clearModeRelatedCache(_mode: string) {
    // 所有模式之间切换都可以复用缓存，因为recommended模式是hot模式的子集
    console.log('模式切换，保留所有模式缓存，只清除当前模式缓存');
    
    // 只清除当前模式的缓存
    const currentModeCacheKeys = [
      CACHE_KEYS.PLAN_RECOMMEND_MODE(this.data.currentMode, 'all'),
      CACHE_KEYS.PLAN_RECOMMEND_MODE(this.data.currentMode, this.data.selectedHero),
      CACHE_KEYS.HERO_LIST_MODE(this.data.currentMode)
    ];
    
    // 使用批量删除
    const deletedCount = cacheManager.deleteBatch(currentModeCacheKeys);
    console.log(`已清除当前模式缓存: ${deletedCount} 个`);
    
         // 只清除当前模式的模式数据缓存
     this.setData({
       [`modeDataCache.${this.data.currentMode}`]: { heroCategories: [], allPlans: [], total: 0 }
     });
     
     // 清除原始数据
     this.setData({
       originalAllPlans: []
     });
    
    console.log('已清除当前模式的缓存数据，保留其他模式缓存');
  },

  // 同步交互状态到方案数据
  async syncInteractionStates() {
    try {
      console.log('开始同步交互状态到方案数据');
      
      // 获取最新的交互状态数据
      const favoritePlans = wx.getStorageSync('user_favorite_plans') || [];
      const likedPlans = wx.getStorageSync('user_liked_plans') || [];
      
      console.log('当前交互状态数据:', {
        favoritePlans: favoritePlans.length,
        likedPlans: likedPlans.length,
        currentMode: this.data.currentMode
      });
      
      // 首先同步当前显示的recommendPlans数据
      if (this.data.recommendPlans && this.data.recommendPlans.length > 0) {
        let hasCurrentDisplayUpdated = false;
        const updatedCurrentPlans = this.data.recommendPlans.map((plan: any) => {
          const isFavorited = favoritePlans.includes(plan._id);
          const isLiked = likedPlans.includes(plan._id);
          
          // 检查状态是否需要更新，但保留原有的数字
          if (plan.isFavorited !== isFavorited || plan.isLiked !== isLiked) {
            hasCurrentDisplayUpdated = true;
            console.log(`当前显示方案 ${plan._id} 状态同步:`, {
              old: { isFavorited: plan.isFavorited, isLiked: plan.isLiked },
              new: { isFavorited, isLiked },
              preservedCounts: { favoriteCount: plan.favoriteCount, likeCount: plan.likeCount }
            });
            return {
              ...plan,
              isFavorited,
              isLiked
              // 保留原有的favoriteCount和likeCount，不在这里覆盖
            };
          }
          return plan;
        });
        
        if (hasCurrentDisplayUpdated) {
          this.setData({
            recommendPlans: updatedCurrentPlans
          });
          console.log('已同步当前显示数据的交互状态，保留了数字数据');
        }
      }
      
      // 更新所有模式的方案数据
      const modes = ['recommended', 'hot', 'latest'] as const;
      let hasUpdated = false;
      
      modes.forEach(mode => {
        const modeCache = this.data.modeDataCache[mode];
        if (modeCache && modeCache.allPlans && modeCache.allPlans.length > 0) {
          const updatedPlans = modeCache.allPlans.map((plan: any) => {
            const isFavorited = favoritePlans.includes(plan._id);
            const isLiked = likedPlans.includes(plan._id);
            
            // 只有当状态发生变化时才更新，并保留原有数字
            if (plan.isFavorited !== isFavorited || plan.isLiked !== isLiked) {
              hasUpdated = true;
              console.log(`方案 ${plan._id} 状态变化:`, {
                old: { isFavorited: plan.isFavorited, isLiked: plan.isLiked },
                new: { isFavorited, isLiked },
                preservedCounts: { favoriteCount: plan.favoriteCount, likeCount: plan.likeCount }
              });
              return {
                ...plan,
                isFavorited,
                isLiked
                // 保留原有的favoriteCount和likeCount
              };
            }
            return plan;
          });
          
          // 更新模式缓存
          const updatedModeDataCache = { ...this.data.modeDataCache };
          (updatedModeDataCache as any)[mode] = {
            ...(updatedModeDataCache as any)[mode],
            allPlans: updatedPlans
          };
          
          this.setData({
            modeDataCache: updatedModeDataCache
          });
          
          // 如果当前模式匹配，也更新allRecommendPlans
          if (mode === this.data.currentMode) {
            this.setData({
              allRecommendPlans: updatedPlans,
              originalAllPlans: updatedPlans
            });
          }
        }
      });
      
      if (hasUpdated) {
        console.log('交互状态同步完成，已更新方案数据');
      } else {
        console.log('交互状态无需更新');
      }
      
      // 清除同步标记
      this.setData({
        needSyncInteractionStates: false
      });
    } catch (error) {
      console.warn('同步交互状态失败:', error);
      // 即使失败也要清除标记，避免无限重试
      this.setData({
        needSyncInteractionStates: false
      });
    }
  },

  // 初始化交互状态数据
  async initInteractionStates() {
    try {
      console.log('开始初始化交互状态数据');
      
      // 检查本地存储中是否已有交互状态数据
      const favoritePlans = wx.getStorageSync('user_favorite_plans');
      const likedPlans = wx.getStorageSync('user_liked_plans');
      
      if (favoritePlans && likedPlans) {
        console.log('本地已有交互状态数据，跳过初始化');
        return;
      }
      
      // 如果没有交互状态数据，从服务器获取
      console.log('本地无交互状态数据，从服务器获取');
      
      try {
        // 获取用户收藏列表
        const favoriteResult = await wx.cloud.callFunction({
          name: 'getUserFavorites'
        }) as any;
        
        if (favoriteResult.result && favoriteResult.result.success) {
          const favoriteIds = favoriteResult.result.data.favorites.map((fav: any) => fav.planId);
          wx.setStorageSync('user_favorite_plans', favoriteIds);
          console.log('已初始化收藏状态数据，数量:', favoriteIds.length);
        }
      } catch (error) {
        console.warn('获取用户收藏列表失败:', error);
      }
      
      // 点赞状态初始化为空数组，点赞状态是动态的，不需要预先加载
      // 实际的点赞状态会在方案数据中包含isLiked字段
      wx.setStorageSync('user_liked_plans', []);
      console.log('已初始化点赞状态数据为空数组');
      
      console.log('交互状态数据初始化完成');
    } catch (error) {
      console.warn('初始化交互状态数据失败:', error);
      // 如果初始化失败，设置为空数组
      try {
        wx.setStorageSync('user_favorite_plans', []);
        wx.setStorageSync('user_liked_plans', []);
      } catch (storageError) {
        console.warn('设置默认交互状态失败:', storageError);
      }
    }
  }
});