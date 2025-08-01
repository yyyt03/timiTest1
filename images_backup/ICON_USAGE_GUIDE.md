
# 图标文件命名规范和使用指南

## 命名规范

### 状态图标
- `favorite-outline.png` - 未收藏状态
- `favorite-filled.png` - 已收藏状态  
- `like-outline.png` - 未点赞状态
- `like-filled.png` - 已点赞状态

### 功能图标
- `hero-category.png` - 英雄分类
- `beta-plan.png` - Beta方案
- `recommend-plan.png` - 推荐方案
- `create-plan.png` - 创建方案
- `favorite-plan.png` - 收藏方案

### Tabbar图标
- `tabbar-strategy.png` - 策略页面（未选中）
- `tabbar-strategy-selected.png` - 策略页面（选中）
- `tabbar-user.png` - 用户页面（未选中）
- `tabbar-user-selected.png` - 用户页面（选中）

## 代码使用示例

```javascript
// 状态图标
const favoriteIcon = isFavorited ? 'favorite-filled.png' : 'favorite-outline.png';
const likeIcon = isLiked ? 'like-filled.png' : 'like-outline.png';

// 功能图标
const categoryIcon = 'hero-category.png';
const createIcon = 'create-plan.png';

// Tabbar图标
const strategyIcon = isSelected ? 'tabbar-strategy-selected.png' : 'tabbar-strategy.png';
```

## 云存储路径

```
文件名称	File ID	文件大小	最后更新时间
beta-plan.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/beta-plan.png	3.32 KB	2025-08-02 01:34:57
create-plan.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/create-plan.png	6.10 KB	2025-08-02 01:35:00
favorite-filled.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/favorite-filled.png	3.40 KB	2025-08-02 01:35:02
favorite-outline.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/favorite-outline.png	3.34 KB	2025-08-02 01:35:05
favorite-plan.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/favorite-plan.png	4.41 KB	2025-08-02 01:35:07
hero-category.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/hero-category.png	4.31 KB	2025-08-02 01:35:10
like-filled.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/like-filled.png	2.74 KB	2025-08-02 01:35:12
like-outline.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/like-outline.png	2.73 KB	2025-08-02 01:35:15
recommend-plan.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/recommend-plan.png	3.23 KB	2025-08-02 01:35:17
tabbar-strategy-selected.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/tabbar-strategy-selected.png	4.81 KB	2025-08-02 01:35:21
tabbar-strategy.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/tabbar-strategy.png	4.63 KB	2025-08-02 01:35:23
tabbar-user-selected.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/tabbar-user-selected.png	4.00 KB	2025-08-02 01:35:25
tabbar-user.png	cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/icons/tabbar-user.png	3.92 KB	2025-08-02 01:35:28

```
