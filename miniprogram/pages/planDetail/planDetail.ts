// 方案详情页面
import { processEquipmentList } from '../../utils/equipmentMatcher';

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
        
        // 获取英雄头像
        const heroAvatar = await this.getHeroAvatarFromCloud(plan.heroName, plan.heroId);
        console.log('获取到的英雄头像:', heroAvatar);
        
        // 处理装备列表，添加图片URL
        let processedEquipment = [];
        if (plan.equipment && plan.equipment.length > 0) {
          try {
            processedEquipment = await processEquipmentList(plan.equipment);
            console.log('处理后的装备列表:', processedEquipment);
          } catch (error) {
            console.error('处理装备列表失败:', error);
            processedEquipment = plan.equipment;
          }
        }
        
        this.setData({
          plan: {
            ...plan,
            heroAvatar: heroAvatar,
            equipment: processedEquipment
          },
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

  // 从云存储获取英雄头像
  async getHeroAvatarFromCloud(heroName: string, heroId?: string) {
    try {
      // 调用云函数获取英雄列表
      const result = await wx.cloud.callFunction({
        name: 'getHeroList',
        data: {}
      }) as any;

      if (result.result && result.result.success && result.result.data) {
        console.log('英雄列表数据结构:', result.result.data);
        // 查找对应英雄
        let targetHero = null;
        
        // 优先使用heroId查找
        if (heroId) {
          console.log('使用heroId查找:', heroId);
          Object.values(result.result.data.categories).forEach((cat: any) => {
            cat.heroes.forEach((hero: any) => {
              if (hero.id === heroId) {
                targetHero = hero;
                console.log('通过heroId找到英雄:', hero);
              }
            });
          });
        }
        
        // 如果通过heroId没找到，再通过英雄名称查找
        if (!targetHero && heroName) {
          Object.values(result.result.data.categories).forEach((cat: any) => {
            cat.heroes.forEach((hero: any) => {
              if (hero.name === heroName) {
                targetHero = hero;
              }
            });
          });
        }

        console.log('找到的英雄信息:', targetHero);

        if (targetHero && (targetHero as any).avatar) {
          // 获取临时URL
          const tempURLs = await wx.cloud.getTempFileURL({
            fileList: [(targetHero as any).avatar]
          });

          if (tempURLs.fileList && tempURLs.fileList[0] && tempURLs.fileList[0].tempFileURL) {
            return tempURLs.fileList[0].tempFileURL;
          } else {
            // 获取失败，使用默认头像
            return '../images/unused/default-avatar.png';
          }
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
          // 使用默认头像
          return '../images/unused/default-avatar.png';
        }
      } else {
        // 云函数调用失败，使用默认头像
        return '../images/unused/default-avatar.png';
      }
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      // 出错时使用默认头像
      return '../images/unused/default-avatar.png';
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