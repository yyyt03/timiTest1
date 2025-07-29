# 数据库结构设计

## 英雄分类表 (hero_categories)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 自动生成的唯一ID | - |
| key | String | 分类键名 | "shooter" |
| name | String | 分类显示名称 | "射手" |
| order | Number | 排序权重 | 1 |
| createTime | Date | 创建时间 | - |
| updateTime | Date | 更新时间 | - |

### 示例数据
```json
[
  {
    "key": "shooter",
    "name": "射手",
    "order": 1
  },
  {
    "key": "support", 
    "name": "辅助",
    "order": 2
  },
  {
    "key": "assassin",
    "name": "刺客", 
    "order": 3
  },
  {
    "key": "warrior",
    "name": "战士",
    "order": 4
  },
  {
    "key": "mage",
    "name": "法师",
    "order": 5
  }
]
```

## 英雄表 (heroes)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 自动生成的唯一ID | - |
| name | String | 英雄名称 | "孙尚香" |
| category | String | 所属分类键名 | "shooter" |
| avatar | String | 英雄头像URL | "cloud://xxx.jpg" |
| description | String | 英雄描述 | "远程射手英雄" |
| difficulty | Number | 难度等级(1-5) | 3 |
| createTime | Date | 创建时间 | - |
| updateTime | Date | 更新时间 | - |

### 示例数据
```json
[
  {
    "name": "孙尚香",
    "category": "shooter",
    "avatar": "cloud://xxx.jpg",
    "description": "远程射手英雄",
    "difficulty": 3
  },
  {
    "name": "马可波罗", 
    "category": "shooter",
    "avatar": "cloud://xxx.jpg",
    "description": "远程射手英雄",
    "difficulty": 4
  }
]
```

## 云端图片存储方案

### 存储路径规范
```
cloud://your-env-id.xxxx/heroes/
├── shooter/
│   ├── sunshangxiang.png
│   ├── makeboluo.png
│   └── ...
├── support/
│   ├── donghuangtaiyi.png
│   ├── zhongkui.png
│   └── ...
├── assassin/
│   ├── zhaoyun.png
│   ├── libai.png
│   └── ...
├── warrior/
│   ├── sunce.png
│   ├── sikongzhen.png
│   └── ...
└── mage/
    ├── yangyuhuan.png
    ├── daji.png
    └── ...
```

### 图片命名规范
- 使用英雄拼音名称
- 统一使用小写字母
- 文件格式：PNG
- 建议尺寸：200x200px

### 上传步骤
1. 将本地图片上传到云存储
2. 获取图片的 fileID
3. 将 fileID 保存到 heroes 表的 avatar 字段

## 数据初始化脚本

### 创建分类数据
```javascript
// 在云开发控制台执行
const db = wx.cloud.database()

// 插入英雄分类
const categories = [
  { key: 'shooter', name: '射手', order: 1 },
  { key: 'support', name: '辅助', order: 2 },
  { key: 'assassin', name: '刺客', order: 3 },
  { key: 'warrior', name: '战士', order: 4 },
  { key: 'mage', name: '法师', order: 5 }
]

categories.forEach(category => {
  db.collection('hero_categories').add({
    data: {
      ...category,
      createTime: new Date(),
      updateTime: new Date()
    }
  })
})
```

### 创建英雄数据
```javascript
// 在云开发控制台执行
const db = wx.cloud.database()

// 射手英雄
const shooterHeroes = [
  { name: '孙尚香', category: 'shooter', avatar: 'cloud://xxx.jpg', difficulty: 3 },
  { name: '马可波罗', category: 'shooter', avatar: 'cloud://xxx.jpg', difficulty: 4 },
  { name: '后羿', category: 'shooter', avatar: 'cloud://xxx.jpg', difficulty: 2 },
  { name: '狄仁杰', category: 'shooter', avatar: 'cloud://xxx.jpg', difficulty: 3 },
  { name: '鲁班七号', category: 'shooter', avatar: 'cloud://xxx.jpg', difficulty: 1 }
]

shooterHeroes.forEach(hero => {
  db.collection('heroes').add({
    data: {
      ...hero,
      createTime: new Date(),
      updateTime: new Date()
    }
  })
})
```

## 注意事项

1. **图片上传**：建议使用云存储的 CDN 加速
2. **数据同步**：确保 heroes 表的 category 字段与 hero_categories 表的 key 字段一致
3. **性能优化**：可以考虑添加索引和缓存机制
4. **错误处理**：云函数需要完善的错误处理机制 