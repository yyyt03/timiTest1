/**
 * 敏感词检查工具函数
 */

// 敏感词检查结果接口
interface SensitiveCheckResult {
  isPass: boolean;
  suggest: string;
  errCode?: number;
}

// 敏感词检查函数
export async function checkSensitiveWord(content: string): Promise<SensitiveCheckResult> {
  try {
    // 如果内容为空，直接通过
    if (!content || !content.trim()) {
      return {
        isPass: true,
        suggest: ''
      };
    }

    // 调用云函数进行敏感词检查
    const result = await wx.cloud.callFunction({
      name: 'msgSecCheck',
      data: {
        content: content.trim()
      }
    }) as any;

    console.log('敏感词检查结果:', result);

    if (result.result && result.result.success) {
      return result.result.data;
    } else {
      // 云函数调用失败，返回错误信息
      return {
        isPass: false,
        suggest: result.result?.message || '检查失败，请重试'
      };
    }
  } catch (error) {
    console.error('敏感词检查异常:', error);
    return {
      isPass: false,
      suggest: '网络异常，请检查网络连接'
    };
  }
}

// 实时敏感词检查函数（带防抖）
let checkTimer: NodeJS.Timeout | null = null;

export async function checkSensitiveWordRealtime(
  content: string, 
  callback: (result: SensitiveCheckResult) => void,
  delay: number = 500
): Promise<void> {
  // 清除之前的定时器
  if (checkTimer) {
    clearTimeout(checkTimer);
  }

  // 如果内容为空，直接通过
  if (!content || !content.trim()) {
    callback({
      isPass: true,
      suggest: ''
    });
    return;
  }

  // 设置防抖延迟
  checkTimer = setTimeout(async () => {
    try {
      const result = await checkSensitiveWord(content);
      callback(result);
    } catch (error) {
      console.error('实时敏感词检查失败:', error);
      callback({
        isPass: false,
        suggest: '检查失败，请重试'
      });
    }
  }, delay);
}

// 批量检查多个字段
export async function checkMultipleFields(fields: { [key: string]: string }): Promise<{
  isAllPass: boolean;
  results: { [key: string]: SensitiveCheckResult };
  failedFields: string[];
}> {
  const results: { [key: string]: SensitiveCheckResult } = {};
  const failedFields: string[] = [];

  // 并行检查所有字段
  const checkPromises = Object.keys(fields).map(async (fieldName) => {
    const content = fields[fieldName];
    const result = await checkSensitiveWord(content);
    results[fieldName] = result;
    
    if (!result.isPass) {
      failedFields.push(fieldName);
    }
  });

  await Promise.all(checkPromises);

  return {
    isAllPass: failedFields.length === 0,
    results,
    failedFields
  };
}

// 显示敏感词检查结果提示
export function showSensitiveCheckResult(result: SensitiveCheckResult, fieldName: string = '内容'): void {
  if (!result.isPass) {
    wx.showToast({
      title: `${fieldName}${result.suggest}`,
      icon: 'none',
      duration: 2000
    });
  }
}

// 验证输入内容是否合法
export async function validateInputContent(content: string, fieldName: string = '内容'): Promise<boolean> {
  const result = await checkSensitiveWord(content);
  
  if (!result.isPass) {
    showSensitiveCheckResult(result, fieldName);
    return false;
  }
  
  return true;
} 