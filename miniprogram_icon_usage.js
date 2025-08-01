// 小程序端图标使用示例

// 1. 状态图标
const getFavoriteIcon = (isFavorited) => {
  return isFavorited 
    ? 'cloud://your-env-id.xxxx/icons/status/favorite-filled.png'
    : 'cloud://your-env-id.xxxx/icons/status/favorite-outline.png'
}

const getLikeIcon = (isLiked) => {
  return isLiked
    ? 'cloud://your-env-id.xxxx/icons/status/like-filled.png' 
    : 'cloud://your-env-id.xxxx/icons/status/like-outline.png'
}

// 2. 功能图标
const ICON_URLS = {
  heroCategory: 'cloud://your-env-id.xxxx/icons/features/hero-category.png',
  betaPlan: 'cloud://your-env-id.xxxx/icons/features/beta-plan.png',
  recommendPlan: 'cloud://your-env-id.xxxx/icons/features/recommend-plan.png',
  createPlan: 'cloud://your-env-id.xxxx/icons/features/create-plan.png',
  favoritePlan: 'cloud://your-env-id.xxxx/icons/features/favorite-plan.png'
}

// 3. Tabbar图标
const getTabbarIcon = (page, isSelected) => {
  const basePath = 'cloud://your-env-id.xxxx/icons/tabbar'
  const suffix = isSelected ? '-selected' : ''
  return `${basePath}/tabbar-${page}${suffix}.png`
}

// 使用示例
Page({
  data: {
    favoriteIcon: getFavoriteIcon(false),
    likeIcon: getLikeIcon(true),
    categoryIcon: ICON_URLS.heroCategory,
    strategyTabIcon: getTabbarIcon('strategy', true)
  }
})
