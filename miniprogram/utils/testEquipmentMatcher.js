// 装备匹配功能测试脚本
const { findEquipmentByName, getEquipmentImageUrl, processEquipmentList } = require('./equipmentMatcher');

console.log('=== 装备匹配功能测试 ===\n');

// 测试1: 精确匹配
console.log('1. 精确匹配测试:');
const testEquipmentNames = ['铁剑', '匕首', '雷鸣刃', '无尽战刃', '宗师之力'];
testEquipmentNames.forEach(name => {
  const result = findEquipmentByName(name);
  if (result) {
    console.log(`  ✓ "${name}" -> ${result.name} (ID: ${result.id}, 图片: ${result.image})`);
  } else {
    console.log(`  ✗ "${name}" -> 未找到匹配`);
  }
});

console.log('\n2. 模糊匹配测试:');
const fuzzyTestNames = ['破军', '破魔', '闪电', '影刃', '血魔'];
fuzzyTestNames.forEach(name => {
  const result = findEquipmentByName(name);
  if (result) {
    console.log(`  ✓ "${name}" -> ${result.name} (ID: ${result.id}, 图片: ${result.image})`);
  } else {
    console.log(`  ✗ "${name}" -> 未找到匹配`);
  }
});

console.log('\n3. 装备列表处理测试:');
const testEquipmentList = [
  { name: '铁剑' },
  { name: '匕首' },
  { name: '雷鸣刃' },
  { name: '不存在的装备' }
];

processEquipmentList(testEquipmentList).then(processedList => {
  console.log('  处理结果:');
  processedList.forEach((item, index) => {
    console.log(`    ${index + 1}. ${item.name} -> ${item.imageUrl ? '有图片' : '无图片'}`);
  });
}).catch(error => {
  console.error('  处理失败:', error);
});

console.log('\n=== 测试完成 ==='); 