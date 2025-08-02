import { CloudService } from '../../utils/cloud'
import { getEmptyIcon, getLocalFallbackIcon } from '../../utils/iconManager'

// 收藏页面
Page({
  data: {
    favorites: [] as any[],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    total: 0,
    emptyIcon: getEmptyIcon('favorites')
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
    console.log('云端图片加载失败，使用本地备用图片');
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
          const { favorites, total, hasMore } = res.result.data;
          
          // 格式化时间
          const formattedFavorites = favorites.map((fav: any) => ({
            ...fav,
            createTime: CloudService.formatTime(fav.createTime)
          }));
          
          if (refresh) {
            // 刷新模式，替换数据
            that.setData({
              favorites: formattedFavorites,
              page: 1,
              total: total,
              hasMore: hasMore
            });
          } else {
            // 加载更多模式，追加数据
            that.setData({
              favorites: [...that.data.favorites, ...formattedFavorites],
              page: page + 1,
              total: total,
              hasMore: hasMore
            });
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
    const { planId, index } = e.currentTarget.dataset;
    
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
          const newFavorites = [...that.data.favorites];
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
    const { planId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `../heroPlan/heroPlan?id=${planId}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshFavorites();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMore();
  }
}); 