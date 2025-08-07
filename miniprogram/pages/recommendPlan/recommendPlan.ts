import { getRecommendPlanIcon, getLikeIcon, getFavoriteIcon, getEmptyIcon } from '../../utils/iconManager';

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
    
    // 精选推荐方案（轮播）
    featuredPlans: [
      {
        _id: 'plan_001',
        heroId: 'mingshiyin',
        heroName: '飞天流小明',
        heroAvatar: '/images_backup/heroes/mingshiyin.jpg',
        title: '飞天流小明 - 主二副三流',
        description: '主二副三,12级的时候能完全体,前期很牢,后期很强。',
        likeCount: 128,
        favoriteCount: 56,
        views: 2340,
        creatorName: '诸神',
        authorAvatar: '/images/头像.png'
      },
      {
        _id: 'plan_002',
        heroId: 'zhugeliang',
        heroName: '诸葛亮',
        heroAvatar: '/images_backup/heroes/zhugeliang.jpg',
        title: '诸葛亮 - 法师核心流',
        description: '以法师为核心的打法，注重技能连招和团战输出。',
        likeCount: 89,
        favoriteCount: 34,
        views: 1567,
        creatorName: '策略大师',
        authorAvatar: '/images/头像.png'
      },
      {
        _id: 'plan_003',
        heroId: 'caocao',
        heroName: '曹操',
        heroAvatar: '/images_backup/heroes/caocao.jpg',
        title: '曹操 - 战士坦克流',
        description: '战士坦克双修，既有输出又有生存能力。',
        likeCount: 67,
        favoriteCount: 23,
        views: 892,
        creatorName: '王者归来',
        authorAvatar: '/images/头像.png'
      }
    ],
    
    // 英雄列表（用于筛选）
    heroList: [
      { heroId: 'mingshiyin', name: '明世隐', avatar: '/images_backup/heroes/mingshiyin.jpg' },
      { heroId: 'zhugeliang', name: '诸葛亮', avatar: '/images_backup/heroes/zhugeliang.jpg' },
      { heroId: 'caocao', name: '曹操', avatar: '/images_backup/heroes/caocao.jpg' },
      { heroId: 'liubei', name: '刘备', avatar: '/images_backup/heroes/liubei.jpg' },
      { heroId: 'guanyu', name: '关羽', avatar: '/images_backup/heroes/guanyu.jpg' },
      { heroId: 'zhangfei', name: '张飞', avatar: '/images_backup/heroes/zhangfei.jpg' }
    ],
    
    // 当前选中的英雄信息
    selectedHeroInfo: {
      heroId: 'all',
      name: '全部英雄',
      avatar: '/images_backup/heroes/mingshiyin.jpg'
    },
    
    // 推荐方案列表
    recommendPlans: [
      {
        _id: 'plan_001',
        heroId: 'mingshiyin',
        heroName: '飞天流小明',
        heroAvatar: '/images_backup/heroes/mingshiyin.jpg',
        title: '飞天流小明 - 主二副三流',
        description: '主二副三,12级的时候能完全体,前期很牢,后期很强。',
        likeCount: 128,
        favoriteCount: 56,
        views: 2340,
        difficulty: '中等',
        style: '辅助流',
        role: '辅助',
        creatorName: '诸神',
        authorAvatar: '/images/头像.png',
        createTime: '2025-01-27'
      },
      {
        _id: 'plan_002',
        heroId: 'zhugeliang',
        heroName: '诸葛亮',
        heroAvatar: '/images_backup/heroes/zhugeliang.jpg',
        title: '诸葛亮 - 法师核心流',
        description: '以法师为核心的打法，注重技能连招和团战输出。',
        likeCount: 89,
        favoriteCount: 34,
        views: 1567,
        difficulty: '困难',
        style: '法师流',
        role: '法师',
        creatorName: '策略大师',
        authorAvatar: '/images/头像.png',
        createTime: '2025-01-26'
      },
      {
        _id: 'plan_003',
        heroId: 'caocao',
        heroName: '曹操',
        heroAvatar: '/images_backup/heroes/caocao.jpg',
        title: '曹操 - 战士坦克流',
        description: '战士坦克双修，既有输出又有生存能力。',
        likeCount: 67,
        favoriteCount: 23,
        views: 892,
        difficulty: '简单',
        style: '战士流',
        role: '战士',
        creatorName: '王者归来',
        authorAvatar: '/images/头像.png',
        createTime: '2025-01-25'
      },
      {
        _id: 'plan_004',
        heroId: 'liubei',
        heroName: '刘备',
        heroAvatar: '/images_backup/heroes/liubei.jpg',
        title: '刘备 - 团队领袖流',
        description: '以团队协作为核心，注重保护和支援队友。',
        likeCount: 45,
        favoriteCount: 18,
        views: 567,
        difficulty: '中等',
        style: '团队流',
        role: '辅助',
        creatorName: '团队之星',
        authorAvatar: '/images/头像.png',
        createTime: '2025-01-24'
      },
      {
        _id: 'plan_005',
        heroId: 'guanyu',
        heroName: '关羽',
        heroAvatar: '/images_backup/heroes/guanyu.jpg',
        title: '关羽 - 爆发输出流',
        description: '高爆发输出，适合快速击杀敌方核心。',
        likeCount: 78,
        favoriteCount: 29,
        views: 1234,
        difficulty: '困难',
        style: '爆发流',
        role: '战士',
        creatorName: '战神',
        authorAvatar: '/images/头像.png',
        createTime: '2025-01-23'
      }
    ]
  },
 
  // 生命周期函数--监听页面加载
  onLoad() {
    console.log('推荐方案页面加载');
    // 这里可以调用云函数获取真实数据
    // this.loadRecommendPlans();
  },

  // 切换筛选类型
  switchFilter(e: any) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentFilter: type
    });
    console.log('切换筛选类型:', type);
    // 这里可以根据筛选类型重新加载数据
    // this.loadRecommendPlans();
  },

  // 切换英雄筛选器显示状态
  toggleHeroFilter() {
    this.setData({
      showHeroFilter: !this.data.showHeroFilter
    });
  },

  // 按英雄筛选
  filterByHero(e: any) {
    const hero = e.currentTarget.dataset.hero;
    let selectedHeroInfo;
    
    if (hero === 'all') {
      selectedHeroInfo = {
        heroId: 'all',
        name: '全部英雄',
        avatar: '/images_backup/heroes/mingshiyin.jpg'
      };
    } else {
      const heroItem = this.data.heroList.find(item => item.heroId === hero);
      selectedHeroInfo = {
        heroId: hero,
        name: heroItem ? heroItem.name : '未知英雄',
        avatar: heroItem ? heroItem.avatar : '/images_backup/heroes/mingshiyin.jpg'
      };
    }
    
    this.setData({
      selectedHero: hero,
      selectedHeroInfo: selectedHeroInfo,
      showHeroFilter: false
    });
    console.log('按英雄筛选:', hero);
    // 这里可以根据英雄筛选重新加载数据
    // this.loadRecommendPlans();
  },

  // 查看精选方案
  viewFeaturedPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    console.log('查看精选方案:', plan);
    wx.navigateTo({
      url: `/pages/planDetail/planDetail?id=${plan._id}`
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

  // 加载推荐方案数据
  loadRecommendPlans() {
    this.setData({ loading: true });
    
    // 模拟云函数调用
    setTimeout(() => {
      this.setData({ 
        loading: false,
        // 这里可以设置从云函数获取的数据
      });
    }, 1000);
  },

  // 加载更多数据
  loadMorePlans() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    
    this.setData({ loadingMore: true });
    
    // 模拟加载更多
    setTimeout(() => {
      this.setData({ 
        loadingMore: false,
        hasMore: false // 模拟没有更多数据
      });
    }, 1000);
  },

  // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh() {
    console.log('下拉刷新');
    this.loadRecommendPlans();
    wx.stopPullDownRefresh();
  },

  // 页面上拉触底事件的处理函数
  onReachBottom() {
    console.log('上拉加载更多');
    this.loadMorePlans();
  }
}); 