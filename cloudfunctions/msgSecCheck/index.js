// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-1gk9t6w2d1d090af'
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('=== 敏感词检查云函数开始 ===');
    console.log('接收到的数据:', JSON.stringify(event, null, 2));
    
    const { content } = event;
    
    // 验证输入
    if (!content || typeof content !== 'string') {
      console.log('输入内容无效');
      return {
        success: false,
        message: '输入内容不能为空',
        data: {
          isPass: false,
          suggest: '请输入有效内容'
        }
      };
    }
    
    // 调用微信敏感词检查接口 - 使用云调用语法
    const result = await cloud.openapi.security.msgSecCheck({
      content: content
    });
    
    console.log('微信敏感词检查结果:', JSON.stringify(result, null, 2));
    
    // 解析结果
    const isPass = result.errCode === 0;
    let suggest = '';
    
    if (!isPass) {
      switch (result.errCode) {
        case 87014:
          suggest = '内容含有违法违规内容';
          break;
        case 87013:
          suggest = '内容含有敏感词';
          break;
        default:
          suggest = '内容检查未通过';
      }
    }
    
    const response = {
      success: true,
      message: isPass ? '内容检查通过' : '内容检查未通过',
      data: {
        isPass: isPass,
        suggest: suggest,
        errCode: result.errCode
      }
    };
    
    console.log('返回结果:', JSON.stringify(response, null, 2));
    console.log('=== 敏感词检查云函数结束 ===');
    
    return response;
    
  } catch (error) {
    console.error('敏感词检查失败:', error);
    
    // 如果是权限错误，提供更详细的错误信息
    if (error.message && error.message.includes('permission')) {
      return {
        success: false,
        message: '云函数权限配置错误，请检查config.json配置',
        data: {
          isPass: false,
          suggest: '请联系管理员检查云函数权限配置'
        }
      };
    }
    
    return {
      success: false,
      message: '敏感词检查服务异常',
      data: {
        isPass: false,
        suggest: '服务暂时不可用，请稍后重试'
      }
    };
  }
} 