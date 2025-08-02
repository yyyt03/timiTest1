# 数据库字段名更新指南

## 问题描述

云平台数据库中的plans集合使用了`likes`和`favorites`字段，但云函数期望的是`likeCount`和`favoriteCount`字段，导致点赞和收藏功能的数量更新不正确。

## 解决方案

### 方案一：更新数据库字段名（推荐）

1. **登录微信云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择对应的小程序云环境

2. **更新plans集合字段名**
   - 进入云数据库 → plans集合
   - 对每个文档执行以下操作：
     - 将`likes`字段重命名为`likeCount`
     - 将`favorites`字段重命名为`favoriteCount`

3. **批量更新脚本**
   如果数据量较大，可以使用以下MongoDB命令批量更新：

   ```javascript
   // 更新likes字段为likeCount
   db.plans.updateMany({}, { $rename: { "likes": "likeCount" } })
   
   // 更新favorites字段为favoriteCount
   db.plans.updateMany({}, { $rename: { "favorites": "favoriteCount" } })
   ```

### 方案二：重新导入数据

1. **删除现有plans集合数据**
   - 在云开发控制台中删除plans集合的所有文档

2. **导入更新后的数据**
   - 使用`json_make/plans_data_fixed.json`文件
   - 该文件已更新为使用`likeCount`和`favoriteCount`字段

3. **导入步骤**
   - 在云开发控制台中选择plans集合
   - 点击"导入"按钮
   - 选择`plans_data_fixed.json`文件
   - 确认导入

### 方案三：修改云函数适配现有数据（临时方案）

如果暂时无法更新数据库，可以修改云函数来适配现有的字段名：

1. **修改getHeroPlans云函数**
   ```javascript
   // 将第66-67行改为：
   likes: true,
   favorites: true
   ```

2. **修改toggleLike云函数**
   ```javascript
   // 将所有likeCount改为likes
   likes: db.command.inc(-1)
   likes: updatedPlan.data.likes || 0
   ```

3. **修改toggleFavorite云函数**
   ```javascript
   // 将所有favoriteCount改为favorites
   favorites: db.command.inc(-1)
   favorites: updatedPlan.data.favorites || 0
   ```

4. **修改前端代码**
   ```typescript
   // 将likeCount改为likes，favoriteCount改为favorites
   ```

## 推荐操作步骤

1. **立即执行**：使用方案一更新数据库字段名
2. **验证功能**：重新部署云函数并测试点赞收藏功能
3. **数据备份**：在更新前备份现有数据

## 注意事项

- 更新字段名不会影响likes和favorites集合的数据
- 确保在更新过程中不要有用户正在使用点赞收藏功能
- 建议在低峰期进行数据库更新操作

## 验证方法

更新完成后，可以通过以下方式验证：

1. **检查数据库**：确认plans集合中的字段名已更新
2. **测试功能**：在小程序中测试点赞和收藏功能
3. **查看日志**：检查云函数日志确认数据更新正常

## 相关文件

- `json_make/plans_data_fixed.json` - 更新后的方案数据
- `cloudfunctions/toggleLike/index.js` - 点赞云函数
- `cloudfunctions/toggleFavorite/index.js` - 收藏云函数
- `cloudfunctions/getHeroPlans/index.js` - 获取方案列表云函数 