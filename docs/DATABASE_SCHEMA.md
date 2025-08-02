# 数据库结构设计

## 概述
本文档描述了王者荣耀攻略小程序的所有数据库集合结构，包括集合名称、权限设置、字段说明和示例数据。

## 数据集合列表

### 1. 英雄分类集合 (hero_categories)
- **集合名称**: `hero_categories`
- **权限设置**: 选择"所有用户可读，仅创建者可写"

### 2. 英雄集合 (heroes)
- **集合名称**: `heroes`
- **权限设置**: 选择"所有用户可读，仅创建者可写"

### 3. 用户集合 (users)
- **集合名称**: `users`
- **权限设置**: 选择"仅创建者可读写"

### 4. 攻略集合 (plans)
- **集合名称**: `plans`
- **权限设置**: 选择"所有用户可读，仅创建者可写"

### 5. 点赞集合 (likes)
- **集合名称**: `likes`
- **权限设置**: 选择"仅创建者可读写"

### 6. 收藏集合 (favorites)
- **集合名称**: `favorites`
- **权限设置**: 选择"仅创建者可读写"

## 权限类型说明

| 权限类型 | 说明 | 适用场景 |
|---------|------|----------|
| 所有用户可读，仅创建者可写 | 所有用户可查看数据，只有创建者可修改 | ✅ 推荐：英雄分类、英雄数据、攻略数据 |
| 仅创建者可读写 | 只有创建者可查看和修改 | ✅ 推荐：用户数据、点赞数据、收藏数据 |
| 所有用户可读写 | 所有用户可查看和修改 | 公共协作数据 |
| 仅管理员可读写 | 只有管理员可查看和修改 | 系统配置数据 |

## 详细字段说明

### 英雄分类表 (hero_categories)

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
    "order": 1,
    "createTime": {"$date": "2025-07-28T20:25:00.882Z"},
    "updateTime": {"$date": "2025-07-28T20:25:00.882Z"}
  },
  {
    "key": "support", 
    "name": "辅助",
    "order": 2,
    "createTime": {"$date": "2025-07-28T20:25:00.882Z"},
    "updateTime": {"$date": "2025-07-28T20:25:00.882Z"}
  },
  {
    "key": "assassin",
    "name": "刺客", 
    "order": 3,
    "createTime": {"$date": "2025-07-28T20:25:00.882Z"},
    "updateTime": {"$date": "2025-07-28T20:25:00.882Z"}
  },
  {
    "key": "warrior",
    "name": "战士",
    "order": 4,
    "createTime": {"$date": "2025-07-28T20:25:00.882Z"},
    "updateTime": {"$date": "2025-07-28T20:25:00.882Z"}
  },
  {
    "key": "mage",
    "name": "法师",
    "order": 5,
    "createTime": {"$date": "2025-07-28T20:25:00.882Z"},
    "updateTime": {"$date": "2025-07-28T20:25:00.882Z"}
  }
]
```

### 英雄表 (heroes)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 英雄唯一标识符 | "sunshangxiang" |
| name | String | 英雄名称 | "孙尚香" |
| category | String | 所属分类键名 | "shooter" |
| avatar | String | 英雄头像URL | "cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/sunshangxiang.jpg" |
| description | String | 英雄描述 | "远程射手英雄" |
| difficulty | Number | 难度等级(1-5) | 3 |
| createTime | Date | 创建时间 | - |
| updateTime | Date | 更新时间 | - |

### 示例数据
```json
[
  {
    "_id": "sunshangxiang",
    "name": "孙尚香",
    "category": "shooter",
    "avatar": "cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/sunshangxiang.jpg",
    "description": "远程射手英雄",
    "difficulty": 3,
    "createTime": {"$date": "2025-07-28T21:10:00.000Z"},
    "updateTime": {"$date": "2025-07-28T21:10:00.000Z"}
  },
  {
    "_id": "makeboluo",
    "name": "马可波罗", 
    "category": "shooter",
    "avatar": "cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/makeboluo.jpg",
    "description": "远程射手英雄",
    "difficulty": 4,
    "createTime": {"$date": "2025-07-28T21:10:00.000Z"},
    "updateTime": {"$date": "2025-07-28T21:10:00.000Z"}
  }
]
```

### 用户表 (users)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 用户唯一标识符 | "user_001" |
| openid | String | 微信小程序openid | "test_openid_001" |
| appid | String | 微信小程序appid | "wx123456789" |
| unionid | String | 微信unionid | "test_unionid_001" |
| nickName | String | 用户昵称 | "王者大神" |
| avatarUrl | String | 用户头像URL | "https://example.com/avatar1.jpg" |
| createTime | Date | 创建时间 | - |
| updateTime | Date | 更新时间 | - |

### 示例数据
```json
[
  {
    "_id": "user_001",
    "openid": "test_openid_001",
    "appid": "wx123456789",
    "unionid": "test_unionid_001",
    "nickName": "王者大神",
    "avatarUrl": "https://example.com/avatar1.jpg",
    "createTime": {"$date": "2025-07-20T10:00:00.000Z"},
    "updateTime": {"$date": "2025-07-28T15:30:00.000Z"}
  },
  {
    "_id": "user_002",
    "openid": "test_openid_002",
    "appid": "wx123456789",
    "unionid": "test_unionid_002",
    "nickName": "游戏达人",
    "avatarUrl": "https://example.com/avatar2.jpg",
    "createTime": {"$date": "2025-07-21T11:00:00.000Z"},
    "updateTime": {"$date": "2025-07-27T16:45:00.000Z"}
  }
]
```

### 攻略表 (plans)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 攻略唯一标识符 | "plan_001" |
| heroId | String | 关联英雄ID | "sunshangxiang" |
| heroName | String | 英雄名称 | "孙尚香" |
| creatorId | String | 创建者用户ID | "user_001" |
| creatorName | String | 创建者昵称 | "王者大神" |
| title | String | 攻略标题 | "孙尚香 - 暴击流" |
| description | String | 攻略描述 | "专注于暴击伤害的孙尚香玩法" |
| coreSkill | String | 核心技能 | "一技能强化" |
| talents | Array | 天赋选择 | ["暴击率提升", "攻速加成", "移速提升"] |
| equipment | String | 装备搭配 | "无尽战刃 + 破军 + 泣血之刃 + 闪电匕首 + 贤者的庇护 + 抵抗之靴" |
| equipmentCode | String | 装备代码 | "123456" |
| strategy | String | 策略说明 | "前期发育，中期团战，后期carry全场..." |
| imageUrl | String | 攻略图片URL | "" |
| likes | Number | 点赞数 | 15 |
| favorites | Number | 收藏数 | 8 |
| views | Number | 浏览量 | 120 |
| status | String | 状态 | "active" |
| createTime | Date | 创建时间 | - |
| updateTime | Date | 更新时间 | - |

### 示例数据
```json
[
  {
    "_id": "plan_001",
    "heroId": "sunshangxiang",
    "heroName": "孙尚香",
    "creatorId": "user_001",
    "creatorName": "王者大神",
    "title": "孙尚香 - 暴击流",
    "description": "专注于暴击伤害的孙尚香玩法",
    "coreSkill": "一技能强化",
    "talents": ["暴击率提升", "攻速加成", "移速提升"],
    "equipment": "无尽战刃 + 破军 + 泣血之刃 + 闪电匕首 + 贤者的庇护 + 抵抗之靴",
    "equipmentCode": "123456",
    "strategy": "前期发育，中期团战，后期carry全场。利用一技能强化后的高暴击率，配合装备的暴击加成，在团战中打出爆炸伤害。",
    "imageUrl": "",
    "likes": 15,
    "favorites": 8,
    "views": 120,
    "status": "active",
    "createTime": {"$date": "2025-07-28T10:00:00.000Z"},
    "updateTime": {"$date": "2025-07-28T10:00:00.000Z"}
  },
  {
    "_id": "plan_002",
    "heroId": "sunshangxiang",
    "heroName": "孙尚香",
    "creatorId": "user_002",
    "creatorName": "游戏达人",
    "title": "孙尚香 - 攻速流",
    "description": "高攻速持续输出的孙尚香玩法",
    "coreSkill": "二技能强化",
    "talents": ["攻速加成", "冷却缩减", "移速提升"],
    "equipment": "闪电匕首 + 无尽战刃 + 泣血之刃 + 破军 + 贤者的庇护 + 抵抗之靴",
    "equipmentCode": "654321",
    "strategy": "利用二技能强化后的高攻速，配合闪电匕首的攻速加成，实现持续高输出。适合新手玩家，操作简单，输出稳定。",
    "imageUrl": "",
    "likes": 12,
    "favorites": 5,
    "views": 89,
    "status": "active",
    "createTime": {"$date": "2025-07-27T15:30:00.000Z"},
    "updateTime": {"$date": "2025-07-27T15:30:00.000Z"}
  }
]
```

### 点赞表 (likes)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 点赞记录唯一标识符 | "like_001" |
| userId | String | 用户ID | "user_001" |
| planId | String | 攻略ID | "plan_003" |
| createTime | Date | 创建时间 | - |

### 示例数据
```json
[
  {
    "_id": "like_001",
    "userId": "user_001",
    "planId": "plan_003",
    "createTime": {"$date": "2025-07-28T14:30:00.000Z"}
  },
  {
    "_id": "like_002",
    "userId": "user_001",
    "planId": "plan_007",
    "createTime": {"$date": "2025-07-28T15:20:00.000Z"}
  },
  {
    "_id": "like_003",
    "userId": "user_002",
    "planId": "plan_001",
    "createTime": {"$date": "2025-07-27T16:45:00.000Z"}
  }
]
```

### 收藏表 (favorites)

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _id | String | 收藏记录唯一标识符 | "fav_001" |
| userId | String | 用户ID | "user_001" |
| planId | String | 攻略ID | "plan_003" |
| createTime | Date | 创建时间 | - |

### 示例数据
```json
[
  {
    "_id": "fav_001",
    "userId": "user_001",
    "planId": "plan_003",
    "createTime": {"$date": "2025-07-28T14:30:00.000Z"}
  },
  {
    "_id": "fav_002",
    "userId": "user_001",
    "planId": "plan_007",
    "createTime": {"$date": "2025-07-28T15:20:00.000Z"}
  },
  {
    "_id": "fav_003",
    "userId": "user_002",
    "planId": "plan_001",
    "createTime": {"$date": "2025-07-27T16:45:00.000Z"}
  }
]
```

## 数据关系说明

1. **英雄分类 ↔ 英雄**: 一对多关系，通过 `heroes.category` 关联 `hero_categories.key`
2. **用户 ↔ 攻略**: 一对多关系，通过 `plans.creatorId` 关联 `users._id`
3. **英雄 ↔ 攻略**: 一对多关系，通过 `plans.heroId` 关联 `heroes._id`
4. **用户 ↔ 点赞**: 一对多关系，通过 `likes.userId` 关联 `users._id`
5. **攻略 ↔ 点赞**: 一对多关系，通过 `likes.planId` 关联 `plans._id`
6. **用户 ↔ 收藏**: 一对多关系，通过 `favorites.userId` 关联 `users._id`
7. **攻略 ↔ 收藏**: 一对多关系，通过 `favorites.planId` 关联 `plans._id`

## 索引建议

1. **heroes集合**: 在 `category` 字段上创建索引，用于按分类查询英雄
2. **plans集合**: 在 `heroId` 字段上创建索引，用于按英雄查询攻略
3. **plans集合**: 在 `creatorId` 字段上创建索引，用于按创建者查询攻略
4. **likes集合**: 在 `userId` 和 `planId` 字段上创建复合索引，用于查询用户点赞记录
5. **favorites集合**: 在 `userId` 和 `planId` 字段上创建复合索引，用于查询用户收藏记录

---
*文档更新时间: 2025年08月2日 00:04:02*

