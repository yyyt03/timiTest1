import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById, getHeroByName } from '../../data/localHeroData';
import { avatarCache } from '../../utils/avatarCache';
import { cacheManager } from '../../utils/cacheManager';
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
    
    // 然后初始化页面数据
    console.log('初始化页面数据，模式:', this.data.currentMode, '英雄:', this.data.selectedHero);
    this.initModeHeroList('hot', this.data.currentRequestId); // 初始化热门模式的英雄分类
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
          pageSize: 100 // 获取更多数据以提取英雄列表
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
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过英雄分类初始化，请求ID:', requestId);
        return;
      }
      
      // 如果缓存中已有数据且未过期，直接使用
      const cacheKey = `mode_hero_list_${mode}`;
      const cachedData = cacheManager.get(cacheKey) as any;
      
      if (cachedData && cachedData.heroCategories && cachedData.heroCategories.length > 0) {
        // 再次检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过缓存数据使用，请求ID:', requestId);
          return;
        }
        
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = cachedData.heroCategories;
        modeCache.allPlans = cachedData.allPlans;
        modeCache.total = cachedData.total;
        
        // 更新当前显示数据
        this.setData({
          heroCategories: cachedData.heroCategories,
          allRecommendPlans: cachedData.allPlans,
          total: cachedData.total,
          [`modeDataCache.${mode}`]: modeCache
        });
        return;
      }

      // 获取指定模式的所有方案数据
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: mode,
          page: 1,
          pageSize: 100 // 获取更多数据以提取英雄列表
        }
      }) as any;
      
      // 检查请求是否已被取消
      if (requestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过云函数结果处理，请求ID:', requestId);
        return;
      }
      
      if (result.result && result.result.success) {
        const { plans } = result.result.data;
        
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
          allRecommendPlans: formattedPlans,
          total: plans.length,
          [`modeDataCache.${mode}`]: modeCache
        });
        
        // 缓存英雄分类数据，延长TTL到30分钟
        const heroListCacheKey = `mode_hero_list_${mode}`;
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
              this.filterRecommendPlansByHero();
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
      
      console.log('模式切换完成，开始初始化英雄分类，请求ID:', requestId);
      
      // 优化：优先使用缓存数据，避免重复调用云函数
      const modeCache = this.data.modeDataCache[type as keyof typeof this.data.modeDataCache];
      if (modeCache && modeCache.allPlans && modeCache.allPlans.length > 0) {
        console.log('使用缓存数据，避免重复调用云函数，请求ID:', requestId);
        
        // 检查请求是否已被取消
        if (requestId !== this.data.currentRequestId) {
          console.log('请求已被取消，跳过缓存数据设置，请求ID:', requestId);
          return;
        }
        
        // 直接使用缓存数据
        this.setData({
          heroCategories: modeCache.heroCategories,
          allRecommendPlans: modeCache.allPlans,
          total: modeCache.total,
          recommendPlans: modeCache.allPlans, // 显示全部方案
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
        
        return; // 直接返回，不需要调用云函数
      }
      
      // 如果缓存中没有数据，才调用云函数
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
  async switchMode(e: any) {
    try {
      const mode = e.currentTarget.dataset.mode;
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
      // 为每个英雄分类添加头像信息
      const processedCategories = heroCategories.map(heroCategory => {
        const hero = getHeroByName(heroCategory.heroName);
        
        if (hero && hero.avatar) {
          return {
            ...heroCategory,
            heroAvatar: hero.avatar
          };
        } else {
          return {
            ...heroCategory,
            heroAvatar: '../images/unused/default-avatar.png'
          };
        }
      });
      
      // 使用新的头像缓存管理器批量获取头像临时URL
      const avatarUrls = processedCategories
        .map(hero => hero.heroAvatar)
        .filter(avatar => avatar && avatar.startsWith('cloud://'));
      
      if (avatarUrls.length > 0) {
        try {
          const avatarUrlMap = await avatarCache.getAvatarUrls(avatarUrls);
          
          // 更新头像URL
          processedCategories.forEach(heroCategory => {
            if (heroCategory.heroAvatar && heroCategory.heroAvatar.startsWith('cloud://')) {
              const tempUrl = avatarUrlMap[heroCategory.heroAvatar];
              if (tempUrl && tempUrl.startsWith('http')) {
                heroCategory.heroAvatar = tempUrl;
              } else {
                // 临时URL获取失败，使用默认头像
                heroCategory.heroAvatar = '../images/unused/default-avatar.png';
              }
            }
          });
        } catch (error) {
          console.error('获取头像临时URL失败:', error);
          // 如果获取失败，使用默认头像
          processedCategories.forEach(heroCategory => {
            if (heroCategory.heroAvatar && heroCategory.heroAvatar.startsWith('cloud://')) {
              heroCategory.heroAvatar = '../images/unused/default-avatar.png';
            }
          });
        }
      }
      
      return processedCategories;
    } catch (error) {
      console.error('处理英雄头像失败:', error);
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
        const cacheKey = `recommend_plans_${this.data.currentMode}_${this.data.selectedHero}`;
        const cachedData = cacheManager.get<any>(cacheKey);
        
        if (cachedData && cachedData.plans && cachedData.plans.length > 0) {
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

      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: this.data.currentMode,
          heroId: this.data.selectedHero === 'all' ? null : this.data.selectedHero,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize
        }
      }) as any;
      
      // 检查请求是否已被取消
      if (currentRequestId !== this.data.currentRequestId) {
        console.log('请求已被取消，跳过云函数结果处理，请求ID:', currentRequestId);
        return;
      }
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        
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
        
        // 格式化时间
        const formattedPlans = sortedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

        this.setData({
          recommendPlans: isLoadMore ? [...this.data.recommendPlans, ...formattedPlans] : formattedPlans,
          page: page,
          hasMore: hasMore,
          loading: false,
          loadingMore: false,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });

        // 如果不是加载更多，则缓存数据
        if (!isLoadMore) {
          // 缓存当前筛选结果，延长TTL到10分钟
          const cacheKey = `recommend_plans_${this.data.currentMode}_${this.data.selectedHero}`;
          const cacheData = {
            plans: formattedPlans,
            page: page,
            hasMore: hasMore,
            timestamp: Date.now(),
            mode: this.data.currentMode,
            heroId: this.data.selectedHero
          };
          cacheManager.set(cacheKey, cacheData, 10 * 60 * 1000); // 10分钟TTL
        }
      } else {
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
      console.error('加载推荐方案失败:', error);
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
      const cacheKey = `recommend_plans_${this.data.currentMode}_${this.data.selectedHero}`;
      cacheManager.delete(cacheKey);
      console.log('下拉刷新，已清除缓存:', cacheKey);
      
      this.setData({ page: 1 }); // 重置页码
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
        `recommend_plans_${this.data.currentMode}_all`,
        `recommend_plans_${this.data.currentMode}_${this.data.selectedHero}`,
        `mode_hero_list_${this.data.currentMode}`
      ];
      
      // 清除所有模式的缓存，因为收藏状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          `recommend_plans_${mode}_all`,
          `mode_hero_list_${mode}`
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
        `recommend_plans_${this.data.currentMode}_all`,
        `recommend_plans_${this.data.currentMode}_${this.data.selectedHero}`
      ];
      
      // 清除所有模式的缓存，因为点赞状态变化可能影响所有模式
      ['recommended', 'hot', 'latest'].forEach(mode => {
        cacheKeys.push(
          `recommend_plans_${mode}_all`,
          `recommend_plans_${mode}_${this.data.selectedHero}`
        );
      });
      
      cacheKeys.forEach(key => {
        if (cacheManager.has(key)) {
          cacheManager.delete(key);
          console.log('已清除点赞相关缓存:', key);
        }
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
  }
});