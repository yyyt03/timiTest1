# 王者荣耀英雄方案小程序

## 项目简介
这是一个基于微信小程序的王者荣耀英雄方案管理工具，用户可以创建、分享、收藏英雄出装和铭文方案。

## 技术栈
- **前端**: 微信小程序 + TypeScript
- **后端**: 微信云开发 + 云函数
- **数据库**: 微信云数据库

## 项目结构
```
timiTest1/
├── cloudfunctions/          # 云函数目录
│   ├── createPlan/         # 创建方案
│   ├── deletePlan/         # 删除方案
│   ├── getAllPlans/        # 获取所有方案
│   ├── getHeroPlans/       # 获取英雄方案
│   ├── getHeroSkills/      # 获取英雄技能
│   ├── getPlanDetail/      # 获取方案详情
│   ├── getRecommendPlans/  # 获取推荐方案
│   ├── getUserFavorites/   # 获取用户收藏
│   ├── getUserInfo/        # 获取用户信息
│   ├── getUserPlans/       # 获取用户方案
│   ├── msgSecCheck/        # 消息安全检查
│   ├── toggleFavorite/     # 切换收藏状态
│   ├── toggleLike/         # 切换点赞状态
│   ├── updatePlan/         # 更新方案
│   └── updatePlanStatus/   # 更新方案状态
├── miniprogram/            # 小程序代码
│   ├── pages/             # 页面文件
│   ├── utils/             # 工具函数
│   ├── data/              # 本地数据
│   └── app.ts             # 小程序入口
├── docs/                  # 文档目录
├── playground/            # 测试和开发工具
└── project.config.json    # 项目配置文件
```

## 开发环境
- Node.js >= 14.0.0
- 微信开发者工具
- 微信云开发环境

## 快速开始

### 1. 克隆项目
```bash
git clone [项目地址]
cd timiTest1
```

### 2. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装云函数依赖（需要在每个云函数目录下执行）
cd cloudfunctions/createPlan && npm install
cd ../deletePlan && npm install
# ... 其他云函数
```

### 3. 配置云开发环境
在微信开发者工具中：
1. 导入项目
2. 开通云开发
3. 配置云环境ID
4. 上传云函数

### 4. 运行项目
在微信开发者工具中编译运行

## 部署说明

### 云函数部署
每个云函数需要单独上传到微信云开发平台：
1. 在微信开发者工具中右键云函数
2. 选择"上传并部署：云端安装依赖"

### 小程序发布
1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 提交审核

## 版本管理
- 云函数依赖版本：wx-server-sdk ^3.0.1
- 小程序基础库版本：3.8.12

## 注意事项
- 确保所有云函数使用相同版本的 wx-server-sdk
- 云函数上传前需要先安装依赖
- 小程序代码和云函数是独立部署的

## 贡献指南
欢迎提交 Issue 和 Pull Request

## 许可证
[许可证信息]