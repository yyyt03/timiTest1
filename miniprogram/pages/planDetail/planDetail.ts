// 方案详情页面
import { processEquipmentList } from '../../utils/equipmentMatcher';
import { heroCache } from '../../utils/heroCache';

Page({
  data: {
    plan: {},
    loading: true,
    planId: ''
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({
        planId: options.id
      });
      this.loadPlanDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载方案详情
  async loadPlanDetail(planId: string) {
    this.setData({ loading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlanDetail',
        data: { planId }
      }) as any;
      
      if (result.result && result.result.success) {
        const plan = result.result.data;
        
        // 并行处理英雄头像和装备列表
        const [heroAvatar, processedEquipment] = await Promise.all([
          this.getHeroAvatarFromCache(plan.heroName, plan.heroId),
          this.processEquipmentList(plan.equipment)
        ]);
        
        console.log('获取到的英雄头像:', heroAvatar);
        console.log('处理后的装备列表:', processedEquipment);
        
        const planData = Object.assign({}, plan);
        planData.heroAvatar = heroAvatar;
        planData.equipment = processedEquipment;
        
        this.setData({
          plan: planData,
          loading: false
        });
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: plan.title || plan.heroName + '的方案'
        });
        
      } else {
        wx.showToast({
          title: '加载方案详情失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载方案详情失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 从缓存获取英雄头像
  async getHeroAvatarFromCache(heroName: string, heroId?: string) {
    try {
      let targetHero = null;
      
      // 优先使用heroId查找
      if (heroId) {
        console.log('使用heroId查找:', heroId);
        targetHero = await heroCache.getHeroById(heroId);
        if (targetHero) {
          console.log('通过heroId找到英雄:', targetHero);
        }
      }
      
      // 如果通过heroId没找到，再通过英雄名称查找
      if (!targetHero && heroName) {
        targetHero = await heroCache.getHeroByName(heroName);
      }

      console.log('找到的英雄信息:', targetHero);

      if (targetHero) {
        // 使用缓存获取头像URL
        return await heroCache.getAvatarUrl(targetHero.id);
      } else {
        // 未找到英雄，尝试直接使用heroId构建头像URL
        if (heroId) {
          console.log('尝试直接构建头像URL:', heroId);
          try {
            const directAvatarPath = `cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/${heroId}.jpg`;
            const tempURLs = await wx.cloud.getTempFileURL({
              fileList: [directAvatarPath]
            });
            
            if (tempURLs.fileList && tempURLs.fileList[0] && tempURLs.fileList[0].tempFileURL) {
              console.log('直接构建头像URL成功:', tempURLs.fileList[0].tempFileURL);
              return tempURLs.fileList[0].tempFileURL;
            }
          } catch (directError) {
            console.log('直接构建头像URL失败:', directError);
          }
        }
        
        return '../images/unused/default-avatar.png';
      }
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      return '../images/unused/default-avatar.png';
    }
  },

  // 处理装备列表
  async processEquipmentList(equipmentList: any[]) {
    if (!equipmentList || equipmentList.length === 0) {
      return [];
    }
    
    try {
      return await processEquipmentList(equipmentList);
    } catch (error) {
      console.error('处理装备列表失败:', error);
      return equipmentList;
    }
  },

  // 分享方案
  sharePlan() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // 切换收藏状态
  async toggleFavorite() {
    const plan = this.data.plan;
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
        this.setData({
          'plan.isFavorited': isFavorited
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

  // 页面分享
  onShareAppMessage() {
    const plan = this.data.plan;
    return {
      title: `${plan.heroName} - ${plan.title}`,
      path: `/pages/planDetail/planDetail?id=${plan._id}`
    };
  }
}); 