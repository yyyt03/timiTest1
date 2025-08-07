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
    showHeroFilter: false,
    
    // 加载状态
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 英雄列表（用于筛选）
    heroList: [],
    
    // 当前选中的英雄信息
    selectedHeroInfo: {
      heroId: 'all',
      name: '全部英雄',
      avatar: ''
    },
    
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
        
        // 从方案中提取唯一的英雄ID
        const heroIds = Array.from(new Set(plans.map((plan: any) => plan.heroId)));
        
        // 从本地数据获取这些英雄的详细信息
        const heroList = heroIds.map((heroId: string) => {
          const hero = getHeroById(heroId);
          return hero ? {
            heroId: hero._id,
            name: hero.name,
            avatar: hero.avatar
          } : null;
        }).filter(hero => hero !== null);
        
        // 处理英雄头像URL
        const avatarUrls = heroList.map(hero => hero.avatar).filter(avatar => avatar);
        let tempUrls: string[] = [];
        if (avatarUrls.length > 0) {
          try {
            tempUrls = await getTempFileURLs(avatarUrls);
          } catch (error) {
            console.error('获取英雄头像临时URL失败:', error);
            tempUrls = avatarUrls.map(() => '');
          }
        }
        
        // 更新英雄列表的头像URL
        const processedHeroList = heroList.map((hero, index) => ({
          ...hero,
          avatar: tempUrls[index] || hero.avatar
        }));
        
        this.setData({
          heroList: processedHeroList
        });
        
        console.log('基于方案的英雄列表初始化完成，共', heroList.length, '个英雄');
      }
    } catch (error) {
      console.error('初始化英雄列表失败:', error);
      // 如果失败，使用默认的英雄列表
      const defaultHeroes = getAllHeroes().slice(0, 10); // 只取前10个
      const heroList = defaultHeroes.map(hero => ({
        heroId: hero._id,
        name: hero.name,
        avatar: hero.avatar
      }));
      
      // 处理默认英雄列表的头像URL
      const avatarUrls = heroList.map(hero => hero.avatar).filter(avatar => avatar);
      let tempUrls: string[] = [];
      if (avatarUrls.length > 0) {
        try {
          tempUrls = await getTempFileURLs(avatarUrls);
        } catch (error) {
          console.error('获取默认英雄头像临时URL失败:', error);
          tempUrls = avatarUrls.map(() => '');
        }
      }
      
      // 更新默认英雄列表的头像URL
      const processedHeroList = heroList.map((hero, index) => ({
        ...hero,
        avatar: tempUrls[index] || hero.avatar
      }));
      
      this.setData({
        heroList: processedHeroList
      });
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

  // 切换英雄筛选器显示状态
  toggleHeroFilter() {
    this.setData({
      showHeroFilter: !this.data.showHeroFilter
    });
  },

  // 按英雄筛选
  async filterByHero(e: any) {
    const hero = e.currentTarget.dataset.hero;
    let selectedHeroInfo;
    
    if (hero === 'all') {
      selectedHeroInfo = {
        heroId: 'all',
        name: '全部英雄',
        avatar: ''
      };
    } else {
      const heroItem = this.data.heroList.find(item => item.heroId === hero);
      if (heroItem) {
        selectedHeroInfo = {
          heroId: hero,
          name: heroItem.name,
          avatar: heroItem.avatar
        };
      } else {
        // 如果没找到，尝试从本地数据获取
        const localHero = getHeroById(hero);
        selectedHeroInfo = {
          heroId: hero,
          name: localHero ? localHero.name : '未知英雄',
          avatar: localHero ? localHero.avatar : ''
        };
      }
    }
    
    this.setData({
      selectedHero: hero,
      selectedHeroInfo: selectedHeroInfo,
      showHeroFilter: false,
      page: 1 // 重置页码
    });
    console.log('按英雄筛选:', hero, selectedHeroInfo);
    // 重新加载数据
    await this.loadRecommendPlans();
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
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: {
          planId: plan._id,
          action: isLiked ? 'add' : 'remove'
        }
      }) as any;
      
      if (result.result && result.result.success) {
        // 更新本地数据
        const updatedPlans = [...this.data.recommendPlans];
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isLiked: isLiked,
          likeCount: isLiked ? updatedPlans[planIndex].likeCount + 1 : updatedPlans[planIndex].likeCount - 1
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        wx.showToast({
          title: isLiked ? '点赞成功' : '取消点赞',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
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
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: {
          planId: plan._id,
          action: isFavorited ? 'add' : 'remove'
        }
      }) as any;
      
      if (result.result && result.result.success) {
        // 更新本地数据
        const updatedPlans = [...this.data.recommendPlans];
        updatedPlans[planIndex] = {
          ...updatedPlans[planIndex],
          isFavorited: isFavorited,
          favoriteCount: isFavorited ? updatedPlans[planIndex].favoriteCount + 1 : updatedPlans[planIndex].favoriteCount - 1
        };
        
        this.setData({
          recommendPlans: updatedPlans
        });
        
        wx.showToast({
          title: isFavorited ? '收藏成功' : '取消收藏',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
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