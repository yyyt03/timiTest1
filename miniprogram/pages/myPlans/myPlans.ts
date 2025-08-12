// 我的方案页面
import { getHeroByName } from '../../data/localHeroData';

Page({
  data: {
    userPlans: [] as any[],
    allUserPlans: [] as any[], // 存储所有方案数据
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    total: 0,
    emptyIcon: '/images/icons/empty-favorites.png',
    isDevelopment: false, // 添加环境标识
    isAdminReview: false, // 是否为管理员审核模式
    pageTitle: '我的方案',
    // 英雄分类相关
    heroCategories: [] as any[], // 英雄分类列表
    selectedHero: 'all', // 当前选中的英雄，'all'表示全部
    showHeroSelector: false, // 是否显示英雄选择器
    // 管理筛选
    adminStatusFilter: 'all' // all | pending | published | offline | rejected
  },

  onLoad(options?: any) {
    // 识别管理员审核模式
    const isAdmin = options && (options.admin === '1' || options.mode === 'admin');
    this.setData({
      isAdminReview: !!isAdmin,
      pageTitle: !!isAdmin ? '方案审核' : '我的方案'
    });
    this.detectEnvironment(); // 检测环境
    if (this.data.isAdminReview) {
      this.loadAllPlansForAdmin();
    } else {
      this.loadUserPlans();
    }
  },

  // 检测环境
  detectEnvironment() {
    try {
      const accountInfo = wx.getAccountInfoSync();
      const version = accountInfo.miniProgram?.version || '';
      const envVersion = accountInfo.miniProgram?.envVersion || '';
      
      // 开发环境判断逻辑 - 只在develop环境下显示发布按钮
      const isDev = envVersion === 'develop';
      
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
    if (this.data.isAdminReview) {
      this.loadAllPlansForAdmin();
    } else {
      this.loadUserPlans();
    }
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
        pageSize: this.data.pageSize,
        adminAll: this.data.isAdminReview
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

  // 管理员审核模式：全量加载所有方案
  async loadAllPlansForAdmin() {
    // 避免重复加载
    if (this.data.loading && this.data.userPlans.length > 0) return;

    this.setData({ loading: true, userPlans: [], allUserPlans: [], total: 0 });

    const pageSize = 100; // 提高单页数量，减少请求次数
    let page = 1;
    let allPlans: any[] = [];
    let hasMore = true;

    try {
      while (hasMore) {
        const res: any = await new Promise((resolve, reject) => {
          wx.cloud.callFunction({
            name: 'getAllPlans',
            data: { page, pageSize, status: this.data.adminStatusFilter },
            success: (r: any) => resolve(r),
            fail: (e: any) => reject(e)
          });
        });

        if (res && res.result && res.result.success) {
          const batch = (res.result.data.plans || []).map((plan: any) => ({
            ...plan,
            createTime: this.formatTime(plan.createTime)
          }));
          allPlans = allPlans.concat(batch);
          hasMore = !!res.result.data.hasMore;
          page += 1;
        } else {
          hasMore = false;
          wx.showToast({ title: res?.result?.message || '获取方案失败', icon: 'none' });
        }
      }

      this.setData({
        userPlans: allPlans,
        allUserPlans: allPlans,
        total: allPlans.length,
        hasMore: false,
        loading: false
      });

      // 生成英雄分类
      this.generateHeroCategories();
    } catch (error) {
      console.error('管理员模式获取方案失败:', error);
      wx.showToast({ title: '获取方案失败', icon: 'none' });
      this.setData({ loading: false, hasMore: false });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 切换管理员状态筛选
  switchAdminStatus(e: any) {
    const status = e.currentTarget.dataset.status;
    this.setData({ adminStatusFilter: status });
    if (this.data.isAdminReview) {
      this.loadAllPlansForAdmin();
    }
  },

  // 加载更多
  loadMore() {
    // 管理员审核模式已全量加载，不再分页
    if (this.data.isAdminReview) return;
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
    
    // 管理员审核模式、开发环境下或普通用户模式下，允许编辑所有方案
    if (this.data.isAdminReview || this.data.isDevelopment || !this.data.isAdminReview) {
      // 跳转到方案创作页面，传递方案数据用于编辑
      wx.navigateTo({
        url: `../createPlan/createPlan?editMode=true&planId=${plan._id}`
      });
    } else {
      // 其他情况下，显示提示信息
      wx.showToast({
        title: '无法编辑此方案',
        icon: 'none'
      });
    }
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
    
    // 管理员审核模式或开发环境下，允许删除所有方案
    if (this.data.isAdminReview || this.data.isDevelopment) {
      wx.showModal({
        title: '删除方案',
        content: '确定要删除这个方案吗？删除后无法恢复。',
        success: (res) => {
          if (res.confirm) {
            this.deletePlanConfirm(plan._id);
          }
        }
      });
    } else {
      // 普通用户只能删除自己的方案
      wx.showModal({
        title: '删除方案',
        content: '确定要删除这个方案吗？删除后无法恢复。',
        success: (res) => {
          if (res.confirm) {
            this.deletePlanConfirm(plan._id);
          }
        }
      });
    }
  },

  // 更新方案状态
  updatePlanStatus(planId: string, status: string) {
    wx.showLoading({ title: '处理中...' });
    
    wx.cloud.callFunction({
      name: 'updatePlanStatus',
      data: {
        planId: planId,
        status: status,
        admin: this.data.isAdminReview || this.data.isDevelopment
      },
      success: (res: any) => {
        if (res.result.success) {
          wx.showToast({
            title: status === 'published' ? '发布成功' : (status === 'offline' ? '下架成功' : (status === 'rejected' ? '拒绝成功' : '更新成功')),
            icon: 'success'
          });
          // 刷新列表
          if (this.data.isAdminReview) {
            this.loadAllPlansForAdmin();
          } else {
            this.setData({ page: 1 });
            this.loadUserPlans();
          }
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

  // 更新方案状态（带拒绝原因）
  updatePlanStatusWithReason(planId: string, status: string, reason: string) {
    wx.showLoading({ title: '处理中...' });
    
    wx.cloud.callFunction({
      name: 'updatePlanStatus',
      data: {
        planId: planId,
        status: status,
        reason: reason, // 传递拒绝原因
        admin: this.data.isAdminReview || this.data.isDevelopment
      },
      success: (res: any) => {
        if (res.result.success) {
          wx.showToast({
            title: status === 'rejected' ? '返回成功' : '更新成功',
            icon: 'success'
          });
          // 刷新列表
          if (this.data.isAdminReview) {
            this.loadAllPlansForAdmin();
          } else {
            this.setData({ page: 1 });
            this.loadUserPlans();
          }
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

  // 提交审核：将状态置为 pending
  submitReview(e: any) {
    const plan = e.currentTarget.dataset.plan;
    const isRejected = plan.status === 'rejected';
    wx.showModal({
      title: isRejected ? '重新提交审核' : '提交审核',
      content: isRejected ? '确定要重新提交该方案审核吗？' : '确定将该方案提交审核吗？',
      success: (res) => {
        if (res.confirm) {
          this.updatePlanStatus(plan._id, 'pending');
        }
      }
    });
  },

  // 审核通过：设为 published
  approvePlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.showModal({
      title: '通过发布',
      content: '确定要通过并发布该方案吗？',
      success: (res) => {
        if (res.confirm) {
          this.updatePlanStatus(plan._id, 'published');
        }
      }
    });
  },

  // 审核返回：设回 draft（或可扩展为 rejected）
  rejectPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.showModal({
      title: '返回审核',
      content: '',
      editable: true,
      placeholderText: '请输入返回原因（必填）...',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          // 调用带返回原因的更新方法
          this.updatePlanStatusWithReason(plan._id, 'rejected', res.content.trim());
        } else if (res.confirm && (!res.content || !res.content.trim())) {
          wx.showToast({
            title: '请输入返回原因',
            icon: 'none'
          });
        }
      }
    });
  },

  // 下架方案：将已发布的方案设为下架状态
  offlinePlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.showModal({
      title: '下架方案',
      content: '确定要下架该方案吗？下架后其他用户将无法看到。',
      success: (res) => {
        if (res.confirm) {
          this.updatePlanStatus(plan._id, 'offline');
        }
      }
    });
  },

  // 重新发布方案：将已下架的方案重新设为已发布状态
  republishPlan(e: any) {
    const plan = e.currentTarget.dataset.plan;
    wx.showModal({
      title: '重新发布方案',
      content: '确定要重新发布该方案吗？重新发布后其他用户将可以再次看到。',
      success: (res) => {
        if (res.confirm) {
          this.updatePlanStatus(plan._id, 'published');
        }
      }
    });
  },

  // 确认删除方案
  deletePlanConfirm(planId: string) {
    wx.showLoading({ title: '删除中...' });
    
    wx.cloud.callFunction({
      name: 'deletePlan',
      data: {
        planId: planId,
        admin: this.data.isAdminReview || this.data.isDevelopment // 传递管理员权限标识
      },
      success: (res: any) => {
        if (res.result && res.result.success) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 刷新列表
          if (this.data.isAdminReview) {
            this.loadAllPlansForAdmin();
          } else {
            this.setData({ page: 1 });
            this.loadUserPlans();
          }
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

  // 图片加载错误处理：切换到云端空状态图标或本地兜底
  onImageError() {
    try {
      // 优先尝试云端空状态图标
      this.setData({ emptyIcon: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/empty-favorites.png' });
    } catch (_e) {
      // 本地兜底
      this.setData({ emptyIcon: '/pages/images/unused/default-avatar.png' });
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
    const heroCategoriesWithAvatars = this.processHeroAvatars(heroCategories);
    
    this.setData({
      heroCategories: heroCategoriesWithAvatars
    });
  },

  // 处理英雄头像
  processHeroAvatars(heroCategories: any[]) {
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

  // 页面分享给朋友
  onShareAppMessage() {
    return {
      title: '我的攻略方案 - 觉醒天赋推荐',
      path: '/pages/myPlans/myPlans',
      imageUrl: '/pages/images/share-my-plans.png'
    };
  },

  // 页面分享到朋友圈
  onShareTimeline() {
    return {
      title: '我的攻略方案 - 觉醒天赋推荐',
      imageUrl: '/pages/images/share-my-plans.png'
    };
  },

  // 切换推荐状态
  toggleRecommend(e: any) {
    const plan = e.currentTarget.dataset.plan;
    const isRecommended = !plan.isRecommended;
    
    wx.showModal({
      title: isRecommended ? '设为推荐' : '取消推荐',
      content: isRecommended ? '确定要将此方案设为推荐吗？' : '确定要取消此方案的推荐状态吗？',
      success: (res) => {
        if (res.confirm) {
          this.updatePlanRecommendStatus(plan._id, isRecommended);
        }
      }
    });
  },

  // 更新方案推荐状态
  updatePlanRecommendStatus(planId: string, isRecommended: boolean) {
    wx.showLoading({ title: '处理中...' });
    
    wx.cloud.callFunction({
      name: 'updatePlanStatus',
      data: {
        planId: planId,
        status: 'published', // 保持当前状态不变
        isRecommended: isRecommended,
        admin: true
      },
      success: (res: any) => {
        if (res.result.success) {
          wx.showToast({
            title: isRecommended ? '设为推荐成功' : '取消推荐成功',
            icon: 'success'
          });
          // 刷新列表
          if (this.data.isAdminReview) {
            this.loadAllPlansForAdmin();
          } else {
            this.setData({ page: 1 });
            this.loadUserPlans();
          }
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('更新推荐状态失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
}); 