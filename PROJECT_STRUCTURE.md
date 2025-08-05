# 项目结构说明

## 项目概述
王者荣耀攻略小程序 - 基于微信小程序云开发平台

## 目录结构

```
timiTest1/
├── cloudfunctions/           # 云函数目录
│   ├── getHeroSkills/       # 获取英雄技能数据云函数
│   ├── getUserInfo/         # 获取用户信息云函数
│   ├── getHeroList/         # 获取英雄列表云函数
│   ├── getHeroPlans/        # 获取英雄攻略云函数
│   ├── getPlanDetail/       # 获取攻略详情云函数
│   ├── createPlan/          # 创建攻略云函数
│   ├── toggleLike/          # 点赞/取消点赞云函数
│   ├── toggleFavorite/      # 收藏/取消收藏云函数
│   ├── getUserFavorites/    # 获取用户收藏云函数
│   ├── getUserPlanStatus/   # 获取用户攻略状态云函数
│   ├── clearCache/          # 清除缓存云函数
│   └── importEnhancedPlans/ # 导入增强攻略云函数
├── docs/                    # 文档目录
│   ├── DATABASE_SCHEMA.md   # 数据库结构设计
│   ├── HERO_SKILLS_IMPORT_GUIDE.md      # 英雄技能数据导入指南
│   ├── HERO_SKILLS_DATA_PROCESSING_SUMMARY.md  # 英雄技能数据处理总结
│   ├── CLOUD_PLATFORM_SETUP.md          # 云平台设置指南
│   ├── TODO.md              # 待办事项
│   ├── archive/             # 归档文档
│   └── study-notes/         # 学习笔记
├── json_make/               # JSON数据处理目录
│   ├── README.md            # JSON目录说明
│   ├── hero_skills_for_import.json      # 英雄技能数据（可导入）
│   ├── hero_data_from_md_20250805_001658.json  # 原始英雄技能数据
│   ├── heroes_data.json     # 英雄基础数据
│   ├── hero_categories_data.json        # 英雄分类数据
│   ├── plans_data_*.json    # 攻略相关数据
│   ├── users_data.json      # 用户数据
│   ├── likes_data.json      # 点赞数据
│   ├── favorites_data.json  # 收藏数据
│   ├── plan_tools/          # 攻略工具
│   └── equipment_tools/     # 装备工具
├── miniprogram/             # 小程序前端代码
│   ├── pages/               # 页面目录
│   │   ├── index/           # 首页
│   │   ├── strategy/        # 攻略页
│   │   ├── heroCategory/    # 英雄分类页
│   │   ├── heroPlan/        # 英雄攻略页
│   │   ├── planDetail/      # 攻略详情页
│   │   ├── createPlan/      # 创建攻略页
│   │   ├── betaPlan/        # 测试攻略页
│   │   ├── recommendPlan/   # 推荐攻略页
│   │   ├── favorites/       # 收藏页
│   │   ├── user/            # 用户页
│   │   └── logs/            # 日志页
│   ├── utils/               # 工具函数
│   ├── app.ts               # 小程序入口文件
│   ├── app.json             # 小程序配置文件
│   └── app.wxss             # 小程序全局样式
├── images_backup/           # 图片备份目录
│   ├── heroes/              # 英雄头像
│   ├── icons/               # 图标文件
│   └── unused/              # 未使用的图片
├── playground/              # 测试和实验目录
├── typings/                 # TypeScript类型定义
├── package.json             # 项目依赖配置
├── project.config.json      # 项目配置文件
├── tsconfig.json            # TypeScript配置
└── README.md                # 项目主说明文档
```

## 核心功能模块

### 1. 英雄系统
- **数据源**: `json_make/hero_skills_for_import.json`
- **云函数**: `getHeroSkills`, `getHeroList`
- **页面**: `heroCategory`, `heroPlan`
- **功能**: 英雄列表展示、技能详情、攻略浏览

### 2. 攻略系统
- **数据源**: `json_make/plans_data_*.json`
- **云函数**: `getHeroPlans`, `getPlanDetail`, `createPlan`
- **页面**: `strategy`, `planDetail`, `createPlan`
- **功能**: 攻略创建、浏览、点赞、收藏

### 3. 用户系统
- **数据源**: `json_make/users_data.json`
- **云函数**: `getUserInfo`, `getUserFavorites`, `getUserPlanStatus`
- **页面**: `user`, `favorites`
- **功能**: 用户信息、收藏管理、个人中心

### 4. 互动系统
- **数据源**: `json_make/likes_data.json`, `json_make/favorites_data.json`
- **云函数**: `toggleLike`, `toggleFavorite`
- **功能**: 点赞、收藏、用户互动

## 数据库集合

### 核心集合
1. **hero_skills** - 英雄技能数据（681条记录）
2. **heroes** - 英雄基础信息
3. **hero_categories** - 英雄分类
4. **plans** - 攻略数据
5. **users** - 用户数据
6. **likes** - 点赞数据
7. **favorites** - 收藏数据

### 权限设置
- **公共数据**: 所有用户可读，仅创建者可写
- **用户数据**: 仅创建者可读写

## 开发环境

### 技术栈
- **前端**: 微信小程序 + TypeScript
- **后端**: 微信云开发
- **数据库**: 云数据库
- **存储**: 云存储

### 开发工具
- **IDE**: 微信开发者工具
- **版本控制**: Git
- **包管理**: npm

## 部署说明

### 1. 环境准备
- 安装微信开发者工具
- 配置云开发环境
- 导入项目代码

### 2. 数据导入
- 导入英雄技能数据：`hero_skills_for_import.json`
- 导入其他基础数据
- 创建必要的数据库索引

### 3. 云函数部署
- 部署所有云函数
- 配置云函数权限
- 测试云函数功能

### 4. 小程序发布
- 配置小程序基本信息
- 上传代码
- 提交审核

## 维护指南

### 数据更新
1. 修改原始数据文件
2. 运行数据处理脚本
3. 导出新的导入文件
4. 更新云数据库

### 功能扩展
1. 添加新的云函数
2. 创建新的页面
3. 更新数据库结构
4. 修改前端代码

### 性能优化
1. 创建数据库索引
2. 优化查询语句
3. 使用缓存机制
4. 压缩图片资源

## 注意事项

1. **数据备份**: 定期备份重要数据
2. **版本控制**: 使用Git管理代码版本
3. **测试验证**: 功能更新后进行充分测试
4. **文档更新**: 及时更新相关文档

---
*项目结构更新时间: 2025年08月5日 15:45:16* 