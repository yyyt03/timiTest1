# 缓存共享优化修复指导

## 问题描述
在对 `recommendPlan` 和 `betaPlan` 页面进行缓存共享优化时，修改过程中出现了语法错误，导致两个页面编译失败。

## 已完成的工作
✅ 创建了 `miniprogram/utils/planService.ts` - 全局方案服务
✅ 修改了 `cloudfunctions/getRecommendPlans/index.js` - 支持 `mode='all'`
✅ 更新了 `miniprogram/utils/cacheKeys.ts` - 添加全局缓存键 `ALL_PLANS_CACHE_KEY`
✅ 添加了 `planService` 导入到两个页面

## 需要修复的问题
❌ `betaPlan.ts` 文件有语法错误，需要替换 `loadBetaPlans` 函数
❌ `recommendPlan.ts` 文件有语法错误，需要替换 `loadRecommendPlans` 函数

## 修复步骤

### 1. 修复 betaPlan.ts
1. 打开 `miniprogram/pages/betaPlan/betaPlan.ts`
2. 找到 `loadBetaPlans` 函数（大约在第1135行）
3. 删除整个 `loadBetaPlans` 函数（从 `async loadBetaPlans(isLoadMore = false, requestId?: number) {` 开始到对应的 `},` 结束）
4. 用 `loadBetaPlans_replacement.js` 文件中的内容替换

### 2. 修复 recommendPlan.ts  
1. 打开 `miniprogram/pages/recommendPlan/recommendPlan.ts`
2. 找到 `loadRecommendPlans` 函数（大约在第1681行）
3. 删除整个 `loadRecommendPlans` 函数（从 `async loadRecommendPlans(isLoadMore = false, requestId?: number) {` 开始到对应的 `},` 结束）
4. 用 `loadRecommendPlans_replacement.js` 文件中的内容替换

### 3. 清理残留代码
在两个文件中，如果发现还有语法错误，查找并删除以下类型的残留代码：
- 单独的 `return;` 语句
- 不完整的 `if` 语句
- 孤立的代码块

## 优化效果验证
修复完成后，您应该能看到以下效果：
1. 无论先进入哪个页面，云函数只会被调用一次
2. 页面切换时数据从缓存中获取，响应更快
3. 控制台日志显示 "使用planService获取数据" 而不是直接调用云函数

## 测试步骤
1. 清除小程序缓存
2. 先进入 recommendPlan 页面，观察网络请求
3. 然后进入 betaPlan 页面，应该没有新的云函数请求
4. 反过来测试：先进入 betaPlan，再进入 recommendPlan
5. 验证两种情况下云函数都只被调用一次

## 如果仍有问题
如果修复后仍有编译错误，请：
1. 检查是否有未配对的大括号 `{}`
2. 确保所有函数都以 `},` 正确结束
3. 检查 `planService` 的导入是否正确

## 核心改进说明
新的实现方式：
- `planService.getAllPlans()` - 获取所有方案并缓存
- `planService.getRecommendPlans(mode)` - 从缓存中筛选推荐方案
- `planService.getBetaPlans(mode)` - 从缓存中筛选体验服方案
- 云函数只在第一次访问时被调用
- 后续访问都从共享缓存中获取数据
