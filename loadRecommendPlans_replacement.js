// 这是一个完整、干净的 loadRecommendPlans 函数，用于替换 recommendPlan.ts 中的旧函数

// 加载推荐方案数据
async loadRecommendPlans(isLoadMore = false, requestId?: number) {
  // 如果没有提供requestId，使用当前请求ID
  const currentRequestId = requestId || this.data.currentRequestId;
  
  console.log(`开始加载推荐方案数据，模式: ${this.data.currentMode}，英雄: ${this.data.selectedHero}，是否加载更多: ${isLoadMore}`);
  
  if (isLoadMore) {
    if (!this.data.hasMore || this.data.loadingMore) {
      return;
    }
    this.setData({ loadingMore: true });
  } else {
    this.setData({ loading: true });
  }

  try {
    // 检查请求是否已被取消
    if (currentRequestId !== this.data.currentRequestId) {
      console.log('请求已被取消，跳过数据加载，请求ID:', currentRequestId);
      this.setData({ 
        loading: false,
        loadingMore: false 
      });
      return;
    }

    // 使用新的 planService 获取推荐方案
    console.log(`使用planService获取${this.data.currentMode}模式数据`);
    const plans = await planService.getRecommendPlans(this.data.currentMode);
    
    // 再次检查请求是否已被取消
    if (currentRequestId !== this.data.currentRequestId) {
      console.log('请求已被取消，跳过方案数据处理，请求ID:', currentRequestId);
      this.setData({ 
        loading: false,
        loadingMore: false 
      });
      return;
    }

    // 根据选定的英雄进行筛选
    let filteredPlans = plans;
    if (this.data.selectedHero !== 'all') {
      filteredPlans = plans.filter(plan => plan.heroId === this.data.selectedHero);
      console.log(`英雄筛选后方案数量: ${filteredPlans.length} (原始: ${plans.length})`);
    }

    // 处理分页
    const pageSize = this.data.pageSize;
    const startIndex = isLoadMore ? this.data.page * pageSize : 0;
    const endIndex = startIndex + pageSize;
    const paginatedPlans = filteredPlans.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredPlans.length;

    console.log(`分页处理: 起始${startIndex}, 结束${endIndex}, 当前页${paginatedPlans.length}个, 还有更多: ${hasMore}`);

    // 处理方案数据，添加英雄头像
    const processedPlans = await this.processPlansWithAvatars(paginatedPlans);
    
    // 最后检查请求是否已被取消
    if (currentRequestId !== this.data.currentRequestId) {
      console.log('请求已被取消，跳过最终数据更新，请求ID:', currentRequestId);
      this.setData({ 
        loading: false,
        loadingMore: false 
      });
      return;
    }
    
    // 格式化时间
    const formattedPlans = processedPlans.map((plan: any) => ({
      ...plan,
      createTime: this.formatTime(plan.createTime)
    }));
    
    // 更新数据
    if (isLoadMore) {
      // 加载更多：追加到现有数据
      const newPlans = [...this.data.recommendPlans, ...formattedPlans];
      this.setData({
        recommendPlans: newPlans,
        page: this.data.page + 1,
        hasMore: hasMore,
        loadingMore: false
      });
      console.log(`加载更多完成，当前总方案数: ${newPlans.length}`);
    } else {
      // 首次加载：替换现有数据
      this.setData({
        recommendPlans: formattedPlans,
        allRecommendPlans: filteredPlans, // 保存完整的筛选后数据
        page: 1,
        hasMore: hasMore,
        loading: false,
        isDataLoaded: true,
        lastLoadTime: Date.now()
      });
      console.log(`首次加载完成，方案数: ${formattedPlans.length}, 总筛选数: ${filteredPlans.length}`);
    }
    
  } catch (error) {
    console.error(`获取${this.data.currentMode}模式数据失败:`, error);
    // 设置加载失败状态
    this.setData({
      loading: false,
      loadingMore: false,
    });
    
    // 显示错误提示
    wx.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    });
  }
},
