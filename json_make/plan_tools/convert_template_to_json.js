const fs = require('fs');
const path = require('path');

// 读取模板文件
function readTemplateFile() {
    try {
        const templatePath = path.join(__dirname, 'plan_template.md');
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error('读取模板文件失败:', error.message);
        return null;
    }
}

// 解析模板内容
function parseTemplate(content) {
    const plans = [];
    const sections = content.split('---').filter(section => section.trim());
    
    // 跳过前两个部分（说明和示例）
    for (let i = 2; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        const plan = parsePlanSection(section);
        if (plan) {
            plans.push(plan);
        }
    }
    
    return plans;
}

// 解析单个方案部分
function parsePlanSection(section) {
    const lines = section.split('\n').filter(line => line.trim());
    const plan = {};
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('```') || trimmedLine.startsWith('#')) {
            continue;
        }
        
        if (trimmedLine.startsWith('英雄：')) {
            plan.heroName = trimmedLine.replace('英雄：', '').trim();
        } else if (trimmedLine.startsWith('特性：')) {
            plan.skills = [];
        } else if (trimmedLine.startsWith('- 技能')) {
            const skillMatch = trimmedLine.match(/技能(\d+)：(.+)/);
            if (skillMatch) {
                const skillContent = skillMatch[2].trim();
                const [coreSkill, talentsStr] = skillContent.split(' + ');
                const talents = talentsStr ? talentsStr.split(',').map(t => t.trim()) : [];
                plan.skills.push({
                    coreSkill: coreSkill.trim(),
                    talents: talents
                });
            }
        } else if (trimmedLine.startsWith('出装：')) {
            const equipmentStr = trimmedLine.replace('出装：', '').trim();
            plan.equipment = equipmentStr.split(',').map(e => e.trim());
        } else if (trimmedLine.startsWith('密语：')) {
            plan.secretCode = trimmedLine.replace('密语：', '').trim();
        } else if (trimmedLine.startsWith('思路：')) {
            plan.strategy = trimmedLine.replace('思路：', '').trim();
        } else if (trimmedLine.startsWith('作者：')) {
            plan.creatorName = trimmedLine.replace('作者：', '').trim();
        }
    }
    
    // 验证必要字段
    if (!plan.heroName || !plan.skills || plan.skills.length === 0 || !plan.equipment || !plan.strategy || !plan.creatorName) {
        console.warn('方案数据不完整，跳过:', plan.heroName || '未知英雄');
        return null;
    }
    
    return plan;
}

// 生成JSON格式
function generateJSON(plans) {
    const jsonPlans = [];
    let planId = 6; // 从现有数据的下一个ID开始
    
    for (const plan of plans) {
        // 生成英雄ID（拼音格式）
        const heroId = generateHeroId(plan.heroName);
        
        // 生成装备代码
        const equipmentCode = generateEquipmentCode(plan.equipment);
        
        // 生成用户ID
        const creatorId = generateCreatorId(plan.creatorName);
        
        // 为每个技能创建单独的方案
        for (let i = 0; i < plan.skills.length; i++) {
            const skill = plan.skills[i];
            const skillNames = ['一技能强化', '二技能强化', '三技能强化'];
            
            const jsonPlan = {
                "_id": `plan_${String(planId).padStart(3, '0')}`,
                "heroId": heroId,
                "heroName": plan.heroName,
                "creatorId": creatorId,
                "creatorName": plan.creatorName,
                "title": `${plan.heroName} - ${skill.coreSkill}`,
                "description": `${skill.coreSkill}的${plan.heroName}玩法`,
                "coreSkill": skill.coreSkill,
                "talents": skill.talents,
                "equipment": plan.equipment.join(' + '),
                "equipmentCode": equipmentCode,
                "strategy": plan.strategy,
                "imageUrl": "",
                "likeCount": Math.floor(Math.random() * 20) + 5,
                "favoriteCount": Math.floor(Math.random() * 10) + 2,
                "views": Math.floor(Math.random() * 100) + 50,
                "status": "active",
                "createTime": { "$date": new Date().toISOString() },
                "updateTime": { "$date": new Date().toISOString() }
            };
            
            jsonPlans.push(jsonPlan);
            planId++;
        }
    }
    
    return jsonPlans;
}

// 生成英雄ID（简化版，实际应该使用拼音转换）
function generateHeroId(heroName) {
    const heroIdMap = {
        '孙尚香': 'sunshangxiang',
        '马可波罗': 'makeboluo',
        '后羿': 'houyi',
        '狄仁杰': 'direnjie',
        '妲己': 'daji',
        '安琪拉': 'anqila',
        '亚瑟': 'yase',
        '鲁班七号': 'lubanqihao',
        '王昭君': 'wangzhaojun',
        '虞姬': 'yuji'
    };
    
    return heroIdMap[heroName] || heroName.toLowerCase().replace(/\s+/g, '');
}

// 生成装备代码
function generateEquipmentCode(equipment) {
    return Math.floor(Math.random() * 900000) + 100000;
}

// 生成创建者ID
function generateCreatorId(creatorName) {
    const creatorIdMap = {
        '王者大神': 'user_001',
        '游戏达人': 'user_002',
        '职业选手': 'user_003',
        '策略专家': 'user_004'
    };
    
    return creatorIdMap[creatorName] || 'user_001';
}

// 主函数
function main() {
    console.log('开始转换模板为JSON...');
    
    const templateContent = readTemplateFile();
    if (!templateContent) {
        console.error('无法读取模板文件');
        return;
    }
    
    const plans = parseTemplate(templateContent);
    if (plans.length === 0) {
        console.log('没有找到有效的方案数据');
        return;
    }
    
    const jsonPlans = generateJSON(plans);
    
    // 读取现有数据
    const existingDataPath = path.join(__dirname, '..', 'plans_data_fixed.json');
    let existingData = [];
    
    try {
        const existingContent = fs.readFileSync(existingDataPath, 'utf8');
        existingData = existingContent.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    } catch (error) {
        console.log('现有数据文件不存在或为空，将创建新文件');
    }
    
    // 合并数据
    const allPlans = [...existingData, ...jsonPlans];
    
    // 写入文件
    const outputPath = path.join(__dirname, '..', 'plans_data_updated.json');
    const outputContent = allPlans.map(plan => JSON.stringify(plan)).join('\n');
    
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    
    console.log(`转换完成！共处理 ${plans.length} 个方案，生成 ${jsonPlans.length} 条JSON记录`);
    console.log(`输出文件：${outputPath}`);
    console.log('\n生成的方案预览：');
    jsonPlans.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.title} - ${plan.creatorName}`);
    });
}

// 运行转换
if (require.main === module) {
    main();
}

module.exports = {
    parseTemplate,
    generateJSON,
    main
}; 