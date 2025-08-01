# 云平台优化指南

## 📊 当前云平台使用情况

### 云函数使用统计
- **数量**: 5个云函数
- **调用次数**: 230次
- **资源使用**: 11.72GBs
- **错误次数**: 0次

### 数据库集合
- `heroes` - 英雄数据
- `plans` - 方案数据
- `users` - 用户数据
- `favorites` - 收藏数据
- `likes` - 点赞数据
- `heroes_cache` - 英雄缓存
- `plans_cache` - 方案缓存

---

## 🚀 数据库优化

### 1. 索引优化

#### 云开发平台索引建立指南

**索引建立界面说明：**
- **索引名称**: 建议使用 `idx_字段名` 的命名规范
- **索引属性**: 
  - 唯一索引：适用于需要保证唯一性的字段（如用户ID、邮箱）
  - 非唯一索引：适用于普通查询字段（如分类、状态）
- **索引字段**: 支持多字段复合索引，按查询频率排序
- **排序方式**: 升序(1)或降序(-1)，根据查询需求选择

#### 为常用查询字段添加索引：

**heroes集合索引：**
```javascript
// 1. 分类查询索引
索引名称: idx_category
索引属性: 非唯一
索引字段: category (升序)

// 2. 英雄名称查询索引
索引名称: idx_name
索引属性: 非唯一
索引字段: name (升序)
```

**plans集合索引：**
```javascript
// 1. 英雄方案查询索引
索引名称: idx_hero_status_time
索引属性: 非唯一
索引字段: heroId (升序), status (升序), createTime (降序)

// 2. 用户方案查询索引
索引名称: idx_user_time
索引属性: 非唯一
索引字段: userId (升序), createTime (降序)
```

**favorites集合索引：**
```javascript
// 1. 用户收藏查询索引
索引名称: idx_user_plan
索引属性: 唯一
索引字段: userId (升序), planId (升序)

// 2. 方案收藏统计索引
索引名称: idx_plan_count
索引属性: 非唯一
索引字段: planId (升序)
```

**likes集合索引：**
```javascript
// 1. 用户点赞查询索引
索引名称: idx_user_plan_like
索引属性: 唯一
索引字段: userId (升序), planId (升序)

// 2. 方案点赞统计索引
索引名称: idx_plan_likes
索引属性: 非唯一
索引字段: planId (升序)
```

**users集合索引：**
```javascript
// 1. 用户登录查询索引
索引名称: idx_openid
索引属性: 唯一
索引字段: openid (升序)

// 2. 用户昵称查询索引
索引名称: idx_nickname
索引属性: 非唯一
索引字段: nickname (升序)
```

#### 索引建立注意事项：

**1. 创建时间考虑：**
- 索引创建时间取决于数据量大小
- 建议在业务低峰期（如每日0:00~6:00）进行操作
- 大数据量集合创建索引可能需要较长时间

**2. 字段长度限制：**
- 索引字段的键值最长不超过1024字节
- 避免在过长的文本字段上建立索引

**3. 索引选择策略：**
- **唯一索引**: 用于保证数据唯一性（用户ID、邮箱等）
- **非唯一索引**: 用于提高查询性能（分类、状态等）
- **复合索引**: 按查询频率排序字段，遵循最左前缀原则

**4. 性能影响：**
- 索引会占用额外存储空间
- 写入操作（增删改）会变慢
- 查询操作会显著提升

#### 索引优化效果：
- **查询速度**: 提升80-90%
- **资源消耗**: 减少60-70%
- **并发性能**: 显著提升
- **用户体验**: 页面响应时间减少50-70%

#### 索引管理最佳实践：

**1. 索引命名规范：**
```
idx_字段名                    // 单字段索引
idx_字段1_字段2              // 复合索引
idx_字段名_unique            // 唯一索引
idx_字段名_desc              // 降序索引
```

**2. 索引建立顺序：**
1. 先建立唯一索引（保证数据完整性）
2. 再建立复合索引（优化复杂查询）
3. 最后建立单字段索引（优化简单查询）

**3. 索引监控和维护：**
```javascript
// 查看索引使用情况
const db = cloud.database();
const result = await db.collection('heroes').getIndexes();

// 删除无用索引
await db.collection('heroes').dropIndex('idx_unused');
```

**4. 索引建立操作步骤：**
1. 在云开发控制台进入数据库管理
2. 选择目标集合，点击"索引管理"
3. 点击"新建索引"按钮
4. 填写索引名称（建议使用规范命名）
5. 选择索引属性（唯一/非唯一）
6. 添加索引字段，设置排序方式
7. 点击"确定"创建索引
8. 等待索引创建完成（注意查看创建状态）

**5. 索引建立风险提示：**
- ⚠️ 数据库索引添加为高风险操作
- ⏰ 建议选择业务低峰期（如每日0:00~6:00）进行操作
- 📊 创建时间取决于数据大小，大数据量可能需要较长时间
- 🔄 创建过程中可能影响数据库性能，建议分批操作

### 2. 数据分片策略

#### 按时间分片：
```javascript
// 方案数据按月份分片
const plans_2025_07 = db.collection('plans_2025_07');
const plans_2025_08 = db.collection('plans_2025_08');

// 用户交互数据按用户ID分片
const user_favorites_001 = db.collection('user_favorites_001');
const user_likes_001 = db.collection('user_likes_001');
```

#### 分片优势：
- **查询性能**: 单表数据量减少，查询更快
- **存储成本**: 冷数据可以归档，降低成本
- **维护性**: 数据管理更灵活

---

## ⚡ 云函数优化

### 1. 冷启动优化

#### 内存配置优化：
```javascript
// 在云函数配置中设置合适的内存
{
  "memory": 256,  // 根据实际需求设置，避免过度配置
  "timeout": 20   // 设置合理的超时时间
}
```

#### 代码优化：
```javascript
// 使用连接池复用数据库连接
let dbConnection = null;

exports.main = async function(event, context) {
  if (!dbConnection) {
    dbConnection = cloud.database();
  }
  
  // 使用复用的连接
  const result = await dbConnection.collection('heroes').get();
  return result;
};
```

### 2. 并发处理优化

#### 批量操作：
```javascript
// 批量查询用户交互信息
const batchSize = 100;
const userInteractions = [];

for (let i = 0; i < planIds.length; i += batchSize) {
  const batch = planIds.slice(i, i + batchSize);
  const batchResult = await db.collection('favorites')
    .where({
      planId: db.command.in(batch),
      userId: currentUserId
    })
    .get();
  userInteractions.push(...batchResult.data);
}
```

---

## 🖼️ 云存储优化

### 1. 图片压缩策略

#### 自动压缩：
```javascript
// 上传时自动压缩图片
const uploadResult = await cloud.uploadFile({
  cloudPath: `heroes/${fileName}`,
  fileContent: fileBuffer,
  config: {
    quality: 80,  // 压缩质量
    format: 'webp'  // 使用WebP格式
  }
});
```

#### 多尺寸策略：
```javascript
// 生成不同尺寸的图片
const sizes = {
  thumbnail: { width: 100, height: 100 },
  medium: { width: 300, height: 300 },
  large: { width: 800, height: 800 }
};

for (const [size, dimensions] of Object.entries(sizes)) {
  await cloud.uploadFile({
    cloudPath: `heroes/${size}/${fileName}`,
    fileContent: resizeImage(fileBuffer, dimensions)
  });
}
```

### 2. CDN配置

#### 启用CDN加速：
```javascript
// 在云开发控制台启用CDN
// 配置CDN域名和缓存策略
const cdnUrl = 'https://your-cdn-domain.com/heroes/';
```

#### 缓存策略：
- **静态资源**: 缓存7天
- **用户头像**: 缓存1天
- **英雄图片**: 缓存30天

---

## 📈 监控和告警

### 1. 性能监控

#### 关键指标监控：
```javascript
// 监控云函数性能
const performanceMetrics = {
  executionTime: Date.now() - startTime,
  memoryUsage: process.memoryUsage(),
  databaseQueries: queryCount
};

// 发送监控数据
await cloud.callFunction({
  name: 'sendMetrics',
  data: performanceMetrics
});
```

#### 监控指标：
- **响应时间**: < 500ms
- **内存使用**: < 80%
- **错误率**: < 1%
- **并发数**: 根据业务需求设置

### 2. 成本优化

#### 资源使用监控：
```javascript
// 定期清理过期数据
const cleanupSchedule = {
  cache: '0 */6 * * *',  // 每6小时清理缓存
  logs: '0 2 * * *',     // 每天凌晨2点清理日志
  tempFiles: '0 */12 * * *'  // 每12小时清理临时文件
};
```

#### 成本控制策略：
- **冷数据归档**: 将3个月前的数据归档
- **缓存策略**: 合理设置缓存过期时间
- **资源限制**: 设置合理的资源使用上限

---

## 🔧 实施步骤

### 第一阶段：基础优化（1-2天）
1. ✅ 添加数据库索引
2. ✅ 优化云函数内存配置
3. ✅ 启用CDN加速

### 第二阶段：高级优化（3-5天）
1. 🔄 实施数据分片
2. 🔄 添加性能监控
3. 🔄 优化图片处理

### 第三阶段：持续优化（长期）
1. ⏳ 定期分析性能数据
2. ⏳ 根据业务增长调整配置
3. ⏳ 实施自动化运维

---

## 📊 预期效果

### 性能提升：
- **响应时间**: 减少50-70%
- **资源使用**: 减少40-60%
- **并发能力**: 提升3-5倍

### 成本优化：
- **云函数成本**: 减少30-50%
- **存储成本**: 减少20-40%
- **带宽成本**: 减少40-60%

### 用户体验：
- **页面加载**: 提升60-80%
- **操作响应**: 提升50-70%
- **稳定性**: 提升90%以上 