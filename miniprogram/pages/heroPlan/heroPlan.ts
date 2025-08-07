import { getFavoriteIcon, getLikeIcon, getEmptyIcon } from '../../utils/iconManager';
import { getHeroByName } from '../../data/localHeroData';

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
  async loadPlanDetail(planId: string) {
    this.setData({ loading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlanDetail',
        data: { planId }
      }) as any;
      
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
        
        // 格式化时间
        const formattedPlans = plans.map((plan: any) => ({
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

  // 格式化时间
  formatTime(timeStr: string) {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (days === 0) {
      if (hours === 0) {
        if (minutes === 0) {
          return '刚刚';
        } else {
          return minutes + '分钟前';
        }
      } else {
        return hours + '小时前';
      }
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return days + '天前';
    } else {
      return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
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
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: { planId }
      }) as any;

      if (result.result && result.result.success) {
        const plans = [...this.data.plans];
        plans[planIndex].isLiked = result.result.data.isLiked;
        // 使用云函数返回的具体数量
        plans[planIndex].likeCount = result.result.data.likes;
        
        this.setData({ plans });
        
        wx.showToast({
          title: result.result.message,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('切换点赞失败:', error);
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
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { planId }
      }) as any;

      if (result.result && result.result.success) {
        const plans = [...this.data.plans];
        plans[planIndex].isFavorited = result.result.data.isFavorited;
        // 使用云函数返回的具体数量
        plans[planIndex].favoriteCount = result.result.data.favorites;
        
        this.setData({ plans });
        
        wx.showToast({
          title: result.result.message,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('切换收藏失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  }
}); 