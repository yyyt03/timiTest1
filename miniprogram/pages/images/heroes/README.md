# 英雄头像图片文件夹

这个文件夹包含了所有英雄的头像图片，用于在英雄分类页面和方案创作页面中显示。

## 图片命名规则

所有图片都使用英雄名称的拼音命名，文件格式为PNG。

## 英雄列表

### 射手类
- `sunshangxiang.png` - 孙尚香
- `makeboluo.png` - 马可波罗
- `houyi.png` - 后羿
- `direnjie.png` - 狄仁杰
- `lubanqihao.png` - 鲁班七号

### 辅助类
- `donghuangtaiyi.png` - 东皇太一
- `zhongkui.png` - 钟馗
- `mingshiyin.png` - 明世隐
- `yao.png` - 瑶

### 刺客类
- `zhaoyun.png` - 赵云
- `libai.png` - 李白
- `dianwei.png` - 典韦
- `sunwukong.png` - 孙悟空

### 战士类
- `sunce.png` - 孙策
- `sikongzhen.png` - 司空震
- `kai.png` - 铠
- `yase.png` - 亚瑟
- `chengyaojin.png` - 程咬金
- `lvbu.png` - 吕布

### 法师类
- `yangyuhuan.png` - 杨玉环
- `daji.png` - 妲己
- `zhugeliang.png` - 诸葛亮
- `anqila.png` - 安琪拉
- `zhenji.png` - 甄姬
- `xiaoqiao.png` - 小乔
- `wuzetian.png` - 武则天
- `diaochan.png` - 貂蝉

## 使用说明

1. 当前所有图片都是默认头像的副本，您可以直接替换为对应的英雄头像
2. 建议图片尺寸保持一致，推荐使用正方形图片（如 200x200 像素）
3. 图片格式建议使用PNG，支持透明背景
4. 替换图片时请保持文件名不变，以确保代码中的引用正常工作

## 代码引用示例

在WXML文件中引用英雄头像：
```xml
<image src="../images/heroes/sunshangxiang.png" mode="aspectFit"></image>
```

在JavaScript文件中构建图片路径：
```javascript
const heroImagePath = `../images/heroes/${heroName}.png`;
``` 