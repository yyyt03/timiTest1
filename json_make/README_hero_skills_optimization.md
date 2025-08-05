# 英雄技能数据优化说明

## 优化概述

本次优化将原始的扁平化英雄技能数据转换为按英雄分组的嵌套结构，使其更适合云数据库存储和查询。

## 优化前后对比

### 原始数据结构
- **文件**: `hero_skills_for_import.json`
- **格式**: 扁平化数组，每个技能一个对象
- **记录数**: 681条技能记录
- **特点**: 每个英雄的技能分散在多个记录中

### 优化后数据结构
- **文件**: `hero_skills_optimized.json`
- **格式**: JSON Lines格式，每行一个英雄对象
- **记录数**: 22个英雄文档
- **特点**: 每个英雄的所有技能整合在一个文档中

## 优化后的数据结构

```json
{
  "_id": "hero_anqila",
  "heroId": "anqila",
  "heroName": "安琪拉",
  "skills": {
    "skillOne": {
      "cores": [
        {
          "id": "skill_anqila_1_c_001",
          "name": "多多多益善",
          "tag": "段数",
          "description": "技能变更:一技能变为散射,且额外产生8颗火球",
          "order": 1
        }
      ],
      "talents": [
        {
          "id": "skill_anqila_1_t_003",
          "name": "危险魔法",
          "tag": "段数",
          "description": "每3秒会获得1个伴身火球,施法时一起丢出",
          "order": 1
        }
      ]
    },
    "skillTwo": { "cores": [...], "talents": [...] },
    "skillThree": { "cores": [...], "talents": [...] }
  },
  "createTime": {"$date": "2025-08-05T08:22:46.340Z"},
  "updateTime": {"$date": "2025-08-05T08:22:46.340Z"}
}
```

## 优化优势

### 1. 查询效率提升
- **原始**: 需要多次查询才能获取一个英雄的所有技能
- **优化后**: 一次查询即可获取英雄的所有技能信息

### 2. 数据完整性
- **原始**: 技能数据分散，容易出现数据不一致
- **优化后**: 每个英雄的技能数据集中管理

### 3. 便于方案创建
- **原始**: 需要复杂的关联查询来匹配英雄和技能
- **优化后**: 直接获取英雄对象即可进行技能选择

### 4. MongoDB优化
- **原始**: 大量小文档，索引开销大
- **优化后**: 文档数量减少，索引效率提升

## 技能分类说明

每个英雄包含3个技能，每个技能分为：

### 核心技能 (cores)
- 数量: 每个技能2个核心
- 作用: 改变技能的基础机制
- 选择: 必须选择其中一个

### 天赋技能 (talents)
- 数量: 每个技能8个天赋
- 作用: 增强或改变技能效果
- 选择: 可以选择多个

## 导入云数据库

### 1. 文件格式
- 使用JSON Lines格式
- 每行一个完整的JSON对象
- 时间字段使用MongoDB ISODate格式

### 2. 导入步骤
1. 在云开发控制台选择 `hero_skills` 集合
2. 点击"导入"按钮
3. 选择 `hero_skills_optimized.json` 文件
4. 确认导入

### 3. 查询示例

```javascript
// 获取特定英雄的所有技能
db.hero_skills.findOne({heroId: "anqila"})

// 获取英雄的技能核心
db.hero_skills.findOne(
  {heroId: "anqila"}, 
  {"skills.skillOne.cores": 1}
)

// 获取所有英雄名称
db.hero_skills.find({}, {heroName: 1, heroId: 1})
```

## 方案创建应用

### 1. 英雄匹配
```javascript
// 根据英雄ID获取技能数据
const heroSkills = await db.hero_skills.findOne({heroId: "anqila"})
```

### 2. 技能选择
```javascript
// 获取技能1的核心选项
const skillOneCores = heroSkills.skills.skillOne.cores

// 获取技能1的天赋选项
const skillOneTalents = heroSkills.skills.skillOne.talents
```

### 3. 流派构建
```javascript
// 构建技能配置
const skillConfig = {
  skillOne: {
    core: skillOneCores[0], // 选择第一个核心
    talents: [skillOneTalents[0], skillOneTalents[2]] // 选择多个天赋
  }
  // ... 其他技能
}
```

## 文件信息

- **优化脚本**: `optimize_hero_skills.js`
- **原始数据**: `hero_skills_for_import.json` (681条记录)
- **优化数据**: `hero_skills_optimized.json` (22个英雄)
- **格式规范**: 遵循 `json-format.md` 要求

## 注意事项

1. 时间字段已转换为MongoDB兼容格式
2. 每个英雄的ID格式为 `hero_{heroId}`
3. 技能数据按 `skillOne`、`skillTwo`、`skillThree` 分类
4. 每个技能包含 `cores` 和 `talents` 两个数组
5. 所有技能保持原有的 `order` 排序

---

*优化完成时间: 2025-08-05 16:22* 