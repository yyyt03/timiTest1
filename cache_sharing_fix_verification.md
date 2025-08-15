# 缓存共享修复验证文档

## 问题诊断

### 发现的问题
通过日志分析发现，betaPlan 页面在 `onLoad` 时调用了 `clearIncompleteCache()`，该函数使用 `cacheManager.clear()` 清空了**所有**缓存，包括 recommendPlan 页面创建的共享缓存。

### 关键日志
```
VM728 logger.js:203 [2025-08-15T09:31:14.582Z] [INFO] 所有缓存已清空
```

这导致 betaPlan 页面无法使用 recommendPlan 页面的缓存数据，必须重新调用云函数。

## 修复方案

### 1. 精确缓存清理
修改 `clearIncompleteCache()` 和 `clearAllRelatedCache()` 函数，不再使用 `cacheManager.clear()` 全局清理，而是：

- **保留**: `ALL_PLANS_CACHE_KEY` (planService 使用的全局方案缓存)
- **清理**: 只清理页面特定的缓存键 (`beta_plans_cache_`, `hero_list_beta_`, `recommend_plans_cache_beta_`)

### 2. 修复前 vs 修复后

**修复前**:
```typescript
clearIncompleteCache() {
  cacheManager.clear(); // 清空所有缓存，破坏共享
}
```

**修复后**:
```typescript
clearIncompleteCache() {
  // 只清理 betaPlan 页面特定的缓存，保留全局共享的 planService 缓存
  const keysToRemove = ['beta_plans_cache_', 'hero_list_beta_', 'recommend_plans_cache_beta_'];
  // 精确清理...
}
```

## 预期效果

### 缓存共享流程
1. **recommendPlan → betaPlan**: 
   - recommendPlan 首次调用云函数，缓存数据到 `ALL_PLANS_CACHE_KEY`
   - betaPlan 启动时不清空全局缓存，直接使用已有数据
   - **应该看到**: `从全局缓存获取所有方案数据`

2. **betaPlan → recommendPlan**:
   - betaPlan 首次调用云函数，缓存数据到 `ALL_PLANS_CACHE_KEY`
   - recommendPlan 启动时直接使用已有数据
   - **应该看到**: `从全局缓存获取所有方案数据`

### 验证标志
- ✅ 不再看到 `所有缓存已清空` 日志
- ✅ 第二个进入的页面应该显示 `从全局缓存获取所有方案数据`
- ✅ 第二个页面不应该重新调用 `getRecommendPlans` 云函数
- ✅ 页面切换时总云函数调用次数保持在 1 次

## 测试步骤

1. **场景1: recommendPlan → betaPlan**
   - 先进入 recommendPlan 页面 
   - 等待数据加载完成
   - 切换到 betaPlan 页面
   - 检查是否使用缓存

2. **场景2: betaPlan → recommendPlan**  
   - 先进入 betaPlan 页面
   - 等待数据加载完成
   - 切换到 recommendPlan 页面
   - 检查是否使用缓存

3. **关键日志观察**
   - 是否出现 `所有缓存已清空`
   - 是否出现 `从全局缓存获取所有方案数据`
   - 云函数调用次数是否符合预期
