/**
 * 图标管理工具类
 * 统一管理云存储中的图标路径
 */

// 云环境ID - 请替换为您的实际云环境ID
const CLOUD_ENV_ID = 'cloudbase-1gk9t6w2d1d090af'; // TODO: 替换为实际云环境ID

// 云存储基础路径
const CLOUD_BASE_PATH = `cloud://${CLOUD_ENV_ID}.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons`;

export class IconManager {
  /**
   * 获取状态图标
   * @param type 图标类型
   * @param isActive 是否激活状态
   * @returns 图标URL
   */
  static getStatusIcon(type: 'favorite' | 'like', isActive: boolean): string {
    const status = isActive ? 'filled' : 'outline';
    return `${CLOUD_BASE_PATH}/${type}-${status}.png`;
  }

  /**
   * 获取功能图标
   * @param type 图标类型
   * @returns 图标URL
   */
  static getFeatureIcon(type: 'hero-category' | 'beta-plan' | 'recommend-plan' | 'create-plan' | 'favorite-plan'): string {
    return `${CLOUD_BASE_PATH}/${type}.png`;
  }

  /**
   * 获取Tabbar图标
   * @param page 页面名称
   * @param isSelected 是否选中状态
   * @returns 图标URL
   */
  static getTabbarIcon(page: 'strategy' | 'user', isSelected: boolean): string {
    const suffix = isSelected ? '-selected' : '';
    return `${CLOUD_BASE_PATH}/tabbar-${page}${suffix}.png`;
  }

  /**
   * 获取收藏图标
   * @param isFavorited 是否已收藏
   * @returns 图标URL
   */
  static getFavoriteIcon(isFavorited: boolean): string {
    return this.getStatusIcon('favorite', isFavorited);
  }

  /**
   * 获取点赞图标
   * @param isLiked 是否已点赞
   * @returns 图标URL
   */
  static getLikeIcon(isLiked: boolean): string {
    return this.getStatusIcon('like', isLiked);
  }

  /**
   * 获取英雄分类图标
   * @returns 图标URL
   */
  static getHeroCategoryIcon(): string {
    return this.getFeatureIcon('hero-category');
  }

  /**
   * 获取Beta方案图标
   * @returns 图标URL
   */
  static getBetaPlanIcon(): string {
    return this.getFeatureIcon('beta-plan');
  }

  /**
   * 获取推荐方案图标
   * @returns 图标URL
   */
  static getRecommendPlanIcon(): string {
    return this.getFeatureIcon('recommend-plan');
  }

  /**
   * 获取创建方案图标
   * @returns 图标URL
   */
  static getCreatePlanIcon(): string {
    return this.getFeatureIcon('create-plan');
  }

  /**
   * 获取收藏方案图标
   * @returns 图标URL
   */
  static getFavoritePlanIcon(): string {
    return this.getFeatureIcon('favorite-plan');
  }

  /**
   * 获取空状态图标
   * @param type 空状态类型
   * @returns 图标URL
   */
  static getEmptyIcon(type: 'favorites' | 'search' | 'error'): string {
    // 使用云端图片路径
    return `${CLOUD_BASE_PATH}/empty-${type}.png`;
  }

  /**
   * 获取本地备用图标（当云端图片加载失败时使用）
   * @param type 图标类型
   * @returns 本地图标URL
   */
  static getLocalFallbackIcon(type: 'favorites' | 'search' | 'error'): string {
    // 使用本地default-avatar作为备用图标
    return '/pages/images/icons/unused/default-avatar.png';
  }

  /**
   * 获取策略页面Tabbar图标
   * @param isSelected 是否选中
   * @returns 图标URL
   */
  static getStrategyTabIcon(isSelected: boolean): string {
    return this.getTabbarIcon('strategy', isSelected);
  }

  /**
   * 获取用户页面Tabbar图标
   * @param isSelected 是否选中
   * @returns 图标URL
   */
  static getUserTabIcon(isSelected: boolean): string {
    return this.getTabbarIcon('user', isSelected);
  }

  /**
   * 设置云环境ID
   * @param envId 云环境ID
   */
  static setCloudEnvId(envId: string): void {
    // 这里可以动态设置云环境ID
    // 注意：需要重新计算所有图标路径
  }

  /**
   * 获取所有图标路径（用于预加载）
   * @returns 所有图标URL数组
   */
  static getAllIconUrls(): string[] {
    return [
      // 状态图标
      this.getFavoriteIcon(false),
      this.getFavoriteIcon(true),
      this.getLikeIcon(false),
      this.getLikeIcon(true),
      
      // 功能图标
      this.getHeroCategoryIcon(),
      this.getBetaPlanIcon(),
      this.getRecommendPlanIcon(),
      this.getCreatePlanIcon(),
      this.getFavoritePlanIcon(),
      
      // Tabbar图标
      this.getStrategyTabIcon(false),
      this.getStrategyTabIcon(true),
      this.getUserTabIcon(false),
      this.getUserTabIcon(true)
    ];
  }
}

// 导出便捷方法
export const getFavoriteIcon = IconManager.getFavoriteIcon.bind(IconManager);
export const getLikeIcon = IconManager.getLikeIcon.bind(IconManager);
export const getHeroCategoryIcon = IconManager.getHeroCategoryIcon.bind(IconManager);
export const getBetaPlanIcon = IconManager.getBetaPlanIcon.bind(IconManager);
export const getRecommendPlanIcon = IconManager.getRecommendPlanIcon.bind(IconManager);
export const getCreatePlanIcon = IconManager.getCreatePlanIcon.bind(IconManager);
export const getFavoritePlanIcon = IconManager.getFavoritePlanIcon.bind(IconManager);
export const getEmptyIcon = IconManager.getEmptyIcon.bind(IconManager);
export const getLocalFallbackIcon = IconManager.getLocalFallbackIcon.bind(IconManager);
export const getStrategyTabIcon = IconManager.getStrategyTabIcon.bind(IconManager);
export const getUserTabIcon = IconManager.getUserTabIcon.bind(IconManager); 