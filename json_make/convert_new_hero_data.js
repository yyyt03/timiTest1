const fs = require('fs');
const path = require('path');

// 读取原始数据
const inputFile = path.join(__dirname, 'new_hero', 'hero_data_6_heroes.json');
const outputFile = path.join(__dirname, 'hero_skills_new_6_heroes.json');

try {
  // 读取原始JSON文件
  const rawData = fs.readFileSync(inputFile, 'utf8');
  const data = JSON.parse(rawData);
  
  // 获取当前时间
  const now = new Date();
  const isoDate = now.toISOString();
  
  // 转换英雄数据
  const convertedHeroes = data.heroes.map(hero => {
    // 转换技能数据格式
    const skills = {
      skillOne: {
        cores: Array.isArray(hero.skillOne.core) ? hero.skillOne.core : [hero.skillOne.core],
        talents: hero.skillOne.talents || []
      },
      skillTwo: {
        cores: Array.isArray(hero.skillTwo.core) ? hero.skillTwo.core : [hero.skillTwo.core],
        talents: hero.skillTwo.talents || []
      },
      skillThree: {
        cores: Array.isArray(hero.skillThree.core) ? hero.skillThree.core : [hero.skillThree.core],
        talents: hero.skillThree.talents || []
      }
    };
    
    // 构建转换后的英雄对象
    const convertedHero = {
      _id: hero._id,
      heroId: hero.heroId,
      heroName: hero.heroName,
      skills: skills,
      createTime: { "$date": isoDate },
      updateTime: { "$date": isoDate }
    };
    
    return convertedHero;
  });
  
  // 写入JSON Lines格式文件
  const outputLines = convertedHeroes.map(hero => JSON.stringify(hero));
  fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf8');
  
  console.log('✅ 转换完成！');
  console.log(`📁 输入文件: ${inputFile}`);
  console.log(`📁 输出文件: ${outputFile}`);
  console.log(`📊 转换了 ${convertedHeroes.length} 个英雄的数据`);
  console.log(`📅 时间戳: ${isoDate}`);
  
  // 显示转换后的数据结构示例
  if (convertedHeroes.length > 0) {
    console.log('\n📋 数据结构示例:');
    console.log(JSON.stringify(convertedHeroes[0], null, 2));
  }
  
} catch (error) {
  console.error('❌ 转换失败:', error.message);
  process.exit(1);
} 