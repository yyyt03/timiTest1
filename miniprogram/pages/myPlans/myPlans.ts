// 我的方案页面
Page({
  data: {
    userPlans: [],
    allUserPlans: [], // 存储所有方案数据
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    total: 0,
    emptyIcon: '/images/icons/empty-favorites.png',
    isDevelopment: false, // 添加环境标识
    // 英雄分类相关
    heroCategories: [] as any[], // 英雄分类列表
    selectedHero: 'all', // 当前选中的英雄，'all'表示全部
    showHeroSelector: false // 是否显示英雄选择器
  },

  onLoad() {
    this.detectEnvironment(); // 检测环境
    this.loadUserPlans();
  },

  // 检测环境
  detectEnvironment() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const version = accountInfo.miniProgram?.version || '';
      const envVersion = accountInfo.miniProgram?.envVersion || '';
      
      // 开发环境判断逻辑
      const isDev = envVersion === 'develop' || 
                    envVersion === 'trial' || 
                    version.includes('dev') || 
                    version.includes('test');
      
      this.setData({
        isDevelopment: isDev
      });
      
      console.log('个人方案页面环境检测结果:', {
        version,
        envVersion,
        isDevelopment: isDev
      });
    } catch (error) {
      console.error('环境检测失败:', error);
      // 如果检测失败，默认设置为非开发环境
      this.setData({
        isDevelopment: false
      });
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadUserPlans();
  },

  // 格式化时间显示
  formatTime(timeString: string) {
    try {
      const date = new Date(timeString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      return timeString;
    }
  },

  // 加载用户方案
  loadUserPlans() {
    // 如果已经在加载中，则返回
    if (this.data.loading && this.data.userPlans.length > 0) return;
    
    this.setData({ loading: true });
    
    console.log('开始调用getUserPlans云函数');
    wx.cloud.callFunction({
      name: 'getUserPlans',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: (res: any) => {
        console.log('getUserPlans云函数调用成功:', res);
        if (res.result && res.result.success) {
          // 格式化时间显示
          const plans = res.result.data.plans.map((plan: any) => ({
            ...plan,
            createTime: this.formatTime(plan.createTime)
          }));
          
          const newPlans = this.data.page === 1 ? plans : [...this.data.userPlans, ...plans];
          
          this.setData({
            userPlans: newPlans,
            allUserPlans: newPlans, // 保存所有数据
            total: newPlans.length,
            hasMore: res.result.data.hasMore,
            loading: false
          });
          
          // 生成英雄分类
          this.generateHeroCategories();
        } else {
          console.error('getUserPlans云函数返回失败:', res);
          wx.showToast({
            title: res.result ? res.result.message : '获取方案失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取用户方案失败:', err);
        wx.showToast({
          title: '获取方案失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      },
      complete: () => {
        wx.stopPullDownRefresh();
      }
    });
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      });
      this.loadUserPlans();
    }
  },

  // 查看方案详情
  viewPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.navigateTo({
      url: `../planDetail/planDetail?planId=${plan._id}`
    });
  },

  // 编辑方案
  editPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    
    // 跳转到方案创作页面，传递方案数据用于编辑
    wx.navigateTo({
      url: `../createPlan/createPlan?editMode=true&planId=${plan._id}`
    });
  },

  // 发布方案
  publishPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    
    wx.showModal({
      title: '发布方案',
      content: '确定要发布这个方案吗？发布后其他用户可以看到。',
      success: (res) => {
        if (res.confirm) {
          this.updatePlanStatus(plan._id, 'published');
        }
      }
    });
  },

  // 删除方案
  deletePlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    
    wx.showModal({
      title: '删除方案',
      content: '确定要删除这个方案吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          this.deletePlanConfirm(plan._id);
        }
      }
    });
  },

  // 更新方案状态
  updatePlanStatus(planId: string, status: string) {
    wx.showLoading({ title: '处理中...' });
    
    wx.cloud.callFunction({
      name: 'updatePlanStatus',
      data: {
        planId: planId,
        status: status
      },
      success: (res: any) => {
        if (res.result.success) {
          wx.showToast({
            title: status === 'published' ? '发布成功' : '更新成功',
            icon: 'success'
          });
          // 刷新列表
          this.setData({ page: 1 });
          this.loadUserPlans();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('更新方案状态失败:', err);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 确认删除方案
  deletePlanConfirm(planId: string) {
    wx.showLoading({ title: '删除中...' });
    
    wx.cloud.callFunction({
      name: 'deletePlan',
      data: {
        planId: planId
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 刷新列表
          this.setData({ page: 1 });
          this.loadUserPlans();
        } else {
          wx.showToast({
            title: res.result ? res.result.message : '删除失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('删除方案失败:', err);
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 跳转到创作方案页面
  goToCreatePlan() {
    wx.navigateTo({
      url: '../createPlan/createPlan'
    });
  },

  // 图片加载错误处理
  onImageError() {
    console.log('图片加载失败，使用默认图片');
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
    this.filterPlansByHero();
  },

  // 根据英雄筛选方案
  filterPlansByHero() {
    const { allUserPlans, selectedHero } = this.data;
    
    if (selectedHero === 'all') {
      // 显示全部方案
      this.setData({
        userPlans: allUserPlans,
        total: allUserPlans.length
      });
    } else {
      // 筛选指定英雄的方案
      const filteredPlans = allUserPlans.filter(plan => plan.heroName === selectedHero);
      this.setData({
        userPlans: filteredPlans,
        total: filteredPlans.length
      });
    }
  },

  // 生成英雄分类列表
  generateHeroCategories() {
    const { allUserPlans } = this.data;
    const heroMap = new Map();
    
    // 统计每个英雄的方案数量
    allUserPlans.forEach(plan => {
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
  }
}); 