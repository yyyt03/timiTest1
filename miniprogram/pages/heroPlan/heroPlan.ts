import { getFavoriteIcon, getLikeIcon, getEmptyIcon } from '../../utils/iconManager';
import { getHeroByName } from '../../data/localHeroData';
import cacheManager from '../../utils/cacheManager';
import { avatarCache } from '../../utils/avatarCache';
import { log } from '../../utils/logger';
import { notifyLikeAdded, notifyLikeRemoved, interactionSyncManager } from '../../utils/favoriteSync';
import { CACHE_KEYS, CacheKeyGenerator } from '../../utils/cacheKeys';

// 英雄方案页面
Page({
  data: {
    hero: '',
    heroId: '',
    heroAvatar: '',
    plans: [] as any[],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    loadingMore: false,
    // 图标路径
    favoriteOutlineIcon: getFavoriteIcon(false),
    favoriteFilledIcon: getFavoriteIcon(true),
    likeOutlineIcon: getLikeIcon(false),
    likeFilledIcon: getLikeIcon(true),
    emptyIcon: getEmptyIcon('favorites')
  },

  onLoad(options: any) {
    if (options.id) {
      // 如果传递的是方案ID，则获取方案详情
      this.loadPlanDetail(options.id);
    } else if (options.hero) {
      // 如果传递的是英雄信息，则加载该英雄的方案列表
      this.setData({
        hero: options.hero,
        heroId: options.heroId || ''
      });
      wx.setNavigationBarTitle({
        title: options.hero + '的方案'
      });
      
      // 直接加载方案数据，让loadPlans方法处理缓存逻辑
      // 获取英雄头像
      this.getHeroAvatarFromLocal(options.hero).catch((error: any) => {
        console.error('获取英雄头像失败:', error);
      });
      this.loadPlans();
    }
    
    // 设置点赞状态变化监听器
    this.setupLikeChangeListener();
  },

  // 点赞状态变化处理器
  likeChangeHandler: null as any,

  // 智能缓存检查和更新 - 简化逻辑，让loadPlans方法处理缓存
  async checkAndUpdateCache() {
    // 简化缓存检查逻辑，主要缓存逻辑在loadPlans方法中处理
    log('缓存检查：让loadPlans方法处理具体的缓存逻辑');
  },

  // 设置点赞状态变化监听器
  setupLikeChangeListener() {
    this.likeChangeHandler = (event: any) => {
      console.log('收到点赞状态变化事件', event);
      this.handleLikeChange(event);
    };
    
    interactionSyncManager.addLikeListener(this.likeChangeHandler);
  },

  // 处理点赞状态变化
  handleLikeChange(event: any) {
    const { planId, action } = event;
    const plans = [...this.data.plans];
    const planIndex = plans.findIndex(plan => plan._id === planId);
    
    if (planIndex !== -1) {
      if (action === 'add') {
        plans[planIndex].isLiked = true;
        plans[planIndex].likeCount = (plans[planIndex].likeCount || 0) + 1;
      } else if (action === 'remove') {
        plans[planIndex].isLiked = false;
        plans[planIndex].likeCount = Math.max(0, (plans[planIndex].likeCount || 0) - 1);
      }
      
      this.setData({ plans });
      console.log('点赞状态已同步更新');
    }
  },

  // 清除英雄相关的缓存
  clearHeroRelatedCache() {
    // 使用与recommendPlan页面相同的缓存键模式，确保缓存共享
    const patterns = [
      `timi:plan:data:herolist_hot`, // recommendPlan页面的主要缓存键，包含所有方案数据
      `timi:plan:data:herolist_latest`,
      `timi:plan:data:herolist_recommended`,
      CacheKeyGenerator.hero('url', 'avatar'),
      CacheKeyGenerator.hero('data', 'info')
    ];
    
    patterns.forEach(pattern => {
      const keys = cacheManager.getCacheKeys().filter((key: string) => key.includes(pattern));
      keys.forEach((key: string) => cacheManager.delete(key));
    });
    
    log('已清除英雄相关缓存:', patterns);
  },

  // 从本地数据获取英雄头像 - 使用头像缓存机制
  async getHeroAvatarFromLocal(heroName: string) {
    try {
      // 从本地数据获取英雄信息
      const hero = getHeroByName(heroName);
      
      if (hero && hero.avatar) {
        try {
          console.log('获取英雄头像:', hero.avatar);
          // 直接使用avatarCache获取头像URL，它会自动处理本地路径和云存储路径
          const avatarUrlMap = await avatarCache.getAvatarUrls([hero.avatar]);
          const avatarUrl = avatarUrlMap[hero.avatar];
          
          if (avatarUrl && avatarUrl.startsWith('http')) {
            console.log('英雄头像获取成功:', avatarUrl);
            this.setData({
              heroAvatar: avatarUrl
            });
          } else {
            console.warn('英雄头像获取失败，使用默认头像');
            this.setData({
              heroAvatar: '../images/unused/default-avatar.png'
            });
          }
        } catch (error) {
          console.error('获取英雄头像失败:', error);
          this.setData({
            heroAvatar: '../images/unused/default-avatar.png'
          });
        }
      } else {
        // 未找到英雄，使用默认头像
        console.log('未找到英雄信息，使用默认头像');
        this.setData({
          heroAvatar: '../images/unused/default-avatar.png'
        });
      }
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      // 出错时使用默认头像
      this.setData({
        heroAvatar: '../images/unused/default-avatar.png'
      });
    }
  },

  // 加载方案详情
  async loadPlanDetail(planId: string, forceRefresh: boolean = false) {
    this.setData({ loading: true });
    
    try {
      // 尝试从缓存获取方案详情（除非强制刷新）
      const cacheKey = CacheKeyGenerator.plan('detail', planId);
      let result: any;
      
      if (!forceRefresh) {
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
          console.log('使用缓存的方案详情数据');
          result = { result: { success: true, data: cachedData } };
        }
      }
      
      if (!result) {
        console.log('从云函数获取方案详情数据');
        result = await wx.cloud.callFunction({
          name: 'getPlanDetail',
          data: { planId }
        }) as any;
        
        // 缓存方案详情数据，英雄方案页面缓存时间设置为15分钟
        if (result.result && result.result.success) {
          cacheManager.set(cacheKey, result.result.data, 15 * 60 * 1000);
        }
      }
      
      if (result.result && result.result.success) {
        const plan = result.result.data;
        
        // 设置页面数据
        this.setData({
          hero: plan.heroName,
          heroId: plan.heroId,
          plans: [{
            ...plan,
            createTime: this.formatTime(plan.createTime)
          }],
          loading: false
        });
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: plan.title || plan.heroName + '的方案'
        });
        
        // 获取英雄头像
        this.getHeroAvatarFromLocal(plan.heroName).catch((error: any) => {
          console.error('获取英雄头像失败:', error);
        });
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '加载方案详情失败',
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

  // 加载方案数据 - 优先使用recommendPlan页面的缓存数据，模拟英雄筛选器
  async loadPlans(isLoadMore = false) {
    
    if (isLoadMore) {
      if (!this.data.hasMore || this.data.loadingMore) {
        return;
      }
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }

    try {
      // 如果不是加载更多，先尝试从统一缓存中获取数据
      let result: any;
      if (!isLoadMore) {
        // 优先使用统一的全局缓存，实现真正的缓存共享
        log('优先检查统一的全局缓存 ALL_PLANS_CACHE_KEY');
        const globalCacheData = cacheManager.get<any[]>(CACHE_KEYS.ALL_PLANS_CACHE_KEY);
        
        if (globalCacheData && globalCacheData.length > 0) {
          log('使用统一全局缓存数据，筛选英雄方案（统一缓存机制）');
          
          // 从统一缓存中筛选出当前英雄的方案
          const heroPlans = globalCacheData.filter((plan: any) => 
            plan.heroId === this.data.heroId || plan.heroName === this.data.hero
          );
          
          if (heroPlans.length > 0) {
            log(`从统一缓存中筛选出${this.data.hero}的方案，数量: ${heroPlans.length}（统一缓存机制）`);
            
            // 按点赞收藏总和降序排序，与hot模式保持一致
            const sortedPlans = this.sortPlansByLikeAndFavorite(heroPlans);
            
            // 格式化时间
            const formattedPlans = sortedPlans.map((plan: any) => ({
              ...plan,
              createTime: this.formatTime(plan.createTime)
            }));
            
            this.setData({
              plans: formattedPlans,
              page: 1,
              hasMore: false, // 缓存数据通常是一页完整的
              loading: false
            });
            
            log('成功使用统一全局缓存数据，避免调用云函数');
            return;
          } else {
            log(`统一缓存中未找到${this.data.hero}的方案，尝试recommendPlan页面缓存`);
          }
        } else {
          log('统一全局缓存不存在，尝试recommendPlan页面缓存');
        }
        
        // 如果统一缓存中没有找到，则尝试recommendPlan页面的旧缓存格式（向后兼容）
        log('检查recommendPlan页面的旧缓存格式');
        const recommendPlanCacheKey = `timi:plan:data:herolist_hot:v1`;
        const cachedData = cacheManager.get<{
          heroCategories: any[];
          allPlans: any[];  // 这里包含了hot模式下的所有方案数据
          total: number;
          mode: string;
          isRecommended: boolean;
          timestamp: number;
        }>(recommendPlanCacheKey);
        
        if (cachedData && cachedData.allPlans && cachedData.allPlans.length > 0) {
          log('使用recommendPlan页面的缓存数据，模拟英雄筛选器筛选英雄方案（实现缓存共享）');
          
          // 检查缓存是否仍然有效（30分钟）
          // 注意：这里需要处理时间戳可能是字符串的情况
          let cacheAge = 0;
          if (cachedData.timestamp) {
            const timestamp = typeof cachedData.timestamp === 'string' 
              ? new Date(cachedData.timestamp).getTime() 
              : cachedData.timestamp;
            cacheAge = Date.now() - timestamp;
          }
          
          log(`缓存时间检查：当前时间 ${new Date().toISOString()}，缓存时间 ${cachedData.timestamp}，时间差 ${cacheAge}ms`);
          
          if (cacheAge < 30 * 60 * 1000) { // 30分钟
            // 从缓存数据中筛选出当前英雄的方案，模拟recommendPlan页面的英雄筛选器
            const heroPlans = cachedData.allPlans.filter((plan: any) => 
              plan.heroId === this.data.heroId || plan.heroName === this.data.hero
            );
            
            if (heroPlans.length > 0) {
              log(`从缓存中筛选出${this.data.hero}的方案，数量: ${heroPlans.length}（模拟英雄筛选器）`);
              
              // 按点赞收藏总和降序排序，与hot模式保持一致
              const sortedPlans = this.sortPlansByLikeAndFavorite(heroPlans);
              
              // 格式化时间
              const formattedPlans = sortedPlans.map((plan: any) => ({
                ...plan,
                createTime: this.formatTime(plan.createTime)
              }));
              
              this.setData({
                plans: formattedPlans,
                page: 1,
                hasMore: false, // 缓存数据通常是一页完整的
                loading: false
              });
              
              log('成功使用recommendPlan页面缓存数据，模拟英雄筛选器，避免调用云函数');
              return;
            } else {
              log(`缓存中未找到${this.data.hero}的方案，需要调用云函数`);
            }
          } else {
            log(`recommendPlan页面缓存已过期，时间差: ${cacheAge}ms，超过30分钟限制，需要调用云函数`);
          }
        } else {
          log('recommendPlan页面缓存不存在或数据结构不完整，需要调用云函数');
          if (cachedData) {
            log('缓存数据结构:', {
              hasHeroCategories: !!cachedData.heroCategories,
              hasAllPlans: !!cachedData.allPlans,
              allPlansLength: cachedData.allPlans ? cachedData.allPlans.length : 0,
              timestamp: cachedData.timestamp,
              mode: cachedData.mode
            });
          }
        }
      }

      // 如果缓存中没有数据或已过期，调用云函数获取数据
      console.log('调用getRecommendPlans云函数获取英雄方案数据，英雄ID:', this.data.heroId);
      result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          heroId: this.data.heroId,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize,
          mode: 'hot', // 使用热门模式，按点赞收藏排序
          includeBetaPlans: true
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        
        // 按点赞收藏总和降序排序（云函数已经排序，这里确保一下）
        const sortedPlans = this.sortPlansByLikeAndFavorite(plans);
        
        // 格式化时间
        const formattedPlans = sortedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

        // 如果不是加载更多，缓存第一页数据
        if (!isLoadMore) {
          // 使用与recommendPlan页面相同的缓存键，实现缓存共享
          const cacheKey = `timi:plan:data:recommend_hot_${this.data.heroId}:v1`;
          const cacheData = {
            plans: sortedPlans,
            total,
            page,
            hasMore,
            timestamp: Date.now(),
            mode: 'hot',
            heroId: this.data.heroId
          };
          // 缓存30分钟
          cacheManager.set(cacheKey, cacheData, 30 * 60 * 1000);
          log('英雄方案列表数据已缓存（与recommendPlan共享），有效期30分钟');
        }

        this.setData({
          plans: isLoadMore ? [...this.data.plans, ...formattedPlans] : formattedPlans,
          page: page,
          hasMore: hasMore,
          loading: false,
          loadingMore: false
        });
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

  // 格式化时间 - 修复iOS兼容性问题
  formatTime(timeStr: any) {
    if (!timeStr) return '';
    
    let date: Date;
    
    // 处理不同类型的输入，确保 iOS 兼容性
    if (typeof timeStr === 'string') {
      // 处理 MongoDB 的日期格式
      if (timeStr.includes('$date')) {
        try {
          const dateObj = JSON.parse(timeStr);
          date = new Date(dateObj.$date);
        } catch (e) {
          // 如果解析失败，尝试标准化格式
          date = this.parseDateString(timeStr);
        }
      } else {
        // 标准化字符串格式，确保 iOS 兼容性
        date = this.parseDateString(timeStr);
      }
    } else if (timeStr instanceof Date) {
      date = timeStr;
    } else {
      // 处理时间戳或其他类型
      date = new Date(timeStr);
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
    
    // 1. 处理 "2025-08-09 16:34" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T') + ':00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 2. 处理 "2025-08-09 16:34:30" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T');
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 3. 处理 "2025/08/09 16:34" 格式，转换为 ISO 格式
    if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T').replace(/\//g, '-') + ':00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 4. 处理 "2025/08/09 16:34:30" 格式，转换为 ISO 格式
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
    var planId = e.currentTarget.dataset.id;
    const planIndex = e.currentTarget.dataset.index;
    const plan = this.data.plans[planIndex];
    
    // 传递收藏状态到详情页
    wx.navigateTo({
      url: `../planDetail/planDetail?id=${planId}&isFavorited=${plan.isFavorited || false}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    // 下拉刷新时清除缓存，强制获取最新数据
    this.invalidateHeroPlansCache();
    this.loadPlans().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadPlans(true);
    }
  },

  // 创建新方案
  createPlan() {
    wx.navigateTo({
      url: '../createPlan/createPlan?hero=' + this.data.hero + '&heroId=' + this.data.heroId
    });
  },

  // 切换点赞状态
  async toggleLike(e: any) {
    const planId = e.currentTarget.dataset.id;
    const planIndex = e.currentTarget.dataset.index;
    
    // 立即更新本地状态，提升响应速度
    const plans = [...this.data.plans];
    const currentLikeState = plans[planIndex].isLiked;
    const currentLikeCount = plans[planIndex].likeCount || 0;
    
    // 立即切换状态
    plans[planIndex].isLiked = !currentLikeState;
    plans[planIndex].likeCount = currentLikeState ? currentLikeCount - 1 : currentLikeCount + 1;
    
    this.setData({ plans });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: { planId }
      }) as any;

      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        plans[planIndex].isLiked = result.result.data.isLiked;
        plans[planIndex].likeCount = result.result.data.likeCount;
        this.setData({ plans });
        
        // 通知点赞状态变化，确保其他页面数据同步
        if (result.result.data.isLiked) {
          notifyLikeAdded(planId);
        } else {
          notifyLikeRemoved(planId);
        }
        
        // 点赞操作成功后，清除相关缓存以确保数据一致性
        this.invalidateHeroPlansCache();
        
        wx.showToast({
          title: result.result.message,
          icon: 'success'
        });
      } else {
        // 如果服务器操作失败，回滚本地状态
        plans[planIndex].isLiked = currentLikeState;
        plans[planIndex].likeCount = currentLikeCount;
        this.setData({ plans });
        
        wx.showToast({
          title: (result.result && result.result.message) || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('切换点赞失败:', error);
      // 网络错误时回滚本地状态
      plans[planIndex].isLiked = currentLikeState;
      plans[planIndex].likeCount = currentLikeCount;
      this.setData({ plans });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 切换收藏状态
  async toggleFavorite(e: any) {
    const planId = e.currentTarget.dataset.id;
    const planIndex = e.currentTarget.dataset.index;
    
    // 立即更新本地状态，提升响应速度
    const plans = [...this.data.plans];
    const currentFavoriteState = plans[planIndex].isFavorited;
    const currentFavoriteCount = plans[planIndex].favoriteCount || 0;
    
    // 立即切换状态
    plans[planIndex].isFavorited = !currentFavoriteState;
    plans[planIndex].favoriteCount = currentFavoriteState ? currentFavoriteCount - 1 : currentFavoriteCount + 1;
    
    this.setData({ plans });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { planId }
      }) as any;

      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        plans[planIndex].isFavorited = result.result.data.isFavorited;
        plans[planIndex].favoriteCount = result.result.data.favorites;
        this.setData({ plans });
        
        // 收藏操作成功后，清除相关缓存以确保数据一致性
        this.invalidateHeroPlansCache();
        
        wx.showToast({
          title: result.result.message,
          icon: 'success'
        });
      } else {
        // 如果服务器操作失败，回滚本地状态
        plans[planIndex].isFavorited = currentFavoriteState;
        plans[planIndex].favoriteCount = currentFavoriteCount;
        this.setData({ plans });
        
        wx.showToast({
          title: (result.result && result.result.message) || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('切换收藏失败:', error);
      // 网络错误时回滚本地状态
      plans[planIndex].isFavorited = currentFavoriteState;
      plans[planIndex].favoriteCount = currentFavoriteCount;
      this.setData({ plans });
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 页面分享给朋友
  onShareAppMessage() {
    const hero = this.data.hero || '英雄';
    return {
      title: `${hero}的攻略方案 - 觉醒天赋推荐`,
      path: `/pages/heroPlan/heroPlan?hero=${hero}`,
      imageUrl: '/pages/images/share-hero-plan.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    const hero = this.data.hero || '英雄';
    return {
      title: `${hero}的攻略方案 - 觉醒天赋推荐`,
      imageUrl: '/pages/images/share-hero-plan.png'
    };
  },

  // 清除英雄方案相关缓存
  invalidateHeroPlansCache() {
    // 使用与recommendPlan页面相同的缓存键，确保缓存共享
    // 优先清除recommendPlan页面的主要缓存
    const recommendPlanCacheKey = `timi:plan:data:herolist_hot:v1`;
    
    if (cacheManager.delete(recommendPlanCacheKey)) {
      log('已清除recommendPlan页面缓存（实现缓存共享）:', recommendPlanCacheKey);
    }
    
    // 同时清除特定英雄的缓存
    const heroSpecificCacheKey = `timi:plan:data:recommend_hot_${this.data.heroId}:v1`;
    if (cacheManager.delete(heroSpecificCacheKey)) {
      log('已清除英雄特定缓存:', heroSpecificCacheKey);
    }
  },

  // 页面卸载时清理监听器
  onUnload() {
    if (this.likeChangeHandler) {
      interactionSyncManager.removeLikeListener(this.likeChangeHandler);
      this.likeChangeHandler = null;
    }
  }
}); 