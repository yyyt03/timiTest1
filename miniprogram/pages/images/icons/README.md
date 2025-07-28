# 图标资源文件夹

这个文件夹包含了小程序中使用的各种图标资源，包括Tabbar图标和功能卡片图标。

## 图标命名规则

所有图标都使用描述性的英文命名，文件格式为PNG。

## Tabbar图标

### 攻略页面图标
- `tabbar-strategy.png` - 攻略Tabbar未选中状态图标
- `tabbar-strategy-selected.png` - 攻略Tabbar选中状态图标

### 用户页面图标
- `tabbar-user.png` - 用户Tabbar未选中状态图标
- `tabbar-user-selected.png` - 用户Tabbar选中状态图标

## 功能卡片图标

### 攻略页面功能卡片
- `recommend-plan.png` - 推荐方案功能图标
- `hero-category.png` - 英雄分类功能图标
- `beta-plan.png` - 体验服方案功能图标
- `create-plan.png` - 方案创作功能图标

## 图标设计说明

### Tabbar图标特点
- 尺寸：建议 81x81 像素
- 风格：简约线条，黑白配色
- 状态：未选中为灰色，选中为黑色

### 功能卡片图标特点
- 尺寸：建议 80x80 像素
- 风格：与整体设计风格保持一致
- 背景：浅灰色背景，便于在白色卡片上显示

## 使用说明

1. 当前所有图标都是基于现有图片的副本，您可以直接替换为更符合功能描述的图标
2. 建议图标尺寸保持一致，确保在不同设备上显示效果统一
3. 图标格式建议使用PNG，支持透明背景
4. 替换图标时请保持文件名不变，以确保代码中的引用正常工作

## 代码引用示例

### Tabbar图标引用（app.json）
```json
{
  "iconPath": "pages/images/icons/tabbar-strategy.png",
  "selectedIconPath": "pages/images/icons/tabbar-strategy-selected.png"
}
```

### 功能卡片图标引用（WXML）
```xml
<image class="function-icon" src="../images/icons/recommend-plan.png" mode="aspectFit"></image>
```

## 图标优化建议

1. **攻略图标**：可以使用指南针、书本或策略相关的图标
2. **用户图标**：使用用户头像或人物轮廓图标
3. **推荐方案图标**：使用星星、推荐标记或热门图标
4. **英雄分类图标**：使用角色、英雄或分类图标
5. **体验服方案图标**：使用测试、实验或Beta标记图标
6. **方案创作图标**：使用创作、编辑或加号图标

## 维护说明

- 所有图标文件都经过优化，确保在小程序中正常显示
- 图标路径已在代码中更新，无需额外修改
- 如需替换图标，请保持文件名和路径不变 