/**
 * 图标管理工具类
 * 统一管理云存储中的图标路径
 */

// 云环境ID - 请替换为您的实际云环境ID
const CLOUD_ENV_ID = 'cloudbase-1gk9t6w2d1d090af'; // TODO: 替换为实际云环境ID

// 云存储基础路径
const CLOUD_BASE_PATH = `cloud://${CLOUD_ENV_ID}.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons`;

/**
 * 获取状态图标
 * @param type 图标类型
 * @param isActive 是否激活状态
 * @returns 图标URL
 */
function getStatusIcon(type: 'favorite' | 'like', isActive: boolean): string {
  const status = isActive ? 'filled' : 'outline';
  return `${CLOUD_BASE_PATH}/${type}-${status}.png`;
}

/**
 * 获取功能图标
 * @param type 图标类型
 * @returns 图标URL
 */
function getFeatureIcon(type: 'hero-category' | 'beta-plan' | 'recommend-plan' | 'create-plan' | 'favorite-plan' | 'my-plan'): string {
  return `${CLOUD_BASE_PATH}/${type}.png`;
}

/**
 * 获取Tabbar图标
 * @param page 页面名称
 * @param isSelected 是否选中状态
 * @returns 图标URL
 */
function getTabbarIcon(page: 'strategy' | 'user', isSelected: boolean): string {
  const suffix = isSelected ? '-selected' : '';
  return `${CLOUD_BASE_PATH}/tabbar-${page}${suffix}.png`;
}

/**
 * 获取收藏图标
 * @param isFavorited 是否已收藏
 * @returns 图标URL
 */
export function getFavoriteIcon(isFavorited: boolean): string {
  return getStatusIcon('favorite', isFavorited);
}

/**
 * 获取点赞图标
 * @param isLiked 是否已点赞
 * @returns 图标URL
 */
export function getLikeIcon(isLiked: boolean): string {
  return getStatusIcon('like', isLiked);
}

/**
 * 获取英雄分类图标
 * @returns 图标URL
 */
export function getHeroCategoryIcon(): string {
  return getFeatureIcon('hero-category');
}

/**
 * 获取Beta方案图标
 * @returns 图标URL
 */
export function getBetaPlanIcon(): string {
  return getFeatureIcon('beta-plan');
}

/**
 * 获取推荐方案图标
 * @returns 图标URL
 */
export function getRecommendPlanIcon(): string {
  return getFeatureIcon('recommend-plan');
}

/**
 * 获取创建方案图标
 * @returns 图标URL
 */
export function getCreatePlanIcon(): string {
  return getFeatureIcon('create-plan');
}

/**
 * 获取收藏方案图标
 * @returns 图标URL
 */
export function getFavoritePlanIcon(): string {
  return getFeatureIcon('favorite-plan');
}

/**
 * 获取我的方案图标
 * @returns 图标URL
 */
export function getMyPlanIcon(): string {
  return getFeatureIcon('my-plan');
}

/**
 * 获取空状态图标
 * @param type 空状态类型
 * @returns 图标URL
 */
export function getEmptyIcon(type: 'favorites' | 'search' | 'error'): string {
  // 使用云端图片路径
  return `${CLOUD_BASE_PATH}/empty-${type}.png`;
}

/**
 * 获取本地备用图标（当云端图片加载失败时使用）
 * @param _type 图标类型
 * @returns 本地图标URL
 */
export function getLocalFallbackIcon(_type: 'favorites' | 'search' | 'error'): string {
  // 使用本地default-avatar作为备用图标
  return '/pages/images/icons/unused/default-avatar.png';
}

/**
 * 获取策略页面Tabbar图标
 * @param isSelected 是否选中
 * @returns 图标URL
 */
export function getStrategyTabIcon(isSelected: boolean): string {
  return getTabbarIcon('strategy', isSelected);
}

/**
 * 获取用户页面Tabbar图标
 * @param isSelected 是否选中
 * @returns 图标URL
 */
export function getUserTabIcon(isSelected: boolean): string {
  return getTabbarIcon('user', isSelected);
}

/**
 * 获取所有图标路径（用于预加载）
 * @returns 所有图标URL数组
 */
export function getAllIconUrls(): string[] {
  return [
    // 状态图标
    getFavoriteIcon(false),
    getFavoriteIcon(true),
    getLikeIcon(false),
    getLikeIcon(true),
    
    // 功能图标
    getHeroCategoryIcon(),
    getBetaPlanIcon(),
    getRecommendPlanIcon(),
    getCreatePlanIcon(),
    getFavoritePlanIcon(),
    getMyPlanIcon(),
    
    // Tabbar图标
    getStrategyTabIcon(false),
    getStrategyTabIcon(true),
    getUserTabIcon(false),
    getUserTabIcon(true)
  ];
} 