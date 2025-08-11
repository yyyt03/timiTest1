const fs = require('fs');
const path = require('path');

// 装备分类映射
const categoryMap = {
  1: "物理攻击",
  2: "法术攻击", 
  3: "防御装备",
  4: "移动装备",
  5: "打野装备",
  7: "辅助装备"
};

// 读取equipment_enhance.json文件
const equipmentFilePath = path.join(__dirname, '../json_make/equipment_enhance.json');
const equipmentContent = fs.readFileSync(equipmentFilePath, 'utf8');

// 使用正则表达式为每个装备对象添加category字段
let updatedContent = equipmentContent.replace(
  /(\{[^}]+\})/g,
  (match, equipmentObj) => {
    // 提取type字段
    const typeMatch = equipmentObj.match(/"type":\s*(\d+)/);
    if (typeMatch) {
      const type = parseInt(typeMatch[1]);
      const category = categoryMap[type] || "其他";
      
      // 在最后一个字段后添加category
      if (equipmentObj.includes('"image":')) {
        return equipmentObj.replace(/"image":\s*"[^"]*"/, `"image": "${equipmentObj.match(/"image":\s*"([^"]*)"/)[1]}", "category": "${category}"`);
      }
    }
    return match;
  }
);

// 写入更新后的内容
fs.writeFileSync(equipmentFilePath, updatedContent, 'utf8');

console.log('装备分类字段添加完成！');

// 同时更新equipmentMatcher.ts文件
const matcherFilePath = path.join(__dirname, '../miniprogram/utils/equipmentMatcher.ts');
const matcherContent = fs.readFileSync(matcherFilePath, 'utf8');

// 更新equipmentMatcher.ts中的装备数据
let updatedMatcherContent = matcherContent.replace(
  /(\{[^}]+\})/g,
  (match, equipmentObj) => {
    // 提取type字段
    const typeMatch = equipmentObj.match(/"type":\s*(\d+)/);
    if (typeMatch) {
      const type = parseInt(typeMatch[1]);
      const category = categoryMap[type] || "其他";
      
      // 在最后一个字段后添加category
      if (equipmentObj.includes('"image":')) {
        return equipmentObj.replace(/"image":\s*"[^"]*"/, `"image": "${equipmentObj.match(/"image":\s*"([^"]*)"/)[1]}", "category": "${category}"`);
      }
    }
    return match;
  }
);

// 写入更新后的内容
fs.writeFileSync(matcherFilePath, updatedMatcherContent, 'utf8');

console.log('equipmentMatcher.ts文件更新完成！');
