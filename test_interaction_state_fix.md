# 交互状态修复测试说明

## 问题描述
在recommendPlan页面实现点赞/收藏之后，对应方案的点赞收藏状态改变，返回strategy页面，再进入recommendPlan页面，发现对应方案的点赞/收藏状态没有正确保存显示。

## 修复内容

### 1. 优化缓存清理策略
- 修改了 `clearFavoriteRelatedCache()` 和 `clearLikeRelatedCache()` 方法
- 不再清除所有缓存数据，只清除筛选相关的缓存
- 保留基础数据（`modeDataCache`、`originalAllPlans`）
- 添加 `needsRefreshInteractionState` 标记，避免过度清理

### 2. 添加交互状态刷新机制
- 新增 `refreshInteractionState()` 方法
- 在需要时调用云函数获取最新的交互状态
- 只更新交互状态，不重新获取所有数据
- 避免重复的云函数调用

### 3. 改进页面生命周期管理
- 在 `onLoad` 时标记需要刷新交互状态
- 在 `onShow` 时检查并刷新交互状态
- 在数据加载完成后自动刷新交互状态

### 4. 避免重复调用云函数
- 添加 `hasRefreshedInteractionState` 标记
- 确保交互状态只刷新一次
- 避免在onShow和数据加载完成后重复刷新

## 测试步骤

### 测试1：基本交互状态保持
1. 进入recommendPlan页面
2. 对某个方案进行点赞或收藏操作
3. 返回strategy页面
4. 再次进入recommendPlan页面
5. 验证点赞/收藏状态是否正确显示

### 测试2：多个交互操作
1. 进入recommendPlan页面
2. 对多个方案进行点赞和收藏操作
3. 返回strategy页面
4. 再次进入recommendPlan页面
5. 验证所有交互状态是否正确显示

### 测试3：页面切换性能
1. 进入recommendPlan页面
2. 进行交互操作
3. 快速切换页面多次
4. 验证页面加载性能和状态正确性

### 测试4：云函数调用优化
1. 进入recommendPlan页面
2. 进行交互操作
3. 返回strategy页面
4. 再次进入recommendPlan页面
5. 验证云函数只被调用一次（用于刷新交互状态）

## 预期结果
- 交互状态在页面切换后能正确保持
- 页面加载性能不受影响
- 缓存策略更加合理，避免过度清理
- 用户体验更加流畅
- **云函数只被调用一次，避免重复调用**

## 技术细节
- 使用 `needsRefreshInteractionState` 标记控制状态刷新
- 使用 `hasRefreshedInteractionState` 标记避免重复刷新
- 优化缓存清理策略，保留必要的基础数据
- 在合适的时机自动刷新交互状态
- 避免重复的云函数调用
