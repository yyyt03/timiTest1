// 体验服方案页面
import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById, getHeroByName } from '../../data/localHeroData';
import { getTempFileURLs } from '../../utils/cloud';
import { cacheManager } from '../../utils/cacheManager';

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
    filterDebounceTimer: null as any // 防抖定时器
  },

  // 生命周期函数--监听页面加载
  onLoad() {
    console.log('体验服方案页面 onLoad 触发');
    
    // 初始化时间状态，避免时间判断错误
    const now = Date.now();
    this.setData({
      lastLoadTime: now,
      lastModeSwitchTime: now
    });
    
    // 从strategy进入时，强制重置为全部英雄状态，不管之前是否有筛选
    console.log('从strategy进入，强制重置为全部英雄状态');
    this.resetFilterState();
    
    // 然后初始化页面数据
    console.log('初始化页面数据，模式:', this.data.currentMode, '英雄:', this.data.selectedHero);
    this.initModeHeroList('hot'); // 初始化热门模式的英雄分类
    this.loadBetaPlans();
  },

  // 页面数据变化监听
  onDataChange() {
    // 页面数据变化监听
  },

  onShow() {
    console.log('体验服方案页面 onShow 触发');
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
        this.loadBetaPlans();
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
  async initModeHeroList(mode: string) {
    try {
      // 如果缓存中已有数据且未过期，直接使用
      const cacheKey = `mode_hero_list_beta_${mode}`;
      const cachedData = cacheManager.get<{
        heroCategories: any[];
        allPlans: any[];
        total: number;
      }>(cacheKey);
      
      if (cachedData && cachedData.heroCategories && cachedData.heroCategories.length > 0) {
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = cachedData.heroCategories;
        modeCache.allPlans = cachedData.allPlans;
        modeCache.total = cachedData.total;
        
        this.setData({
          heroCategories: cachedData.heroCategories,
          allBetaPlans: cachedData.allPlans,
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
          pageSize: 100, // 获取更多数据以提取英雄列表
          isBetaPlan: true // 只获取体验服方案
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans } = result.result.data;
        
        // 生成英雄分类
        const heroCategories = await this.generateHeroCategoriesFromPlans(plans);
        
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
        const heroListCacheKey = `mode_hero_list_beta_${mode}`;
        cacheManager.set(heroListCacheKey, {
          heroCategories: heroCategories,
          allPlans: formattedPlans,
          total: plans.length
        }, 30 * 60 * 1000); // 30分钟TTL
        
        // 强制刷新页面数据，确保头像能正确显示
        setTimeout(() => {
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
      
      // 重置英雄选择为全部
      this.setData({
        currentMode: type,
        selectedHero: 'all',
        page: 1, // 重置页码
        lastModeSwitchTime: Date.now() // 记录模式切换时间
      });
      
      console.log('模式切换完成，开始初始化英雄分类');
      
      // 优化：优先使用缓存数据，避免重复调用云函数
      const modeCache = this.data.modeDataCache[type as keyof typeof this.data.modeDataCache];
      if (modeCache && modeCache.allPlans && modeCache.allPlans.length > 0) {
        console.log('使用缓存数据，避免重复调用云函数');
        // 直接使用缓存数据
        this.setData({
          heroCategories: modeCache.heroCategories,
          allBetaPlans: modeCache.allPlans,
          total: modeCache.total,
          betaPlans: modeCache.allPlans, // 显示全部方案
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
      await this.initModeHeroList(type);
      
      console.log('英雄分类初始化完成，开始加载数据');
      // 重新加载数据
      await this.loadBetaPlans();
      
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
  async loadBetaPlans(isLoadMore = false) {
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
        const cacheKey = `beta_plans_${this.data.currentMode}_${this.data.selectedHero}`;
        const cachedData = cacheManager.get<any>(cacheKey);
        
        if (cachedData && cachedData.plans && cachedData.plans.length > 0) {
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

      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: this.data.currentMode,
          heroId: this.data.selectedHero === 'all' ? null : this.data.selectedHero,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize,
          isBetaPlan: true // 只获取体验服方案
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
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
          betaPlans: isLoadMore ? [...this.data.betaPlans, ...formattedPlans] : formattedPlans,
          page: page,
          hasMore: hasMore,
          loading: false,
          loadingMore: false,
          isDataLoaded: true,
          lastLoadTime: Date.now()
        });

        // 如果不是加载更多，则缓存数据并更新当前模式的缓存数据
        if (!isLoadMore) {
          // 缓存当前筛选结果，延长TTL到10分钟
          const cacheKey = `beta_plans_${this.data.currentMode}_${this.data.selectedHero}`;
          const cacheData = {
            plans: formattedPlans,
            page: page,
            hasMore: hasMore,
            timestamp: Date.now(),
            mode: this.data.currentMode,
            heroId: this.data.selectedHero
          };
          cacheManager.set(cacheKey, cacheData, 10 * 60 * 1000); // 10分钟TTL
          
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
            const fullResult = await wx.cloud.callFunction({
              name: 'getRecommendPlans',
              data: {
                mode: this.data.currentMode,
                page: 1,
                pageSize: 100, // 获取更多数据以更新缓存
                isBetaPlan: true // 只获取体验服方案
              }
            }) as any;
            
            if (fullResult.result && fullResult.result.success) {
              const { plans: fullPlans } = fullResult.result.data;
              const heroCategories = await this.generateHeroCategoriesFromPlans(fullPlans);
              
              // 处理方案数据，添加英雄头像
              const processedFullPlans = await this.processPlansWithAvatars(fullPlans);
              
              // 格式化时间
              const formattedFullPlans = processedFullPlans.map((plan: any) => ({
                ...plan,
                createTime: this.formatTime(plan.createTime)
              }));
              
              // 更新缓存
              modeCache.heroCategories = heroCategories;
              modeCache.allPlans = formattedFullPlans;
              modeCache.total = fullPlans.length;
              
              // 更新当前显示数据
              this.setData({
                heroCategories: heroCategories,
                allBetaPlans: formattedFullPlans,
                total: fullPlans.length,
                [`modeDataCache.${this.data.currentMode}`]: modeCache
              });
              
              // 缓存英雄分类数据，延长TTL到30分钟
              const heroListCacheKey = `mode_hero_list_beta_${this.data.currentMode}`;
              cacheManager.set(heroListCacheKey, {
                heroCategories: heroCategories,
                allPlans: formattedFullPlans,
                total: fullPlans.length
              }, 30 * 60 * 1000); // 30分钟TTL
            }
          }
          
          // 数据加载完成后，不需要重新筛选，因为现在默认显示全部英雄
          // 只有在用户主动选择英雄时才需要筛选
          console.log('数据加载完成，当前显示全部方案，无需重新筛选');
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
      
      // 批量获取头像临时URL
      const avatarUrls = processedCategories
        .map(hero => hero.heroAvatar)
        .filter(avatar => avatar && avatar.startsWith('cloud://'));
      
      if (avatarUrls.length > 0) {
        const tempUrls = await getTempFileURLs(avatarUrls);
        
        // 更新头像URL
        let urlIndex = 0;
        processedCategories.forEach(heroCategory => {
          if (heroCategory.heroAvatar && heroCategory.heroAvatar.startsWith('cloud://')) {
            if (tempUrls[urlIndex] && tempUrls[urlIndex].indexOf('http') === 0) {
              heroCategory.heroAvatar = tempUrls[urlIndex];
            } else {
              // 临时URL获取失败，使用默认头像
              heroCategory.heroAvatar = '../images/unused/default-avatar.png';
            }
            urlIndex++;
          }
        });
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
    
    // 批量获取临时URL
    let tempUrls: string[] = [];
    if (avatarUrls.length > 0) {
      try {
        tempUrls = await getTempFileURLs(avatarUrls);
      } catch (error) {
        console.error('获取头像临时URL失败:', error);
        tempUrls = avatarUrls.map(() => '');
      }
    }
    
    // 创建URL映射
    const urlMap = new Map();
    avatarUrls.forEach((originalUrl, index) => {
      urlMap.set(originalUrl, tempUrls[index] || originalUrl);
    });
    
    // 处理方案数据
    return plans.map(plan => {
      const hero = getHeroById(plan.heroId);
      const originalAvatar = hero ? hero.avatar : '';
      const heroAvatar = urlMap.get(originalAvatar) || originalAvatar;
      
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
          planId: plan._id,
          action: isLiked ? 'add' : 'remove'
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
        
        wx.showToast({
          title: isLiked ? '点赞成功' : '取消点赞',
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
          planId: plan._id,
          action: isFavorited ? 'add' : 'remove'
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
      const cacheKey = `beta_plans_${this.data.currentMode}_${this.data.selectedHero}`;
      cacheManager.delete(cacheKey);
      console.log('下拉刷新，已清除体验服方案缓存:', cacheKey);
      
      this.setData({ page: 1 }); // 重置页码
      await this.loadBetaPlans();
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
    await this.loadBetaPlans(true);
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
  }
}); 