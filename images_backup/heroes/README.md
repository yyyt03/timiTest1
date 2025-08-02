# 英雄头像图片文件夹

这个文件夹包含了所有英雄的头像图片，用于在英雄分类页面和方案创作页面中显示。

## 图片命名规则

所有图片都使用英雄名称的拼音命名，文件格式为JPG。

## 英雄列表

### 射手类
- `sunshangxiang.jpg` - 孙尚香
- `makeboluo.jpg` - 马可波罗
- `houyi.jpg` - 后羿
- `direnjie.jpg` - 狄仁杰
- `lubanqihao.jpg` - 鲁班七号

### 辅助类
- `donghuangtaiyi.jpg` - 东皇太一
- `zhongkui.jpg` - 钟馗
- `mingshiyin.jpg` - 明世隐
- `yao.jpg` - 瑶

### 刺客类
- `zhaoyun.jpg` - 赵云
- `libai.jpg` - 李白
- `dianwei.jpg` - 典韦
- `sunwukong.jpg` - 孙悟空

### 战士类
- `sunce.jpg` - 孙策
- `sikongzhen.jpg` - 司空震
- `kai.jpg` - 铠
- `yase.jpg` - 亚瑟
- `chengyaojin.jpg` - 程咬金
- `lvbu.jpg` - 吕布

### 法师类
- `yangyuhuan.jpg` - 杨玉环
- `daji.jpg` - 妲己
- `zhugeliang.jpg` - 诸葛亮
- `anqila.jpg` - 安琪拉
- `zhenji.jpg` - 甄姬
- `xiaoqiao.jpg` - 小乔
- `wuzetian.jpg` - 武则天
- `diaochan.jpg` - 貂蝉

## 使用说明

1. 当前所有图片都是默认头像的副本，您可以直接替换为对应的英雄头像
2. 建议图片尺寸保持一致，推荐使用正方形图片（如 200x200 像素）
3. 图片格式建议使用jpg，支持透明背景
4. 替换图片时请保持文件名不变，以确保代码中的引用正常工作

## 代码引用示例

在WXML文件中引用英雄头像：
```xml
<image src="../images/heroes/sunshangxiang.jpg" mode="aspectFit"></image>
```

在JavaScript文件中构建图片路径：
```javascript
const heroImagePath = `../images/heroes/${heroName}.jpg`;
```