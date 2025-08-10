const fs = require('fs');
const path = require('path');

/**
 * 检查云函数依赖版本一致性脚本
 * 用于验证所有云函数使用相同的依赖版本
 */

// 云函数目录
const cloudFunctionsDir = path.join(__dirname, '../cloudfunctions');

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

// 检查单个云函数的依赖版本
const checkCloudFunctionVersions = (funcName) => {
  const packagePath = path.join(cloudFunctionsDir, funcName, 'package.json');
  
  try {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const versions = {};
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(depName => {
        versions[depName] = packageJson.dependencies[depName];
      });
    }
    
    return { funcName, versions, hasPackageJson: true };
  } catch (error) {
    return { funcName, versions: {}, hasPackageJson: false, error: error.message };
  }
};

// 分析版本一致性
const analyzeVersions = (results) => {
  const allDeps = new Set();
  const versionMap = {};
  
  // 收集所有依赖
  results.forEach(result => {
    if (result.hasPackageJson) {
      Object.keys(result.versions).forEach(depName => {
        allDeps.add(depName);
      });
    }
  });
  
  // 分析每个依赖的版本分布
  allDeps.forEach(depName => {
    versionMap[depName] = {};
    results.forEach(result => {
      if (result.hasPackageJson && result.versions[depName]) {
        const version = result.versions[depName];
        versionMap[depName][version] = (versionMap[depName][version] || 0) + 1;
      }
    });
  });
  
  return { allDeps: Array.from(allDeps), versionMap };
};

// 主函数
const main = () => {
  console.log('🔍 开始检查云函数依赖版本一致性...\n');
  
  const cloudFunctions = getCloudFunctions();
  console.log(`📁 发现 ${cloudFunctions.length} 个云函数\n`);
  
  // 检查所有云函数
  const results = cloudFunctions.map(funcName => checkCloudFunctionVersions(funcName));
  
  // 分析版本
  const { allDeps, versionMap } = analyzeVersions(results);
  
  console.log('📊 依赖版本分析结果：\n');
  
  let hasInconsistency = false;
  
  allDeps.forEach(depName => {
    const versions = versionMap[depName];
    const versionCounts = Object.keys(versions);
    
    if (versionCounts.length > 1) {
      hasInconsistency = true;
      console.log(`⚠️  ${depName} 存在版本不一致：`);
      versionCounts.forEach(version => {
        const count = versions[version];
        console.log(`     ${version}: ${count} 个云函数`);
      });
      console.log('');
    } else {
      const version = versionCounts[0];
      const count = versions[version];
      console.log(`✅ ${depName}: ${version} (${count} 个云函数)`);
    }
  });
  
  if (!hasInconsistency) {
    console.log('\n🎉 所有依赖版本都一致！');
  } else {
    console.log('\n⚠️  发现版本不一致，建议运行 npm run update:cloud-deps 来统一版本');
  }
  
  // 显示详细信息
  console.log('\n📋 各云函数依赖详情：');
  results.forEach(result => {
    if (result.hasPackageJson) {
      console.log(`\n🔧 ${result.funcName}:`);
      Object.keys(result.versions).forEach(depName => {
        console.log(`   ${depName}: ${result.versions[depName]}`);
      });
    } else {
      console.log(`\n❌ ${result.funcName}: 缺少 package.json`);
    }
  });
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { checkCloudFunctionVersions, getCloudFunctions, analyzeVersions };
