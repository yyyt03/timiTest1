// 体验服方案页面
import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById, getHeroByName } from '../../data/localHeroData';
import { avatarCache } from '../../utils/avatarCache';
import cacheManager from '../../utils/cacheManager';
import { CACHE_KEYS } from '../../utils/cacheKeys';
import { notifyFavoriteAdded, notifyFavoriteRemoved, notifyLikeAdded, notifyLikeRemoved, favoriteSyncManager, interactionSyncManager } from '../../utils/favoriteSync';
import { debounceOperation } from '../../utils/debounce';
import { planService } from '../../utils/planService';

Page({
  data: {
    // 页面数据
    recommendPlanIcon: getRecommendPlanIcon(),
    likeOutlineIcon: getLikeIcon(false),
    likeFilledIcon: getLikeIcon(true),
    favoriteOutlineIcon: getFavoriteIcon(false),
    favoriteFilledIcon: getFavoriteIcon(true),
    emptyIcon: getEmptyIcon('favorites'),
    
    // 筛选状态 - 改为3个tab
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
    allBetaPlans: [] as any[], // 当前模式的所有方案数据
    originalAllPlans: [] as any[], // 保存完整的hot模式数据，用于模式切换时恢复
    total: 0,
    
    // 体验服方案列表
    betaPlans: [] as any[],
    
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
    
    // 添加页面状态管理
    pageState: {
      isInitialized: false, // 页面是否已初始化
      lastEnterTime: 0, // 最后进入时间
      dataVersion: 0 // 数据版本号，用于强制刷新
    },
    
    // 添加云函数调用计数和初始化状态管理
    cloudFunctionCallCount: 0, // 云函数调用次数计数
    hasInitialized: false // 页面是否已完成初始化
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
    console.log('体验服方案页面 onLoad 触发');
    
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
      'pageState.lastEnterTime': now,
      'pageState.isInitialized': true,
      hasInitialized: true
    });
    
    // 设置收藏状态变化监听器
    this.setupFavoriteChangeListener();
    // 设置点赞状态变化监听器
    this.setupLikeChangeListener();
    // 设置统一交互状态变化监听器
    this.setupInteractionChangeListener();
    
    // 初始化防抖版本的筛选器切换函数（500ms防抖，避免快速切换）
    this.debouncedSwitchFilter = debounceOperation('betaSwitchFilter', this.switchFilter.bind(this), 500, {
      leading: false,
      trailing: true,
      maxWait: 2000 // 最大等待2秒
    });
    
    // 从strategy进入时，强制重置为全部英雄状态，不管之前是否有筛选
    console.log('从strategy进入，强制重置为全部英雄状态');
    this.resetFilterState();
    
    // 清理可能不完整的缓存数据，确保显示完整数据
    this.clearIncompleteCache();
    
    // 重要：只调用一次initModeHeroList，避免重复云函数调用
    console.log('初始化页面数据，模式:', this.data.currentMode, '英雄:', this.data.selectedHero);
    this.initModeHeroList('hot', this.data.currentRequestId); // 初始化热门模式的英雄分类
    
    // 移除重复的loadBetaPlans调用，避免多次云函数调用
    // this.loadBetaPlans(false, this.data.currentRequestId); // 已移除，避免重复调用
    
    // 添加自动筛选逻辑，确保页面刚进入时显示全部方案
    console.log('添加自动筛选逻辑，确保页面刚进入时显示全部方案');
    setTimeout(() => {
      // 等待数据加载完成后自动筛选
      if (this.data.allBetaPlans && this.data.allBetaPlans.length > 0) {
        console.log('onLoad自动筛选：开始筛选全部体验服方案，数据量:', this.data.allBetaPlans.length);
        this.filterBetaPlansByHero();
      } else {
        console.log('onLoad自动筛选：等待数据加载完成...');
        // 如果数据还没加载完成，再次尝试
        setTimeout(() => {
          if (this.data.allBetaPlans && this.data.allBetaPlans.length > 0) {
            console.log('onLoad自动筛选重试：开始筛选全部体验服方案，数据量:', this.data.allBetaPlans.length);
            this.filterBetaPlansByHero();
          }
        }, 500);
      }
    }, 300);
  },

  // 页面数据变化监听
  onDataChange() {
    // 页面数据变化监听
  },

  onShow() {
    console.log('体验服方案页面 onShow 触发');
    
    const now = Date.now();
    const timeSinceLastEnter = now - this.data.pageState.lastEnterTime;
    
    // 更新最后进入时间
    this.setData({
      'pageState.lastEnterTime': now
    });
    
    // 优先检查交互状态变化（收藏和点赞）
    if (this.checkInteractionChanges()) {
      console.log('检测到交互状态变化，需要刷新数据');
      
      // 重要：即使有交互状态变化，也要检查云函数调用计数，避免重复调用
      if (this.data.cloudFunctionCallCount > 0 && this.data.isDataLoaded) {
        console.log('[优化] 检测到交互状态变化，但云函数已调用过，跳过重复调用，当前调用次数:', this.data.cloudFunctionCallCount);
        // 只清除相关缓存，不重新调用云函数
        this.clearAllRelatedCache();
        return;
      }
      
      console.log('交互状态变化，云函数未调用过，允许调用云函数刷新数据');
      this.loadBetaPlans(false, this.data.currentRequestId);
      return;
    }
    
    const timeSinceLastLoad = now - this.data.lastLoadTime;
    const timeSinceLastModeSwitch = now - this.data.lastModeSwitchTime;
    
    console.log('时间检查:', {
      timeSinceLastLoad: timeSinceLastLoad,
      timeSinceLastModeSwitch: timeSinceLastModeSwitch,
      timeSinceLastEnter: timeSinceLastEnter,
      isDataLoaded: this.data.isDataLoaded,
      currentMode: this.data.currentMode,
      selectedHero: this.data.selectedHero,
      cloudFunctionCallCount: this.data.cloudFunctionCallCount
    });
    
    // 等待状态稳定后再处理数据
    setTimeout(() => {
      // 检查是否有可用的缓存数据
      const hasCacheData = this.data.betaPlans && this.data.betaPlans.length > 0;
      const hasModeCache = this.data.modeDataCache[this.data.currentMode as keyof typeof this.data.modeDataCache]?.allPlans?.length > 0;
      
      console.log('缓存状态检查:', {
        hasCacheData,
        hasModeCache,
        betaPlansLength: this.data.betaPlans?.length || 0,
        modeCacheLength: this.data.modeDataCache[this.data.currentMode as keyof typeof this.data.modeDataCache]?.allPlans?.length || 0
      });
      
      // 修复问题1：重复进入页面时数据丢失的问题
      // 如果页面刚初始化或者距离上次进入时间很短，强制重新加载数据
      const shouldForceReload = !this.data.pageState.isInitialized || timeSinceLastEnter < 1000;
      
      // 修复问题2：确保recommended模式下有筛选器
      // 如果当前模式是recommended且没有英雄分类数据，强制重新加载
      const shouldForceReloadForRecommended = this.data.currentMode === 'recommended' && 
          (!this.data.heroCategories || this.data.heroCategories.length === 0);
      
      // 修复问题3：如果当前显示的数据量明显少于预期，强制重新加载
      // 检查当前显示的数据是否合理（体验服方案通常应该有多个）
      const hasReasonableData = this.data.betaPlans && this.data.betaPlans.length >= 3; // 体验服方案至少应该有3个
      const shouldForceReloadForDataQuality = !hasReasonableData && this.data.isDataLoaded;
      
      // 重要：优化云函数调用检查，避免重复调用
      // 如果云函数已经调用过且数据已加载，优先使用缓存数据
      const shouldSkipCloudCall = this.data.cloudFunctionCallCount > 0 && this.data.isDataLoaded;
      
      // 只有在以下情况才重新加载：
      // 1. 强制重新加载（但需要排除云函数已调用的情况）
      // 2. recommended模式没有英雄分类数据
      // 3. 数据未加载且没有缓存数据
      // 4. 距离上次加载超过10分钟
      // 5. 距离上次模式切换超过2分钟（确保模式切换后的数据同步）
      // 6. 数据质量不达标（新增）
      let shouldReload = shouldForceReload || 
          shouldForceReloadForRecommended ||
          shouldForceReloadForDataQuality ||
          (!this.data.isDataLoaded && !hasCacheData) || 
          timeSinceLastLoad > 10 * 60 * 1000 || 
          (this.data.lastModeSwitchTime > 0 && timeSinceLastModeSwitch > 2 * 60 * 1000);
      
      // 重要：如果云函数已经调用过且数据已加载，强制跳过重复调用
      if (shouldSkipCloudCall) {
        console.log('[优化] 云函数已调用过且数据已加载，强制跳过重复调用，当前调用次数:', this.data.cloudFunctionCallCount);
        shouldReload = false;
        
        // 即使有强制重新加载的需求，也要跳过，因为云函数已经调用过了
        if (shouldForceReload) {
          console.log('[优化] 虽然有强制重新加载需求，但云函数已调用过，跳过重复调用');
        }
        if (shouldForceReloadForRecommended) {
          console.log('[优化] 虽然有recommended模式重新加载需求，但云函数已调用过，跳过重复调用');
        }
        if (shouldForceReloadForDataQuality) {
          console.log('[优化] 虽然有数据质量重新加载需求，但云函数已调用过，跳过重复调用');
        }
      }
      
      if (shouldReload) {
        console.log('需要重新加载数据，原因:', {
          shouldForceReload,
          shouldForceReloadForRecommended,
          shouldForceReloadForDataQuality,
          isDataLoaded: this.data.isDataLoaded,
          hasCacheData,
          hasReasonableData,
          timeSinceLastLoad,
          timeSinceLastModeSwitch,
          currentMode: this.data.currentMode,
          heroCategoriesLength: this.data.heroCategories?.length || 0,
          cloudFunctionCallCount: this.data.cloudFunctionCallCount
        });
        
        // 重要：在调用任何云函数之前，再次检查云函数调用计数
        if (this.data.cloudFunctionCallCount > 0 && this.data.isDataLoaded) {
          console.log('[优化] 虽然需要重新加载数据，但云函数已调用过，强制跳过重复调用，当前调用次数:', this.data.cloudFunctionCallCount);
          // 只清除相关缓存，不重新调用云函数
          this.clearAllRelatedCache();
          return;
        }
        
        // 如果是recommended模式且没有英雄分类，重新初始化该模式
        if (shouldForceReloadForRecommended) {
          console.log('recommended模式没有英雄分类，重新初始化该模式');
          
          // 重要：即使有recommended模式重新加载需求，也要检查云函数调用计数
          if (this.data.cloudFunctionCallCount > 0 && this.data.isDataLoaded) {
            console.log('[优化] recommended模式需要重新加载，但云函数已调用过，跳过重复调用，当前调用次数:', this.data.cloudFunctionCallCount);
            // 只清除相关缓存，不重新调用云函数
            this.clearModeRelatedCache('recommended');
            return;
          }
          
          console.log('recommended模式需要重新加载，云函数未调用过，允许调用云函数');
          this.initModeHeroList('recommended', this.data.currentRequestId);
        } else {
          this.loadBetaPlans(false, this.data.currentRequestId);
        }
      } else {
        console.log('数据已加载且未过期，保持现有数据');
        // 如果数据已加载且未过期，且当前有英雄筛选，需要重新筛选数据
        if (this.data.originalAllPlans.length > 0 && this.data.selectedHero !== 'all') {
          console.log('使用originalAllPlans重新筛选数据，当前数据量:', this.data.originalAllPlans.length);
          this.filterBetaPlansByHero();
        } else if (this.data.allBetaPlans.length > 0 && this.data.selectedHero !== 'all') {
          console.log('当前有英雄筛选，重新筛选数据，当前数据量:', this.data.allBetaPlans.length);
          this.filterBetaPlansByHero();
        } else {
          console.log('当前显示全部英雄或无数据，跳过筛选');
        }
      }
    }, 50); // 等待50ms确保状态稳定
  },

  // 页面隐藏时保存筛选状态
  onHide() {
    console.log('体验服方案页面 onHide 触发，保存筛选状态');
    this.saveFilterState();
  },

  // 页面卸载时保存筛选状态
  onUnload() {
    console.log('体验服方案页面 onUnload 触发，保存筛选状态');
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
      console.log('体验服防抖定时器已清理');
    }
    
    // 清理页面定时器
    if (this.data.filterDebounceTimer) {
      clearTimeout(this.data.filterDebounceTimer);
      this.setData({
        filterDebounceTimer: null
      });
      console.log('体验服页面定时器已清理');
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
      wx.setStorageSync('betaPlan_filter_state', filterState);
      console.log('已保存筛选状态到本地存储:', filterState);
    } catch (error) {
      console.warn('保存筛选状态失败:', error);
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
      wx.removeStorageSync('betaPlan_filter_state');
      console.log('已清除本地存储的筛选状态');
    } catch (error) {
      console.warn('清除本地存储筛选状态失败:', error);
    }
  },

  // 初始化指定模式的英雄分类
  async initModeHeroList(mode: string, requestId: number) {
    try {
      console.log(`开始初始化${mode}模式的体验服英雄分类，请求ID:`, requestId);
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过英雄分类初始化，请求ID:', requestId);
        return;
      }
      
      // 优化：检查云函数调用次数，避免重复调用
      if (this.data.cloudFunctionCallCount > 0) {
        console.log('[优化] 云函数已调用过，跳过重复调用，当前调用次数:', this.data.cloudFunctionCallCount);
        return;
      }
      
      // 重要：英雄筛选器应该基于当前模式的实际数据，确保数据一致性
      // 对于recommended模式，英雄筛选器只显示实际有推荐方案的体验服英雄
      let heroCategories: any[] = [];
      let allPlans: any[] = [];
      
      // 首先尝试从当前模式缓存获取数据
      const currentModeCacheKey = `timi:plan:data:herolist_beta_${mode}:v1`;
      const currentModeCachedData = cacheManager.get(currentModeCacheKey) as any;
      
      if (currentModeCachedData && currentModeCachedData.heroCategories && currentModeCachedData.heroCategories.length > 0) {
        console.log(`使用${mode}模式缓存的体验服英雄分类数据，确保数据一致性`);
        heroCategories = currentModeCachedData.heroCategories;
        allPlans = currentModeCachedData.allPlans || [];
        
        // 直接使用缓存数据，无需重新获取
        console.log(`使用缓存的${mode}模式体验服数据，英雄数量:`, heroCategories.length);
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          allBetaPlans: allPlans,
          originalAllPlans: allPlans, // 保存完整的原始数据
          betaPlans: allPlans,
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
              this.filterBetaPlansByHero();
            }, 50);
          } else {
            console.log('英雄分类初始化完成，当前显示全部方案，无需筛选');
          }
        }, 100);
        
        return; // 成功使用缓存数据，直接返回
      }
      
      // 如果没有缓存数据，优先尝试从recommendPlan缓存中筛选体验服方案
      console.log(`没有${mode}模式体验服缓存，尝试从recommendPlan缓存中筛选体验服方案`);
      const recommendCacheKey = `timi:plan:data:herolist_${mode}:v1`;
      const recommendCachedData = cacheManager.get(recommendCacheKey) as any;
      
      if (recommendCachedData && recommendCachedData.allPlans && recommendCachedData.allPlans.length > 0) {
        console.log(`找到recommendPlan缓存数据，筛选体验服方案，原始数据量:`, recommendCachedData.allPlans.length);
        
        // 筛选体验服方案
        const betaPlans = recommendCachedData.allPlans.filter((plan: any) => plan.isBetaPlan === true);
        console.log(`筛选后的体验服方案数量:`, betaPlans.length);
        
        if (betaPlans.length > 0) {
          // 重新生成英雄分类（基于筛选后的体验服方案）
          heroCategories = await this.generateHeroCategoriesFromPlans(betaPlans);
          
          // 处理方案数据，添加英雄头像
          const processedPlans = await this.processPlansWithAvatars(betaPlans);
          
          // 格式化时间
          allPlans = processedPlans.map((plan: any) => ({
            ...plan,
            createTime: this.formatTime(plan.createTime)
          }));
          
          // 更新缓存
          const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
          modeCache.heroCategories = heroCategories;
          modeCache.allPlans = allPlans;
          modeCache.total = allPlans.length;
          
          // 更新当前显示数据
          this.setData({
            heroCategories: heroCategories,
            allBetaPlans: allPlans,
            originalAllPlans: allPlans, // 保存完整的原始数据
            betaPlans: allPlans,
            total: allPlans.length,
            isDataLoaded: true,
            lastLoadTime: Date.now()
          });
          
          console.log(`${mode}模式体验服数据加载完成:`, {
            heroCategoriesCount: heroCategories.length,
            allPlansCount: allPlans.length,
            total: allPlans.length
          });
          
          // 缓存英雄分类数据，延长TTL到30分钟
          const heroListCacheKey = `timi:plan:data:herolist_beta_${mode}:v1`;
          cacheManager.set(heroListCacheKey, {
            heroCategories: heroCategories,
            allPlans: allPlans,
            total: allPlans.length,
            mode: mode, // 添加模式标识
            isBetaPlan: true // 添加体验服标识
          }, 30 * 60 * 1000); // 30分钟TTL
          
          console.log(`已缓存${mode}模式体验服数据，缓存键:`, heroListCacheKey);
          
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
            
            // 英雄分类初始化完成后，自动进行一次"全部"筛选，确保显示完整的体验服方案
            console.log('英雄分类初始化完成，自动进行一次"全部"筛选，确保显示完整的体验服方案');
            
            // 延迟执行自动筛选，确保数据状态稳定
            setTimeout(() => {
              // 检查是否有数据需要筛选
              if (this.data.allBetaPlans && this.data.allBetaPlans.length > 0) {
                console.log('自动筛选：开始筛选全部体验服方案，数据量:', this.data.allBetaPlans.length);
                
                // 确保当前状态为"全部英雄"
                if (this.data.selectedHero !== 'all') {
                  console.log('自动筛选：重置为全部英雄状态');
                  this.setData({
                    selectedHero: 'all'
                  });
                }
                
                // 执行筛选，显示全部方案
                this.filterBetaPlansByHero();
              } else {
                console.log('自动筛选：没有可用数据，跳过筛选');
              }
            }, 200); // 等待200ms确保数据状态稳定
          }, 100);
          
          return; // 成功从recommendPlan缓存筛选数据，直接返回
        } else {
          console.log('recommendPlan缓存中没有体验服方案数据');
          // 如果没有体验服方案，清除缓存键，避免后续误用
          cacheManager.delete(recommendCacheKey);
        }
      } else {
        console.log('recommendPlan缓存也为空，缓存键:', recommendCacheKey);
      }
      
      // 如果没有缓存数据，需要获取当前模式的数据
      console.log(`没有缓存数据，需要获取${mode}模式体验服数据来生成英雄分类`);
      
      // 获取指定模式的所有方案数据
      const requestData: any = {
        page: 1,
        pageSize: 100, // 获取更多数据以提取英雄列表
        includeBetaPlans: true // 包含体验服方案，确保isBetaPlan字段正确设置
        // 注意：不在这里设置isBetaPlan=true，因为我们要获取所有方案然后筛选出原本就有体验服标签的方案
      };
      
      if (mode === 'recommended') {
        // recommended模式：获取审核标记为推荐的方案
        requestData.isRecommended = true;
        console.log('betaPlan recommended模式：获取审核标记为推荐的体验服方案，请求参数:', requestData);
      } else {
        // hot和latest模式：按模式获取方案
        requestData.mode = mode;
        console.log(`betaPlan ${mode}模式：按模式获取体验服方案，请求参数:`, requestData);
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
      
      // 重要：云函数调用成功，增加调用计数，避免重复调用
      this.setData({
        cloudFunctionCallCount: this.data.cloudFunctionCallCount + 1
      });
      console.log(`[优化] 云函数调用成功，当前调用次数: ${this.data.cloudFunctionCallCount}，模式: ${mode}`);
      
      console.log(`云函数getRecommendPlans返回结果:`, result);
      
      if (result.result && result.result.success) {
        const { plans } = result.result.data;
        console.log(`获取到${mode}模式数据，原始方案数量:`, plans.length);
        
        // 重要：筛选出原本就有体验服标签的方案，而不是给所有方案加上体验服标签
        const betaPlans = plans.filter((plan: any) => plan.isBetaPlan === true);
        console.log(`筛选出原本就有体验服标签的方案数量:`, betaPlans.length);
        
        if (betaPlans.length === 0) {
          console.warn(`${mode}模式：未找到体验服方案，可能数据有问题`);
          // 如果没有体验服方案，设置空数据
          this.setData({
            heroCategories: [],
            allBetaPlans: [],
            betaPlans: [],
            total: 0,
            isDataLoaded: true,
            lastLoadTime: Date.now()
          });
          
          // 重要：即使没有数据，也要缓存空结果，避免重复请求
          const heroListCacheKey = `timi:plan:data:herolist_beta_${mode}:v1`;
          cacheManager.set(heroListCacheKey, {
            heroCategories: [],
            allPlans: [],
            total: 0,
            mode: mode,
            isBetaPlan: true
          }, 5 * 60 * 1000); // 5分钟TTL，避免长时间缓存空结果
          console.log(`已缓存${mode}模式空结果，避免重复请求`);
          
          return;
        }
        
        // 验证体验服模式的数据
        if (mode === 'recommended') {
          const recommendedBetaPlans = betaPlans.filter((plan: any) => plan.isRecommended === true);
          console.log(`betaPlan recommended模式数据验证: 体验服方案数${betaPlans.length}，推荐体验服方案数${recommendedBetaPlans.length}`);
          
          if (recommendedBetaPlans.length === 0) {
            console.warn('betaPlan recommended模式：未找到推荐体验服方案，可能数据有问题');
            // 即使没有推荐方案，也要设置空数据并缓存
            this.setData({
              heroCategories: [],
              allBetaPlans: [],
              betaPlans: [],
              total: 0,
              isDataLoaded: true,
              lastLoadTime: Date.now()
            });
            
            const heroListCacheKey = `timi:plan:data:herolist_beta_${mode}:v1`;
            cacheManager.set(heroListCacheKey, {
              heroCategories: [],
              allPlans: [],
              total: 0,
              mode: mode,
              isBetaPlan: true
            }, 5 * 60 * 1000); // 5分钟TTL
            console.log(`已缓存${mode}模式空结果，避免重复请求`);
            
            return;
          }
        }
        
        // 从筛选后的体验服方案数据生成英雄分类，确保英雄筛选器只显示实际有方案的体验服英雄
        heroCategories = await this.generateHeroCategoriesFromPlans(betaPlans);
        
        // 再次检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过英雄分类处理，请求ID:', requestId);
          return;
        }
        
        // 处理筛选后的体验服方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(betaPlans);
        
        // 格式化时间
        allPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        // 更新缓存
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = heroCategories;
        modeCache.allPlans = allPlans;
        modeCache.total = betaPlans.length;
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          allBetaPlans: allPlans,
          originalAllPlans: allPlans, // 保存完整的原始数据
          betaPlans: allPlans,
          total: betaPlans.length,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });
        
        console.log(`${mode}模式体验服数据加载完成:`, {
          heroCategoriesCount: heroCategories.length,
          allPlansCount: allPlans.length,
          total: betaPlans.length
        });
        
        // 缓存英雄分类数据，延长TTL到30分钟
        // 为不同模式使用不同的缓存键，确保数据隔离
        const heroListCacheKey = `timi:plan:data:herolist_beta_${mode}:v1`;
        cacheManager.set(heroListCacheKey, {
          heroCategories: heroCategories,
          allPlans: allPlans,
          total: betaPlans.length,
          mode: mode, // 添加模式标识
          isBetaPlan: true // 添加体验服标识
        }, 30 * 60 * 1000); // 30分钟TTL
        
        console.log(`已缓存${mode}模式体验服数据，缓存键:`, heroListCacheKey);
        
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
          
          // 英雄分类初始化完成后，自动进行一次"全部"筛选，确保显示完整的体验服方案
          console.log('英雄分类初始化完成，自动进行一次"全部"筛选，确保显示完整的体验服方案');
          
          // 延迟执行自动筛选，确保数据状态稳定
          setTimeout(() => {
            // 检查是否有数据需要筛选
            if (this.data.allBetaPlans && this.data.allBetaPlans.length > 0) {
              console.log('自动筛选：开始筛选全部体验服方案，数据量:', this.data.allBetaPlans.length);
              
              // 确保当前状态为"全部英雄"
              if (this.data.selectedHero !== 'all') {
                console.log('自动筛选：重置为全部英雄状态');
                this.setData({
                  selectedHero: 'all'
                });
              }
              
              // 执行筛选，显示全部方案
              this.filterBetaPlansByHero();
            } else {
              console.log('自动筛选：没有可用数据，跳过筛选');
            }
          }, 200); // 等待200ms确保数据状态稳定
        }, 100);
      } else {
        console.error(`${mode}模式体验服数据获取失败:`, result);
      }
      
    } catch (error) {
      console.error(`初始化${mode}模式体验服英雄列表失败:`, error);
    }
  },

  // 切换筛选类型
  // 优化：所有模式之间切换时都复用缓存数据，避免重复请求
  // 因为betaPlan模式是recommendPlan模式的子集，可以通过筛选获得
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
      // 所有模式都可以复用，因为betaPlan模式是recommendPlan模式的子集
      if (this.data.isDataLoaded && this.data.originalAllPlans.length > 0) {
        console.log('可以复用缓存数据，模式切换:', this.data.currentMode, '->', type);
        
        let filteredAndSortedPlans: any[];
        
        if (type === 'recommended') {
          // recommended模式：从完整数据中筛选出推荐方案
          console.log('betaPlan recommended模式：从完整数据中筛选推荐体验服方案');
          const recommendedPlans = this.data.originalAllPlans.filter((plan: any) => plan.isRecommended === true);
          console.log('筛选结果：总体验服方案数', this.data.originalAllPlans.length, '推荐体验服方案数', recommendedPlans.length);
          
          // 对筛选后的方案进行排序
          filteredAndSortedPlans = this.sortPlansByMode(recommendedPlans, type);
          
          // 重要：为recommended模式重新生成英雄分类，确保英雄筛选器只显示有推荐方案的体验服英雄
          const recommendedHeroCategories = await this.generateHeroCategoriesFromPlans(recommendedPlans);
          console.log('betaPlan recommended模式：重新生成英雄分类，英雄数量:', recommendedHeroCategories.length);
          
          // 更新显示数据，recommended模式使用筛选后的数据
          this.setData({
            currentMode: type,
            recommendPlans: filteredAndSortedPlans,
            allBetaPlans: filteredAndSortedPlans, // 筛选后的推荐体验服方案数据
            betaPlans: filteredAndSortedPlans, // 重要：更新实际显示的数据
            total: filteredAndSortedPlans.length,
            heroCategories: recommendedHeroCategories // 更新英雄分类为推荐体验服方案中的英雄
          });
          console.log('betaPlan recommended模式：已更新allBetaPlans和heroCategories，确保英雄筛选器只显示有推荐方案的体验服英雄');
          
          // 缓存recommended模式的英雄分类数据
          const heroListCacheKey = `timi:plan:data:herolist_beta_${type}:v1`;
          cacheManager.set(heroListCacheKey, {
            heroCategories: recommendedHeroCategories,
            allPlans: filteredAndSortedPlans,
            total: filteredAndSortedPlans.length,
            mode: type,
            isBetaPlan: true
          }, 30 * 60 * 1000); // 30分钟TTL
          console.log('已缓存recommended模式体验服英雄分类数据，缓存键:', heroListCacheKey);
        } else {
          // hot和latest模式：使用完整的原始数据
          filteredAndSortedPlans = this.sortPlansByMode(this.data.originalAllPlans, type);
          
          // 重要：为hot/latest模式重新生成英雄分类，确保英雄筛选器显示所有体验服英雄
          const allHeroCategories = await this.generateHeroCategoriesFromPlans(this.data.originalAllPlans);
          console.log(`${type}模式：重新生成英雄分类，英雄数量:`, allHeroCategories.length);
          
          // 更新显示数据，hot/latest模式使用完整数据
          this.setData({
            currentMode: type,
            recommendPlans: filteredAndSortedPlans,
            allBetaPlans: this.data.originalAllPlans, // 恢复为完整的原始数据
            betaPlans: filteredAndSortedPlans, // 重要：更新实际显示的数据为排序后的数据
            total: this.data.originalAllPlans.length,
            heroCategories: allHeroCategories // 更新英雄分类为所有体验服英雄
          });
          console.log(`${type}模式：已恢复allBetaPlans为完整数据，方案数量:`, this.data.originalAllPlans.length, '，英雄数量:', allHeroCategories.length);
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
        allBetaPlans: [],
        originalAllPlans: [], // 清除原始数据
        betaPlans: [],
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
      await this.loadBetaPlans(false, requestId);
      
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
      allBetaPlansLength: this.data.allBetaPlans.length,
      originalAllPlansLength: this.data.originalAllPlans.length
    });
    
    this.setData({
      selectedHero: heroName,
      showHeroSelector: false
    });
    
    console.log('英雄选择完成，开始筛选数据');
    // 使用防抖机制，避免频繁筛选
    this.filterBetaPlansByHero();
  },

  // 防抖定时器
  filterDebounceTimer: null as any,

  // 根据英雄筛选体验服方案
  async filterBetaPlansByHero() {
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
      const { allBetaPlans, selectedHero, currentMode, originalAllPlans } = this.data;
      
      // 优先使用originalAllPlans作为数据源，如果没有则使用allBetaPlans
      const dataSource = originalAllPlans.length > 0 ? originalAllPlans : allBetaPlans;
      
      console.log('开始筛选体验服方案:', {
        selectedHero,
        currentMode,
        dataSourceLength: dataSource.length,
        allBetaPlansLength: allBetaPlans.length,
        originalAllPlansLength: originalAllPlans.length,
        currentBetaPlansLength: this.data.betaPlans.length
      });
      
      if (selectedHero === 'all') {
        console.log('显示全部体验服方案');
        // 显示全部体验服方案，根据当前模式使用不同的排序逻辑
        let sortedPlans = [...dataSource];
        
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
          betaPlans: formattedPlans,
          total: formattedPlans.length
        });
        
        // 强制更新页面UI
        this.setData({
          _forceUpdate: Date.now()
        });
      } else {
        console.log('筛选指定英雄的方案:', selectedHero);
        // 筛选指定英雄的体验服方案，根据当前模式使用不同的排序逻辑
        const filteredPlans = dataSource.filter(plan => plan.heroName === selectedHero);
        console.log('筛选结果:', {
          heroName: selectedHero,
          filteredCount: filteredPlans.length,
          dataSourceCount: dataSource.length
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
          betaPlans: formattedPlans,
          total: formattedPlans.length
        });
        
        // 强制更新页面UI
        this.setData({
          _forceUpdate: Date.now()
        });
      }
      
      console.log('筛选完成，最终方案数量:', this.data.betaPlans.length);
      
      // 使用setTimeout确保UI更新完成
      setTimeout(() => {
        console.log('UI更新完成，当前显示方案数量:', this.data.betaPlans.length);
      }, 100);
    } finally {
      // 重置筛选状态
      this.setData({
        isFiltering: false
      });
    }
  },

  // 加载体验服方案数据
  async loadBetaPlans(isLoadMore = false, requestId?: number) {
    // 如果没有提供requestId，使用当前请求ID
    const currentRequestId = requestId || this.data.currentRequestId;
    
    console.log(`开始加载体验服方案数据，模式: ${this.data.currentMode}，英雄: ${this.data.selectedHero}，是否加载更多: ${isLoadMore}`);
    
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

      // 使用新的 planService 获取体验服方案
      console.log(`使用planService获取${this.data.currentMode}模式体验服数据`);
      const plans = await planService.getBetaPlans(this.data.currentMode);
      
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
        filteredPlans = plans.filter(plan => plan.heroId === this.data.selectedHero);
        console.log(`英雄筛选后体验服方案数量: ${filteredPlans.length} (原始: ${plans.length})`);
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
        // 加载更多：追加到现有数据
        const newPlans = [...this.data.betaPlans, ...formattedPlans];
        this.setData({
          betaPlans: newPlans,
          page: this.data.page + 1,
          hasMore: hasMore,
          loadingMore: false
        });
        console.log(`加载更多完成，当前总方案数: ${newPlans.length}`);
      } else {
        // 首次加载：替换现有数据
        this.setData({
          betaPlans: formattedPlans,
          allBetaPlans: filteredPlans, // 保存完整的筛选后数据
          originalAllPlans: filteredPlans, // 保存原始数据
          page: 1,
          hasMore: hasMore,
          loading: false,
          isDataLoaded: true,
          lastLoadTime: Date.now(),
          total: filteredPlans.length
        });
        console.log(`首次加载完成，方案数: ${formattedPlans.length}, 总筛选数: ${filteredPlans.length}`);
      }
      
    } catch (error) {
      console.error(`获取${this.data.currentMode}模式体验服数据失败:`, error);
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

  // 处理方案数据，添加英雄头像
  async processPlansWithAvatars(plans: any[]): Promise<any[]> {
    try {
      console.log('开始处理方案数据，添加英雄头像，方案数量:', plans.length);
      
      const processedPlans = await Promise.all(
        plans.map(async (plan: any) => {
          try {
            const hero = getHeroById(plan.heroId);
            let heroAvatarUrl = '';
            
            if (hero) {
              heroAvatarUrl = await avatarCache.getHeroAvatar(hero.name);
            }
            
            return {
              ...plan,
              heroAvatarUrl,
              heroName: hero?.name || plan.heroName || '未知英雄'
            };
          } catch (error) {
            console.warn(`处理方案${plan._id}的英雄头像失败:`, error);
            return {
              ...plan,
              heroAvatarUrl: '',
              heroName: plan.heroName || '未知英雄'
            };
          }
        })
      );
      
      console.log('方案数据处理完成，处理数量:', processedPlans.length);
      return processedPlans;
    } catch (error) {
      console.error('批量处理方案数据失败:', error);
      // 返回原始数据，避免完全失败
      return plans.map(plan => ({
        ...plan,
        heroAvatarUrl: '',
        heroName: plan.heroName || '未知英雄'
      }));
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
          
          // 格式化时间
          const formattedPlans = sortedPlans.map((plan: any) => ({
            ...plan,
            createTime: this.formatTime(plan.createTime)
          }));
          
          console.log(`从缓存设置${this.data.currentMode}模式体验服数据，最终方案数量:`, formattedPlans.length);
          this.setData({
            betaPlans: formattedPlans,
            allBetaPlans: formattedPlans,
            total: formattedPlans.length,
            loading: false,
            loadingMore: false,
            isDataLoaded: true,
            lastLoadTime: Date.now()
          });
          
          // 缓存筛选后的数据
          const cacheKey = `timi:plan:data:beta_${this.data.currentMode}_${this.data.selectedHero}:v1`;
          const cacheData = {
            plans: formattedPlans,
            page: 1,
            hasMore: false,
            total: recommendCachedData.total || 0,
            originalTotal: recommendCachedData.plans.length,
            timestamp: Date.now(),
            mode: this.data.currentMode,
            heroId: this.data.selectedHero,
            isBetaPlan: true,
            isFilteredFromRecommend: true
          };
          cacheManager.set(cacheKey, cacheData, 2 * 60 * 1000); // 2分钟TTL
          console.log('已缓存从recommendPlan筛选的体验服方案数据:', cacheKey, '方案数量:', formattedPlans.length);
          
          return;
        }
      }
      
      // 如果缓存中没有足够的数据，则调用云函数获取更多数据
      console.log('recommendPlan缓存中没有足够数据，调用云函数获取更多数据');
      const requestData: any = {
        heroId: this.data.selectedHero === 'all' ? null : this.data.selectedHero,
        page: isLoadMore ? this.data.page + 1 : 1,
        pageSize: 100, // 增加pageSize到100，确保能获取足够的体验服方案
        includeBetaPlans: true
      };
      
      if (this.data.currentMode === 'recommended') {
        requestData.isRecommended = true;
        console.log('betaPlan recommended模式：获取审核标记为推荐的体验服方案，请求参数:', requestData);
      } else {
        requestData.mode = this.data.currentMode;
        console.log(`betaPlan ${this.data.currentMode}模式：按模式获取体验服方案，请求参数:`, requestData);
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
      
      // 重要：云函数调用成功，增加调用计数，避免重复调用
      this.setData({
        cloudFunctionCallCount: this.data.cloudFunctionCallCount + 1
      });
      console.log(`[优化] 云函数调用成功，当前调用次数: ${this.data.cloudFunctionCallCount}，模式: ${this.data.currentMode}`);
      
      console.log(`云函数getRecommendPlans返回结果:`, result);
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        console.log(`获取到${this.data.currentMode}模式数据，原始方案数量:`, plans.length);
        
        // 重要：筛选出原本就有体验服标签的方案，而不是给所有方案加上体验服标签
        const betaPlans = plans.filter((plan: any) => plan.isBetaPlan === true);
        console.log(`筛选出原本就有体验服标签的方案数量:`, betaPlans.length);
        
        if (betaPlans.length === 0) {
          console.warn(`${this.data.currentMode}模式：未找到体验服方案，可能数据有问题`);
          // 如果没有体验服方案，设置空数据
          this.setData({
            betaPlans: [],
            allBetaPlans: [],
            total: 0,
            loading: false,
            loadingMore: false,
            isDataLoaded: true,
            lastLoadTime: Date.now()
          });
          return;
        }
        
        // 验证体验服模式的数据
        if (this.data.currentMode === 'recommended') {
          const recommendedBetaPlans = betaPlans.filter((plan: any) => plan.isRecommended === true);
          console.log(`betaPlan recommended模式数据验证: 体验服方案数${betaPlans.length}，推荐体验服方案数${recommendedBetaPlans.length}`);
          
          if (recommendedBetaPlans.length === 0) {
            console.warn('betaPlan recommended模式：未找到推荐体验服方案，可能数据有问题');
          }
        }
        
        // 处理筛选后的体验服方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(betaPlans);
        
        // 再次检查请求是否已被取消
        if (currentRequestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过方案数据处理，请求ID:', currentRequestId);
          return;
        }
        
        // 根据当前模式使用不同的排序逻辑
        let sortedPlans = processedPlans;
        if (this.data.currentMode === 'hot') {
          sortedPlans = this.sortPlansByLikeAndFavorite(processedPlans);
          console.log('热门模式排序完成，体验服方案数量:', sortedPlans.length);
        } else if (this.data.currentMode === 'latest') {
          sortedPlans = this.sortPlansByCreateTime(processedPlans);
          console.log('最新模式排序完成，体验服方案数量:', sortedPlans.length);
        } else {
          sortedPlans = this.sortPlansByRecommendation(processedPlans);
          console.log('推荐模式排序完成，体验服方案数量:', sortedPlans.length);
        }
        
        // 格式化时间
        const formattedPlans = sortedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

        console.log(`设置${this.data.currentMode}模式体验服数据，最终方案数量:`, formattedPlans.length);
        this.setData({
          betaPlans: isLoadMore ? [...this.data.betaPlans, ...formattedPlans] : formattedPlans,
          page: page,
          hasMore: hasMore,
          loading: false,
          loadingMore: false,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });
        
        // 如果不是加载更多，更新当前模式的缓存数据
        if (!isLoadMore) {
          const modeCache = this.data.modeDataCache[this.data.currentMode as keyof typeof this.data.modeDataCache];
          if (modeCache) {
            modeCache.allPlans = formattedPlans;
            modeCache.total = formattedPlans.length;
            this.setData({
              [`modeDataCache.${this.data.currentMode}`]: modeCache
            });
          }
          
          // 如果是hot模式，保存为originalAllPlans用于模式切换
          if (this.data.currentMode === 'hot') {
            this.setData({
              originalAllPlans: formattedPlans
            });
            console.log('hot模式：已保存originalAllPlans，方案数量:', formattedPlans.length);
          }
        }

        // 如果不是加载更多，则缓存数据并更新当前模式的缓存数据
        if (!isLoadMore) {
          // 缓存当前筛选结果，延长TTL到10分钟
          const cacheKey = `timi:plan:data:beta_${this.data.currentMode}_${this.data.selectedHero}:v1`;
          const cacheData = {
            plans: formattedPlans,
            page: page,
            hasMore: hasMore,
            total: formattedPlans.length, // 添加total字段，确保缓存数据完整性
            timestamp: Date.now(),
            mode: this.data.currentMode,
            heroId: this.data.selectedHero,
            isBetaPlan: true, // 添加体验服标识
            isFilteredFromRecommend: false // 标记这是直接获取的数据
          };
          cacheManager.set(cacheKey, cacheData, 10 * 60 * 1000); // 10分钟TTL
          console.log(`已缓存${this.data.currentMode}模式体验服数据，缓存键:`, cacheKey, '方案数量:', formattedPlans.length);
          
          // 优化：如果当前模式缓存中已有数据，直接使用，避免重复调用云函数
          const modeCache = this.data.modeDataCache[this.data.currentMode as keyof typeof this.data.modeDataCache];
          if (modeCache.allPlans && modeCache.allPlans.length > 0) {
            console.log('使用现有模式缓存数据，避免重复调用云函数');
            // 直接使用现有数据，只更新betaPlans
            this.setData({
              betaPlans: formattedPlans,
              page: page,
              hasMore: hasMore,
              loading: false,
              loadingMore: false,
              isDataLoaded: true,
              lastLoadTime: Date.now()
            });
          } else {
            console.log('模式缓存为空，需要获取完整数据');
            // 获取当前模式的完整数据用于更新缓存
            // recommended模式需要特殊处理，获取审核标记为推荐的方案
            const fullRequestData: any = {
              page: 1,
              pageSize: 100, // 获取更多数据以更新缓存
              includeBetaPlans: true // 包含体验服方案，确保isBetaPlan字段正确设置
              // 注意：不在这里设置isBetaPlan=true，因为我们要获取所有方案然后筛选出原本就有体验服标签的方案
            };
            
            if (this.data.currentMode === 'recommended') {
              // recommended模式：获取审核标记为推荐的方案
              fullRequestData.isRecommended = true;
              console.log('betaPlan recommended模式：获取审核标记为推荐的体验服方案（完整数据）');
            } else {
              // hot和latest模式：按模式获取方案
              fullRequestData.mode = this.data.currentMode;
              console.log(`betaPlan ${this.data.currentMode}模式：按模式获取体验服方案（完整数据）`);
            }
            
            const fullResult = await wx.cloud.callFunction({
              name: 'getRecommendPlans',
              data: fullRequestData
            }) as any;
            
            // 再次检查请求是否已被取消
            if (currentRequestId !== this.data.currentRequestId) {
              console.log('请求已被取消，跳过完整数据获取，请求ID:', currentRequestId);
              return;
            }
            
            // 重要：为获取完整数据的云函数调用增加调用计数
            this.setData({
              cloudFunctionCallCount: this.data.cloudFunctionCallCount + 1
            });
            console.log(`[优化] 获取完整数据云函数调用成功，当前调用次数: ${this.data.cloudFunctionCallCount}，模式: ${this.data.currentMode}`);
            
            if (fullResult.result && fullResult.result.success) {
              const { plans: fullPlans } = fullResult.result.data;
              console.log(`获取到完整数据，原始方案数量:`, fullPlans.length);
              
              // 重要：筛选出原本就有体验服标签的方案
              const fullBetaPlans = fullPlans.filter((plan: any) => plan.isBetaPlan === true);
              console.log(`筛选出原本就有体验服标签的方案数量:`, fullBetaPlans.length);
              
              if (fullBetaPlans.length > 0) {
                const heroCategories = await this.generateHeroCategoriesFromPlans(fullBetaPlans);
                
                // 处理筛选后的体验服方案数据，添加英雄头像
                const processedFullPlans = await this.processPlansWithAvatars(fullBetaPlans);
                
                // 格式化时间
                const formattedFullPlans = processedFullPlans.map((plan: any) => ({
                  ...plan,
                  createTime: this.formatTime(plan.createTime)
                }));
                
                // 更新缓存
                modeCache.heroCategories = heroCategories;
                modeCache.allPlans = formattedFullPlans;
                modeCache.total = fullBetaPlans.length;
                
                // 更新当前显示数据
                this.setData({
                  heroCategories: heroCategories,
                  allBetaPlans: formattedFullPlans,
                  total: fullBetaPlans.length,
                  [`modeDataCache.${this.data.currentMode}`]: modeCache
                });
                
                // 缓存英雄分类数据，延长TTL到30分钟
                const heroListCacheKey = `timi:plan:data:herolist_beta_${this.data.currentMode}:v1`;
                cacheManager.set(heroListCacheKey, {
                  heroCategories: heroCategories,
                  allPlans: formattedFullPlans,
                  total: fullBetaPlans.length,
                  mode: this.data.currentMode, // 添加模式标识
                  isBetaPlan: true // 添加体验服标识
                }, 30 * 60 * 1000); // 30分钟TTL
                
                console.log(`已缓存${this.data.currentMode}模式体验服英雄分类数据，缓存键:`, heroListCacheKey);
              } else {
                console.warn(`${this.data.currentMode}模式：完整数据中未找到体验服方案`);
              }
            }
          }
          
          // 数据加载完成后，自动进行一次"全部"筛选，确保显示完整的体验服方案
          console.log('数据加载完成，自动进行一次"全部"筛选，确保显示完整的体验服方案');
          
          // 延迟执行自动筛选，确保数据状态稳定
          setTimeout(() => {
            // 检查是否有数据需要筛选
            if (this.data.allBetaPlans && this.data.allBetaPlans.length > 0) {
              console.log('自动筛选：开始筛选全部体验服方案，数据量:', this.data.allBetaPlans.length);
              
              // 确保当前状态为"全部英雄"
              if (this.data.selectedHero !== 'all') {
                console.log('自动筛选：重置为全部英雄状态');
                this.setData({
                  selectedHero: 'all'
                });
              }
              
              // 执行筛选，显示全部方案
              this.filterBetaPlansByHero();
            } else {
              console.log('自动筛选：没有可用数据，跳过筛选');
            }
          }, 200); // 等待200ms确保数据状态稳定
        }
      } else {
        console.error(`${this.data.currentMode}模式体验服数据获取失败:`, result);
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
      console.error(`加载${this.data.currentMode}模式体验服方案失败:`, error);
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
    
    console.log(`根据模式 ${mode} 对体验服方案进行排序，方案数量: ${plans.length}`);
    
    let sortedPlans = [...plans];
    
    switch (mode) {
      case 'hot':
        // 热门方案按点赞收藏总和降序排序
        sortedPlans = this.sortPlansByLikeAndFavorite(sortedPlans);
        console.log('热门模式排序完成，体验服方案数量:', sortedPlans.length);
        break;
      case 'latest':
        // 最新方案按创建时间降序排序
        sortedPlans = this.sortPlansByCreateTime(sortedPlans);
        console.log('最新模式排序完成，体验服方案数量:', sortedPlans.length);
        break;
      case 'recommended':
        // 推荐方案按推荐权重排序（如果有的话）
        sortedPlans = this.sortPlansByRecommendation(sortedPlans);
        console.log('推荐模式排序完成，体验服方案数量:', sortedPlans.length);
        break;
      default:
        console.log('未知模式，使用默认排序');
        break;
    }
    
    return sortedPlans;
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
      console.log('betaPlan: 开始处理英雄头像，英雄数量:', heroCategories.length);
      
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
          console.log(`betaPlan: 英雄 ${heroCategory.heroName} 未找到头像，使用默认头像`);
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
        console.log('betaPlan: 头像临时URL获取完成，处理数量:', avatarUrls.length);
        
        // 更新英雄头像URL
        processedCategories.forEach(heroCategory => {
          if (heroCategory.heroAvatar && avatarUrlMap[heroCategory.heroAvatar]) {
            heroCategory.heroAvatar = avatarUrlMap[heroCategory.heroAvatar];
          }
        });
      }
      
      return processedCategories;
    } catch (error) {
      console.error('betaPlan: 处理英雄头像失败:', error);
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
        heroAvatar: heroAvatar,
        // 保留云端返回的 isLiked / isFavorited，如无则默认 false
        isLiked: typeof plan.isLiked === 'boolean' ? plan.isLiked : false,
        isFavorited: typeof plan.isFavorited === 'boolean' ? plan.isFavorited : false,
        createTime: this.formatTime(plan.createTime)
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

  // 查看方案详情
  viewPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.navigateTo({
      url: `/pages/planDetail/planDetail?id=${plan._id}`
    });
  },

  // 点赞/取消点赞
  async toggleLike(e: any) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const plan = e.currentTarget.dataset.plan;
    const index = e.currentTarget.dataset.index;
    const isLiked = !plan.isLiked;
    
    // 立即更新本地状态，提升响应速度
    const updatedPlans = [...this.data.betaPlans];
    const currentLikeCount = updatedPlans[index].likeCount || 0;
    
    // 立即切换状态
    updatedPlans[index] = {
      ...updatedPlans[index],
      isLiked: isLiked,
      likeCount: isLiked ? currentLikeCount + 1 : currentLikeCount - 1
    };
    
    this.setData({
      betaPlans: updatedPlans
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
        updatedPlans[index] = {
          ...updatedPlans[index],
          isLiked: result.result.data.isLiked,
          likeCount: result.result.data.likeCount
        };
        
        this.setData({
          betaPlans: updatedPlans
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
        updatedPlans[index] = {
          ...updatedPlans[index],
          isLiked: !isLiked,
          likeCount: currentLikeCount
        };
        
        this.setData({
          betaPlans: updatedPlans
        });
        
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      // 网络错误时回滚本地状态
      updatedPlans[index] = {
        ...updatedPlans[index],
        isLiked: !isLiked,
        likeCount: currentLikeCount
      };
      
      this.setData({
        betaPlans: updatedPlans
      });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 收藏/取消收藏
  async toggleFavorite(e: any) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const plan = e.currentTarget.dataset.plan;
    const index = e.currentTarget.dataset.index;
    const isFavorited = !plan.isFavorited;
    
    // 立即更新本地状态，提升响应速度
    const updatedPlans = [...this.data.betaPlans];
    const currentFavoriteCount = updatedPlans[index].favoriteCount || 0;
    
    // 立即切换状态
    updatedPlans[index] = {
      ...updatedPlans[index],
      isFavorited: isFavorited,
      favoriteCount: isFavorited ? currentFavoriteCount + 1 : currentFavoriteCount - 1
    };
    
    this.setData({
      betaPlans: updatedPlans
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
        updatedPlans[index] = {
          ...updatedPlans[index],
          isFavorited: result.result.data.isFavorited,
          favoriteCount: result.result.data.favorites
        };
        
        this.setData({
          betaPlans: updatedPlans
        });
        
        // 通知收藏状态变化，确保其他页面数据同步
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
        updatedPlans[index] = {
          ...updatedPlans[index],
          isFavorited: !isFavorited,
          favoriteCount: currentFavoriteCount
        };
        
        this.setData({
          betaPlans: updatedPlans
        });
        
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      // 网络错误时回滚本地状态
      updatedPlans[index] = {
        ...updatedPlans[index],
        isFavorited: !isFavorited,
        favoriteCount: currentFavoriteCount
      };
      
      this.setData({
        betaPlans: updatedPlans
      });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      // 清除当前模式的缓存数据
      const cacheKey = `timi:plan:data:beta_${this.data.currentMode}_${this.data.selectedHero}:v1`;
      cacheManager.delete(cacheKey);
      console.log('下拉刷新，已清除体验服方案缓存:', cacheKey);
      
      this.setData({ page: 1 }); // 重置页码
      await this.loadBetaPlans(false, this.data.currentRequestId);
    } catch (error) {
      console.error('下拉刷新失败:', error);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMorePlans();
    }
  },

  // 加载更多数据
  async loadMorePlans() {
    await this.loadBetaPlans(true, this.data.currentRequestId);
  },

  // 加载更多
  async loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;

    this.setData({ loadingMore: true });

    try {
      // 这里可以实现分页加载逻辑
      // 目前简单处理，直接设置没有更多数据
      this.setData({
        hasMore: false,
        loadingMore: false
      });
    } catch (error) {
      console.error('加载更多失败:', error);
      this.setData({ loadingMore: false });
    }
  },

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '体验服攻略方案 - 推荐/热门/最新',
      path: '/pages/betaPlan/betaPlan',
      imageUrl: '/images/share-beta-plan.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '体验服攻略方案 - 推荐/热门/最新',
      imageUrl: '/images/share-beta-plan.png'
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
      // 当收到统一交互状态变化事件时，立即清除所有相关缓存并标记数据需要刷新
      this.clearAllRelatedCache();
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
    try {
      const lastGlobalChange = wx.getStorageSync('last_global_interaction_change') || 0;
      const lastLocalUpdate = this.data.lastLoadTime || 0;
      
      if (lastGlobalChange > lastLocalUpdate) {
        console.log('检测到全局交互状态变化，时间戳:', {
          global: lastGlobalChange,
          local: lastLocalUpdate,
          diff: lastGlobalChange - lastLocalUpdate
        });
        
        // 清除所有相关缓存，确保获取最新数据
        this.clearAllRelatedCache();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('检查统一交互状态变化失败:', error);
      return false;
    }
  },

  // 清除收藏相关的缓存
  clearFavoriteRelatedCache() {
    try {
      // 清除当前模式的所有英雄筛选缓存
      const cacheKeys = [
        `timi:plan:data:beta_${this.data.currentMode}_all:v1`,
        `timi:plan:data:beta_${this.data.currentMode}_${this.data.selectedHero}:v1`,
        `timi:plan:data:herolist_beta_${this.data.currentMode}:v1`
      ];
      
      // 清除所有模式的缓存，因为收藏状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          `timi:plan:data:beta_${mode}_all:v1`,
          `timi:plan:data:herolist_beta_${mode}:v1`
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
        `timi:plan:data:beta_${this.data.currentMode}_all:v1`,
        `timi:plan:data:beta_${this.data.currentMode}_${this.data.selectedHero}:v1`,
        `timi:plan:data:herolist_beta_${this.data.currentMode}:v1`
      ];
      
      // 清除所有模式的缓存，因为点赞状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          `timi:plan:data:beta_${mode}_all:v1`,
          `timi:plan:data:herolist_beta_${mode}:v1`
        );
      });
      
      cacheKeys.forEach(key => {
        if (cacheManager.has(key)) {
          cacheManager.delete(key);
          console.log('已清除点赞相关缓存:', key);
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
      
      console.log('已清除点赞相关的所有缓存数据');
    } catch (error) {
      console.warn('清除点赞相关缓存失败:', error);
    }
  },

  // 清除所有相关缓存
  clearAllRelatedCache() {
    this.clearFavoriteRelatedCache();
    this.clearLikeRelatedCache();
    this.setData({
      modeDataCache: {
        recommended: { heroCategories: [], allPlans: [], total: 0 },
        hot: { heroCategories: [], allPlans: [], total: 0 },
        latest: { heroCategories: [], allPlans: [], total: 0 }
      },
      originalAllPlans: [] // 清除原始数据
    });
    console.log('已清除所有相关缓存数据');
  },

  // 防抖版本的筛选器切换事件处理
  onFilterSwitch(e: any) {
    console.log('体验服筛选器切换事件触发，使用防抖处理');
    
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

  // 清除模式相关的缓存
  clearModeRelatedCache(mode: string) {
    try {
      // 清理指定模式的所有相关缓存
      const cacheKeys = [
        `timi:plan:data:beta_${mode}_all:v1`,
        `timi:plan:data:beta_${mode}_recommended:v1`,
        `timi:plan:data:herolist_beta_${mode}:v1`
      ];
      
      cacheKeys.forEach(key => {
        cacheManager.delete(key);
        console.log('已清理缓存:', key);
      });
      
      // 清理模式数据缓存
      this.setData({
        [`modeDataCache.${mode}.heroCategories`]: [],
        [`modeDataCache.${mode}.allPlans`]: [],
        [`modeDataCache.${mode}.total`]: 0
      });
      
      console.log(`已清理${mode}模式相关缓存`);
    } catch (error) {
      console.warn('清理模式相关缓存失败:', error);
    }
  },

  // 清理不完整的缓存数据
  clearIncompleteCache() {
    try {
      // 清理所有可能不完整的betaPlan缓存
      const knownCacheKeys = [
        'timi:plan:data:beta_hot_all:v1',
        'timi:plan:data:beta_latest_all:v1',
        'timi:plan:data:beta_recommended_all:v1'
      ];
      
      knownCacheKeys.forEach(key => {
        const cachedData = cacheManager.get<any>(key);
        if (cachedData && cachedData.isFilteredFromRecommend) {
          // 检查筛选数据的完整性
          const isComplete = cachedData.plans && 
                           cachedData.plans.length > 0 && 
                           cachedData.total !== undefined && 
                           cachedData.total > 0 && 
                           cachedData.plans.length === cachedData.total;
          
          if (!isComplete) {
            cacheManager.delete(key);
            console.log('已清理不完整的缓存:', key);
          }
        }
      });
      
      console.log('已清理不完整的缓存数据');
    } catch (error) {
      console.warn('清理不完整缓存失败:', error);
    }
  },

  // 切换显示模式
  // 优化：所有模式之间切换时都复用缓存数据，避免重复请求
  // 因为betaPlan模式是recommendPlan模式的子集，可以通过筛选获得
  async switchMode(e: any) {
    try {
      const mode = e.currentTarget.dataset.mode;
      console.log('切换显示模式:', mode, '当前状态:', {
        currentMode: this.data.currentMode,
        selectedHero: this.data.selectedHero,
        isDataLoaded: this.data.isDataLoaded
      });
      
      // 如果数据已加载且只是切换模式，尝试复用缓存
      // 所有模式都可以复用，因为betaPlan模式是recommendPlan模式的子集
      if (this.data.isDataLoaded && this.data.originalAllPlans.length > 0) {
        console.log('数据已加载，尝试复用缓存数据，模式切换:', this.data.currentMode, '->', mode);
        
        let filteredAndSortedPlans: any[];
        
        if (mode === 'recommended') {
          // recommended模式：从完整数据中筛选出推荐方案
          console.log('betaPlan recommended模式：从完整数据中筛选推荐体验服方案');
          const recommendedPlans = this.data.originalAllPlans.filter((plan: any) => plan.isRecommended === true);
          console.log('筛选结果：总体验服方案数', this.data.originalAllPlans.length, '推荐体验服方案数', recommendedPlans.length);
          
          // 对筛选后的方案进行排序
          filteredAndSortedPlans = this.sortPlansByMode(recommendedPlans, mode);
          
          // 重要：为recommended模式重新生成英雄分类，确保英雄筛选器只显示有推荐方案的体验服英雄
          const recommendedHeroCategories = await this.generateHeroCategoriesFromPlans(recommendedPlans);
          console.log('betaPlan recommended模式：重新生成英雄分类，英雄数量:', recommendedHeroCategories.length);
          
          // 更新显示数据，recommended模式使用筛选后的数据
          this.setData({
            currentMode: mode,
            page: 1, // 重置页码
            lastModeSwitchTime: Date.now(), // 记录模式切换时间
            recommendPlans: filteredAndSortedPlans,
            allBetaPlans: filteredAndSortedPlans, // 筛选后的推荐体验服方案数据
            betaPlans: filteredAndSortedPlans, // 重要：更新实际显示的数据
            heroCategories: recommendedHeroCategories // 更新英雄分类为推荐体验服方案中的英雄
          });
          console.log('betaPlan recommended模式：已更新allBetaPlans和heroCategories，确保英雄筛选器只显示有推荐方案的体验服英雄');
          
          // 缓存recommended模式的英雄分类数据
          const heroListCacheKey = `timi:plan:data:herolist_beta_${mode}:v1`;
          cacheManager.set(heroListCacheKey, {
            heroCategories: recommendedHeroCategories,
            allPlans: filteredAndSortedPlans,
            total: filteredAndSortedPlans.length,
            mode: mode, // 添加模式标识
            isBetaPlan: true // 添加体验服标识
          }, 30 * 60 * 1000); // 30分钟TTL
          console.log('已缓存recommended模式体验服英雄分类数据，缓存键:', heroListCacheKey);
        } else {
          // hot和latest模式：使用完整的原始数据
          filteredAndSortedPlans = this.sortPlansByMode(this.data.originalAllPlans, mode);
          
          // 重要：为hot/latest模式重新生成英雄分类，确保英雄筛选器显示所有体验服英雄
          const allHeroCategories = await this.generateHeroCategoriesFromPlans(this.data.originalAllPlans);
          console.log(`${mode}模式：重新生成英雄分类，英雄数量:`, allHeroCategories.length);
          
          // 更新显示数据，hot/latest模式使用完整数据
          this.setData({
            currentMode: mode,
            page: 1, // 重置页码
            lastModeSwitchTime: Date.now(), // 记录模式切换时间
            recommendPlans: filteredAndSortedPlans,
            allBetaPlans: this.data.originalAllPlans, // 恢复为完整的原始数据
            betaPlans: filteredAndSortedPlans, // 重要：更新实际显示的数据为排序后的数据
            heroCategories: allHeroCategories // 更新英雄分类为所有体验服英雄
          });
          console.log(`${mode}模式：已恢复allBetaPlans为完整数据，方案数量:`, this.data.originalAllPlans.length, '，英雄数量:', allHeroCategories.length);
        }
        
        console.log('模式切换完成，已复用缓存数据，新方案数量:', filteredAndSortedPlans.length);
        return;
      }
      
      // 检查是否可以从其他模式的缓存中复用数据
      // hot和latest模式之间可以相互复用数据
      if (mode !== 'recommended' && this.data.currentMode !== 'recommended') {
        // 尝试从其他模式的缓存中获取数据
        const otherMode = mode === 'hot' ? 'latest' : 'hot';
        const cacheKey = `timi:plan:data:herolist_beta_${otherMode}:v1`;
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
            allBetaPlans: cachedData.allPlans,
            betaPlans: sortedPlans, // 重要：更新实际显示的数据为排序后的数据
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
        console.log('betaPlan recommended模式：数据源不同，需要重新获取数据');
        
        // 尝试从缓存获取recommended模式数据
        const recommendedCacheKey = `timi:plan:data:herolist_beta_recommended:v1`;
        const recommendedCachedData = cacheManager.get(recommendedCacheKey) as any;
        
        if (recommendedCachedData && recommendedCachedData.heroCategories && recommendedCachedData.heroCategories.length > 0) {
          console.log('找到recommended模式缓存数据，复用英雄分类，英雄数量:', recommendedCachedData.heroCategories.length);
          
          // 更新显示数据
          this.setData({
            currentMode: mode,
            page: 1, // 重置页码
            lastModeSwitchTime: Date.now(), // 记录模式切换时间
            recommendPlans: recommendedCachedData.allPlans || [],
            allBetaPlans: recommendedCachedData.allPlans || [],
            betaPlans: recommendedCachedData.allPlans || [],
            total: recommendedCachedData.total || 0,
            heroCategories: recommendedCachedData.heroCategories,
            isDataLoaded: true
          });
          
          console.log('recommended模式切换完成，已复用缓存数据，英雄数量:', recommendedCachedData.heroCategories.length);
          return;
        }
      }
      
      // 如果没有缓存数据，才重新加载
      console.log('没有缓存数据，需要重新加载数据');
      this.setData({
        currentMode: mode,
        page: 1, // 重置页码
        lastModeSwitchTime: Date.now() // 记录模式切换时间
      });
      // 重新加载数据
      await this.loadBetaPlans(false, this.data.currentRequestId);
    } catch (error) {
      console.error('切换模式失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
    }
  }
}); 