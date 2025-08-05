# JSON数据处理目录

## 目录说明
本目录包含项目中的各种JSON数据处理文件，包括英雄数据、攻略数据、用户数据等。

## 文件结构

### 英雄技能数据
- `hero_data_from_md_20250805_001658.json` - 原始英雄技能数据（嵌套结构）
- `hero_skills_for_import.json` - 规范化后的英雄技能数据（扁平化结构，可直接导入云数据库）
- `hero_skills_mongodb.json` - MongoDB格式的英雄技能数据（JSON Lines格式，符合云数据库导入要求）

### 英雄基础数据
- `heroes_data.json` - 英雄基础信息数据
- `hero_categories_data.json` - 英雄分类数据

### 攻略数据
- `plans_data_enhanced.json` - 增强版攻略数据
- `plans_data_enhanced_converted.json` - 转换后的攻略数据
- `plans_data_updated.json` - 更新的攻略数据
- `plans_data_updated1.json` - 更新的攻略数据（版本1）

### 用户相关数据
- `users_data.json` - 用户数据
- `likes_data.json` - 点赞数据
- `favorites_data.json` - 收藏数据

### 工具脚本
- `convert_json_format.py` - JSON格式转换脚本
- `convert_json_format_enhanced.py` - 增强版JSON格式转换脚本

### 文档
- `json-format.md` - JSON格式说明文档

### 子目录
- `plan_tools/` - 攻略相关工具
- `equipment_tools/` - 装备相关工具

## 数据处理流程

### 英雄技能数据处理
1. **原始数据**: `hero_data_from_md_20250805_001658.json`
   - 格式：嵌套结构
   - 内容：23个英雄的技能和天赋数据
   - 大小：121KB，3949行

2. **处理后数据**: `hero_skills_for_import.json`
   - 格式：扁平化结构
   - 内容：681条技能记录
   - 大小：254KB，8855行
   - 状态：可直接导入云数据库

3. **MongoDB格式数据**: `hero_skills_mongodb.json`
   - 格式：JSON Lines格式（每行一个对象）
   - 内容：681条技能记录
   - 大小：254KB，681行
   - 状态：符合MongoDB导入要求，时间字段为ISODate格式

### 数据质量
- ✅ 数据完整性：100%
- ✅ ID唯一性：100%
- ✅ 时间格式：100%
- ✅ 总体质量评分：100/100

## 使用说明

### 导入英雄技能数据到云数据库
1. 使用 `hero_skills_mongodb.json` 文件（推荐，符合MongoDB导入要求）
2. 创建 `hero_skills` 集合
3. 设置权限为"所有用户可读，仅创建者可写"
4. 导入后创建必要的索引

**注意**: `hero_skills_mongodb.json` 文件采用JSON Lines格式，每行一个对象，时间字段为MongoDB ISODate格式，完全符合云数据库导入要求。

### 查看详细导入指南
请参考：`docs/HERO_SKILLS_IMPORT_GUIDE.md`

### 查看处理总结
请参考：`docs/HERO_SKILLS_DATA_PROCESSING_SUMMARY.md`

## 注意事项

1. **备份**: 重要数据文件建议定期备份
2. **版本控制**: 原始数据文件不要修改，处理后的数据可以更新
3. **格式验证**: 导入前请验证JSON格式的正确性
4. **权限设置**: 确保云数据库集合权限设置正确

---
*最后更新时间: 2025年08月5日 15:45:16* 