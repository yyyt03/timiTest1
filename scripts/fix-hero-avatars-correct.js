const fs = require('fs');
const path = require('path');

// 读取localHeroData.ts文件
const filePath = path.join(__dirname, '../miniprogram/data/localHeroData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 正确的云存储基础URL格式
// 使用标准的微信小程序云存储地址格式：cloud://环境ID/文件路径
const cloudBaseUrl = 'cloud://cloudbase-1gk9t6w2d1d090af/images/heroes/';

// 替换所有的头像路径
content = content.replace(
  /avatar: '@cloud:\/\/cloudbase-1gk9t6w2d1d090af\.636c-cloudbase-1gk9t9d1d090af-1371508497\/images\/heroes\//g,
  `avatar: '${cloudBaseUrl}`
);

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('英雄头像路径修复完成！');
console.log(`已将错误的云存储地址替换为正确的格式：${cloudBaseUrl}`);
console.log('现在所有英雄头像都使用标准的云存储地址格式');
