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
    
    // 设置监听器
    this.setupFavoriteChangeListener();
    this.setupLikeChangeListener();
    this.setupInteractionChangeListener();
    
    // 初始化防抖版本的筛选器切换函数
    this.debouncedSwitchFilter = debounceOperation('betaSwitchFilter', this.switchFilter.bind(this), 500, {
      leading: false,
      trailing: true,
      maxWait: 2000
    });
    
    // 重置筛选状态
    this.resetFilterState();
    
    // 清理可能不完整的缓存数据
    this.clearIncompleteCache();
    
    // 初始化数据
    this.initModeHeroList('hot', this.data.currentRequestId);
  },

  // 生命周期函数--监听页面显示
  onShow() {
    console.log('体验服方案页面 onShow 触发');
    
    const now = Date.now();
    this.setData({
      'pageState.lastEnterTime': now
    });
    
    // 检查交互状态变化
    if (this.checkInteractionChanges()) {
      console.log('检测到交互状态变化，需要刷新数据');
      this.loadBetaPlans(false, this.data.currentRequestId);
      return;
    }
    
    // 检查数据是否需要刷新
    const timeSinceLastLoad = now - this.data.lastLoadTime;
    if (timeSinceLastLoad > 5 * 60 * 1000) { // 5分钟自动刷新
      console.log('数据过期，自动刷新');
      this.loadBetaPlans(false, this.data.currentRequestId);
    }
  },

  // 生命周期函数--监听页面隐藏
  onHide() {
    console.log('体验服方案页面 onHide 触发');
    this.clearDebounceTimers();
  },

  // 生命周期函数--监听页面卸载
  onUnload() {
    console.log('体验服方案页面 onUnload 触发');
    this.clearEventListeners();
    this.clearDebounceTimers();
  },

  // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh() {
    console.log('用户下拉刷新');
    const requestId = Date.now();
    this.setData({ currentRequestId: requestId });
    
    this.loadBetaPlans(false, requestId).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 页面上拉触底事件的处理函数
  onReachBottom() {
    console.log('触底加载更多');
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadBetaPlans(true, this.data.currentRequestId);
    }
  },

  // 加载体验服方案数据 - 使用新的 planService
  async loadBetaPlans(isLoadMore = false, requestId?: number) {
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
          allBetaPlans: filteredPlans,
          originalAllPlans: filteredPlans,
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
      this.setData({
        loading: false,
        loadingMore: false,
      });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 处理方案数据，添加英雄头像
  async processPlansWithAvatars(plans: any[]) {
    try {
      console.log('开始处理方案数据，添加英雄头像，方案数量:', plans.length);
      
      const processedPlans = await Promise.all(
        plans.map(async (plan: any) => {
          const hero = getHeroById(plan.heroId);
          let avatarUrl = '';
          
          if (hero && hero.avatar) {
            try {
              // 使用头像缓存管理器获取临时URL
              const tempUrls = await avatarCache.getAvatarUrls([hero.avatar]);
              avatarUrl = tempUrls[hero.avatar] || hero.avatar;
            } catch (error) {
              console.error('获取英雄头像临时URL失败:', error);
              avatarUrl = hero.avatar; // 回退到原始URL
            }
          }
          
          // 获取用户交互状态
          const favoritePlans = wx.getStorageSync('user_favorite_plans') || [];
          const likedPlans = wx.getStorageSync('user_liked_plans') || [];
          
          return {
            ...plan,
            heroName: hero ? hero.name : '未知英雄',
            heroAvatar: avatarUrl,
            isLiked: likedPlans.includes(plan._id),
            isFavorited: favoritePlans.includes(plan._id)
          };
        })
      );
      
      console.log('方案数据处理完成');
      return processedPlans;
    } catch (error) {
      console.error('处理方案数据时出错:', error);
      return plans;
    }
  },

  // 格式化时间
  formatTime(timestamp: any) {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (typeof timestamp === 'string') {
        // 如果是字符串，尝试解析
        date = this.parseDateString(timestamp);
      } else if (typeof timestamp === 'number') {
        // 如果是数字时间戳
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        // 如果已经是Date对象
        date = timestamp;
      } else {
        console.warn('未知的时间格式:', timestamp);
        return '';
      }
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('无效的日期:', timestamp);
        return '';
      }
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      // 1分钟内
      if (diff < 60 * 1000) {
        return '刚刚';
      }
      
      // 1小时内
      if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}分钟前`;
      }
      
      // 24小时内
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}小时前`;
      }
      
      // 7天内
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}天前`;
      }
      
      // 超过7天，显示具体日期
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
      
    } catch (error) {
      console.error('格式化时间出错:', error, '原始时间:', timestamp);
      return '';
    }
  },

  // 解析日期字符串
  parseDateString(dateString: string): Date {
    // 处理常见的日期格式
    if (dateString.includes('T') && dateString.includes('Z')) {
      // ISO 8601格式: "2024-01-15T10:30:00.000Z"
      return new Date(dateString);
    } else if (dateString.includes('/')) {
      // "YYYY/MM/DD HH:mm:ss" 格式
      return new Date(dateString);
    } else if (dateString.includes('-')) {
      // "YYYY-MM-DD HH:mm:ss" 格式
      if (dateString.length === 10) {
        // 只有日期部分 "YYYY-MM-DD"
        return new Date(dateString + 'T00:00:00');
      } else {
        // 包含时间部分
        return new Date(dateString.replace(' ', 'T'));
      }
    } else if (/^\d+$/.test(dateString)) {
      // 纯数字字符串，当作时间戳处理
      const timestamp = parseInt(dateString);
      // 判断是秒还是毫秒时间戳
      if (timestamp < 10000000000) {
        // 秒时间戳，转为毫秒
        return new Date(timestamp * 1000);
      } else {
        // 毫秒时间戳
        return new Date(timestamp);
      }
    } else {
      // 其他格式，尝试直接解析
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('无法解析的日期字符串:', dateString);
        // 返回当前时间作为fallback
        return new Date();
      }
      return date;
    }
  },

  // 查看方案详情
  viewPlan(e: any) {
    const planId = e.currentTarget.dataset.planId;
    const plan = this.data.betaPlans.find(p => p._id === planId);
    
    if (plan) {
      wx.navigateTo({
        url: `/pages/planDetail/planDetail?id=${planId}&source=betaPlan&heroId=${plan.heroId}`
      });
    }
  },

  // 切换模式
  switchMode(e: any) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.currentMode) return;
    
    console.log(`切换模式: ${this.data.currentMode} -> ${mode}`);
    
    this.setData({ 
      currentMode: mode,
      lastModeSwitchTime: Date.now(),
      selectedHero: 'all' // 切换模式时重置英雄筛选
    });
    
    // 重新加载数据
    this.loadBetaPlans(false, this.data.currentRequestId);
  },

  // 英雄筛选相关方法
  toggleHeroSelector() {
    this.setData({
      showHeroSelector: !this.data.showHeroSelector
    });
  },

  selectHero(e: any) {
    const heroId = e.currentTarget.dataset.heroId;
    console.log('选择英雄:', heroId);
    
    this.setData({
      selectedHero: heroId,
      showHeroSelector: false
    });
    
    // 重新筛选数据
    this.filterBetaPlansByHero();
  },

  // 根据英雄筛选方案
  filterBetaPlansByHero() {
    if (!this.data.allBetaPlans || this.data.allBetaPlans.length === 0) {
      console.log('没有可筛选的数据');
      return;
    }
    
    let filteredPlans = this.data.allBetaPlans;
    
    if (this.data.selectedHero !== 'all') {
      filteredPlans = this.data.allBetaPlans.filter(plan => plan.heroId === this.data.selectedHero);
    }
    
    console.log(`英雄筛选完成: ${filteredPlans.length}/${this.data.allBetaPlans.length}`);
    
    // 更新显示的数据
    const pageSize = this.data.pageSize;
    const paginatedPlans = filteredPlans.slice(0, pageSize);
    const hasMore = pageSize < filteredPlans.length;
    
    this.setData({
      betaPlans: paginatedPlans,
      page: 1,
      hasMore: hasMore,
      total: filteredPlans.length
    });
  },

  // 点赞操作
  async toggleLike(e: any) {
    const planId = e.currentTarget.dataset.planId;
    const plan = this.data.betaPlans.find(p => p._id === planId);
    
    if (!plan) return;
    
    const isCurrentlyLiked = plan.isLiked;
    
    try {
      // 乐观更新UI
      const updatedPlans = this.data.betaPlans.map(p => {
        if (p._id === planId) {
          return {
            ...p,
            isLiked: !isCurrentlyLiked,
            likeCount: isCurrentlyLiked ? (p.likeCount || 1) - 1 : (p.likeCount || 0) + 1
          };
        }
        return p;
      });
      
      this.setData({ betaPlans: updatedPlans });
      
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: { planId }
      });
      
      if (result.result.success) {
        // 更新本地存储
        const likedPlans = wx.getStorageSync('user_liked_plans') || [];
        if (isCurrentlyLiked) {
          const index = likedPlans.indexOf(planId);
          if (index > -1) likedPlans.splice(index, 1);
        } else {
          if (!likedPlans.includes(planId)) likedPlans.push(planId);
        }
        wx.setStorageSync('user_liked_plans', likedPlans);
        
        // 通知其他页面
        if (isCurrentlyLiked) {
          notifyLikeRemoved(planId);
        } else {
          notifyLikeAdded(planId);
        }
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      // 回滚UI状态
      const rollbackPlans = this.data.betaPlans.map(p => {
        if (p._id === planId) {
          return {
            ...p,
            isLiked: isCurrentlyLiked,
            likeCount: plan.likeCount
          };
        }
        return p;
      });
      this.setData({ betaPlans: rollbackPlans });
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 收藏操作
  async toggleFavorite(e: any) {
    const planId = e.currentTarget.dataset.planId;
    const plan = this.data.betaPlans.find(p => p._id === planId);
    
    if (!plan) return;
    
    const isCurrentlyFavorited = plan.isFavorited;
    
    try {
      // 乐观更新UI
      const updatedPlans = this.data.betaPlans.map(p => {
        if (p._id === planId) {
          return {
            ...p,
            isFavorited: !isCurrentlyFavorited,
            favoriteCount: isCurrentlyFavorited ? (p.favoriteCount || 1) - 1 : (p.favoriteCount || 0) + 1
          };
        }
        return p;
      });
      
      this.setData({ betaPlans: updatedPlans });
      
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { planId }
      });
      
      if (result.result.success) {
        // 更新本地存储
        const favoritePlans = wx.getStorageSync('user_favorite_plans') || [];
        if (isCurrentlyFavorited) {
          const index = favoritePlans.indexOf(planId);
          if (index > -1) favoritePlans.splice(index, 1);
        } else {
          if (!favoritePlans.includes(planId)) favoritePlans.push(planId);
        }
        wx.setStorageSync('user_favorite_plans', favoritePlans);
        
        // 通知其他页面
        if (isCurrentlyFavorited) {
          notifyFavoriteRemoved(planId);
        } else {
          notifyFavoriteAdded(planId);
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      // 回滚UI状态
      const rollbackPlans = this.data.betaPlans.map(p => {
        if (p._id === planId) {
          return {
            ...p,
            isFavorited: isCurrentlyFavorited,
            favoriteCount: plan.favoriteCount
          };
        }
        return p;
      });
      this.setData({ betaPlans: rollbackPlans });
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 辅助方法
  resetFilterState() {
    this.setData({
      selectedHero: 'all',
      showHeroSelector: false
    });
  },

  clearIncompleteCache() {
    // 清理可能不完整的缓存
    cacheManager.clear('betaPlan');
  },

  clearAllRelatedCache() {
    // 清理所有相关缓存
    cacheManager.clear('betaPlan');
    cacheManager.clear('recommendPlan');
  },

  clearDebounceTimers() {
    if (this.data.filterDebounceTimer) {
      clearTimeout(this.data.filterDebounceTimer);
      this.setData({ filterDebounceTimer: null });
    }
  },

  clearEventListeners() {
    // 清理事件监听器
    if (this.favoriteChangeHandler) {
      this.favoriteChangeHandler = null;
    }
    if (this.likeChangeHandler) {
      this.likeChangeHandler = null;
    }
    if (this.interactionChangeHandler) {
      this.interactionChangeHandler = null;
    }
  },

  checkInteractionChanges() {
    // 检查交互状态变化
    // 这里可以添加具体的检查逻辑
    return false;
  },

  setupFavoriteChangeListener() {
    // 设置收藏状态变化监听器
    this.favoriteChangeHandler = (planId: string, isFavorited: boolean) => {
      const updatedPlans = this.data.betaPlans.map(plan => {
        if (plan._id === planId) {
          return { ...plan, isFavorited };
        }
        return plan;
      });
      this.setData({ betaPlans: updatedPlans });
    };
  },

  setupLikeChangeListener() {
    // 设置点赞状态变化监听器
    this.likeChangeHandler = (planId: string, isLiked: boolean) => {
      const updatedPlans = this.data.betaPlans.map(plan => {
        if (plan._id === planId) {
          return { ...plan, isLiked };
        }
        return plan;
      });
      this.setData({ betaPlans: updatedPlans });
    };
  },

  setupInteractionChangeListener() {
    // 设置统一交互状态变化监听器
    this.interactionChangeHandler = () => {
      // 处理交互状态变化
    };
  },

  switchFilter(mode: string) {
    // 筛选器切换逻辑
    this.switchMode({ currentTarget: { dataset: { mode } } });
  },

  initModeHeroList(mode: string, requestId: number) {
    // 初始化模式英雄列表
    console.log(`初始化${mode}模式英雄列表`);
    this.loadBetaPlans(false, requestId);
  }
});
