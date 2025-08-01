import { getFavoriteIcon, getLikeIcon } from '../../utils/iconManager';

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
    likeFilledIcon: getLikeIcon(true)
  },

  onLoad(options: any) {
    if (options.hero) {
      this.setData({
        hero: options.hero,
        heroId: options.heroId || ''
      });
      wx.setNavigationBarTitle({
        title: options.hero + '的方案'
      });
      // 获取英雄头像
      this.getHeroAvatarFromCloud(options.hero);
    }
    this.loadPlans();
  },

  // 从云存储获取英雄头像
  async getHeroAvatarFromCloud(heroName: string) {
    try {
      // 调用云函数获取英雄列表
      const result = await wx.cloud.callFunction({
        name: 'getHeroList',
        data: {}
      }) as any;

      if (result.result && result.result.success && result.result.data) {
        // 查找对应英雄
        let targetHero = null;
        Object.values(result.result.data.categories).forEach((cat: any) => {
          cat.heroes.forEach((hero: any) => {
            if (hero.name === heroName) {
              targetHero = hero;
            }
          });
        });

        if (targetHero && (targetHero as any).avatar) {
          // 获取临时URL
          const tempURLs = await wx.cloud.getTempFileURL({
            fileList: [(targetHero as any).avatar]
          });

          if (tempURLs.fileList && tempURLs.fileList[0] && tempURLs.fileList[0].tempFileURL) {
            this.setData({
              heroAvatar: tempURLs.fileList[0].tempFileURL
            });
          } else {
            // 获取失败，使用默认头像
            this.setData({
              heroAvatar: '../images/unused/default-avatar.png'
            });
          }
        } else {
          // 未找到英雄，使用默认头像
          this.setData({
            heroAvatar: '../images/unused/default-avatar.png'
          });
        }
      } else {
        // 云函数调用失败，使用默认头像
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
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return days + '天前';
    } else {
      return date.toLocaleDateString();
    }
  },

  // 查看方案详情
  viewPlan(e: any) {
    var planId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '方案详情功能开发中',
      icon: 'none'
    });
    
    // TODO: 跳转到方案详情页面
    // wx.navigateTo({
    //   url: '../planDetail/planDetail?id=' + planId
    // })
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