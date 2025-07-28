# 数据库设置指南

## 1. 创建数据库集合

### 1.1 在云开发控制台创建集合

1. 登录微信开发者工具
2. 点击"云开发" → "数据库"
3. 点击"添加集合"，创建以下两个集合：

#### 英雄分类集合 (hero_categories)
- **集合名称**: `hero_categories`
- **权限设置**: 选择"所有用户可读，仅创建者可写"

#### 英雄集合 (heroes)
- **集合名称**: `heroes`
- **权限设置**: 选择"所有用户可读，仅创建者可写"

### 1.2 权限类型说明

| 权限类型 | 说明 | 适用场景 |
|---------|------|----------|
| 所有用户可读，仅创建者可写 | 所有用户可查看数据，只有创建者可修改 | ✅ 推荐：英雄分类和英雄数据 |
| 仅创建者可读写 | 只有创建者可查看和修改 | 用户私有数据 |
| 所有用户可读写 | 所有用户可查看和修改 | 公共协作数据 |
| 仅管理员可读写 | 只有管理员可查看和修改 | 系统配置数据 |

## 2. 快速导入数据

### 2.1 方法一：云开发控制台批量导入

#### 步骤1：准备JSON数据
创建 `hero_categories_data.json` 文件：
```json
[
  {
    "key": "shooter",
    "name": "射手",
    "order": 1,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "key": "support",
    "name": "辅助",
    "order": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "key": "assassin",
    "name": "刺客",
    "order": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "key": "warrior",
    "name": "战士",
    "order": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "key": "mage",
    "name": "法师",
    "order": 5,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  }
]
```

创建 `heroes_data.json` 文件：
```json
[
  {
    "name": "孙尚香",
    "category": "shooter",
    "avatar": "cloud://your-env-id.xxxx/heroes/shooter/sunshangxiang.png",
    "description": "远程射手英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "马可波罗",
    "category": "shooter",
    "avatar": "cloud://your-env-id.xxxx/heroes/shooter/makeboluo.png",
    "description": "远程射手英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "后羿",
    "category": "shooter",
    "avatar": "cloud://your-env-id.xxxx/heroes/shooter/houyi.png",
    "description": "远程射手英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "狄仁杰",
    "category": "shooter",
    "avatar": "cloud://your-env-id.xxxx/heroes/shooter/direnjie.png",
    "description": "远程射手英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "鲁班七号",
    "category": "shooter",
    "avatar": "cloud://your-env-id.xxxx/heroes/shooter/lubanqihao.png",
    "description": "远程射手英雄",
    "difficulty": 1,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "东皇太一",
    "category": "support",
    "avatar": "cloud://your-env-id.xxxx/heroes/support/donghuangtaiyi.png",
    "description": "辅助英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "钟馗",
    "category": "support",
    "avatar": "cloud://your-env-id.xxxx/heroes/support/zhongkui.png",
    "description": "辅助英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "明世隐",
    "category": "support",
    "avatar": "cloud://your-env-id.xxxx/heroes/support/mingshiyin.png",
    "description": "辅助英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "瑶",
    "category": "support",
    "avatar": "cloud://your-env-id.xxxx/heroes/support/yao.png",
    "description": "辅助英雄",
    "difficulty": 1,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "赵云",
    "category": "assassin",
    "avatar": "cloud://your-env-id.xxxx/heroes/assassin/zhaoyun.png",
    "description": "刺客英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "李白",
    "category": "assassin",
    "avatar": "cloud://your-env-id.xxxx/heroes/assassin/libai.png",
    "description": "刺客英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "典韦",
    "category": "assassin",
    "avatar": "cloud://your-env-id.xxxx/heroes/assassin/dianwei.png",
    "description": "刺客英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "孙悟空",
    "category": "assassin",
    "avatar": "cloud://your-env-id.xxxx/heroes/assassin/sunwukong.png",
    "description": "刺客英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "孙策",
    "category": "warrior",
    "avatar": "cloud://your-env-id.xxxx/heroes/warrior/sunce.png",
    "description": "战士英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "司空震",
    "category": "warrior",
    "avatar": "cloud://your-env-id.xxxx/heroes/warrior/sikongzhen.png",
    "description": "战士英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "铠",
    "category": "warrior",
    "avatar": "cloud://your-env-id.xxxx/heroes/warrior/kai.png",
    "description": "战士英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "亚瑟",
    "category": "warrior",
    "avatar": "cloud://your-env-id.xxxx/heroes/warrior/yase.png",
    "description": "战士英雄",
    "difficulty": 1,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "程咬金",
    "category": "warrior",
    "avatar": "cloud://your-env-id.xxxx/heroes/warrior/chengyaojin.png",
    "description": "战士英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "吕布",
    "category": "warrior",
    "avatar": "cloud://your-env-id.xxxx/heroes/warrior/lvbu.png",
    "description": "战士英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "杨玉环",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/yangyuhuan.png",
    "description": "法师英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "妲己",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/daji.png",
    "description": "法师英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "诸葛亮",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/zhugeliang.png",
    "description": "法师英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "安琪拉",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/anqila.png",
    "description": "法师英雄",
    "difficulty": 1,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "甄姬",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/zhenji.png",
    "description": "法师英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "小乔",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/xiaoqiao.png",
    "description": "法师英雄",
    "difficulty": 2,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "武则天",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/wuzetian.png",
    "description": "法师英雄",
    "difficulty": 4,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  },
  {
    "name": "貂蝉",
    "category": "mage",
    "avatar": "cloud://your-env-id.xxxx/heroes/mage/diaochan.png",
    "description": "法师英雄",
    "difficulty": 3,
    "createTime": "2025-07-28T20:25:00.000Z",
    "updateTime": "2025-07-28T20:25:00.000Z"
  }
]
```

#### 步骤2：导入数据
1. 在云开发控制台选择对应集合
2. 点击"导入"按钮
3. 选择JSON文件并上传
4. 确认导入成功

### 2.2 方法二：云函数批量导入

创建 `initDatabase` 云函数：

```javascript
// cloudfunctions/initDatabase/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  
  try {
    // 清空现有数据
    await db.collection('hero_categories').where({}).remove()
    await db.collection('heroes').where({}).remove()
    
    // 插入英雄分类数据
    const categories = [
      { key: 'shooter', name: '射手', order: 1 },
      { key: 'support', name: '辅助', order: 2 },
      { key: 'assassin', name: '刺客', order: 3 },
      { key: 'warrior', name: '战士', order: 4 },
      { key: 'mage', name: '法师', order: 5 }
    ]
    
    for (const category of categories) {
      await db.collection('hero_categories').add({
        data: {
          ...category,
          createTime: new Date(),
          updateTime: new Date()
        }
      })
    }
    
    // 插入英雄数据（这里只展示部分，完整数据见上面的JSON）
    const heroes = [
      {
        name: '孙尚香',
        category: 'shooter',
        avatar: 'cloud://your-env-id.xxxx/heroes/shooter/sunshangxiang.png',
        description: '远程射手英雄',
        difficulty: 3
      }
      // ... 其他英雄数据
    ]
    
    for (const hero of heroes) {
      await db.collection('heroes').add({
        data: {
          ...hero,
          createTime: new Date(),
          updateTime: new Date()
        }
      })
    }
    
    return {
      success: true,
      message: '数据库初始化成功'
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 2.3 方法三：手动逐条添加

在云开发控制台：
1. 选择对应集合
2. 点击"添加记录"
3. 输入JSON格式数据
4. 点击"确定"保存

## 3. 验证数据导入

### 3.1 检查数据完整性
1. 在云开发控制台查看集合记录数
2. 确认 hero_categories 有5条记录
3. 确认 heroes 有27条记录

### 3.2 测试云函数
1. 在云开发控制台测试 getHeroList 云函数
2. 检查返回的数据结构是否正确
3. 确认分类和英雄数据完整

## 4. 注意事项

### 4.1 环境ID替换
- 将JSON文件中的 `your-env-id.xxxx` 替换为你的实际环境ID
- 环境ID格式：`cloud://环境ID.随机字符串`

### 4.2 图片路径
- 确保云存储中已上传对应的英雄图片
- 图片路径要与数据库中的 avatar 字段一致

### 4.3 权限设置
- 建议使用"所有用户可读，仅创建者可写"权限
- 避免使用"所有用户可读写"权限，防止数据被误删

### 4.4 数据备份
- 导入前建议备份现有数据
- 定期备份重要数据 