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
                const [corePart, talentsPart] = skillContent.split(' + ');
                
                // 解析核心技能
                const coreParts = corePart.split('|');
                const core = {
                    name: coreParts[0] || '',
                    description: coreParts[1] || '',
                    tag: coreParts[2] || ''
                };
                
                // 解析天赋
                const talents = [];
                if (talentsPart) {
                    const talentItems = talentsPart.split(',');
                    for (const talentItem of talentItems) {
                        const talentParts = talentItem.split('|');
                        if (talentParts.length >= 3) {
                            talents.push({
                                name: talentParts[0] || '',
                                description: talentParts[1] || '',
                                tag: talentParts[2] || ''
                            });
                        }
                    }
                }
                
                plan.skills.push({
                    core: core,
                    talents: talents
                });
            }
        } else if (trimmedLine.startsWith('出装：')) {
            const equipmentStr = trimmedLine.replace('出装：', '').trim();
            plan.equipment = equipmentStr.split(',').map(e => e.trim());
        } else if (trimmedLine.startsWith('密语：')) {
            plan.secretCode = trimmedLine.replace('密语：', '').trim();
        } else if (trimmedLine.startsWith('思路：')) {
            plan.description = trimmedLine.replace('思路：', '').trim();
        } else if (trimmedLine.startsWith('作者：')) {
            plan.creatorName = trimmedLine.replace('作者：', '').trim();
        }
    }
    
    // 验证必要字段
    if (!plan.heroName || !plan.skills || plan.skills.length === 0 || !plan.equipment || !plan.description || !plan.creatorName) {
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
        
        // 处理装备列表，转换为对象数组格式
        const processedEquipment = processEquipmentList(plan.equipment);
        
        // 创建适配方案详情页面的数据结构
        const jsonPlan = {
            _id: `plan_${planId++}`,
            heroName: plan.heroName,
            heroId: heroId,
            creatorName: plan.creatorName,
            creatorId: creatorId,
            description: plan.description,
            secretCode: plan.secretCode || '',
            equipment: processedEquipment,
            equipmentCode: equipmentCode,
            skillOne: plan.skills[0] || null,
            skillTwo: plan.skills[1] || null,
            skillThree: plan.skills[2] || null,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            likeCount: Math.floor(Math.random() * 100),
            favoriteCount: Math.floor(Math.random() * 50) + 10,
            views: Math.floor(Math.random() * 500) + 100,
            status: 'active'
        };
        
        jsonPlans.push(jsonPlan);
    }
    
    return jsonPlans;
}

// 生成英雄ID（拼音格式）
function generateHeroId(heroName) {
    // 简单的拼音映射
    const pinyinMap = {
        '孙尚香': 'sunshangxiang',
        '妲己': 'daji',
        '安琪拉': 'anqila',
        '亚瑟': 'yase',
        '妲己': 'daji',
        '貂蝉': 'diaochan',
        '小乔': 'xiaoqiao',
        '大乔': 'daqiao',
        '王昭君': 'wangzhaojun',
        '甄姬': 'zhenji',
        '虞姬': 'yuji',
        '蔡文姬': 'caiwenji',
        '杨玉环': 'yangyuhuan',
        '西施': 'xishi',
        '嫦娥': 'change',
        '露娜': 'luna',
        '花木兰': 'huamulan',
        '阿轲': 'ake',
        '娜可露露': 'nakelele',
        '不知火舞': 'buzhihuowu',
        '橘右京': 'juyoujing',
        '宫本武藏': 'gongbenwuzang',
        '李白': 'libai',
        '韩信': 'hanxin',
        '赵云': 'zhaoyun',
        '关羽': 'guanyu',
        '张飞': 'zhangfei',
        '马超': 'machao',
        '吕布': 'lvbu',
        '典韦': 'dianwei',
        '许褚': 'xuchu',
        '夏侯惇': 'xiahoudun',
        '夏侯渊': 'xiahouyuan',
        '张辽': 'zhangliao',
        '徐晃': 'xuhuang',
        '庞德': 'pangde',
        '太史慈': 'taishici',
        '甘宁': 'ganning',
        '周泰': 'zhoutai',
        '黄盖': 'huanggai',
        '程普': 'chengpu',
        '韩当': 'handang',
        '凌统': 'lingtong',
        '蒋钦': 'jiangqin',
        '周仓': 'zhoucang',
        '关平': 'guanping',
        '关兴': 'guanxing',
        '张苞': 'zhangbao',
        '关索': 'guansuo',
        '鲍三娘': 'baosanniang',
        '王平': 'wangping',
        '马岱': 'madai',
        '张翼': 'zhangyi',
        '廖化': 'liaohua',
        '周仓': 'zhoucang',
        '关平': 'guanping',
        '关兴': 'guanxing',
        '张苞': 'zhangbao',
        '关索': 'guansuo',
        '鲍三娘': 'baosanniang',
        '王平': 'wangping',
        '马岱': 'madai',
        '张翼': 'zhangyi',
        '廖化': 'liaohua'
    };
    
    return pinyinMap[heroName] || heroName.toLowerCase().replace(/\s+/g, '');
}

// 生成装备代码
function generateEquipmentCode(equipment) {
    if (Array.isArray(equipment)) {
        // 如果是对象数组，提取name属性
        if (equipment.length > 0 && typeof equipment[0] === 'object' && equipment[0].name) {
            return equipment.map(item => item.name).join('_').toLowerCase().replace(/\s+/g, '');
        }
        // 如果是字符串数组
        return equipment.join('_').toLowerCase().replace(/\s+/g, '');
    }
    return '';
}

// 装备名称到图标的映射
function getEquipmentIcon(equipmentName) {
    const equipmentIconMap = {
        // 攻击装备
        '破军': 'sword',
        '无尽战刃': 'blade',
        '泣血之刃': 'bloodblade',
        '闪电匕首': 'dagger',
        '宗师之力': 'mastery',
        '碎星锤': 'hammer',
        
        // 防御装备
        '贤者的庇护': 'shield',
        '抵抗之靴': 'boots',
        '影忍之足': 'ninja_boots',
        '冷静之靴': 'cool_boots',
        '神速之靴': 'speed_boots',
        '秘法之靴': 'magic_boots',
        
        // 法师装备
        '疾步之靴': 'boots',
        '圣杯': 'chalice',
        '贤者之书': 'book',
        '魔法水晶': 'crystal',
        '蛇杖': 'staff',
        
        // 射手装备
        '泣血之刃': 'bloodblade',
        '闪电匕首': 'dagger',
        '破军': 'sword',
        '无尽战刃': 'blade',
        
        // 坦克装备
        '贤者的庇护': 'shield',
        '抵抗之靴': 'boots',
        '影忍之足': 'ninja_boots',
        
        // 辅助装备
        '圣杯': 'chalice',
        '贤者之书': 'book',
        '魔法水晶': 'crystal'
    };
    
    return equipmentIconMap[equipmentName] || 'default';
}

// 处理装备列表，转换为对象数组格式
function processEquipmentList(equipmentNames) {
    return equipmentNames.map(name => ({
        name: name,
        icon: getEquipmentIcon(name)
    }));
}

// 生成用户ID
function generateCreatorId(creatorName) {
    return `user_${creatorName.toLowerCase().replace(/\s+/g, '')}_${Date.now()}`;
}

// 主函数
function main() {
    console.log('开始解析模板文件...');
    
    const content = readTemplateFile();
    if (!content) {
        console.error('无法读取模板文件');
        return;
    }
    
    console.log('解析模板内容...');
    const plans = parseTemplate(content);
    
    if (plans.length === 0) {
        console.log('没有找到有效的方案数据');
        return;
    }
    
    console.log(`找到 ${plans.length} 个方案`);
    
    console.log('生成JSON数据...');
    const jsonPlans = generateJSON(plans);
    
    // 读取现有数据
    let existingPlans = [];
    const existingDataPath = path.join(__dirname, '..', 'plans_data_fixed.json');
    if (fs.existsSync(existingDataPath)) {
        try {
            const existingContent = fs.readFileSync(existingDataPath, 'utf8');
            existingPlans = JSON.parse(existingContent);
            console.log(`读取到 ${existingPlans.length} 个现有方案`);
        } catch (error) {
            console.warn('读取现有数据失败，将创建新文件:', error.message);
        }
    }
    
    // 合并数据
    const allPlans = [...existingPlans, ...jsonPlans];
    
    // 输出到文件
    const outputPath = path.join(__dirname, '..', 'plans_data_updated.json');
    fs.writeFileSync(outputPath, JSON.stringify(allPlans, null, 2), 'utf8');
    
    console.log(`成功生成 ${jsonPlans.length} 个新方案`);
    console.log(`总方案数量: ${allPlans.length}`);
    console.log(`输出文件: ${outputPath}`);
    
    // 同时输出JSON Lines格式
    const jsonlPath = path.join(__dirname, '..', 'plans_data_updated.jsonl');
    const jsonlContent = allPlans.map(plan => JSON.stringify(plan)).join('\n');
    fs.writeFileSync(jsonlPath, jsonlContent, 'utf8');
    console.log(`JSON Lines格式文件: ${jsonlPath}`);
}

// 运行主函数
if (require.main === module) {
    main();
} 