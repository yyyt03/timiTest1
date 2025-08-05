const fs = require('fs');
const path = require('path');

// 读取原始数据
const inputFile = path.join(__dirname, 'hero_skills_for_import.json');
const outputFile = path.join(__dirname, 'hero_skills_optimized.json');

console.log('开始优化英雄技能数据...');

try {
    // 读取原始JSON文件
    const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    console.log(`读取到 ${rawData.length} 条技能数据`);

    // 按英雄分组数据
    const heroGroups = {};
    
    rawData.forEach(skill => {
        const heroId = skill.heroId;
        
        if (!heroGroups[heroId]) {
            heroGroups[heroId] = {
                heroId: heroId,
                heroName: skill.heroName,
                skills: {
                    skillOne: { cores: [], talents: [] },
                    skillTwo: { cores: [], talents: [] },
                    skillThree: { cores: [], talents: [] }
                }
            };
        }
        
        // 根据技能类型和类别分类
        const skillType = skill.skillType;
        const skillCategory = skill.skillCategory;
        
        if (heroGroups[heroId].skills[skillType]) {
            if (skillCategory === 'core') {
                heroGroups[heroId].skills[skillType].cores.push({
                    id: skill._id,
                    name: skill.name,
                    tag: skill.tag,
                    description: skill.description,
                    order: skill.order
                });
            } else if (skillCategory === 'talents') {
                heroGroups[heroId].skills[skillType].talents.push({
                    id: skill._id,
                    name: skill.name,
                    tag: skill.tag,
                    description: skill.description,
                    order: skill.order
                });
            }
        }
    });

    // 转换为MongoDB格式的JSON Lines
    const currentTime = new Date().toISOString();
    const mongoTimeFormat = { "$date": currentTime };
    
    const outputLines = [];
    
    Object.values(heroGroups).forEach(hero => {
        const optimizedHero = {
            _id: `hero_${hero.heroId}`,
            heroId: hero.heroId,
            heroName: hero.heroName,
            skills: hero.skills,
            createTime: mongoTimeFormat,
            updateTime: mongoTimeFormat
        };
        
        outputLines.push(JSON.stringify(optimizedHero));
    });

    // 写入文件（每行一个对象）
    fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf8');
    
    console.log(`优化完成！`);
    console.log(`- 原始数据：${rawData.length} 条技能记录`);
    console.log(`- 优化后：${outputLines.length} 个英雄文档`);
    console.log(`- 输出文件：${outputFile}`);
    
    // 显示一些统计信息
    const heroCount = Object.keys(heroGroups).length;
    console.log(`\n统计信息：`);
    console.log(`- 英雄数量：${heroCount}`);
    
    // 显示前几个英雄的技能统计
    console.log(`\n前5个英雄的技能统计：`);
    Object.values(heroGroups).slice(0, 5).forEach(hero => {
        const skillOneCount = hero.skills.skillOne.cores.length + hero.skills.skillOne.talents.length;
        const skillTwoCount = hero.skills.skillTwo.cores.length + hero.skills.skillTwo.talents.length;
        const skillThreeCount = hero.skills.skillThree.cores.length + hero.skills.skillThree.talents.length;
        
        console.log(`- ${hero.heroName} (${hero.heroId}): 技能1(${skillOneCount}) 技能2(${skillTwoCount}) 技能3(${skillThreeCount})`);
    });

} catch (error) {
    console.error('处理过程中出现错误：', error);
} 