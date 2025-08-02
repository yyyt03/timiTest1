# 云平台配置详细指南

## 📋 概述
本文档详细说明如何在微信小程序云开发平台配置数据库、云函数和云存储，以支持英雄方案功能。

## 🗄️ 数据库配置

### 1. 创建数据库集合

在微信开发者工具中，进入云开发控制台，创建以下5个集合：

**注意：如果heroes和users集合已存在，请跳过创建步骤，直接导入数据即可。**

#### 1.1 heroes 集合（英雄信息）
- **集合名称**: `heroes`
- **权限设置**: 所有用户可读，仅创建者可写
- **字段说明**:
  - `_id`: 自动生成的唯一ID
  - `name`: 英雄名称（如：孙尚香）
  - `avatar`: 云存储fileID（英雄头像）
  - `category`: 英雄分类（shooter/support/assassin/warrior/mage）
  - `chineseName`: 中文名称
  - `createTime`: 创建时间
  - `updateTime`: 更新时间

#### 1.2 users 集合（用户信息）
- **集合名称**: `users`
- **权限设置**: 仅创建者可读写
- **字段说明**:
  - `_id`: 自动生成的唯一ID
  - `openid`: 微信用户openid
  - `appid`: 小程序appid
  - `unionid`: 微信用户unionid
  - `nickName`: 用户昵称
  - `avatarUrl`: 头像URL
  - `createTime`: 创建时间
  - `updateTime`: 更新时间

#### 1.3 plans 集合（方案信息）
- **集合名称**: `plans`
- **权限设置**: 所有用户可读，仅创建者可写
- **字段说明**:
  - `_id`: 自动生成的唯一ID
  - `heroId`: 英雄ID（对应heroes集合）
  - `heroName`: 英雄名称
  - `creatorId`: 创建者openid
  - `creatorName`: 创建者昵称
  - `title`: 方案标题
  - `description`: 方案描述
  - `coreSkill`: 流派核心技能
  - `talents`: 特性天赋数组
  - `equipment`: 出装推荐
  - `equipmentCode`: 装备密语
  - `strategy`: 方案思路描述
  - `imageUrl`: 一图流图片URL
  - `likes`: 点赞数
  - `favorites`: 收藏数
  - `views`: 浏览量
  - `status`: 状态（active/draft/deleted）
  - `createTime`: 创建时间
  - `updateTime`: 更新时间

#### 1.4 favorites 集合（收藏信息）
- **集合名称**: `favorites`
- **权限设置**: 仅创建者可读写
- **字段说明**:
  - `_id`: 自动生成的唯一ID
  - `userId`: 用户openid
  - `planId`: 方案ID（对应plans集合）
  - `createTime`: 创建时间

#### 1.5 likes 集合（点赞信息）
- **集合名称**: `likes`
- **权限设置**: 仅创建者可读写
- **字段说明**:
  - `_id`: 自动生成的唯一ID
  - `userId`: 用户openid
  - `planId`: 方案ID（对应plans集合）
  - `createTime`: 创建时间

### 2. 导入示例数据

#### 2.1 导入步骤
1. 在云开发控制台选择对应集合
2. 点击"导入"按钮
3. 选择对应的JSON文件：
   - `json_make/plans_data.json` → plans集合
   - `json_make/favorites_data.json` → favorites集合
   - `json_make/likes_data.json` → likes集合
   - `json_make/users_data.json` → users集合
   - `json_make/heroes_data.json` → heroes集合（如果还没有英雄数据）
4. 确认导入

**注意：heroes集合可能已经有数据，如果没有，请先导入heroes_data.json**

#### 2.2 数据格式说明
- 文件格式：JSON Lines（每行一个对象）
- 编码格式：UTF-8
- 时间字段：使用MongoDB ISODate格式 `{"$date": "2025-07-28T10:00:00.000Z"}`

## ☁️ 云函数配置

### 1. 部署云函数

在微信开发者工具中，右键点击以下云函数文件夹，选择"上传并部署：云端安装依赖"：

#### 1.1 getHeroPlans 云函数
- **功能**: 获取指定英雄的方案列表
- **参数**: heroId, page, pageSize
- **返回**: 方案列表、分页信息、用户交互状态

#### 1.2 createPlan 云函数
- **功能**: 创建新方案
- **参数**: 完整的方案数据
- **返回**: 创建结果和方案ID

#### 1.3 toggleFavorite 云函数
- **功能**: 切换收藏状态
- **参数**: planId
- **返回**: 操作结果和新的收藏状态

### 2. 云函数环境配置
确保所有云函数都使用相同的云环境ID：`cloudbase-1gk9t6w2d1d090af`

## 🖼️ 云存储配置

### 1. 英雄头像上传
1. 在云开发控制台选择"存储"
2. 创建文件夹：`heroes/`
3. 上传英雄头像图片到该文件夹
4. 获取每个图片的fileID
5. 更新heroes集合中的avatar字段

### 2. 方案图片上传（可选）
1. 创建文件夹：`plans/`
2. 用于存储方案的一图流图片
3. 获取图片fileID后更新plans集合的imageUrl字段

## 🔧 前端配置

### 1. 云开发初始化
确保 `app.ts` 中已正确初始化云开发：
```typescript
wx.cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
});
```

### 2. 云函数调用
前端代码中已集成云函数调用，无需额外配置。

## 📊 数据库索引配置

### 1. plans 集合索引
创建以下索引以提升查询性能：
- `heroId` (升序)
- `status` (升序)
- `createTime` (降序)
- `creatorId` (升序)

### 2. favorites 集合索引
- `userId` (升序)
- `planId` (升序)
- 复合索引：`userId + planId`

### 3. likes 集合索引
- `userId` (升序)
- `planId` (升序)
- 复合索引：`userId + planId`

## 🧪 测试验证

### 1. 数据导入验证
1. 检查各集合数据是否正确导入
2. 验证时间字段格式是否正确
3. 确认关联关系是否正确

### 2. 云函数测试
1. 在云开发控制台测试云函数
2. 验证参数传递和返回值
3. 检查错误处理是否正常

### 3. 前端功能测试
1. 测试英雄方案页面数据加载
2. 测试方案创建功能
3. 测试收藏功能
4. 测试分页加载

## 🚨 注意事项

### 1. 权限设置
- 确保数据库集合权限设置正确
- 用户数据只能由用户本人访问
- 方案数据所有用户可读，仅创建者可写

### 2. 数据安全
- 定期备份重要数据
- 监控云函数执行情况
- 注意数据量增长对性能的影响

### 3. 成本控制
- 监控云开发资源使用情况
- 合理设置数据库查询限制
- 优化云函数执行效率

## 📞 技术支持

如遇到问题，请检查：
1. 云环境ID是否正确
2. 云函数是否成功部署
3. 数据库权限设置
4. 网络连接状态
5. 控制台错误日志

---

*配置完成后，英雄方案功能即可正常使用* 