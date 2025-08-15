# betaPlan 事件处理修复验证

## 修复内容

### 1. selectHero 事件处理修复
**问题**: 原代码寻找 `dataset.heroId` 但 WXML 绑定为 `data-hero`
**修复**: 改为使用 `dataset.hero` 获取英雄名称

```typescript
// 修复前
const heroId = e.currentTarget.dataset.heroId || e.currentTarget.dataset.heroid;

// 修复后  
const heroName = e.currentTarget.dataset.hero;
```

### 2. switchFilter 事件处理修复
**问题**: WXML 绑定 `switchFilter` 但代码中只有 `switchMode`
**修复**: 添加了 `switchFilter` 函数来处理 WXML 的 `bindtap="switchFilter"` 绑定

```typescript
// 新增函数
switchFilter(e: any) {
  const type = e.currentTarget.dataset.type;
  // 处理模式切换逻辑
}
```

## 对应的 WXML 绑定

### 英雄选择
```xml
<view bindtap="selectHero" data-hero="{{item.heroName}}">
```

### 模式切换
```xml
<view bindtap="switchFilter" data-type="recommended">
<view bindtap="switchFilter" data-type="hot">
<view bindtap="switchFilter" data-type="latest">
```

## 测试方案

1. **英雄筛选测试**
   - 点击不同英雄，检查 `selectedHero` 是否正确设置
   - 验证筛选结果是否正确显示

2. **模式切换测试** 
   - 点击推荐方案/热门方案/最新方案标签
   - 检查 `currentMode` 是否正确切换
   - 验证数据加载和显示是否正常

3. **控制台日志验证**
   - 检查 `选择英雄:` 日志是否显示正确的英雄名称
   - 检查 `切换筛选类型:` 日志是否显示正确的模式

## 预期结果

- 英雄选择功能正常工作，不再出现 undefined 错误
- 模式切换功能正常工作，不再出现 [object Object] 错误
- 缓存共享机制正常运作
- 筛选和排序功能恢复正常
