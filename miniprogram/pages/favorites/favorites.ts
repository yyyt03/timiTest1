import { formatTime } from '../../utils/cloud'
import { getEmptyIcon, getLocalFallbackIcon } from '../../utils/iconManager'

// 收藏页面
Page({
  data: {
    favorites: [] as any[],
    allFavorites: [] as any[], // 存储所有收藏数据
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    total: 0,
    emptyIcon: getEmptyIcon('favorites'),
    // 英雄分类相关
    heroCategories: [] as any[], // 英雄分类列表
    selectedHero: 'all', // 当前选中的英雄，'all'表示全部
    showHeroSelector: false // 是否显示英雄选择器
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshFavorites();
  },

  // 图片加载错误处理
  onImageError() {
    this.setData({
      emptyIcon: getLocalFallbackIcon('favorites')
    });
  },

  // 加载收藏列表
  loadFavorites(refresh = false) {
    if (this.data.loading) return;
    
    const that = this;
    const page = refresh ? 1 : this.data.page;
    
    that.setData({
      loading: true
    });

    wx.cloud.callFunction({
      name: 'getUserFavorites',
      data: {
        page: page,
        pageSize: that.data.pageSize
      },
      success: (res: any) => {
        
        if (res.result.success) {
          const favorites = res.result.data.favorites;
          const total = res.result.data.total;
          const hasMore = res.result.data.hasMore;
          
          // 格式化时间并处理数据结构
          const formattedFavorites = favorites.map((fav: any) => {
            const newFav = Object.assign({}, fav);
            newFav.createTime = formatTime(fav.createTime);
            
            // 如果方案信息在plan对象中，将其展开到顶层
            if (fav.plan) {
              newFav.heroName = fav.plan.heroName;
              newFav.title = fav.plan.title;
              newFav.creatorName = fav.plan.creatorName;
              newFav.likeCount = fav.plan.likeCount;
              newFav.favoriteCount = fav.plan.favoriteCount;
              newFav.heroId = fav.plan.heroId;
              newFav.description = fav.plan.description;
              newFav.equipment = fav.plan.equipment;
              newFav.skillOne = fav.plan.skillOne;
              newFav.skillTwo = fav.plan.skillTwo;
              newFav.skillThree = fav.plan.skillThree;
              newFav.views = fav.plan.views;
              newFav.status = fav.plan.status;
            }
            
            return newFav;
          });
          
          if (refresh) {
            // 刷新模式，替换数据
            that.setData({
              favorites: formattedFavorites,
              allFavorites: formattedFavorites, // 保存所有数据
              page: 1,
              total: total,
              hasMore: hasMore
            });
            // 生成英雄分类
            that.generateHeroCategories();
          } else {
            // 加载更多模式，追加数据
            const newFavorites = that.data.favorites.concat(formattedFavorites);
            const newAllFavorites = that.data.allFavorites.concat(formattedFavorites);
            that.setData({
              favorites: newFavorites,
              allFavorites: newAllFavorites, // 保存所有数据
              page: page + 1,
              total: total,
              hasMore: hasMore
            });
            // 重新生成英雄分类
            that.generateHeroCategories();
          }
        } else {
          wx.showToast({
            title: res.result.message || '获取收藏失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取收藏列表失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        that.setData({
          loading: false
        });
        wx.stopPullDownRefresh();
      }
    });
  },

  // 刷新收藏列表
  refreshFavorites() {
    this.loadFavorites(true);
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadFavorites();
    }
  },

  // 取消收藏
  cancelFavorite(e: any) {
    const planId = e.currentTarget.dataset.planId;
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '确认取消收藏',
      content: '确定要取消收藏这个方案吗？',
      success: (res) => {
        if (res.confirm) {
          this.toggleFavorite(planId, index);
        }
      }
    });
  },

  // 切换收藏状态
  toggleFavorite(planId: string, index: number) {
    const that = this;
    
    wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: {
        planId: planId
      },
      success: (res: any) => {
        
        if (res.result.success) {
          // 从列表中移除该收藏
          const newFavorites = that.data.favorites.slice();
          newFavorites.splice(index, 1);
          
          that.setData({
            favorites: newFavorites,
            total: that.data.total - 1
          });
          
          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result.message || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('切换收藏状态失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 查看方案详情
  viewPlan(e: any) {
    const planId = e.currentTarget.dataset.planId;
    wx.navigateTo({
      url: '../planDetail/planDetail?id=' + planId
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshFavorites();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMore();
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
    this.setData({
      selectedHero: heroName,
      showHeroSelector: false
    });
    this.filterFavoritesByHero();
  },

  // 根据英雄筛选收藏
  filterFavoritesByHero() {
    const { allFavorites, selectedHero } = this.data;
    
    if (selectedHero === 'all') {
      // 显示全部收藏
      this.setData({
        favorites: allFavorites,
        total: allFavorites.length
      });
    } else {
      // 筛选指定英雄的收藏
      const filteredFavorites = allFavorites.filter(fav => fav.heroName === selectedHero);
      this.setData({
        favorites: filteredFavorites,
        total: filteredFavorites.length
      });
    }
  },

  // 生成英雄分类列表
  generateHeroCategories() {
    const { allFavorites } = this.data;
    const heroMap = new Map();
    
    // 统计每个英雄的收藏数量
    allFavorites.forEach(fav => {
      const heroName = fav.heroName || '未知英雄';
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
    
    // 按收藏数量排序
    heroCategories.sort((a, b) => (b.count as number) - (a.count as number));
    
    this.setData({
      heroCategories
    });
  },

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '我的收藏方案 - 觉醒天赋推荐',
      path: '/pages/favorites/favorites',
      imageUrl: '/pages/images/share-favorites.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '我的收藏方案 - 觉醒天赋推荐',
      imageUrl: '/pages/images/share-favorites.png'
    };
  }
}); 