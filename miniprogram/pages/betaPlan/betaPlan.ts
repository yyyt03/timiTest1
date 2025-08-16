// 体验服方案页面
import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getHeroById, getHeroByName } from '../../data/localHeroData';
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
    console.log('体验服方案页面 onLoad 触发');
    
    // 调试：检查全局缓存状态
    console.log('[DEBUG] onLoad时检查全局缓存状态');
    console.log('[DEBUG] 缓存键名:', CACHE_KEYS.ALL_PLANS_CACHE_KEY);
    console.log('[DEBUG] 缓存键名值:', `"${CACHE_KEYS.ALL_PLANS_CACHE_KEY}"`);
    console.log('[DEBUG] cacheManager实例:', typeof cacheManager);
    
    let debugCache = cacheManager.get(CACHE_KEYS.ALL_PLANS_CACHE_KEY) as any[];
    console.log('[DEBUG] 内存缓存状态:', debugCache ? `找到缓存，数量: ${debugCache.length}` : '未找到缓存');
    
    // 如果内存缓存不存在，尝试从持久化存储恢复
    if (!debugCache) {
      try {
        const persistentCache = wx.getStorageSync('global_all_plans_cache');
        if (persistentCache && persistentCache.data) {
          // 检查是否过期
          const now = Date.now();
          if (now - persistentCache.timestamp < persistentCache.ttl) {
            console.log('[DEBUG] 从持久化存储恢复缓存，数量:', persistentCache.data.length);
            // 恢复到内存缓存
            cacheManager.set(CACHE_KEYS.ALL_PLANS_CACHE_KEY, persistentCache.data, 30 * 60 * 1000);
            debugCache = persistentCache.data;
          } else {
            console.log('[DEBUG] 持久化缓存已过期');
            wx.removeStorageSync('global_all_plans_cache');
          }
        } else {
          console.log('[DEBUG] 无持久化缓存备份');
        }
      } catch (error) {
        console.warn('[DEBUG] 恢复持久化缓存失败:', error);
      }
    }
    
    // 再次尝试手动构造键名检查
    const manualKey = 'timi:plan:data:all_plans_cache:v1';
    const manualCache = cacheManager.get(manualKey) as any[];
    console.log('[DEBUG] 手动键名缓存:', manualCache ? `找到缓存，数量: ${manualCache.length}` : '未找到缓存');
    console.log('[DEBUG] 最终缓存状态:', debugCache ? `找到缓存，数量: ${debugCache.length}` : '未找到缓存');
    
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
    this.debouncedSwitchFilter = debounceOperation('betaSwitchFilter', this.switchFilter.bind(this), 500, {
      leading: false,
      trailing: true,
      maxWait: 2000 // 最大等待2秒
    });
    
    // 从strategy进入时，强制重置为全部英雄状态，不管之前是否有筛选
    console.log('从strategy进入，强制重置为全部英雄状态');
    this.resetFilterState();
    
    // 然后初始化页面数据
    console.log('初始化页面数据，模式:', this.data.currentMode, '英雄:', this.data.selectedHero);
    this.initModeHeroList('hot', this.data.currentRequestId); // 初始化热门模式的英雄分类
    this.loadBetaPlans(false, this.data.currentRequestId);
  },

  // 页面数据变化监听
  onDataChange() {
    // 页面数据变化监听
  },

  onShow() {
    console.log('体验服方案页面 onShow 触发');
    
    // 优先检查交互状态变化（收藏和点赞）
    if (this.checkInteractionChanges()) {
      console.log('检测到交互状态变化，需要刷新数据');
      this.loadBetaPlans(false, this.data.currentRequestId);
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
        this.loadBetaPlans(false, this.data.currentRequestId);
      } else {
        console.log('数据已加载且未过期，保持现有数据');
        // 如果数据已加载且未过期，且当前有英雄筛选，需要重新筛选数据
        if (this.data.allBetaPlans.length > 0 && this.data.selectedHero !== 'all') {
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
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过英雄分类初始化，请求ID:', requestId);
        return;
      }
      
      // 首先检查是否有最新的全局缓存数据
      const globalAllPlansCache = cacheManager.get<any[]>(CACHE_KEYS.ALL_PLANS_CACHE_KEY);
      const cacheKey = CACHE_KEYS.HERO_LIST_MODE(`beta_${mode}`);
      const cachedData = cacheManager.get<{
        heroCategories: any[];
        allPlans: any[];
        total: number;
      }>(cacheKey);
      
      // 优先使用全局缓存，确保数据是最新的
      if (globalAllPlansCache && globalAllPlansCache.length > 0) {
        console.log(`使用全局缓存数据初始化${mode}模式英雄分类，总方案数: ${globalAllPlansCache.length}`);
        
        // 再次检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过全局缓存数据使用，请求ID:', requestId);
          return;
        }
        
        // 从全局缓存中筛选体验服方案
        let filteredPlans = globalAllPlansCache.filter((plan: any) => plan.isBetaPlan === true);
        
        // 根据模式进一步筛选
        if (mode === 'recommended') {
          filteredPlans = filteredPlans.filter((plan: any) => plan.isRecommended === true);
        }
        
        // 处理头像
        const processedAllPlans = await this.processPlansWithAvatars(filteredPlans);
        const cleanHeroCategories = await this.generateHeroCategoriesFromPlans(processedAllPlans);
        
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = cleanHeroCategories;
        modeCache.allPlans = processedAllPlans;
        
        this.setData({
          heroCategories: cleanHeroCategories,
          modeDataCache: this.data.modeDataCache
        });
        
        // 更新特定模式缓存，确保一致性
        cacheManager.set(cacheKey, {
          heroCategories: cleanHeroCategories,
          allPlans: processedAllPlans,
          total: processedAllPlans.length,
          timestamp: Date.now()
        }, 30 * 60 * 1000);
        
        console.log(`${mode}模式全局缓存初始化完成，英雄数量: ${cleanHeroCategories.length}，方案数: ${processedAllPlans.length}`);
        return;
      }
      // 如果没有全局缓存，则使用特定模式缓存
      else if (cachedData && cachedData.heroCategories && cachedData.heroCategories.length > 0) {
        // 再次检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过缓存数据使用，请求ID:', requestId);
          return;
        }
        
        console.log(`使用${mode}模式缓存数据，但重新生成英雄分类确保数据独立性`);
        // 不直接使用缓存的heroCategories，因为可能被其他页面污染
        // heroCategories: cachedData.heroCategories, // ❌ 直接使用可能被污染的缓存
        const allPlans = cachedData.allPlans || [];
        
        // 重要：基于完整数据重新生成heroCategories，确保包含体验服实际的英雄
        // 不直接使用缓存中的heroCategories，避免被recommendPlan等页面污染
        const processedAllPlans = await this.processPlansWithAvatars(allPlans);
        const cleanHeroCategories = await this.generateHeroCategoriesFromPlans(processedAllPlans);
        
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = cleanHeroCategories; // 使用重新生成的干净数据
        modeCache.allPlans = processedAllPlans;
        modeCache.total = processedAllPlans.length;
        
        console.log(`使用缓存的${mode}模式数据，重新生成英雄数量:`, cleanHeroCategories.length, '，方案数:', processedAllPlans.length);
        
        this.setData({
          heroCategories: cleanHeroCategories, // 使用重新生成的干净数据
          allBetaPlans: processedAllPlans, // 使用处理过头像的数据
          total: processedAllPlans.length,
          [`modeDataCache.${mode}`]: modeCache
        });
        return;
      }

      // 获取指定模式的所有方案数据
      const plans = await planService.getBetaPlans(mode);
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过云函数结果处理，请求ID:', requestId);
        return;
      }
      
      if (plans && plans.length > 0) {
        
        // 生成英雄分类
        const heroCategories = await this.generateHeroCategoriesFromPlans(plans);
        
        // 再次检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过英雄分类处理，请求ID:', requestId);
          return;
        }
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
        // 格式化时间
        const formattedPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        // 更新缓存
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = heroCategories;
        modeCache.allPlans = formattedPlans;
        modeCache.total = plans.length;
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          allBetaPlans: formattedPlans,
          total: plans.length,
          [`modeDataCache.${mode}`]: modeCache
        });
        
        // 缓存英雄分类数据，延长TTL到30分钟
        const heroListCacheKey = CACHE_KEYS.HERO_LIST_MODE(`beta_${mode}`);
        cacheManager.set(heroListCacheKey, {
          heroCategories: heroCategories,
          allPlans: formattedPlans,
          total: plans.length
        }, 30 * 60 * 1000); // 30分钟TTL
        
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
              this.filterBetaPlansByHero();
            }, 50);
          } else {
            console.log('英雄分类初始化完成，当前显示全部方案，无需筛选');
          }
        }, 100);
      }
    } catch (error) {
      console.error(`初始化${mode}模式英雄列表失败:`, error);
    }
  },

  // 切换筛选类型
  async switchFilter(e: any) {
    try {
      const type = e.currentTarget.dataset.type;
      console.log('切换筛选类型:', type, '当前状态:', {
        currentMode: this.data.currentMode,
        selectedHero: this.data.selectedHero
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
      
      console.log('模式切换完成，开始加载数据，请求ID:', requestId);
      
      // 优化：优先检查是否已有加载的数据，如果有则直接复用，避免重复调用云函数
      if (this.data.isDataLoaded && this.data.allBetaPlans.length > 0) {
        console.log('[switchFilter] 可以复用已有数据，模式切换:', this.data.currentMode, '->', type);
        
        // 检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过数据复用，请求ID:', requestId);
          return;
        }
        
        // 从现有数据中根据模式筛选和排序
        let filteredPlans = [...this.data.allBetaPlans];
        
        if (type === 'recommended') {
          filteredPlans = filteredPlans.filter((plan: any) => plan.isRecommended === true);
        }
        
        // 根据模式排序
        if (type === 'hot') {
          filteredPlans.sort((a: any, b: any) => {
            const aScore = (a.likeCount || 0) + (a.favoriteCount || 0);
            const bScore = (b.likeCount || 0) + (b.favoriteCount || 0);
            return bScore - aScore;
          });
        } else if (type === 'latest') {
          filteredPlans.sort((a: any, b: any) => this.getDateTimestamp(b.createTime) - this.getDateTimestamp(a.createTime));
        }
        
        // 格式化时间
        const formattedPlans = filteredPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        // 更新显示数据
        this.setData({
          currentMode: type,
          betaPlans: formattedPlans,
          total: formattedPlans.length,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });
        
        console.log(`[switchFilter] 模式切换完成，已复用缓存数据，模式: ${type}，方案数: ${formattedPlans.length}`);
        
        // 强制重新计算布局，确保页面比例正确
        setTimeout(() => {
          try {
            this.setData({
              _layoutUpdate: Date.now()
            });
          } catch (layoutError) {
            console.warn('布局重新计算失败，但不影响主要功能:', layoutError);
          }
        }, 100);
        
        return; // 直接返回，不需要调用云函数
      }
      
      // 如果没有已加载的数据，再检查全局缓存
      console.log('[switchFilter] 没有已加载数据，检查全局缓存');
      console.log('[switchFilter] 缓存键名:', CACHE_KEYS.ALL_PLANS_CACHE_KEY);
      const allPlansCache = cacheManager.get(CACHE_KEYS.ALL_PLANS_CACHE_KEY) as any[];
      console.log('[switchFilter] 缓存检查结果:', allPlansCache ? `找到缓存，数量: ${allPlansCache.length}` : '未找到缓存');
      
      if (allPlansCache) { // 只要有全局缓存就使用，即使体验服方案为空
        console.log('[switchFilter] 使用全局缓存数据进行本地筛选，总缓存数量:', allPlansCache.length);
        
        // 检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过缓存数据设置，请求ID:', requestId);
          return;
        }
        
        // 根据当前模式筛选数据
        let filteredPlans = allPlansCache.filter((plan: any) => plan.isBetaPlan);
        
        if (type === 'hot') {
          filteredPlans = filteredPlans.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0));
        } else if (type === 'latest') {
          filteredPlans = filteredPlans.sort((a: any, b: any) => 
            this.getDateTimestamp(b.createTime) - this.getDateTimestamp(a.createTime)
          );
        } else if (type === 'recommended') {
          filteredPlans = filteredPlans.filter((plan: any) => plan.isRecommended);
        }
        
        // 处理方案数据，添加英雄头像
        const processedPlans = filteredPlans.length > 0 ? await this.processPlansWithAvatars(filteredPlans) : [];
        
        // 提取英雄分类
        const allBetaPlans = allPlansCache.filter((plan: any) => plan.isBetaPlan);
        const heroCategories = allBetaPlans.length > 0 ? await this.generateHeroCategoriesFromPlans(allBetaPlans) : [];
        
        // 设置数据
        this.setData({
          heroCategories: heroCategories,
          allBetaPlans: processedPlans,
          total: processedPlans.length,
          betaPlans: processedPlans,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });
        
        // 强制重新计算布局，确保页面比例正确
        setTimeout(() => {
          try {
            this.setData({
              _layoutUpdate: Date.now()
            });
          } catch (layoutError) {
            console.warn('布局重新计算失败，但不影响主要功能:', layoutError);
          }
        }, 100);
        
        console.log(`[switchFilter] 使用缓存完成，模式: ${type}，方案数: ${processedPlans.length}`);
        return; // 直接返回，不需要调用云函数
      }
      
      console.log('[switchFilter] 全局缓存不可用，继续使用传统方法');
      
      // 如果缓存中没有数据，才调用云函数
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
      allBetaPlansLength: this.data.allBetaPlans.length
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
      const { allBetaPlans, selectedHero, currentMode } = this.data;
      
      console.log('开始筛选体验服方案:', {
        selectedHero,
        currentMode,
        allBetaPlansLength: allBetaPlans.length,
        currentBetaPlansLength: this.data.betaPlans.length
      });
      
      if (selectedHero === 'all') {
        console.log('显示全部体验服方案');
        // 显示全部体验服方案，根据当前模式使用不同的排序逻辑
        let sortedPlans = [...allBetaPlans];
        
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
        // 添加调试信息：检查实际的方案数据
        allBetaPlans.forEach((plan, index) => {
          console.log(`体验服方案 ${index + 1}:`, {
            id: plan._id,
            heroName: plan.heroName,
            heroId: plan.heroId,
            title: plan.title
          });
        });
        // 筛选指定英雄的体验服方案，根据当前模式使用不同的排序逻辑
        const filteredPlans = allBetaPlans.filter(plan => plan.heroName === selectedHero);
        console.log('筛选结果:', {
          heroName: selectedHero,
          filteredCount: filteredPlans.length,
          allPlansCount: allBetaPlans.length
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
  async loadBetaPlans(isLoadMore = false, requestId?: number, forceRefresh = false) {
    // 如果没有提供requestId，使用当前请求ID
    const currentRequestId = requestId || this.data.currentRequestId;
    
    if (isLoadMore) {
      if (!this.data.hasMore || this.data.loadingMore) {
        return;
      }
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }

    try {
      // 优先检查全局缓存，避免重复调用云函数
      // 如果强制刷新，跳过所有缓存检查
      if (!isLoadMore && !forceRefresh) {
        console.log('[loadBetaPlans] 检查全局缓存是否可用');
        console.log('[loadBetaPlans] 缓存键名:', CACHE_KEYS.ALL_PLANS_CACHE_KEY);
        
        let allPlansCache = cacheManager.get(CACHE_KEYS.ALL_PLANS_CACHE_KEY) as any[];
        console.log('[loadBetaPlans] 内存缓存检查结果:', allPlansCache ? `找到缓存，数量: ${allPlansCache.length}` : '未找到缓存');
        
        // 如果内存缓存不存在，尝试从持久化存储恢复
        if (!allPlansCache) {
          try {
            console.log('[loadBetaPlans] 内存缓存缺失，尝试从持久化存储恢复');
            const persistentCache = wx.getStorageSync('global_all_plans_cache');
            if (persistentCache && persistentCache.data) {
              // 检查是否过期
              const now = Date.now();
              if (now - persistentCache.timestamp < persistentCache.ttl) {
                console.log('[loadBetaPlans] 从持久化存储恢复缓存，数量:', persistentCache.data.length);
                // 恢复到内存缓存
                cacheManager.set(CACHE_KEYS.ALL_PLANS_CACHE_KEY, persistentCache.data, 30 * 60 * 1000);
                allPlansCache = persistentCache.data;
                console.log('[loadBetaPlans] 成功恢复全局缓存');
              } else {
                console.log('[loadBetaPlans] 持久化缓存已过期，清除');
                wx.removeStorageSync('global_all_plans_cache');
              }
            } else {
              console.log('[loadBetaPlans] 无持久化缓存备份');
            }
          } catch (error) {
            console.warn('[loadBetaPlans] 恢复持久化缓存失败:', error);
          }
        }
        
        if (allPlansCache) { // 只要有全局缓存就使用，即使体验服方案为空
          console.log(`[loadBetaPlans] 使用全局缓存数据进行本地筛选，模式: ${this.data.currentMode}，总缓存数量: ${allPlansCache.length}`);
          
          // 从全局缓存中筛选体验服方案
          let filteredPlans = allPlansCache.filter((plan: any) => plan.isBetaPlan === true);
          console.log(`[loadBetaPlans] 筛选出体验服方案数量: ${filteredPlans.length}`);
          
          // 根据模式进一步筛选
          if (this.data.currentMode === 'recommended') {
            filteredPlans = filteredPlans.filter((plan: any) => plan.isRecommended === true);
          }
          
          // 根据模式排序
          if (this.data.currentMode === 'hot') {
            filteredPlans.sort((a: any, b: any) => {
              const aScore = (a.likeCount || 0) + (a.favoriteCount || 0);
              const bScore = (b.likeCount || 0) + (b.favoriteCount || 0);
              return bScore - aScore;
            });
          } else if (this.data.currentMode === 'latest') {
            filteredPlans.sort((a: any, b: any) => this.getDateTimestamp(b.createTime) - this.getDateTimestamp(a.createTime));
          }
          
          // 根据英雄筛选
          if (this.data.selectedHero !== 'all') {
            filteredPlans = filteredPlans.filter((plan: any) => plan.heroName === this.data.selectedHero);
          }
          
          console.log(`[loadBetaPlans] 本地筛选完成，${this.data.currentMode}模式方案数量: ${filteredPlans.length}`);
          
          // 即使筛选结果为空，也使用缓存数据，避免调用云函数
          // 处理方案数据，添加英雄头像
          const processedPlans = filteredPlans.length > 0 ? await this.processPlansWithAvatars(filteredPlans) : [];
          
          // 生成英雄分类列表（使用所有体验服方案）
          const allBetaPlans = allPlansCache.filter((plan: any) => plan.isBetaPlan === true);
          const heroCategories = allBetaPlans.length > 0 ? await this.generateHeroCategoriesFromPlans(allBetaPlans) : [];
          
          // 检查请求是否已被取消
          if (currentRequestId !== this.data.currentRequestId) {
            return;
          }
          
          // 客户端分页处理
          const pageSize = this.data.pageSize;
          const currentPage = 1;
          const startIndex = 0;
          const endIndex = pageSize;
          const paginatedPlans = processedPlans.slice(startIndex, endIndex);
          const hasMore = endIndex < processedPlans.length;
          
          // 格式化时间
          const formattedPlans = paginatedPlans.map((plan: any) => ({
            ...plan,
            createTime: this.formatTime(plan.createTime)
          }));

          this.setData({
            betaPlans: formattedPlans,
            page: currentPage,
            hasMore: hasMore,
            loading: false,
            loadingMore: false,
            isDataLoaded: true,
            lastLoadTime: Date.now(),
            heroCategories: heroCategories,
            allBetaPlans: processedPlans,
            total: processedPlans.length
          });

          // 重要：设置heroPlan页面需要的缓存键，实现跨页面缓存共享
          // 使用全局缓存的完整数据，而不是只使用体验服方案数据
          const heroListCacheKey = `timi:plan:data:herolist_${this.data.currentMode}:v1`;
          const heroListCacheData = {
            heroCategories: heroCategories,
            allPlans: allPlansCache, // 使用全局缓存的完整数据，包含所有方案
            total: allPlansCache.length,
            mode: this.data.currentMode,
            isRecommended: this.data.currentMode === 'recommended',
            timestamp: Date.now()
          };
          cacheManager.set(heroListCacheKey, heroListCacheData, 30 * 60 * 1000); // 30分钟TTL
          console.log(`[loadBetaPlans] 已设置heroPlan页面缓存: ${heroListCacheKey}，完整数据量: ${allPlansCache.length}`);

          console.log(`[loadBetaPlans] 使用缓存数据加载完成，模式: ${this.data.currentMode}，方案数: ${formattedPlans.length}，总数: ${processedPlans.length}`);
          return;
        }
      }
      
      // 如果不是加载更多且不是强制刷新，先尝试从缓存获取数据
      if (!isLoadMore && !forceRefresh) {
        const cacheKey = CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, this.data.selectedHero);
        const cachedData = cacheManager.get<any>(cacheKey);
        
        if (cachedData && cachedData.plans && cachedData.plans.length > 0) {
          // 检查请求是否已被取消
          if (currentRequestId !== this.data.currentRequestId) {
            console.log('请求已被取消，跳过缓存数据使用，请求ID:', currentRequestId);
            return;
          }
          
          console.log('使用缓存的体验服方案数据:', cacheKey);
          this.setData({
            betaPlans: cachedData.plans,
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

      // 使用 planService 获取数据，它内部会处理缓存
      let plans;
      if (this.data.selectedHero === 'all') {
        plans = await planService.getBetaPlans(this.data.currentMode, forceRefresh);
      } else {
        const allPlans = await planService.getBetaPlans(this.data.currentMode, forceRefresh);
        plans = allPlans.filter(plan => plan.heroName === this.data.selectedHero);
      }
      
      // 检查请求是否已被取消
      if (currentRequestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过数据处理，请求ID:', currentRequestId);
        return;
      }
      
      if (plans && plans.length > 0) {
        
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
        } else if (this.data.currentMode === 'latest') {
          sortedPlans = this.sortPlansByCreateTime(processedPlans);
        } else {
          sortedPlans = this.sortPlansByRecommendation(processedPlans);
        }
        
        // 客户端分页处理
        const pageSize = this.data.pageSize;
        const currentPage = isLoadMore ? this.data.page + 1 : 1;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedPlans = sortedPlans.slice(startIndex, endIndex);
        const hasMore = endIndex < sortedPlans.length;
        
        // 格式化时间
        const formattedPlans = paginatedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

        this.setData({
          betaPlans: isLoadMore ? [...this.data.betaPlans, ...formattedPlans] : formattedPlans,
          page: currentPage,
          hasMore: hasMore,
          loading: false,
          loadingMore: false,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });

        // 如果不是加载更多，则缓存数据
        if (!isLoadMore) {
          // planService.getBetaPlans()内部已经调用getAllPlans()并设置了全局缓存
          // 这里不需要重复调用，避免多次调用云函数
          console.log(`[betaPlan] planService已处理全局缓存设置，跳过重复操作`);
          
          /*
          // 重要：betaPlan不应该设置全局缓存，因为它获取的是筛选过的数据，不是全部数据
          // ALL_PLANS_CACHE_KEY应该只由获取全部数据的页面设置（如recommendPlan）
          // 这里我们通过planService.getAllPlans()来获取并设置完整的全局缓存
          try {
            const allCompleteData = await planService.getAllPlans(forceRefresh);
            cacheManager.set(CACHE_KEYS.ALL_PLANS_CACHE_KEY, allCompleteData, 30 * 60 * 1000); // 30分钟TTL
            console.log(`[betaPlan] 已设置完整的统一全局缓存: ${CACHE_KEYS.ALL_PLANS_CACHE_KEY}，完整数据量: ${allCompleteData.length}${forceRefresh ? ' (强制刷新)' : ''}`);
          } catch (error) {
            console.error(`[betaPlan] 设置完整全局缓存失败:`, error);
          }
          */
          
          // 缓存当前筛选结果，延长TTL到10分钟
          const cacheKey = CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, this.data.selectedHero);
          const cacheData = {
            plans: formattedPlans,
            page: currentPage,
            hasMore: hasMore,
            timestamp: Date.now(),
            mode: this.data.currentMode,
            heroId: this.data.selectedHero
          };
          cacheManager.set(cacheKey, cacheData, 10 * 60 * 1000); // 10分钟TTL
          
          // 重要：设置heroPlan页面需要的缓存键，实现跨页面缓存共享
          // 从全局缓存获取完整数据来设置heroPlan缓存
          const globalCache = cacheManager.get<any[]>(CACHE_KEYS.ALL_PLANS_CACHE_KEY);
          if (globalCache && globalCache.length > 0) {
            const heroListCacheKey = `timi:plan:data:herolist_${this.data.currentMode}:v1`;
            // 重新生成干净的heroCategories，避免页面特有状态污染
            const cleanHeroCategories = await this.generateHeroCategoriesFromPlans(globalCache);
            const heroListCacheData = {
              heroCategories: cleanHeroCategories, // 使用重新生成的干净数据
              allPlans: globalCache, // 使用全局缓存的完整数据
              total: globalCache.length,
              mode: this.data.currentMode,
              isRecommended: this.data.currentMode === 'recommended',
              timestamp: Date.now()
            };
            cacheManager.set(heroListCacheKey, heroListCacheData, 30 * 60 * 1000); // 30分钟TTL
            console.log(`[betaPlan] 已设置heroPlan页面缓存: ${heroListCacheKey}，完整数据量: ${globalCache.length}，英雄分类: ${cleanHeroCategories.length}`);
          } else {
            console.log(`[betaPlan] 全局缓存不可用，但planService.getBetaPlans()应该已经设置了全局缓存`);
            // planService.getBetaPlans()应该已经调用了getAllPlans()并设置了全局缓存
            // 这里不再重复调用，避免多次调用云函数
            console.log(`[betaPlan] 跳过heroPlan缓存设置，避免重复调用云函数`);
            
            /*
            // 如果全局缓存不可用，通过planService获取完整数据
            try {
              const allCompleteData = await planService.getAllPlans(forceRefresh);
              const heroListCacheKey = `timi:plan:data:herolist_${this.data.currentMode}:v1`;
              const cleanHeroCategories = await this.generateHeroCategoriesFromPlans(allCompleteData);
              const heroListCacheData = {
                heroCategories: cleanHeroCategories,
                allPlans: allCompleteData,
                total: allCompleteData.length,
                mode: this.data.currentMode,
                isRecommended: this.data.currentMode === 'recommended',
                timestamp: Date.now()
              };
              cacheManager.set(heroListCacheKey, heroListCacheData, 30 * 60 * 1000); // 30分钟TTL
              console.log(`[betaPlan] 已通过planService设置heroPlan页面缓存: ${heroListCacheKey}，完整数据量: ${allCompleteData.length}，英雄分类: ${cleanHeroCategories.length}`);
            } catch (error) {
              console.error(`[betaPlan] 通过planService设置heroPlan缓存失败:`, error);
            }
            */
          }
        }
      } else {
        this.setData({
          betaPlans: [],
          page: 1,
          hasMore: false,
          loading: false,
          loadingMore: false,
          isDataLoaded: true
        });
      }
    } catch (error) {
      console.error('加载体验服方案失败:', error);
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
            heroAvatar: '../images/unused/default-avatar.png'
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
      let heroAvatar = avatarUrlMap[originalAvatar] || originalAvatar;
      
      // 如果没有找到英雄头像或头像无效，使用默认头像
      if (!heroAvatar || (!heroAvatar.startsWith('http') && !heroAvatar.startsWith('../') && !heroAvatar.startsWith('/'))) {
        heroAvatar = '../images/unused/default-avatar.png';
      }
      
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

  // 安全获取日期时间戳，确保iOS兼容性
  getDateTimestamp(dateInput: any): number {
    if (!dateInput) return 0;
    
    if (typeof dateInput === 'string') {
      return this.parseDateString(dateInput).getTime();
    } else if (dateInput instanceof Date) {
      return dateInput.getTime();
    } else {
      return new Date(dateInput).getTime();
    }
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
      const cacheKey = CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, this.data.selectedHero);
      cacheManager.delete(cacheKey);
      console.log('下拉刷新，已清除体验服方案缓存:', cacheKey);
      
      this.setData({ page: 1 }); // 重置页码
      await this.loadBetaPlans(false, this.data.currentRequestId, true); // 强制刷新
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
      imageUrl: '/pages/images/share-beta-plan.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '体验服攻略方案 - 推荐/热门/最新',
      imageUrl: '/pages/images/share-beta-plan.png'
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
        CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, 'all'),
        CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, this.data.selectedHero),
        CACHE_KEYS.HERO_LIST_MODE(`beta_${this.data.currentMode}`)
      ];
      
      // 清除所有模式的缓存，因为收藏状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${mode}`, 'all'),
          CACHE_KEYS.HERO_LIST_MODE(`beta_${mode}`)
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
        }
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
        CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, 'all'),
        CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${this.data.currentMode}`, this.data.selectedHero),
        CACHE_KEYS.HERO_LIST_MODE(`beta_${this.data.currentMode}`)
      ];
      
      // 清除所有模式的缓存，因为点赞状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          CACHE_KEYS.PLAN_RECOMMEND_MODE(`beta_${mode}`, 'all'),
          CACHE_KEYS.HERO_LIST_MODE(`beta_${mode}`)
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
        }
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
      }
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
  }
}); 