const fs = require('fs');
const path = require('path');

// 文件路径
const heroesDataFile = path.join(__dirname, 'heroes_data.json');
const outputFile = path.join(__dirname, 'heroes_data_updated.json');

try {
  // 读取现有的英雄数据
  const rawData = fs.readFileSync(heroesDataFile, 'utf8');
  const heroes = rawData.trim().split('\n').map(line => JSON.parse(line));
  
  // 获取当前时间
  const now = new Date();
  const isoDate = now.toISOString();
  
  // 新英雄数据
  const newHeroes = [
    {
      "_id": "lan",
      "name": "澜",
      "category": "assassin",
      "avatar": "cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/lan.jpg",
      "description": "刺客英雄",
      "difficulty": 4,
      "createTime": { "$date": isoDate },
      "updateTime": { "$date": isoDate }
    },
    {
      "_id": "zhangfei",
      "name": "张飞",
      "category": "warrior",
      "avatar": "cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/zhangfei.jpg",
      "description": "战士英雄",
      "difficulty": 3,
      "createTime": { "$date": isoDate },
      "updateTime": { "$date": isoDate }
    }
  ];
  
  // 检查哪些英雄已经存在
  const existingHeroIds = heroes.map(hero => hero._id);
  const heroesToAdd = newHeroes.filter(hero => !existingHeroIds.includes(hero._id));
  
  if (heroesToAdd.length === 0) {
    console.log('✅ 所有新英雄都已存在于英雄列表中！');
    return;
  }
  
  // 添加新英雄到列表
  const updatedHeroes = [...heroes, ...heroesToAdd];
  
  // 写入更新后的文件
  const outputLines = updatedHeroes.map(hero => JSON.stringify(hero));
  fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf8');
  
  console.log('✅ 英雄列表更新完成！');
  console.log(`📁 原始文件: ${heroesDataFile}`);
  console.log(`📁 更新文件: ${outputFile}`);
  console.log(`📊 添加了 ${heroesToAdd.length} 个新英雄:`);
  heroesToAdd.forEach(hero => {
    console.log(`   - ${hero.name} (${hero._id}) - ${hero.category}`);
  });
  console.log(`📅 时间戳: ${isoDate}`);
  console.log(`📈 总英雄数量: ${updatedHeroes.length}`);
  
  // 显示新英雄的详细信息
  console.log('\n📋 新英雄详细信息:');
  heroesToAdd.forEach(hero => {
    console.log(JSON.stringify(hero, null, 2));
  });
  
} catch (error) {
  console.error('❌ 更新失败:', error.message);
  process.exit(1);
} 