// 云函数入口文件
var cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = function(event, context) {
  console.log('测试云函数被调用');
  console.log('事件参数:', event);
  console.log('上下文:', context);
  
  // 返回简单的测试数据
  var result = {
    success: true,
    message: '测试云函数正常工作',
    timestamp: new Date().toISOString(),
    event: event,
    env: 'cloudbase-1gk9t6w2d1d090af'
  };
  
  console.log('云函数即将返回结果:', result);
  
  // 使用context.succeed确保正确返回
  context.succeed(result);
  
  // 同时使用return作为备选
  return result;
} 