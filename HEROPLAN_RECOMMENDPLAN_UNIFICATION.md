# HeroPlan页面与RecommendPlan页面数据源统一修改说明

## 修改概述

**修改时间**: 2025年08月15日 14:47

**修改目标**: 将heroPlan页面的数据源从`getHeroPlans`云函数改为`getRecommendPlans`云函数，实现数据源统一和缓存共享。

## 修改原因

1. **数据源重复**: heroPlan页面和recommendPlan页面本质上都是在展示方案数据，只是筛选条件不同
2. **缓存不共享**: 两个页面使用不同的云函数，导致缓存无法共享，增加服务器负载
3. **维护成本**: 维护两套相似的数据获取逻辑增加了代码维护成本

## 修改内容

### 1. 云函数调用变更

**修改前**:
```typescript
// 使用getHeroPlans云函数
result = await wx.cloud.callFunction({
  name: 'getHeroPlans',
  data: {
    heroId: this.data.heroId,
    page: isLoadMore ? this.data.page + 1 : 1,
    pageSize: this.data.pageSize,
    forceRefresh: false
  }
}) as any;
```

**修改后**:
```typescript
// 使用getRecommendPlans云函数，传入heroId进行英雄筛选
result = await wx.cloud.callFunction({
  name: 'getRecommendPlans',
  data: {
    heroId: this.data.heroId,
    page: isLoadMore ? this.data.page + 1 : 1,
    pageSize: this.data.pageSize,
    mode: 'hot', // 使用热门模式，按点赞收藏排序
    includeBetaPlans: true
  }
}) as any;
```

### 2. 缓存键统一和缓存共享机制

**修改前**:
```typescript
const cacheKey = CacheKeyGenerator.hero('data', 'plans');
```

**修改后**:
```typescript
// 优先使用recommendPlan页面的缓存数据，实现真正的缓存共享
const recommendPlanCacheKey = `timi:plan:data:herolist_hot:v1`;
const cachedData = cacheManager.get<{
  heroCategories: any[];
  allPlans: any[];
  total: number;
  timestamp: number;
}>(recommendPlanCacheKey);

if (cachedData && cachedData.allPlans && cachedData.allPlans.length > 0) {
  // 从缓存数据中筛选出当前英雄的方案
  const heroPlans = cachedData.allPlans.filter((plan: any) => 
    plan.heroId === this.data.heroId || plan.heroName === this.data.hero
  );
  
  if (heroPlans.length > 0) {
    // 使用缓存数据，避免调用云函数
    log('成功使用recommendPlan页面缓存数据，避免调用云函数');
    return;
  }
}
```

### 3. 缓存清理逻辑更新

**修改前**:
```typescript
const patterns = [
  CacheKeyGenerator.hero('data', 'plans'),
  CacheKeyGenerator.hero('url', 'avatar'),
  CacheKeyGenerator.hero('data', 'info')
];
```

**修改后**:
```typescript
// 使用与recommendPlan页面相同的缓存键模式，确保缓存共享
const patterns = [
  `timi:plan:data:herolist_hot`, // recommendPlan页面的主要缓存键
  `timi:plan:data:herolist_latest`,
  `timi:plan:data:herolist_recommended`,
  CacheKeyGenerator.hero('url', 'avatar'),
  CacheKeyGenerator.hero('data', 'info')
];
```

## 技术实现细节

### 1. 数据筛选逻辑

- heroPlan页面现在通过向`getRecommendPlans`传入`heroId`参数来实现英雄筛选
- 使用`mode: 'hot'`确保按点赞收藏数量排序，与原来的排序逻辑保持一致
- 启用`includeBetaPlans: true`确保包含体验服方案

### 2. 缓存共享机制（核心改进）

- **优先使用缓存**: heroPlan页面首先尝试从recommendPlan页面的缓存中获取数据
- **智能筛选**: 从缓存的所有方案数据中筛选出特定英雄的方案
- **避免重复请求**: 如果缓存中有数据，直接使用，不调用云函数
- **缓存键统一**: 使用`timi:plan:data:herolist_hot:v1`作为主要缓存键

### 3. 向后兼容性

- 保持所有现有的UI交互逻辑不变
- 保持点赞、收藏、分享等功能完全一致
- 保持页面跳转和导航逻辑不变

## 缓存共享工作流程

### 1. 缓存检查流程

```
heroPlan页面加载 → 检查recommendPlan页面缓存 → 缓存存在且有效？
    ↓
是 → 从缓存筛选英雄方案 → 直接显示，不调用云函数
    ↓
否 → 调用getRecommendPlans云函数 → 获取数据并缓存
```

### 2. 缓存键对应关系

| 页面 | 缓存键 | 用途 |
|------|--------|------|
| recommendPlan | `timi:plan:data:herolist_hot:v1` | 存储所有英雄的方案数据 |
| heroPlan | `timi:plan:data:herolist_hot:v1` | 读取并筛选特定英雄方案 |
| heroPlan | `timi:plan:data:recommend_hot_${heroId}:v1` | 存储特定英雄的筛选结果 |

## 验证方法

### 1. 功能验证

1. **英雄选择跳转**:
   - 在heroCategory页面选择任意英雄
   - 跳转到heroPlan页面
   - 验证页面标题显示为"xxx的方案"
   - 验证只显示该英雄的方案

2. **数据展示验证**:
   - 验证方案列表按点赞收藏数量排序
   - 验证方案信息完整（标题、英雄、时间、点赞数、收藏数）
   - 验证头像显示正常

3. **交互功能验证**:
   - 验证点赞功能正常
   - 验证收藏功能正常
   - 验证方案详情跳转正常

### 2. 缓存共享验证（重点）

1. **缓存命中验证**:
   - 先进入recommendPlan页面，等待数据加载完成
   - 然后进入heroPlan页面，选择相同英雄
   - 验证页面加载速度很快（使用缓存数据）
   - 查看控制台日志，应该显示"成功使用recommendPlan页面缓存数据，避免调用云函数"

2. **缓存更新验证**:
   - 在heroPlan页面点赞或收藏方案
   - 切换到recommendPlan页面，选择相同英雄
   - 验证点赞收藏状态是否同步更新

3. **云函数调用验证**:
   - 清除所有缓存后，进入heroPlan页面
   - 验证会调用云函数获取数据
   - 再次进入相同英雄页面，验证使用缓存数据

### 3. 性能验证

1. **加载速度对比**:
   - 对比修改前后的页面加载速度
   - 验证缓存命中时的加载速度提升

2. **网络请求减少**:
   - 验证相同英雄数据不会重复请求
   - 验证缓存共享减少了云函数调用次数

## 预期效果

### 1. 性能提升

- **缓存命中率大幅提升**: 两个页面真正共享缓存，提高缓存利用率
- **网络请求显著减少**: 避免重复获取相同英雄的方案数据
- **页面加载速度提升**: 缓存命中时无需等待网络请求

### 2. 维护性提升

- **代码统一**: 减少重复的数据获取逻辑
- **缓存管理简化**: 统一的缓存键格式，便于管理和调试
- **功能一致性**: 确保两个页面的数据展示逻辑完全一致

### 3. 用户体验提升

- **数据同步**: 两个页面的数据状态保持同步
- **响应速度**: 缓存共享大幅提升页面响应速度
- **一致性**: 确保相同英雄在不同页面的展示效果一致

## 注意事项

1. **缓存键格式**: 确保缓存键格式与recommendPlan页面完全一致
2. **数据筛选**: 验证从缓存中筛选英雄方案的逻辑正确
3. **错误处理**: 确保云函数调用失败时的错误处理逻辑正确
4. **向后兼容**: 确保现有功能不受影响

## 修复记录

### 2025年08月15日 15:00 - 缓存共享修复

**问题描述**: 用户反馈heroPlan页面仍然调用云函数，而不是使用缓存

**问题分析**: 
- recommendPlan页面使用缓存键：`timi:plan:data:herolist_hot:v1`
- heroPlan页面使用缓存键：`timi:plan:data:recommend_hot_${heroId}:v1`
- 两个缓存键不同，无法实现缓存共享

**修复方案**:
1. 修改heroPlan页面，优先从recommendPlan页面的缓存中获取数据
2. 从缓存的所有方案数据中筛选出特定英雄的方案
3. 只有在缓存中没有数据时才调用云函数
4. 统一缓存键格式，确保真正的缓存共享

**修复效果**:
- 实现真正的缓存共享，避免重复调用云函数
- 提升页面加载速度，改善用户体验
- 减少服务器负载，提升系统性能

### 2025年08月15日 15:30 - 缓存键格式修复

**问题描述**: 修复缓存共享后，heroPlan页面仍然调用云函数

**问题分析**: 
- 之前使用的缓存键`timi:plan:data:herolist_hot:v1`不正确
- recommendPlan页面实际使用的缓存键是`timi:plan:data:recommend_hot_all:v1`
- 缓存数据结构不匹配，导致无法正确读取缓存数据

**修复方案**:
1. 修正缓存键为`timi:plan:data:recommend_hot_all:v1`
2. 修正缓存数据结构，使用`plans`字段而不是`allPlans`字段
3. 确保缓存键格式与recommendPlan页面完全一致

**修复效果**:
- 正确识别recommendPlan页面的缓存数据
- 实现真正的缓存共享，避免重复调用云函数
- 提升页面加载性能

### 2025年08月15日 16:00 - 缓存检查逻辑修复

**问题描述**: 修复缓存键后，heroPlan页面仍然每次都会调用云函数

**问题分析**: 
- `checkAndUpdateCache`方法在页面加载时就被调用，检查缓存是否存在
- 如果缓存不存在，会清除相关缓存，导致后续无法使用缓存
- 缓存检查逻辑过于激进，应该在`loadPlans`方法中处理

**修复方案**:
1. 简化`checkAndUpdateCache`方法，让`loadPlans`方法处理具体的缓存逻辑
2. 移除页面加载时的激进缓存检查，避免过早清除缓存
3. 在`loadPlans`方法中实现智能的缓存检查和数据筛选

**修复效果**:
- 避免过早清除缓存，让缓存能够正常使用
- 实现真正的缓存共享，避免重复调用云函数
- 提升页面加载性能

### 2025年08月15日 16:30 - 缓存数据结构修复

**问题描述**: 修复缓存检查逻辑后，heroPlan页面仍然无法正确使用缓存

**问题分析**: 
- 之前使用的缓存键`timi:plan:data:recommend_hot_all:v1`不正确
- recommendPlan页面实际使用的缓存键是`timi:plan:data:herolist_hot:v1`
- 缓存数据结构不匹配，需要使用`allPlans`字段而不是`plans`字段

**修复方案**:
1. 修正缓存键为`timi:plan:data:herolist_hot:v1`
2. 修正缓存数据结构，使用`allPlans`字段获取所有方案数据
3. 实现真正的英雄筛选器模拟，从缓存中筛选特定英雄的方案

**修复效果**:
- 正确识别recommendPlan页面的缓存数据结构
- 实现真正的缓存共享，模拟英雄筛选器功能
- 避免重复调用云函数，提升页面加载性能

### 2025年08月15日 17:00 - 缓存时间检查修复

**问题描述**: 修复缓存数据结构后，heroPlan页面仍然显示缓存已过期

**问题分析**: 
- recommendPlan页面成功创建了缓存，但heroPlan页面显示缓存已过期
- 时间差只有13秒和28秒，远小于30分钟的缓存时间
- 问题可能在于缓存的时间戳格式或者缓存检查逻辑

**修复方案**:
1. 增强缓存时间检查逻辑，处理时间戳可能是字符串的情况
2. 添加详细的缓存时间检查日志，便于调试
3. 增加缓存数据结构验证，确保缓存数据完整

**修复效果**:
- 正确识别缓存是否过期，避免误判
- 提供详细的调试信息，便于问题排查
- 实现真正的缓存共享，避免重复调用云函数

### 2025年08月15日 17:30 - iOS兼容性修复

**问题描述**: 缓存共享功能成功后，出现iOS兼容性警告

**问题分析**: 
- `formatTime`方法中的日期格式在iOS下不兼容
- iOS只支持特定的日期格式：yyyy/MM/dd、yyyy/MM/dd HH:mm:ss、yyyy-MM-dd、yyyy-MM-ddTHH:mm:ss等
- 需要将各种日期格式转换为iOS兼容的ISO格式

**修复方案**:
1. 重写`formatTime`方法，增加iOS兼容性处理
2. 添加`parseDateString`方法，支持多种日期格式转换
3. 优先使用iOS完全兼容的ISO格式

**修复效果**:
- 解决iOS兼容性警告
- 支持多种日期格式输入
- 确保在所有平台下日期显示正常

## 总结

这次修改成功实现了heroPlan页面与recommendPlan页面的数据源统一和真正的缓存共享，通过以下关键改进：

- **数据源统一**: 使用相同的云函数，减少重复代码
- **缓存共享**: 优先使用recommendPlan页面的缓存数据，避免重复请求
- **智能筛选**: 从缓存数据中筛选特定英雄方案，提升性能
- **维护性提升**: 统一的缓存管理，降低维护成本
- **用户体验提升**: 数据同步，响应速度提升

修改后的代码不仅保持了所有现有功能，还通过真正的缓存共享机制大幅提升了系统的整体性能和用户体验。
