// 测试敏感词检测云函数配置
const cloud = require('wx-server-sdk')

// 模拟云函数环境
cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

async function testMsgSecCheck() {
  console.log('=== 测试敏感词检测云函数配置 ===')
  
  try {
    // 测试正常内容
    console.log('测试1: 正常内容')
    const result1 = await cloud.openapi.security.msgSecCheck({
      content: '这是一个正常的测试内容'
    })
    console.log('结果1:', JSON.stringify(result1, null, 2))
    
    // 测试敏感内容
    console.log('\n测试2: 敏感内容')
    const result2 = await cloud.openapi.security.msgSecCheck({
      content: '测试敏感词内容'
    })
    console.log('结果2:', JSON.stringify(result2, null, 2))
    
    console.log('\n=== 测试完成 ===')
    
  } catch (error) {
    console.error('测试失败:', error)
    console.error('错误详情:', error.message)
    
    if (error.message && error.message.includes('permission')) {
      console.error('权限错误: 请检查config.json配置')
    }
  }
}

// 运行测试
testMsgSecCheck() 