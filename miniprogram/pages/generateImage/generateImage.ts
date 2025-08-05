// 生成一图流页面
import { heroCache } from '../../utils/heroCache';

Page({
  data: {
    heroName: '',
    heroImageUrl: '',
    title: '',
    skillOne: null,
    skillTwo: null,
    skillThree: null,
    equipment: [],
    strategy: ''
  },

  async onLoad(options: any) {
    console.log('生成一图流页面接收到的参数:', options);
    
    // 从页面参数中获取数据
    if (options.planData) {
      try {
        const planData = JSON.parse(decodeURIComponent(options.planData));
        
        // 获取英雄头像
        const heroAvatar = await this.getHeroAvatarFromCache(planData.heroName, planData.heroId);
        
        this.setData({
          heroName: planData.heroName || '',
          heroImageUrl: heroAvatar,
          title: planData.title || '',
          skillOne: planData.skillOne || null,
          skillTwo: planData.skillTwo || null,
          skillThree: planData.skillThree || null,
          equipment: planData.equipment || [],
          strategy: planData.strategy || ''
        });
      } catch (error) {
        console.error('解析方案数据失败:', error);
        wx.showToast({
          title: '数据解析失败',
          icon: 'error'
        });
      }
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
        
        // 如果heroId也没有，尝试通过英雄名称构建
        if (heroName) {
          console.log('尝试通过英雄名称构建头像URL:', heroName);
          try {
            // 将中文名称转换为拼音ID
            const heroIdFromName = this.convertHeroNameToId(heroName);
            const directAvatarPath = `cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/${heroIdFromName}.jpg`;
            const tempURLs = await wx.cloud.getTempFileURL({
              fileList: [directAvatarPath]
            });
            
            if (tempURLs.fileList && tempURLs.fileList[0] && tempURLs.fileList[0].tempFileURL) {
              console.log('通过名称构建头像URL成功:', tempURLs.fileList[0].tempFileURL);
              return tempURLs.fileList[0].tempFileURL;
            }
          } catch (nameError) {
            console.log('通过名称构建头像URL失败:', nameError);
          }
        }
        
        return '../images/unused/default-avatar.png';
      }
    } catch (error) {
      console.error('获取英雄头像失败:', error);
      return '../images/unused/default-avatar.png';
    }
  },

  // 将英雄中文名称转换为拼音ID
  convertHeroNameToId(heroName: string): string {
    const heroIdMap: { [key: string]: string } = {
      '妲己': 'daji',
      '安琪拉': 'anqila',
      '亚瑟': 'yase',
      '孙尚香': 'sunshangxiang',
      '鲁班七号': 'lubanqihao',
      '王昭君': 'wangzhaojun',
      '虞姬': 'yuji',
      '貂蝉': 'diaochan',
      '小乔': 'xiaoqiao',
      '大乔': 'daqiao',
      '甄姬': 'zhenji',
      '蔡文姬': 'caiwenji',
      '杨玉环': 'yangyuhuan',
      '西施': 'xishi',
      '嫦娥': 'change',
      '露娜': 'luna',
      '花木兰': 'huamulan',
      '阿轲': 'ake',
      '娜可露露': 'nakelele',
      '不知火舞': 'buzhihuowu',
      '橘右京': 'juyoujing',
      '宫本武藏': 'gongbenwuzang',
      '李白': 'libai',
      '韩信': 'hanxin',
      '赵云': 'zhaoyun',
      '关羽': 'guanyu',
      '张飞': 'zhangfei',
      '马超': 'machao',
      '吕布': 'lvbu',
      '典韦': 'dianwei',
      '许褚': 'xuchu',
      '夏侯惇': 'xiahoudun',
      '夏侯渊': 'xiahouyuan',
      '张辽': 'zhangliao',
      '徐晃': 'xuhuang',
      '庞德': 'pangde',
      '太史慈': 'taishici',
      '甘宁': 'ganning',
      '周泰': 'zhoutai',
      '黄盖': 'huanggai',
      '程普': 'chengpu',
      '韩当': 'handang',
      '凌统': 'lingtong',
      '蒋钦': 'jiangqin',
      '周仓': 'zhoucang'
    };
    
    return heroIdMap[heroName] || heroName.toLowerCase();
  },

  // 返回编辑
  goBack() {
    wx.navigateBack();
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: `${this.data.heroName} - ${this.data.title}`,
      path: '/pages/generateImage/generateImage',
      imageUrl: this.data.heroImageUrl
    };
  },

  onShareTimeline() {
    return {
      title: `${this.data.heroName} - ${this.data.title}`,
      imageUrl: this.data.heroImageUrl
    };
  }
}); 