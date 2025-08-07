// 本地数据测试工具
import { heroCache } from './heroCache';
import { getHeroesByCategory, getHeroById, getHeroByName } from '../data/localHeroData';

export class LocalDataTest {
  
  // 测试本地数据是否正常工作
  static testLocalData() {
    console.log('=== 本地数据测试开始 ===');
    
    // 测试1: 检查本地数据状态
    console.log('1. 本地数据状态:', heroCache.isLocalDataEnabled());
    
    // 测试2: 获取英雄分类数据
    const heroData = getHeroesByCategory();
    console.log('2. 英雄分类数据:', heroData);
    console.log('   总英雄数量:', heroData.totalHeroes);
    console.log('   分类数量:', Object.keys(heroData.categories).length);
    
    // 测试3: 测试英雄查找功能
    const testHero = getHeroById('tank_001');
    console.log('3. 通过ID查找英雄:', testHero);
    
    const testHeroByName = getHeroByName('亚瑟');
    console.log('4. 通过名称查找英雄:', testHeroByName);
    
    // 测试4: 测试缓存功能
    const cacheData = heroCache.getCache();
    console.log('5. 缓存数据:', cacheData);
    
    // 测试5: 测试英雄查找API
    heroCache.getHeroById('warrior_001').then(hero => {
      console.log('6. 通过API查找英雄:', hero);
    });
    
    console.log('=== 本地数据测试完成 ===');
  }
  
  // 测试本地/云端数据切换
  static testDataToggle() {
    console.log('=== 数据切换测试开始 ===');
    
    // 切换到云端数据
    console.log('1. 切换到云端数据');
    heroCache.toggleLocalData(false);
    console.log('   本地数据状态:', heroCache.isLocalDataEnabled());
    
    // 切换回本地数据
    console.log('2. 切换回本地数据');
    heroCache.toggleLocalData(true);
    console.log('   本地数据状态:', heroCache.isLocalDataEnabled());
    
    console.log('=== 数据切换测试完成 ===');
  }
  
  // 性能测试
  static performanceTest() {
    console.log('=== 性能测试开始 ===');
    
    const startTime = Date.now();
    
    // 测试本地数据获取速度
    for (let i = 0; i < 100; i++) {
      getHeroesByCategory();
    }
    
    const localTime = Date.now() - startTime;
    console.log('1. 本地数据获取100次耗时:', localTime + 'ms');
    
    // 测试英雄查找速度
    const searchStartTime = Date.now();
    for (let i = 0; i < 100; i++) {
      getHeroById('tank_001');
      getHeroByName('亚瑟');
    }
    
    const searchTime = Date.now() - searchStartTime;
    console.log('2. 英雄查找100次耗时:', searchTime + 'ms');
    
    console.log('=== 性能测试完成 ===');
  }
  
  // 生成测试报告
  static generateReport() {
    console.log('=== 本地化测试报告 ===');
    
    const heroData = getHeroesByCategory();
    const report = {
      测试时间: new Date().toLocaleString(),
      本地数据状态: heroCache.isLocalDataEnabled(),
      英雄总数: heroData.totalHeroes,
      分类数量: Object.keys(heroData.categories).length,
      分类列表: Object.keys(heroData.categories),
      数据完整性: heroData.totalHeroes > 0 ? '正常' : '异常',
      缓存状态: heroCache.getCache() ? '正常' : '异常'
    };
    
    console.log('测试报告:', report);
    return report;
  }
}

// 导出测试函数，方便在控制台调用
export const testLocalData = LocalDataTest.testLocalData;
export const testDataToggle = LocalDataTest.testDataToggle;
export const testPerformance = LocalDataTest.performanceTest;
export const generateReport = LocalDataTest.generateReport; 