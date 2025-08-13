import { getFavoriteIcon, getLikeIcon, getEmptyIcon } from '../../utils/iconManager';
import { getHeroByName } from '../../data/localHeroData';
import { cacheManager } from '../../utils/cacheManager';

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
      // 获取英雄头像
      this.getHeroAvatarFromLocal(options.hero);
      this.loadPlans();
    }
  },

  // 从本地数据获取英雄头像
  getHeroAvatarFromLocal(heroName: string) {
    try {
      // 从本地数据获取英雄信息
      const hero = getHeroByName(heroName);
      
      if (hero && hero.avatar) {
        this.setData({
          heroAvatar: hero.avatar
        });
      } else {
        // 未找到英雄，使用默认头像
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
        this.getHeroAvatarFromLocal(plan.heroName);
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
      const result = await wx.cloud.callFunction({
        name: 'getHeroPlans',
        data: {
          heroId: this.data.heroId,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize,
          forceRefresh: !isLoadMore // 第一次加载时强制刷新，确保数据最新
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
  }
}); 