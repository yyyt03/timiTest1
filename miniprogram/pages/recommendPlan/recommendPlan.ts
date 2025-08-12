import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';
import { getAllHeroes, getHeroById, getHeroByName } from '../../data/localHeroData';
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
    currentMode: 'hot', // recommended: 推荐方案, hot: 热门方案, latest: 最新方案
    selectedHero: 'all',
    showHeroSelector: false,
    
    // 加载状态
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 英雄分类相关 - 为每个模式维护独立数据
    heroCategories: [] as any[], // 当前模式的英雄分类列表
    allRecommendPlans: [] as any[], // 当前模式的所有方案数据
    total: 0,
    
    // 推荐方案列表
    recommendPlans: [] as any[],
    
    // 为每个模式缓存数据，避免重复请求
    modeDataCache: {
      recommended: {
        heroCategories: [] as any[],
        allPlans: [] as any[],
        total: 0
      },
      hot: {
        heroCategories: [] as any[],
        allPlans: [] as any[],
        total: 0
      },
      latest: {
        heroCategories: [] as any[],
        allPlans: [] as any[],
        total: 0
      }
    }
  },
 
  // 生命周期函数--监听页面加载
  onLoad() {
    this.initModeHeroList('hot'); // 初始化热门模式的英雄分类
    this.loadRecommendPlans();
  },

  // 页面数据变化监听
  onDataChange() {
    // 页面数据变化监听
  },

  onShow() {
    // 返回页面时刷新，确保与体验服页面点赞/收藏状态同步
    this.loadRecommendPlans();
  },

  // 初始化英雄列表 - 基于已有方案
  async initHeroList() {
    try {
      // 获取所有推荐方案，从中提取英雄列表
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: 'hot',
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
      }
    } catch (error) {
      console.error('初始化英雄列表失败:', error);
    }
  },

  // 初始化指定模式的英雄分类
  async initModeHeroList(mode: string) {
    try {
      // 如果缓存中已有数据，直接使用
      if (this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache].heroCategories.length > 0) {
        const cachedData = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        this.setData({
          heroCategories: cachedData.heroCategories,
          allRecommendPlans: cachedData.allPlans,
          total: cachedData.total
        });
        return;
      }

      // 获取指定模式的所有方案数据
      const result = await wx.cloud.callFunction({
        name: 'getRecommendPlans',
        data: {
          mode: mode,
          page: 1,
          pageSize: 100 // 获取更多数据以提取英雄列表
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans } = result.result.data;
        
        // 生成英雄分类
        const heroCategories = await this.generateHeroCategoriesFromPlans(plans);
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
        // 格式化时间
        const formattedPlans = processedPlans.map((plan: any) => ({
          ...plan,
          createTime: this.formatTime(plan.createTime)
        }));
        
        // 更新缓存
        const modeCache = this.data.modeDataCache[mode as keyof typeof this.data.modeDataCache];
        modeCache.heroCategories = heroCategories;
        modeCache.allPlans = formattedPlans;
        modeCache.total = plans.length;
        
        // 更新当前显示数据
        this.setData({
          heroCategories: heroCategories,
          allRecommendPlans: formattedPlans,
          total: plans.length,
          [`modeDataCache.${this.data.currentMode}`]: modeCache
        });
        
        // 强制刷新页面数据，确保头像能正确显示
        setTimeout(() => {
          this.setData({
            heroCategories: heroCategories
          });
        }, 100);
      }
    } catch (error) {
      console.error(`初始化${mode}模式英雄列表失败:`, error);
    }
  },

  // 切换筛选类型
  async switchFilter(e: any) {
    try {
      const type = e.currentTarget.dataset.type;
      
      // 重置英雄选择为全部
      this.setData({
        currentMode: type,
        selectedHero: 'all',
        page: 1 // 重置页码
      });
      
      // 初始化对应模式的英雄分类
      await this.initModeHeroList(type);
      
      // 重新加载数据
      await this.loadRecommendPlans();
      
      // 强制重新计算布局，确保页面比例正确
      // 使用setTimeout确保DOM更新完成后再触发重新渲染
      setTimeout(() => {
        try {
          // 触发页面重新渲染，确保布局正确
          this.setData({
            _layoutUpdate: Date.now()
          });
          
          // 强制页面重新计算样式
          wx.createSelectorQuery()
            .select('.container')
            .boundingClientRect()
            .exec(() => {
              // 布局重新计算完成
            });
        } catch (layoutError) {
          console.warn('布局重新计算失败，但不影响主要功能:', layoutError);
        }
      }, 100);
    } catch (error) {
      console.error('切换筛选器失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
    }
  },

  // 切换显示模式
  async switchMode(e: any) {
    try {
      const mode = e.currentTarget.dataset.mode;
      this.setData({
        currentMode: mode,
        page: 1 // 重置页码
      });
      // 重新加载数据
      await this.loadRecommendPlans();
    } catch (error) {
      console.error('切换模式失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
    }
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
  async filterRecommendPlansByHero() {
    const { allRecommendPlans, selectedHero, currentMode } = this.data;
    
    if (selectedHero === 'all') {
      // 显示全部推荐方案，根据当前模式使用不同的排序逻辑
      let sortedPlans = [...allRecommendPlans];
      
      if (currentMode === 'hot') {
        // 热门方案按点赞收藏总和降序排序
        sortedPlans = this.sortPlansByLikeAndFavorite(sortedPlans);
      } else if (currentMode === 'latest') {
        // 最新方案按创建时间降序排序
        sortedPlans = this.sortPlansByCreateTime(sortedPlans);
      } else {
        // 推荐方案按推荐权重排序（如果有的话）
        sortedPlans = this.sortPlansByRecommendation(sortedPlans);
      }
      
      // 确保全部方案数据包含英雄头像
      const processedPlans = await this.processPlansWithAvatars(sortedPlans);
      
      // 格式化时间
      const formattedPlans = processedPlans.map((plan: any) => ({
        ...plan,
        createTime: this.formatTime(plan.createTime)
      }));
      
      this.setData({
        recommendPlans: formattedPlans,
        total: formattedPlans.length
      });
    } else {
      // 筛选指定英雄的推荐方案，根据当前模式使用不同的排序逻辑
      const filteredPlans = allRecommendPlans.filter(plan => plan.heroName === selectedHero);
      let sortedPlans = [...filteredPlans];
      
      if (currentMode === 'hot') {
        // 热门方案按点赞收藏总和降序排序
        sortedPlans = this.sortPlansByLikeAndFavorite(sortedPlans);
      } else if (currentMode === 'latest') {
        // 最新方案按创建时间降序排序
        sortedPlans = this.sortPlansByCreateTime(sortedPlans);
      } else {
        // 推荐方案按推荐权重排序（如果有的话）
        sortedPlans = this.sortPlansByRecommendation(sortedPlans);
      }
      
      // 确保筛选后的方案数据包含英雄头像
      const processedPlans = await this.processPlansWithAvatars(sortedPlans);
      
      // 格式化时间
      const formattedPlans = processedPlans.map((plan: any) => ({
        ...plan,
        createTime: this.formatTime(plan.createTime)
      }));
      
      this.setData({
        recommendPlans: formattedPlans,
        total: formattedPlans.length
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

  // 按创建时间降序排序方案
  sortPlansByCreateTime(plans: any[]) {
    return plans.sort((a, b) => {
      const dateA = this.parseDateString(b.createTime);
      const dateB = this.parseDateString(a.createTime);
      return dateA.getTime() - dateB.getTime();
    });
  },

  // 按推荐权重排序方案 (如果有)
  sortPlansByRecommendation(plans: any[]) {
    // 假设有一个推荐权重字段，例如 'recommendationWeight'
    // 如果没有，则不排序
    if (plans.length > 0 && plans[0].recommendationWeight) {
      return plans.sort((a, b) => (b.recommendationWeight as number) - (a.recommendationWeight as number));
    }
    return plans;
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

  // 生成英雄分类列表 (从方案数据中提取)
  async generateHeroCategoriesFromPlans(plans: any[]) {
    const heroMap = new Map();
    
    // 统计每个英雄的方案数量
    plans.forEach(plan => {
      const heroName = plan.heroName || '未知英雄';
      if (heroMap.has(heroName)) {
        const existing = heroMap.get(heroName);
        existing.count = existing.count + 1;
        // 如果当前方案有英雄头像，则使用它
        if (plan.heroAvatar && !existing.heroAvatar) {
          existing.heroAvatar = plan.heroAvatar;
        }
      } else {
        heroMap.set(heroName, {
          heroName,
          count: 1,
          heroAvatar: plan.heroAvatar || null
        });
      }
    });
    
    // 转换为数组格式
    const heroCategories = Array.from(heroMap.values());
    
    // 按方案数量排序
    heroCategories.sort((a, b) => b.count - a.count);
    
    // 为没有头像的英雄获取头像
    const heroCategoriesWithAvatars = await this.processHeroAvatars(heroCategories);
    
    return heroCategoriesWithAvatars;
  },

  // 处理英雄头像
  async processHeroAvatars(heroCategories: any[]) {
    try {
      // 为每个英雄分类添加头像信息
      const processedCategories = heroCategories.map(heroCategory => {
        const hero = getHeroByName(heroCategory.heroName);
        
        if (hero && hero.avatar) {
          return {
            ...heroCategory,
            heroAvatar: hero.avatar
          };
        } else {
          return {
            ...heroCategory,
            heroAvatar: '../images/unused/default-avatar.png'
          };
        }
      });
      
      // 批量获取头像临时URL
      const avatarUrls = processedCategories
        .map(hero => hero.heroAvatar)
        .filter(avatar => avatar && avatar.startsWith('cloud://'));
      
      if (avatarUrls.length > 0) {
        const tempUrls = await getTempFileURLs(avatarUrls);
        
        // 更新头像URL
        let urlIndex = 0;
        processedCategories.forEach(heroCategory => {
          if (heroCategory.heroAvatar && heroCategory.heroAvatar.startsWith('cloud://')) {
            if (tempUrls[urlIndex] && tempUrls[urlIndex].indexOf('http') === 0) {
              heroCategory.heroAvatar = tempUrls[urlIndex];
            } else {
              // 临时URL获取失败，使用默认头像
              heroCategory.heroAvatar = '../images/unused/default-avatar.png';
            }
            urlIndex++;
          }
        });
      }
      
      return processedCategories;
    } catch (error) {
      console.error('处理英雄头像失败:', error);
      // 如果处理失败，返回原始数据
      return heroCategories;
    }
  },

  // 头像加载失败处理
  onHeroAvatarError(e: any) {
    const heroName = e.currentTarget.dataset.heroName;
    
    // 找到对应的英雄分类，清除头像信息，这样会显示首字母
    const { heroCategories } = this.data;
    const updatedCategories = heroCategories.map(hero => {
      if (hero.heroName === heroName) {
        return {
          ...hero,
          heroAvatar: null
        };
      }
      return hero;
    });
    
    this.setData({
      heroCategories: updatedCategories
    });
  },


  // 查看方案详情
  viewPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
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
          likeCount: result.result.data.likeCount
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
          mode: this.data.currentMode,
          heroId: this.data.selectedHero === 'all' ? null : this.data.selectedHero,
          page: isLoadMore ? this.data.page + 1 : 1,
          pageSize: this.data.pageSize,
          includeBetaPlans: true // 包含体验服方案
        }
      }) as any;
      
      if (result.result && result.result.success) {
        const { plans, total, page, hasMore } = result.result.data;
        
        // 处理方案数据，添加英雄头像
        const processedPlans = await this.processPlansWithAvatars(plans);
        
        // 根据当前模式使用不同的排序逻辑
        let sortedPlans = processedPlans;
        if (this.data.currentMode === 'hot') {
          sortedPlans = this.sortPlansByLikeAndFavorite(processedPlans);
        } else if (this.data.currentMode === 'latest') {
          sortedPlans = this.sortPlansByCreateTime(processedPlans);
        } else {
          sortedPlans = this.sortPlansByRecommendation(processedPlans);
        }
        
        // 格式化时间
        const formattedPlans = sortedPlans.map((plan: any) => ({
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

        // 如果不是加载更多，则更新当前模式的缓存数据
        if (!isLoadMore) {
          // 获取当前模式的完整数据用于更新缓存
          const fullResult = await wx.cloud.callFunction({
            name: 'getRecommendPlans',
            data: {
              mode: this.data.currentMode,
              page: 1,
              pageSize: 100 // 获取更多数据以更新缓存
            }
          }) as any;
          
          if (fullResult.result && fullResult.result.success) {
            const { plans: fullPlans } = fullResult.result.data;
            const heroCategories = await this.generateHeroCategoriesFromPlans(fullPlans);
            
            // 处理方案数据，添加英雄头像
            const processedFullPlans = await this.processPlansWithAvatars(fullPlans);
            
            // 格式化时间
            const formattedFullPlans = processedFullPlans.map((plan: any) => ({
              ...plan,
              createTime: this.formatTime(plan.createTime)
            }));
            
            // 更新缓存
            const modeCache = this.data.modeDataCache[this.data.currentMode as keyof typeof this.data.modeDataCache];
            modeCache.heroCategories = heroCategories;
            modeCache.allPlans = formattedFullPlans;
            modeCache.total = fullPlans.length;
            
            // 更新当前显示数据
            this.setData({
              heroCategories: heroCategories,
              allRecommendPlans: formattedFullPlans,
              total: fullPlans.length,
              [`modeDataCache.${this.data.currentMode}`]: modeCache
            });
          }
        }
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
    
    let date: Date;
    
    // 处理不同类型的输入，确保 iOS 兼容性
    if (typeof timestamp === 'string') {
      // 处理 MongoDB 的日期格式
      if (timestamp.includes('$date')) {
        try {
          const dateObj = JSON.parse(timestamp);
          date = new Date(dateObj.$date);
        } catch (e) {
          // 如果解析失败，尝试标准化格式
          date = this.parseDateString(timestamp);
        }
      } else {
        // 标准化字符串格式，确保 iOS 兼容性
        date = this.parseDateString(timestamp);
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // 处理时间戳或其他类型
      date = new Date(timestamp);
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
    
    // 1. 处理 "2025-08-09 18:20" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T') + ':00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 2. 处理 "2025-08-09 18:20:30" 格式，转换为 ISO 格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T');
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 3. 处理 "2025/08/09 18:20" 格式，转换为 ISO 格式
    if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(cleanString)) {
      const isoString = cleanString.replace(' ', 'T').replace(/\//g, '-') + ':00';
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // 4. 处理 "2025/08/09 18:20:30" 格式，转换为 ISO 格式
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

  // 加载更多数据
  async loadMorePlans() {
    await this.loadRecommendPlans(true);
  },

  // 页面相关事件处理函数--监听用户下拉动作
  async onPullDownRefresh() {
    this.setData({ page: 1 }); // 重置页码
    await this.loadRecommendPlans();
    wx.stopPullDownRefresh();
  },

  // 页面上拉触底事件的处理函数
  async onReachBottom() {
    await this.loadMorePlans();
  },

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '攻略方案 - 推荐/热门/最新',
      path: '/pages/recommendPlan/recommendPlan',
      imageUrl: '/pages/images/share-recommend-plan.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '攻略方案 - 推荐/热门/最新',
      imageUrl: '/pages/images/share-recommend-plan.png'
    };
  }
});