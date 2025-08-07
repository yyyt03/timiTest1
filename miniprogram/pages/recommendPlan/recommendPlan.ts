import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById } from '../../data/localHeroData';
import { getTempFileURLs } from '../../utils/cloud';

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
    currentFilter: 'featured', // featured, latest
    selectedHero: 'all',
    showHeroSelector: false,
    
    // 加载状态
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 英雄分类相关
    heroCategories: [] as any[], // 英雄分类列表
    allRecommendPlans: [] as any[], // 存储所有推荐方案数据
    total: 0,
    
    // 推荐方案列表
    recommendPlans: []
  },
 
  // 生命周期函数--监听页面加载
  onLoad() {
    console.log('推荐方案页面加载');
    this.initHeroList();
    this.loadRecommendPlans();
  },

  // 初始化英雄列表 - 基于已有方案
  async initHeroList() {
    try {
      // 获取所有推荐方案，从中提取英雄列表
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          filter: 'featured',
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
        
        console.log('基于方案的英雄分类初始化完成');
      }
    } catch (error) {
      console.error('初始化英雄列表失败:', error);
    }
  },

  // 切换筛选类型
  async switchFilter(e: any) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentFilter: type,
      page: 1 // 重置页码
    });
    console.log('切换筛选类型:', type);
    // 重新加载数据
    await this.loadRecommendPlans();
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
    this.filterRecommendPlansByHero();
  },

  // 根据英雄筛选推荐方案
  filterRecommendPlansByHero() {
    const { allRecommendPlans, selectedHero } = this.data;
    
    if (selectedHero === 'all') {
      // 显示全部推荐方案
      this.setData({
        recommendPlans: allRecommendPlans,
        total: allRecommendPlans.length
      });
    } else {
      // 筛选指定英雄的推荐方案
      const filteredPlans = allRecommendPlans.filter(plan => plan.heroName === selectedHero);
      this.setData({
        recommendPlans: filteredPlans,
        total: filteredPlans.length
      });
    }
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



  // 查看方案详情
  viewPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    console.log('查看方案:', plan);
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
          planId: plan._id,
          action: isLiked ? 'add' : 'remove'
        }
      }) as any;
      
      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isLiked: result.result.data.isLiked,
          likeCount: result.result.data.likes
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        wx.showToast({
          title: isLiked ? '点赞成功' : '取消点赞',
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
          planId: plan._id,
          action: isFavorited ? 'add' : 'remove'
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
  async loadRecommendPlans(isLoadMore = false) {
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
        name: 'getRecommendPlans',
        data: {
          filter: this.data.currentFilter,
          heroId: this.data.selectedHero === 'all' ? null : this.data.selectedHero,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
        // 格式化时间
        const formattedPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));

        this.setData({
          recommendPlans: isLoadMore ? [...this.data.recommendPlans, ...formattedPlans] : formattedPlans,
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
        heroAvatar: heroAvatar
      };
    });
  },

  // 格式化时间
  formatTime(timestamp: any) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  },

  // 加载更多数据
  async loadMorePlans() {
    await this.loadRecommendPlans(true);
  },

  // 页面相关事件处理函数--监听用户下拉动作
  async onPullDownRefresh() {
    console.log('下拉刷新');
    this.setData({ page: 1 }); // 重置页码
    await this.loadRecommendPlans();
    wx.stopPullDownRefresh();
  },

  // 页面上拉触底事件的处理函数
  async onReachBottom() {
    console.log('上拉加载更多');
    await this.loadMorePlans();
  }
});