# 王者荣耀觉醒天赋推荐小程序 —— 项目总体说明

## 项目简介
本项目为基于微信小程序的“王者荣耀觉醒之战”流派加点与装备推荐工具，支持英雄分类、方案创作、装备推荐、用户收藏等功能。采用分层模块化开发，结合云开发后端与丰富的图片资源，便于维护、扩展和二次开发。

---

## 目录结构说明

```
├── README.md                # 简要说明（根目录保留）
├── PROJECT_OVERVIEW.md      # 本文件，总体说明
├── docs/                    # 归档的项目文档（数据库、云开发、后端、开发指南等）
│   ├── BACKEND_INTEGRATION.md
│   ├── CLOUD_SETUP_GUIDE.md
│   ├── DATABASE_SCHEMA.md
│   ├── DATABASE_SETUP_GUIDE.md
│   ├── GIT_GUIDE.md
│   ├── TODO.md
│   └── fileID.md
├── miniprogram/             # 小程序主目录
│   ├── app.json / app.ts / app.wxss
│   ├── pages/               # 页面与图片资源
│   │   ├── images/          # 图片资源（英雄头像、图标等）
│   │   │   ├── heroes/      # 英雄头像（已批量下载，拼音命名）
│   │   │   └── icons/       # 功能图标，含README说明
│   │   ├── ...              # 各功能页面（如heroCategory、createPlan等）
│   ├── utils/               # 工具函数
│   └── ...
├── cloudfunctions/          # 云开发后端（Node.js）
│   ├── getHeroList/         # 英雄列表API
│   └── getUserInfo/         # 用户信息API
├── json_make/               # 辅助数据与脚本
│   ├── heroes_data.json
│   ├── hero_categories_data.json
│   └── README.md
├── typings/                 # TypeScript类型声明
│   └── types/wx/            # 微信API类型
├── download_hero_avatars.py # 英雄头像批量下载脚本
├── package.json / tsconfig.json / ... # 配置文件
```

---

## 主要功能模块

- **攻略页面**：流派推荐、装备推荐、英雄分类、体验服方案、方案创作等核心功能。
- **用户页面**：微信用户信息展示、收藏方案、创作方案管理。
- **方案创作**：支持选择英雄、流派核心、特性天赋、装备推荐、密语描述等，生成一图流方案。
- **英雄分类**：射手、辅助、刺客、战士、法师等多维度分类，便于快速查找。
- **云开发后端**：支持用户信息、方案、图片、收藏等数据的存储与管理。
- **图片资源管理**：所有英雄头像已批量下载，命名规范，便于小程序直接引用。
- **脚本工具**：如download_hero_avatars.py，支持自动化资源补全。

---

## 资源与文档说明

- **图片资源**：
  - `miniprogram/pages/images/heroes/`：约100+英雄头像，拼音命名，jpg格式。
  - `miniprogram/pages/images/icons/`：功能图标，含README说明。
- **文档归档**：
  - `docs/`文件夹下包含数据库、云开发、后端、开发流程、TODO等详细文档。
- **辅助数据**：
  - `json_make/`下有英雄数据、分类数据等，便于二次开发和数据分析。

---

## 开发与运行须知

- 推荐使用微信开发者工具导入`miniprogram/`目录进行开发与调试。
- 云开发需配置好环境ID，详见`docs/CLOUD_SETUP_GUIDE.md`。
- 所有依赖通过`package.json`和`tsconfig.json`统一管理。
- 英雄头像如需更新，可运行`download_hero_avatars.py`自动补全。
- 详细开发、部署、数据库等说明请参见`docs/`文件夹内相关文档。

---

## 维护与扩展建议

- 所有新增文档请归档至`docs/`，保持根目录整洁。
- 图片资源如需替换，建议保留命名规范，避免小程序引用出错。
- 云函数、数据库结构变更请同步更新文档。
- 建议定期运行脚本工具，保持资源最新。
- 详细变更记录请写入`docs/TODO.md`，便于团队协作。

---

如有更多问题或建议，欢迎查阅各模块README或联系项目维护者。 