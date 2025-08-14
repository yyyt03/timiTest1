import { formatTime } from '../../utils/cloud'
import { getEmptyIcon, getLocalFallbackIcon } from '../../utils/iconManager'
import { getHeroByName } from '../../data/localHeroData'
import { avatarCache } from '../../utils/avatarCache'
import cacheManager from '../../utils/cacheManager'
import { favoriteSyncManager, FavoriteAction } from '../../utils/favoriteSync'
import type { FavoritesCacheData, FavoriteItem } from '../../typings/types/favorites'

// 收藏页面
Page({
  data: {
    favorites: [] as FavoriteItem[],
    allFavorites: [] as FavoriteItem[], // 存储所有收藏数据
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    total: 0,
    emptyIcon: getEmptyIcon('favorites'),
    // 英雄分类相关
    heroCategories: [] as any[], // 英雄分类列表
    selectedHero: 'all', // 当前选中的英雄，'all'表示全部
    showHeroSelector: false, // 是否显示英雄选择器
    // 缓存相关
    lastUpdateTime: 0, // 最后更新时间
    isDataStale: false // 数据是否过期
  },

  onLoad() {
    // 初始化缓存管理器
    cacheManager.init();
    this.loadFavorites();
    
    // 监听收藏状态变化事件
    this.setupFavoriteChangeListener();
  },

  onShow() {
    // 首先检查是否有收藏状态变化需要同步
    if (this.checkFavoriteChanges()) {
      // 如果有收藏变化，直接刷新，不检查缓存
      console.log('检测到收藏状态变化，直接刷新数据');
      this.refreshFavorites();
      return;
    }
    
    // 没有收藏变化时，检查缓存状态
    this.checkAndRefreshIfNeeded();
  },

  // 检查缓存状态并在必要时刷新
  checkAndRefreshIfNeeded() {
    const cacheKey = 'user_favorites';
    const cachedData = cacheManager.get<FavoritesCacheData>(cacheKey);
    
    if (cachedData && !this.isDataStale()) {
      // 缓存有效，使用缓存数据
      console.log('使用缓存的收藏数据');
      this.setData({
        favorites: cachedData.favorites || [],
        allFavorites: cachedData.allFavorites || [],
        total: cachedData.total || 0,
        lastUpdateTime: cachedData.timestamp || 0
      });
      this.generateHeroCategories();
      
      // 后台静默更新数据（如果缓存即将过期）
      if (this.shouldSilentUpdate(cachedData.timestamp || 0)) {
        this.silentUpdate();
      }
    } else {
      // 缓存无效或过期，需要刷新
      console.log('缓存无效，刷新收藏数据');
      this.refreshFavorites();
    }
  },

  // 检查数据是否过期（10分钟）
  isDataStale(): boolean {
    const staleThreshold = 10 * 60 * 1000; // 10分钟
    return Date.now() - this.data.lastUpdateTime > staleThreshold;
  },

  // 判断是否应该静默更新
  shouldSilentUpdate(lastUpdateTime: number): boolean {
    const silentUpdateThreshold = 8 * 60 * 1000; // 8分钟后开始静默更新
    return Date.now() - lastUpdateTime > silentUpdateThreshold;
  },

  // 静默更新数据
  silentUpdate() {
    console.log('开始静默更新收藏数据');
    this.loadFavoritesFromCloud(true, true); // 静默模式
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
    
    // 如果不是刷新模式，先尝试从缓存加载
    if (!refresh) {
      const cacheKey = 'user_favorites';
      const cachedData = cacheManager.get<FavoritesCacheData>(cacheKey);
      
      if (cachedData) {
        console.log('从缓存加载收藏数据');
        this.setData({
          favorites: cachedData.favorites || [],
          allFavorites: cachedData.allFavorites || [],
          total: cachedData.total || 0,
          lastUpdateTime: cachedData.timestamp || 0
        });
        this.generateHeroCategories();
        return;
      }
    }
    
    // 从云端加载数据
    this.loadFavoritesFromCloud(refresh, false);
  },

  // 从云端加载收藏数据
  loadFavoritesFromCloud(refresh = false, silent = false) {
    if (this.data.loading) return;
    
    const that = this;
    const page = refresh ? 1 : this.data.page;
    
    if (!silent) {
      that.setData({
        loading: true
      });
    }

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
              hasMore: hasMore,
              lastUpdateTime: Date.now()
            });
            
            // 更新缓存
            that.updateCache(formattedFavorites, total);
            
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
              hasMore: hasMore,
              lastUpdateTime: Date.now()
            });
            
            // 更新缓存
            that.updateCache(newAllFavorites, total);
            
            // 重新生成英雄分类
            that.generateHeroCategories();
          }
          
          if (silent) {
            console.log('静默更新完成');
          }
        } else {
          if (!silent) {
            wx.showToast({
              title: res.result.message || '获取收藏失败',
              icon: 'none'
            });
          }
        }
      },
      fail: (err) => {
        console.error('获取收藏列表失败:', err);
        if (!silent) {
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        }
      },
      complete: () => {
        if (!silent) {
          that.setData({
            loading: false
          });
          wx.stopPullDownRefresh();
        }
      }
    });
  },

  // 更新缓存
  updateCache(favorites: FavoriteItem[], total: number) {
    const cacheKey = 'user_favorites';
    const cacheData: FavoritesCacheData = {
      favorites,
      allFavorites: favorites,
      total,
      timestamp: Date.now()
    };
    
    // 缓存10分钟
    cacheManager.set(cacheKey, cacheData, 10 * 60 * 1000);
    console.log('收藏数据已缓存');
  },

  // 刷新收藏列表
  refreshFavorites() {
    this.loadFavoritesFromCloud(true, false);
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadFavoritesFromCloud(false, false);
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
          
          const newAllFavorites = that.data.allFavorites.slice();
          const allIndex = newAllFavorites.findIndex(fav => fav.planId === planId);
          if (allIndex !== -1) {
            newAllFavorites.splice(allIndex, 1);
          }
          
          that.setData({
            favorites: newFavorites,
            allFavorites: newAllFavorites,
            total: that.data.total - 1
          });
          
          // 更新缓存
          that.updateCache(newAllFavorites, that.data.total - 1);
          
          // 重新生成英雄分类
          that.generateHeroCategories();
          
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
        const existing = heroMap.get(heroName);
        existing.count += 1;
      } else {
        // 获取英雄信息，包括头像
        const heroInfo = getHeroByName(heroName);
        heroMap.set(heroName, {
          count: 1,
          heroName: heroName,
          heroAvatar: heroInfo ? heroInfo.avatar : null
        });
      }
    });
    
    // 转换为数组格式
    const heroCategories = Array.from(heroMap.values());
    
    // 按收藏数量排序
    heroCategories.sort((a, b) => b.count - a.count);
    
    // 处理英雄头像
    this.processHeroAvatars(heroCategories).then(processedCategories => {
      this.setData({
        heroCategories: processedCategories
      });
    });
    
    this.setData({
      heroCategories
    });
  },

  // 处理英雄头像
  async processHeroAvatars(heroCategories: any[]) {
    try {
      console.log('favorites: 开始处理英雄头像，英雄数量:', heroCategories.length);
      
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
          console.log(`favorites: 英雄 ${heroCategory.heroName} 未找到头像，使用默认头像`);
          return {
            ...heroCategory,
            heroAvatar: '/images/unused/default-avatar.png'
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
        console.log('favorites: 头像临时URL获取完成，处理数量:', avatarUrls.length);
        
        // 更新英雄头像URL
        processedCategories.forEach(heroCategory => {
          if (heroCategory.heroAvatar && avatarUrlMap[heroCategory.heroAvatar]) {
            heroCategory.heroAvatar = avatarUrlMap[heroCategory.heroAvatar];
          }
        });
      }
      
      return processedCategories;
    } catch (error) {
      console.error('favorites: 处理英雄头像失败:', error);
      return heroCategories;
    }
  },

  // 英雄头像加载错误处理
  onHeroAvatarError(e: any) {
    const heroName = e.currentTarget.dataset.heroName;
    const { heroCategories } = this.data;
    
    // 找到对应的英雄并清除头像
    const updatedHeroCategories = heroCategories.map(hero => {
      if (hero.heroName === heroName) {
        return { ...hero, heroAvatar: null };
      }
      return hero;
    });
    
    this.setData({
      heroCategories: updatedHeroCategories
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
  },

  // 设置收藏状态变化监听器
  setupFavoriteChangeListener() {
    // 监听收藏状态变化事件
    favoriteSyncManager.addListener((event) => {
      console.log('收到收藏状态变化事件', event);
      this.handleFavoriteChange(event);
    });
  },

  // 处理收藏状态变化
  handleFavoriteChange(event: any) {
    // 清除缓存，强制刷新数据
    cacheManager.delete('user_favorites');
    this.setData({
      lastUpdateTime: 0
    });
    
    // 如果页面当前可见，立即刷新
    if (this.data.favorites.length > 0) {
      console.log('收藏状态变化，立即刷新数据');
      this.refreshFavorites();
    }
  },

  // 检查收藏状态变化（兼容旧版本）
  checkFavoriteChanges(): boolean {
    // 检查全局收藏变化时间戳
    const lastGlobalChangeTime = wx.getStorageSync('last_global_favorite_change') || 0;
    const lastLocalUpdateTime = this.data.lastUpdateTime;
    
    // 如果全局有新的收藏变化，且比本地更新时间新，则需要刷新
    if (lastGlobalChangeTime > lastLocalUpdateTime) {
      console.log('检测到全局收藏状态变化，需要刷新数据');
      
      // 清除缓存，强制刷新
      cacheManager.delete('user_favorites');
      this.setData({
        lastUpdateTime: 0
      });
      
      return true; // 返回true表示有变化
    }
    
    // 兼容旧版本的收藏数量检查
    const lastFavoriteCount = wx.getStorageSync('last_favorite_count') || 0;
    const currentFavoriteCount = this.data.total;
    
    if (lastFavoriteCount !== currentFavoriteCount) {
      console.log('检测到收藏数量变化，需要刷新数据');
      wx.setStorageSync('last_favorite_count', currentFavoriteCount);
      
      if (this.data.lastUpdateTime > 0) {
        cacheManager.delete('user_favorites');
        this.setData({
          lastUpdateTime: 0
        });
      }
      
      return true;
    }
    
    return false;
  },

  // 页面卸载时清理
  onUnload() {
    // 保存当前收藏数量到本地存储
    wx.setStorageSync('last_favorite_count', this.data.total);
    
    // 移除收藏状态监听器
    favoriteSyncManager.removeListener(this.handleFavoriteChange.bind(this));
  }
}); 