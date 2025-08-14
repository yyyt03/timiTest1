const fs = require('fs');
const path = require('path');

// 定义需要修复的文件和路径
const filesToFix = [
  {
    path: '../miniprogram/pages/myPlans/myPlans.ts',
    search: /cloud:\/\/cloudbase-1gk9t6w2d1d090af\.636c-cloudbase-1gk9t6w2d1d090af-1371508497\/images\/icons\/empty-favorites\.png/g,
    replace: "cloud://cloudbase-1gk9t6w2d1d090af/images/icons/empty-favorites.png"
  },
  {
    path: '../miniprogram/utils/equipmentCache.ts',
    search: /cloud:\/\/cloudbase-1gk9t6w2d1d090af\.636c-cloudbase-1gk9t6w2d1d090af-1371508497\/images\/equipment\//g,
    replace: "cloud://cloudbase-1gk9t6w2d1d090af/images/equipment/"
  },
  {
    path: '../miniprogram/pages/user/user.ts',
    search: /cloud:\/\/cloudbase-1gk9t6w2d1d090af\.636c-cloudbase-1gk9t6w2d1d090af-1371508497\/images\/icons\/default-avatar\.png/g,
    replace: "cloud://cloudbase-1gk9t6w2d1d090af/images/icons/default-avatar.png"
  }
];

console.log('开始修复项目中所有错误的云存储地址格式...');

filesToFix.forEach((fileInfo, index) => {
  const filePath = path.join(__dirname, fileInfo.path);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否包含需要替换的内容
    if (fileInfo.search.test(content)) {
      // 执行替换
      content = content.replace(fileInfo.search, fileInfo.replace);
      
      // 写回文件
      fs.writeFileSync(filePath, content, 'utf8');
      
      console.log(`✓ 已修复文件: ${fileInfo.path}`);
    } else {
      console.log(`- 文件 ${fileInfo.path} 中未找到需要替换的内容`);
    }
  } else {
    console.log(`✗ 文件不存在: ${fileInfo.path}`);
  }
});

console.log('\n所有云存储地址格式修复完成！');
console.log('现在所有文件都使用正确的云存储地址格式：cloud://cloudbase-1gk9t6w2d1d090af/...');
