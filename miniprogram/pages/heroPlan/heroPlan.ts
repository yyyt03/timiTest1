import { getFavoriteIcon, getLikeIcon, getEmptyIcon } from '../../utils/iconManager';
import { getHeroByName } from '../../data/localHeroData';
import { cacheManager } from '../../utils/cacheManager';
import { avatarCache } from '../../utils/avatarCache';
import { log } from '../../utils/logger';

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
      
      // 智能缓存检查，只在必要时清除缓存
      this.checkAndUpdateCache().then(() => {
        // 获取英雄头像
        this.getHeroAvatarFromLocal(options.hero).catch((error: any) => {
          console.error('获取英雄头像失败:', error);
        });
        this.loadPlans();
      }).catch((error: any) => {
        log('缓存检查失败，直接获取数据:', error);
        // 获取英雄头像
        this.getHeroAvatarFromLocal(options.hero).catch((error: any) => {
          console.error('获取英雄头像失败:', error);
        });
        this.loadPlans();
      });
    }
  },

  // 智能缓存检查和更新
  async checkAndUpdateCache() {
    const cacheKey = `hero_plans_cache_${this.data.heroId || this.data.hero}`;
    const cacheInfo = cacheManager.getItemInfo(cacheKey);
    
    // 如果缓存不存在，清除相关缓存
    if (!cacheInfo) {
      log('英雄方案缓存不存在，清除相关缓存');
      this.clearHeroRelatedCache();
      return;
    }

    // 检查缓存是否过期（英雄方案列表缓存时间设置为30分钟）
    if (cacheInfo.expired) {
      log('英雄方案缓存已过期，清除相关缓存');
      this.clearHeroRelatedCache();
      return;
    }

    // 检查缓存年龄，如果超过25分钟则标记为即将过期
    if (cacheInfo.age > 25 * 60 * 1000) { // 25分钟
      log('英雄方案缓存即将过期，标记为需要更新');
      // 不立即清除，但标记为需要更新
    }

    log('英雄方案缓存有效，保留现有缓存');
  },

  // 清除英雄相关的缓存
  clearHeroRelatedCache() {
    const heroKey = this.data.heroId || this.data.hero;
    const patterns = [
      `hero_plans_cache_${heroKey}`,
      `hero_avatar_cache_${heroKey}`,
      `hero_info_cache_${heroKey}`
    ];
    
    patterns.forEach(pattern => {
      const keys = cacheManager.getKeys().filter(key => key.includes(pattern));
      keys.forEach(key => cacheManager.delete(key));
    });
    
    log('已清除英雄相关缓存:', patterns);
  },

  // 从本地数据获取英雄头像 - 使用头像缓存机制
  async getHeroAvatarFromLocal(heroName: string) {
    try {
      // 检查头像缓存
      const avatarCacheKey = `hero_avatar_cache_${heroName}`;
      const cachedAvatar = cacheManager.get<string>(avatarCacheKey);
      
      if (cachedAvatar) {
        log('使用缓存的英雄头像');
        this.setData({
          heroAvatar: cachedAvatar
        });
        return;
      }

      // 从本地数据获取英雄信息
      const hero = getHeroByName(heroName);
      
      if (hero && hero.avatar) {
        let avatarUrl = hero.avatar;
        
        // 如果是云存储路径，使用头像缓存获取临时URL
        if (avatarUrl && avatarUrl.startsWith('cloud://')) {
          try {
            console.log('获取英雄头像临时URL:', avatarUrl);
            const avatarUrlMap = await avatarCache.getAvatarUrls([avatarUrl]);
            const tempUrl = avatarUrlMap[avatarUrl];
            
            if (tempUrl && tempUrl.startsWith('http')) {
              avatarUrl = tempUrl;
              console.log('英雄头像临时URL获取成功');
            } else {
              console.warn('英雄头像临时URL获取失败，使用默认头像');
              avatarUrl = '../images/unused/default-avatar.png';
            }
          } catch (error) {
            console.error('获取英雄头像临时URL失败:', error);
            avatarUrl = '../images/unused/default-avatar.png';
          }
        }
        
        // 缓存头像URL（2小时）
        cacheManager.set(avatarCacheKey, avatarUrl, 2 * 60 * 60 * 1000);
        
        this.setData({
          heroAvatar: avatarUrl
        });
      } else {
        // 未找到英雄，使用默认头像
        const defaultAvatar = '../images/unused/default-avatar.png';
        cacheManager.set(avatarCacheKey, defaultAvatar, 2 * 60 * 60 * 1000);
        this.setData({
          heroAvatar: defaultAvatar
        });
      }
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      // 出错时使用默认头像
      const defaultAvatar = '../images/unused/default-avatar.png';
      const avatarCacheKey = `hero_avatar_cache_${heroName}`;
      cacheManager.set(avatarCacheKey, defaultAvatar, 2 * 60 * 60 * 1000);
      this.setData({
        heroAvatar: defaultAvatar
      });
    }
  },

  // 加载方案详情
  async loadPlanDetail(planId: string, forceRefresh: boolean = false) {
    this.setData({ loading: true });
    
    try {
      // 尝试从缓存获取方案详情（除非强制刷新）
      const cacheKey = `hero_plan_detail_${planId}`;
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

  // 加载方案数据
  async loadPlans(isLoadMore = false) {
    const that = this;
    
    if (isLoadMore) {
      if (!this.data.hasMore || this.data.loadingMore) {
        return;
      }
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }

    try {
      // 如果不是加载更多，尝试从缓存获取数据
      let result: any;
      if (!isLoadMore) {
        const cacheKey = `hero_plans_cache_${this.data.heroId || this.data.hero}`;
        const cachedData = cacheManager.get<{
          plans: any[];
          total: number;
          page: number;
          hasMore: boolean;
          timestamp: number;
        }>(cacheKey);
        
        if (cachedData) {
          log('使用缓存的英雄方案列表数据');
          // 检查缓存是否仍然有效（30分钟）
          const cacheAge = Date.now() - cachedData.timestamp;
          if (cacheAge < 30 * 60 * 1000) { // 30分钟
            const formattedPlans = cachedData.plans.map((plan: any) => ({
              ...plan,
              createTime: this.formatTime(plan.createTime)
            }));
            
            this.setData({
              plans: formattedPlans,
              page: cachedData.page,
              hasMore: cachedData.hasMore,
              loading: false
            });
            return;
          } else {
            log('缓存已过期，从云函数获取数据');
          }
        }
      }

      // 从云函数获取数据
      result = await wx.cloud.callFunction({
        name: 'getHeroPlans',
        data: {
          heroId: this.data.heroId,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize,
          forceRefresh: false // 移除强制刷新，让缓存机制发挥作用
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        
        // 按点赞收藏总和降序排序
        const sortedPlans = this.sortPlansByLikeAndFavorite(plans);
        
        // 格式化时间
        const formattedPlans = sortedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

        // 如果不是加载更多，缓存第一页数据
        if (!isLoadMore) {
          const cacheKey = `hero_plans_cache_${this.data.heroId || this.data.hero}`;
          const cacheData = {
            plans: sortedPlans,
            total,
            page,
            hasMore,
            timestamp: Date.now()
          };
          // 缓存30分钟
          cacheManager.set(cacheKey, cacheData, 30 * 60 * 1000);
          log('英雄方案列表数据已缓存，有效期30分钟');
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

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr);
    
    // 标准格式：年月日+小时分钟
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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
        plans[planIndex].likeCount = result.result.data.likes;
        this.setData({ plans });
        
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
    const heroKey = this.data.heroId || this.data.hero;
    const cacheKey = `hero_plans_cache_${heroKey}`;
    
    if (cacheManager.delete(cacheKey)) {
      log('已清除英雄方案列表缓存:', cacheKey);
    }
  }
}); 