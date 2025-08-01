# Git 版本管理使用指南

## 📋 概述

本指南针对微信小程序开发场景，提供 Git 版本管理的合理使用方法和最佳实践，让你的每一次提交都清晰、可追溯、便于回滚和协作。

---

## 🎯 基本原则

- **一事一提交**：每次提交只做一件事（如只改文档、只修复一个bug、只加一个功能）
- **写清楚提交说明**：让别人（包括未来的你）一看就知道这次提交做了什么
- **保持主分支干净**：主分支（main/master）只放稳定、可用的代码
- **善用分支**：新功能/大改动建议新建分支，开发完合并到主分支

---

## 📝 常见场景举例

### 1. 只更新文档

```bash
git add README.md TODO.md
git commit -m "docs: 更新文档，完善分层模块说明"
git push
```

**说明**：`docs:` 代表文档类提交，后面写清楚内容

### 2. 修复bug

```bash
git add miniprogram/pages/user/user.ts
git commit -m "fix: 修复用户信息显示异常"
git push
```

**说明**：`fix:` 代表修复bug

### 3. 开发新功能（建议新建分支）

```bash
# 创建并切换到新分支
git checkout -b feat-plan-page

# ...开发推荐方案页面...

# 提交更改
git add miniprogram/pages/recommendPlan/*
git commit -m "feat: 新增推荐方案页面及相关逻辑"
git push origin feat-plan-page

# 开发完后合并到主分支
git checkout main
git merge feat-plan-page
git push
```

**说明**：`feat:` 代表新功能

---

## 🔧 合理的提交粒度

- **小步快跑**：每次提交不要太大，能描述清楚的"一个点"就提交一次
- **不要把无关内容混在一起**：比如文档和代码、多个功能、修bug和加功能，最好分开提交

---

## 📋 提交信息规范（推荐）

### 常用前缀

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档
- `style:` 格式/样式（不影响功能）
- `refactor:` 重构（优化代码结构）
- `test:` 测试相关
- `chore:` 其他杂项

### 示例

```
feat: 新增英雄分类页面
fix: 修复方案创作流程跳转bug
docs: 更新README和图标说明
style: 优化按钮样式和交互效果
refactor: 重构云开发工具类
test: 添加用户页面功能测试
chore: 更新依赖包版本
```

---

## 🎯 不同场景的使用建议

### 文档更新
- **适用场景**：README.md、TODO.md、注释等文档更新
- **建议**：直接 `docs:` 提交到主分支即可
- **示例**：
  ```bash
  git add README.md TODO.md
  git commit -m "docs: 优化文档结构，补充分层说明"
  git push
  ```

### 小功能/小修复
- **适用场景**：简单的bug修复、小的功能调整
- **建议**：可以直接在主分支提交
- **示例**：
  ```bash
  git add miniprogram/pages/strategy/strategy.ts
  git commit -m "fix: 修复攻略页面加载异常"
  git push
  ```

### 大功能/多人协作
- **适用场景**：新页面开发、复杂功能实现、多人协作
- **建议**：建议新建分支，开发完合并
- **示例**：
  ```bash
  # 创建功能分支
  git checkout -b feat-recommend-plan
  
  # 开发完成后
  git add .
  git commit -m "feat: 完成推荐方案页面开发"
  git push origin feat-recommend-plan
  
  # 合并到主分支
  git checkout main
  git merge feat-recommend-plan
  git push
  ```

---

## 🔄 版本回退与历史查看

### 查看历史
```bash
# 查看提交历史
git log --oneline

# 查看最近5次提交
git log --oneline -5

# 查看某个文件的修改历史
git log --oneline -- filename
```

### 回退操作
```bash
# 回退到上一个版本
git reset --hard HEAD~1

# 回退到指定版本
git reset --hard commit_hash

# 撤销未提交的更改
git checkout -- filename

# 撤销已暂存的更改
git reset HEAD filename
```

### 分支操作
```bash
# 查看所有分支
git branch -a

# 创建新分支
git branch new-branch-name

# 切换分支
git checkout branch-name

# 创建并切换分支
git checkout -b new-branch-name

# 删除分支
git branch -d branch-name
```

---

## 🚀 微信小程序开发参考流程

### 日常开发流程
1. 编辑代码/文档
2. 查看更改：`git status`
3. 添加文件：`git add .` 或 `git add filename`
4. 提交更改：`git commit -m "type: 描述"`
5. 推送到远程：`git push`

### 新功能开发流程
1. 创建功能分支：`git checkout -b feat-feature-name`
2. 开发功能
3. 提交更改：`git commit -m "feat: 新功能描述"`
4. 推送到远程：`git push origin feat-feature-name`
5. 合并到主分支：`git checkout main && git merge feat-feature-name`

### 文档更新流程
1. 编辑文档
2. 提交更改：`git commit -m "docs: 文档更新描述"`
3. 推送到远程：`git push`

---

## ⚠️ 注意事项

1. **提交前检查**：使用 `git status` 查看要提交的文件
2. **写清楚提交信息**：避免使用 "update"、"fix" 等模糊词汇
3. **定期推送**：避免本地积压太多未推送的提交
4. **备份重要更改**：重要功能开发前先提交当前状态
5. **不要提交敏感信息**：如API密钥、密码等

---

## 📚 常用命令速查

```bash
# 基础操作
git status                    # 查看状态
git add .                     # 添加所有文件
git add filename              # 添加指定文件
git commit -m "message"       # 提交更改
git push                      # 推送到远程
git pull                      # 拉取远程更新

# 分支操作
git branch                    # 查看分支
git checkout branch-name      # 切换分支
git checkout -b new-branch    # 创建并切换分支
git merge branch-name         # 合并分支

# 查看历史
git log --oneline             # 查看提交历史
git log --oneline -5          # 查看最近5次提交
git diff                      # 查看未提交的更改

# 回退操作
git reset --hard HEAD~1       # 回退到上一个版本
git checkout -- filename      # 撤销文件更改
```

---

## 🎯 总结

合理的 Git 使用就是：
- **每次提交都有明确的目的**
- **提交信息清晰易懂**
- **保持代码历史的整洁**
- **便于团队协作和问题追踪**

遵循这些原则，你的项目版本管理会更加规范和高效！

---

*最后更新：2025-07-28* 