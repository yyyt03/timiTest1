# 英雄方案数据创建工具

## 概述
此文件夹包含用于创建和管理英雄方案数据的工具和模板，已适配方案详情页面的显示需求。

## 文件说明

### 📝 `plan_template.md`
- **用途**: 英雄方案数据填写模板
- **格式**: Markdown 格式，包含详细的技能描述结构
- **使用方法**: 按照模板格式填写英雄方案数据，然后使用转换脚本生成 JSON
- **新特性**: 支持详细的技能核心和天赋描述，适配方案详情页面显示

### 📋 `plan_template_examples.md`
- **用途**: 提供详细的填写示例和常用词汇
- **内容**: 包含多个英雄的完整示例和常用天赋、装备词汇表
- **使用方法**: 参考示例填写自己的方案数据

### 🔧 `convert_template_to_json.js`
- **用途**: 将 Markdown 模板转换为 JSON 格式
- **功能**: 
  - 解析 Markdown 模板文件
  - 验证数据完整性
  - 生成唯一标识符和随机数据
  - 生成适配方案详情页面的数据结构
  - 合并现有数据并输出 JSON 格式
- **使用方法**: `node convert_template_to_json.js`

### 📖 `README_plan_creation.md`
- **用途**: 详细的使用指南
- **内容**: 包含完整的使用步骤、字段说明、注意事项和常见问题

## 使用流程

1. **填写数据**: 在 `plan_template.md` 中按照格式填写英雄方案数据
2. **参考示例**: 查看 `plan_template_examples.md` 获取填写参考
3. **转换数据**: 运行 `node convert_template_to_json.js` 生成 JSON
4. **查看结果**: 生成的 JSON 文件保存在上级目录的 `plans_data_updated.json`

## 数据格式

### 模板格式
每个方案包含以下字段：
- **英雄**: 英雄名称
- **特性**: 3个技能，每个技能包含：
  - 核心技能：名称|描述|标签
  - 天赋：名称|描述|标签（3个天赋，用逗号分隔）
- **出装**: 6件装备
- **密语**: 可选的秘密代码
- **思路**: 50字以内的策略说明
- **作者**: 方案创建者

### 生成的JSON结构
```json
{
  "_id": "plan_6",
  "heroName": "英雄名称",
  "heroId": "英雄拼音ID",
  "creatorName": "作者名称",
  "creatorId": "用户ID",
  "description": "方案描述",
  "secretCode": "密语",
  "equipment": [
    {"name": "装备名称", "icon": "装备图标"},
    {"name": "装备名称", "icon": "装备图标"}
  ],
  "equipmentCode": "装备代码",
  "skillOne": {
    "core": {"name": "技能名称", "description": "技能描述", "tag": "技能标签"},
    "talents": [
      {"name": "天赋名称", "description": "天赋描述", "tag": "天赋标签"}
    ]
  },
  "skillTwo": {...},
  "skillThree": {...},
  "createTime": "创建时间",
  "updateTime": "更新时间",
  "likeCount": 点赞数,
  "favoriteCount": 收藏数,
  "views": 浏览量,
  "status": "active"
}
```

## 方案详情页面适配

生成的JSON数据已完全适配方案详情页面的显示需求：

- **英雄信息**: `heroName`, `heroId`, `creatorName`
- **方案描述**: `description` 字段对应思路说明
- **技能展示**: `skillOne`, `skillTwo`, `skillThree` 包含详细的core和talents结构
- **装备列表**: `equipment` 数组格式
- **统计信息**: `likes`, `views` 等统计数据

## 注意事项

- 确保填写的数据格式正确
- 技能数量必须为3个
- 装备数量必须为6件
- 思路字数限制在50字以内
- 技能描述格式：`名称|描述|标签`
- 天赋描述格式：`名称|描述|标签`
- 转换脚本会自动生成ID、时间戳等字段
- 生成的JSON完全兼容方案详情页面显示 