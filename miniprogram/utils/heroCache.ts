// 英雄数据缓存工具
interface Hero {
  id: string;
  name: string;
  avatar: string;
  category: string;
}

interface HeroCache {
  heroes: Hero[];
  categories: any;
  lastUpdate: number;
  avatarUrls: Record<string, string>;
}

class HeroCacheManager {
  private static instance: HeroCacheManager;
  private cache: HeroCache | null = null;
  private readonly CACHE_KEY = 'hero_list_cache';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

  static getInstance(): HeroCacheManager {
    if (!HeroCacheManager.instance) {
      HeroCacheManager.instance = new HeroCacheManager();
    }
    return HeroCacheManager.instance;
  }

  // 获取英雄列表（优先从缓存）
  async getHeroList(): Promise<any> {
    const cached = this.getCachedData();
    if (cached && this.isCacheValid(cached.lastUpdate)) {
      console.log('使用缓存的英雄列表');
      return cached;
    }

    console.log('从云函数获取英雄列表');
    const result = await wx.cloud.callFunction({
      name: 'getHeroList',
      data: {}
    }) as any;

    if (result.result && result.result.success) {
      const heroData = result.result.data;
      const heroes = this.flattenHeroes(heroData);
      
      const cacheData: HeroCache = {
        heroes,
        categories: heroData.categories,
        lastUpdate: Date.now(),
        avatarUrls: {}
      };

      this.setCachedData(cacheData);
      return heroData;
    }

    throw new Error('获取英雄列表失败');
  }

  // 根据ID快速查找英雄
  async getHeroById(heroId: string): Promise<Hero | null> {
    const cached = this.getCachedData();
    if (!cached || !this.isCacheValid(cached.lastUpdate)) {
      await this.getHeroList();
      return this.getHeroById(heroId);
    }

    return cached.heroes.find(hero => hero.id === heroId) || null;
  }

  // 根据名称快速查找英雄
  async getHeroByName(heroName: string): Promise<Hero | null> {
    const cached = this.getCachedData();
    if (!cached || !this.isCacheValid(cached.lastUpdate)) {
      await this.getHeroList();
      return this.getHeroByName(heroName);
    }

    return cached.heroes.find(hero => hero.name === heroName) || null;
  }

  // 批量获取头像URL
  async getAvatarUrls(heroIds: string[]): Promise<Record<string, string>> {
    const cached = this.getCachedData();
    if (!cached) {
      await this.getHeroList();
      return this.getAvatarUrls(heroIds);
    }

    const uncachedIds = heroIds.filter(id => !cached.avatarUrls[id]);
    
    if (uncachedIds.length > 0) {
      const heroes = uncachedIds.map(id => 
        cached.heroes.find(hero => hero.id === id)
      ).filter(Boolean);

      if (heroes.length > 0) {
        const avatarPaths = heroes.map(hero => hero!.avatar);
        
        try {
          const tempURLs = await wx.cloud.getTempFileURL({
            fileList: avatarPaths
          });

          tempURLs.fileList.forEach((file: any, index: number) => {
            if (file.tempFileURL) {
              cached.avatarUrls[uncachedIds[index]] = file.tempFileURL;
            }
          });

          this.setCachedData(cached);
        } catch (error) {
          console.error('批量获取头像URL失败:', error);
        }
      }
    }

    return cached.avatarUrls;
  }

  // 获取单个头像URL
  async getAvatarUrl(heroId: string): Promise<string> {
    const urls = await this.getAvatarUrls([heroId]);
    return urls[heroId] || '../images/unused/default-avatar.png';
  }

  // 清除缓存
  clearCache(): void {
    this.cache = null;
    wx.removeStorageSync(this.CACHE_KEY);
  }

  private flattenHeroes(heroData: any): Hero[] {
    const heroes: Hero[] = [];
    Object.values(heroData.categories).forEach((cat: any) => {
      cat.heroes.forEach((hero: any) => {
        heroes.push({
          id: hero.id,
          name: hero.name,
          avatar: hero.avatar,
          category: cat.name
        });
      });
    });
    return heroes;
  }

  private getCachedData(): HeroCache | null {
    if (this.cache) return this.cache;
    
    try {
      const data = wx.getStorageSync(this.CACHE_KEY);
      this.cache = data || null;
      return this.cache;
    } catch (error) {
      console.error('读取缓存失败:', error);
      return null;
    }
  }

  private setCachedData(data: HeroCache): void {
    this.cache = data;
    try {
      wx.setStorageSync(this.CACHE_KEY, data);
    } catch (error) {
      console.error('保存缓存失败:', error);
    }
  }

  private isCacheValid(lastUpdate: number): boolean {
    return Date.now() - lastUpdate < this.CACHE_DURATION;
  }
}

export const heroCache = HeroCacheManager.getInstance(); 