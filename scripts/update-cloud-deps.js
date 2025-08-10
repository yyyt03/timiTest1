const fs = require('fs');
const path = require('path');

/**
 * 更新云函数依赖版本脚本
 * 用于统一所有云函数的依赖版本
 */

// 云函数目录
const cloudFunctionsDir = path.join(__dirname, '../cloudfunctions');

// 目标版本
const targetVersions = {
  'wx-server-sdk': '^3.0.1'
};

// 读取云函数目录
const getCloudFunctions = () => {
  try {
    return fs.readdirSync(cloudFunctionsDir).filter(dir => {
      const fullPath = path.join(cloudFunctionsDir, dir);
      return fs.statSync(fullPath).isDirectory() && 
             fs.existsSync(path.join(fullPath, 'package.json'));
    });
  } catch (error) {
    console.error('读取云函数目录失败:', error.message);
    return [];
  }
};

// 更新单个云函数的依赖
const updateCloudFunctionDeps = (funcName) => {
  const packagePath = path.join(cloudFunctionsDir, funcName, 'package.json');
  
  try {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    let updated = false;
    
    // 更新依赖版本
    if (packageJson.dependencies) {
      Object.keys(targetVersions).forEach(depName => {
        if (packageJson.dependencies[depName] !== targetVersions[depName]) {
          packageJson.dependencies[depName] = targetVersions[depName];
          updated = true;
          console.log(`  📦 更新 ${depName}: ${targetVersions[depName]}`);
        }
      });
    }
    
    // 写入更新后的package.json
    if (updated) {
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ❌ 更新 ${funcName} 失败:`, error.message);
    return false;
  }
};

// 主函数
const main = () => {
  console.log('🚀 开始更新云函数依赖版本...\n');
  
  const cloudFunctions = getCloudFunctions();
  console.log(`📁 发现 ${cloudFunctions.length} 个云函数\n`);
  
  let updatedCount = 0;
  
  cloudFunctions.forEach(funcName => {
    console.log(`🔧 检查 ${funcName}...`);
    if (updateCloudFunctionDeps(funcName)) {
      updatedCount++;
      console.log(`  ✅ ${funcName} 更新完成\n`);
    } else {
      console.log(`  ⏭️  ${funcName} 无需更新\n`);
    }
  });
  
  console.log(`\n🎉 更新完成！共更新了 ${updatedCount} 个云函数`);
  console.log('\n📋 下一步操作：');
  console.log('1. 在每个云函数目录下运行 npm install');
  console.log('2. 在微信开发者工具中上传云函数');
  console.log('3. 选择"云端安装依赖"选项');
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { updateCloudFunctionDeps, getCloudFunctions };
