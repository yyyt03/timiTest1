/**
 * 统一缓存键命名规范
 * 格式：{app}:{module}:{type}:{identifier}:{version}
 * 
 * 组成部分：
 * - app: 应用标识，统一使用 'timi'
 * - module: 功能模块，如 'hero', 'equipment', 'avatar', 'user'
 * - type: 数据类型，如 'data', 'image', 'url', 'config'
 * - identifier: 具体标识符，如 'list', 'detail', 'category'
 * - version: 版本号，如 'v1', 'v2'（可选）
 */

// 应用标识
const APP_PREFIX = 'timi';

// 功能模块
const MODULES = {
  HERO: 'hero',
  EQUIPMENT: 'equipment',
  AVATAR: 'avatar',
  USER: 'user',
  PLAN: 'plan',
  FAVORITE: 'favorite',
  SYSTEM: 'system'
} as const;

// 数据类型
const TYPES = {
  DATA: 'data',
  IMAGE: 'image',
  URL: 'url',
  CONFIG: 'config',
  CACHE: 'cache',
  LIST: 'list',
  DETAIL: 'detail'
} as const;

// 版本号
const VERSIONS = {
  V1: 'v1',
  V2: 'v2'
} as const;

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  /**
   * 生成缓存键
   * @param module 功能模块
   * @param type 数据类型
   * @param identifier 具体标识符
   * @param version 版本号（可选，默认为v1）
   * @returns 格式化的缓存键
   */
  static generate(
    module: string,
    type: string,
    identifier: string,
    version: string = VERSIONS.V1
  ): string {
    const encodedIdentifier = this.encodeIdentifier(identifier);
    return `${APP_PREFIX}:${module}:${type}:${encodedIdentifier}:${version}`;
  }

  /**
   * 生成英雄相关缓存键
   */
  static hero(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.HERO, type, identifier, version);
  }

  /**
   * 生成装备相关缓存键
   */
  static equipment(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.EQUIPMENT, type, identifier, version);
  }

  /**
   * 生成头像相关缓存键
   */
  static avatar(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.AVATAR, type, identifier, version);
  }

  /**
   * 生成用户相关缓存键
   */
  static user(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.USER, type, identifier, version);
  }

  /**
   * 生成方案相关缓存键
   */
  static plan(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.PLAN, type, identifier, version);
  }

  /**
   * 生成带ID的方案详情缓存键
   */
  static planDetail(planId: string, version?: string): string {
    return this.generate(MODULES.PLAN, TYPES.DATA, `detail_${planId}`, version);
  }

  /**
   * 生成推荐方案缓存键
   */
  /**
   * 对标识符进行安全编码，确保缓存键符合规范
   * 将中文字符转换为简单哈希，其他特殊字符替换为下划线
   */
  private static encodeIdentifier(identifier: string): string {
    // 如果包含中文字符，生成简单哈希
    if (/[\u4e00-\u9fa5]/.test(identifier)) {
      // 生成字符串哈希码
      let hash = 0;
      for (let i = 0; i < identifier.length; i++) {
        const char = identifier.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      // 取绝对值并转换为字符串，添加前缀表示是编码后的
      return `cn_${Math.abs(hash).toString(36)}`;
    }
    // 非中文字符，替换特殊字符为下划线
    return identifier.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  static planRecommend(mode: string, hero: string = 'all', version?: string): string {
    const encodedHero = this.encodeIdentifier(hero);
    return this.generate(MODULES.PLAN, TYPES.DATA, `recommend_${mode}_${encodedHero}`, version);
  }

  /**
   * 生成英雄列表缓存键
   */
  static heroList(mode: string, version?: string): string {
    return this.generate(MODULES.HERO, TYPES.LIST, `categories_${mode}`, version);
  }

  /**
   * 生成收藏相关缓存键
   */
  static favorite(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.FAVORITE, type, identifier, version);
  }

  /**
   * 生成系统相关缓存键
   */
  static system(type: string, identifier: string, version?: string): string {
    return this.generate(MODULES.SYSTEM, type, identifier, version);
  }
}

/**
 * 预定义的缓存键常量
 */
export const CACHE_KEYS = {
  // 英雄相关缓存键
  HERO_LIST_DATA: CacheKeyGenerator.hero(TYPES.DATA, 'list'),
  HERO_CATEGORY_DATA: CacheKeyGenerator.hero(TYPES.DATA, 'category'),
  HERO_AVATAR_URLS: CacheKeyGenerator.hero(TYPES.URL, 'avatars'),
  HERO_DETAIL_DATA: CacheKeyGenerator.hero(TYPES.DATA, 'detail'),

  // 装备相关缓存键
  EQUIPMENT_IMAGE_CACHE: CacheKeyGenerator.equipment(TYPES.IMAGE, 'cache'),
  EQUIPMENT_LIST_DATA: CacheKeyGenerator.equipment(TYPES.DATA, 'list'),
  EQUIPMENT_CATEGORY_DATA: CacheKeyGenerator.equipment(TYPES.DATA, 'category'),

  // 头像相关缓存键
  AVATAR_URL_CACHE: CacheKeyGenerator.avatar(TYPES.URL, 'cache'),
  AVATAR_DEFAULT_IMAGE: CacheKeyGenerator.avatar(TYPES.IMAGE, 'default'),

  // 用户相关缓存键
  USER_INFO_DATA: CacheKeyGenerator.user(TYPES.DATA, 'info'),
  USER_PLANS_DATA: CacheKeyGenerator.user(TYPES.DATA, 'plans'),
  USER_FAVORITES_DATA: CacheKeyGenerator.user(TYPES.DATA, 'favorites'),

  // 方案相关缓存键
  PLAN_LIST_DATA: CacheKeyGenerator.plan(TYPES.DATA, 'list'),
  PLAN_DETAIL_DATA: CacheKeyGenerator.plan(TYPES.DATA, 'detail'),
  PLAN_DETAIL_WITH_ID: (planId: string) => CacheKeyGenerator.planDetail(planId),
  PLAN_RECOMMEND_DATA: CacheKeyGenerator.plan(TYPES.DATA, 'recommend'),
  
  // 推荐方案专用缓存键生成器
  PLAN_RECOMMEND_MODE: (mode: string, hero: string = 'all') => CacheKeyGenerator.planRecommend(mode, hero),
  
  // 全局方案缓存键
  ALL_PLANS_CACHE_KEY: CacheKeyGenerator.plan(TYPES.DATA, 'all_plans_cache'),

  // 英雄列表专用缓存键生成器  
  HERO_LIST_MODE: (mode: string) => CacheKeyGenerator.heroList(mode),

  // 收藏相关缓存键
  FAVORITE_LIST_DATA: CacheKeyGenerator.favorite(TYPES.DATA, 'list'),
  FAVORITE_SYNC_STATUS: CacheKeyGenerator.favorite(TYPES.DATA, 'sync'),

  // 系统相关缓存键
  SYSTEM_CONFIG: CacheKeyGenerator.system(TYPES.CONFIG, 'app'),
  SYSTEM_LOGS: CacheKeyGenerator.system(TYPES.DATA, 'logs')
} as const;

/**
 * 缓存键类型定义
 */
export type CacheKeyType = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

/**
 * 缓存键验证器
 */
export class CacheKeyValidator {
  /**
   * 验证缓存键是否符合规范
   * @param key 缓存键
   * @returns 是否符合规范
   */
  static isValid(key: string): boolean {
    const pattern = /^timi:[a-z]+:[a-z]+:[a-z0-9_\-]+:v[0-9]+$/;
    return pattern.test(key);
  }

  /**
   * 解析缓存键
   * @param key 缓存键
   * @returns 解析结果
   */
  static parse(key: string): {
    app: string;
    module: string;
    type: string;
    identifier: string;
    version: string;
  } | null {
    if (!this.isValid(key)) {
      return null;
    }

    const parts = key.split(':');
    return {
      app: parts[0],
      module: parts[1],
      type: parts[2],
      identifier: parts[3],
      version: parts[4]
    };
  }
}

export default CACHE_KEYS;
