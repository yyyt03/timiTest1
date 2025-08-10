// 体验服方案页面
import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById } from '../../data/localHeroData';
import { getTempFileURLs } from '../../utils/cloud';

Page({
  data: {
    currentFilter: 'featured', // 当前筛选类型：featured-精选，latest-最新
    selectedHero: 'all', // 选中的英雄
    showHeroSelector: false, // 是否显示英雄选择器
    heroCategories: [] as any[], // 英雄分类数据
    betaPlans: [] as any[], // 体验服方案列表
    allBetaPlans: [] as any[], // 所有体验服方案（用于统计）
    loading: true,
    loadingMore: false,
    hasMore: true,
    total: 0,
    
    // 图标路径
    likeFilledIcon: getLikeIcon(true),
    likeOutlineIcon: getLikeIcon(false),
    favoriteFilledIcon: getFavoriteIcon(true),
    favoriteOutlineIcon: getFavoriteIcon(false),
    emptyIcon: getEmptyIcon('favorites')
  },

  onLoad() {
    this.loadBetaPlans();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadBetaPlans();
  },

  // 从推荐页返回也能同步：依赖 onShow 刷新

  // 切换筛选类型
  switchFilter(e: any) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentFilter: type
    });
    this.loadBetaPlans();
  },

  // 切换英雄选择器显示状态
  toggleHeroSelector() {
    this.setData({
      showHeroSelector: !this.data.showHeroSelector
    });
  },

  // 选择英雄
  selectHero(e: any) {
    const hero = e.currentTarget.dataset.hero;
    this.setData({
      selectedHero: hero,
      showHeroSelector: false
    });
    this.loadBetaPlans();
  },

  // 加载体验服方案
  async loadBetaPlans() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          filter: this.data.currentFilter,
          hero: this.data.selectedHero,
          isBetaPlan: true // 只获取体验服方案
        }
      }) as any;

      console.log('体验服方案加载结果:', result);

      if (result.result && result.result.success) {
        // 获取方案数据，云函数返回格式为 {plans: [...], total: ..., ...}
        let plans = result.result.data?.plans || [];
        
        // 确保plans是数组
        if (!Array.isArray(plans)) {
          console.warn('无法获取有效的方案数据，使用空数组');
          plans = [];
        }
        
        // 处理方案数据，添加英雄头像（保留云端返回的 isLiked/isFavorited）
        const processedPlans = await this.processPlansWithAvatars(plans);

        // 如果是精选方案，按点赞收藏总和降序排序
        let sortedPlans = processedPlans;
        if (this.data.currentFilter === 'featured') {
          sortedPlans = this.sortPlansByLikeAndFavorite(processedPlans);
        }

        // 统计英雄分类
        const heroCategories = this.calculateHeroCategories(sortedPlans);

        this.setData({
          betaPlans: sortedPlans,
          allBetaPlans: sortedPlans,
          heroCategories,
          total: sortedPlans.length,
          loading: false,
          hasMore: sortedPlans.length >= 20 // 假设每页20条
        });
      } else {
        console.error('加载体验服方案失败:', result.result);
        this.setData({
          betaPlans: [],
          allBetaPlans: [],
          heroCategories: [],
          total: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('加载体验服方案出错:', error);
      this.setData({
        betaPlans: [],
        allBetaPlans: [],
        heroCategories: [],
        total: 0,
        loading: false
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
    
    const date = new Date(timestamp);
    
    // 标准格式：年月日+小时分钟
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 计算英雄分类统计
  calculateHeroCategories(plans: any[]) {
    const heroMap = new Map();
    
    plans.forEach(plan => {
      const heroName = plan.heroName;
      if (heroMap.has(heroName)) {
        heroMap.set(heroName, heroMap.get(heroName) + 1);
      } else {
        heroMap.set(heroName, 1);
      }
    });

    return Array.from(heroMap.entries()).map(([heroName, count]) => ({
      heroName,
      count
    }));
  },

  // 查看方案详情
  viewPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.navigateTo({
      url: `/pages/planDetail/planDetail?planId=${plan._id}`
    });
  },

  // 点赞/取消点赞
  async toggleLike(e: any) {
    const plan = e.currentTarget.dataset.plan;
    const index = e.currentTarget.dataset.index;

    // 立即更新本地状态，提升响应速度
    const betaPlans = [...this.data.betaPlans];
    const currentLikeState = betaPlans[index].isLiked;
    const currentLikeCount = betaPlans[index].likeCount || 0;
    
    // 立即切换状态
    betaPlans[index].isLiked = !currentLikeState;
    betaPlans[index].likeCount = currentLikeState ? currentLikeCount - 1 : currentLikeCount + 1;
    
    this.setData({
      betaPlans
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: {
          planId: plan._id
        }
      }) as any;

      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        betaPlans[index].isLiked = result.result.data.isLiked;
        betaPlans[index].likeCount = result.result.data.likeCount;

        this.setData({
          betaPlans
        });

        wx.showToast({
          title: betaPlans[index].isLiked ? '点赞成功' : '取消点赞',
          icon: 'success'
        });
      } else {
        // 如果服务器操作失败，回滚本地状态
        betaPlans[index].isLiked = currentLikeState;
        betaPlans[index].likeCount = currentLikeCount;
        this.setData({
          betaPlans
        });
        
        wx.showToast({
          title: '操作失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      // 网络错误时回滚本地状态
      betaPlans[index].isLiked = currentLikeState;
      betaPlans[index].likeCount = currentLikeCount;
      this.setData({
        betaPlans
      });
      
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
    }
  },

  // 收藏/取消收藏
  async toggleFavorite(e: any) {
    const plan = e.currentTarget.dataset.plan;
    const index = e.currentTarget.dataset.index;

    // 立即更新本地状态，提升响应速度
    const betaPlans = [...this.data.betaPlans];
    const currentFavoriteState = betaPlans[index].isFavorited;
    const currentFavoriteCount = betaPlans[index].favoriteCount || 0;
    
    // 立即切换状态
    betaPlans[index].isFavorited = !currentFavoriteState;
    betaPlans[index].favoriteCount = currentFavoriteState ? currentFavoriteCount - 1 : currentFavoriteCount + 1;
    
    this.setData({
      betaPlans
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: {
          planId: plan._id
        }
      }) as any;

      if (result.result && result.result.success) {
        // 使用服务器返回的准确数据更新
        betaPlans[index].isFavorited = result.result.data.isFavorited;
        betaPlans[index].favoriteCount = result.result.data.favorites;

        this.setData({
          betaPlans
        });

        wx.showToast({
          title: betaPlans[index].isFavorited ? '收藏成功' : '取消收藏',
          icon: 'success'
        });
      } else {
        // 如果服务器操作失败，回滚本地状态
        betaPlans[index].isFavorited = currentFavoriteState;
        betaPlans[index].favoriteCount = currentFavoriteCount;
        this.setData({
          betaPlans
        });
        
        wx.showToast({
          title: '操作失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      // 网络错误时回滚本地状态
      betaPlans[index].isFavorited = currentFavoriteState;
      betaPlans[index].favoriteCount = currentFavoriteCount;
      this.setData({
        betaPlans
      });
      
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadBetaPlans().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
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
      title: '体验服攻略方案 - 觉醒天赋推荐',
      path: '/pages/betaPlan/betaPlan',
      imageUrl: '/pages/images/share-beta-plan.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '体验服攻略方案 - 觉醒天赋推荐',
      imageUrl: '/pages/images/share-beta-plan.png'
    };
  }
}); 