// 环境配置管理
export const config = {
  // 开发环境配置 (develop)
  development: {
    enableLogs: true,
    cacheExpireTime: 5 * 60 * 1000, // 5分钟（开发环境缓存时间短）
    enableHotReload: true,
    versionCheckInterval: 2 * 60 * 1000, // 2分钟检查一次版本
    enableVersionCheck: true,
    debugMode: true,
    showPerformanceMetrics: true
  },
  
  // 生产环境配置 (trial体验版 + release线上版)
  production: {
    enableLogs: false,
    cacheExpireTime: 30 * 60 * 1000, // 30分钟（生产环境缓存时间长）
    enableHotReload: false,
    versionCheckInterval: 5 * 60 * 1000, // 5分钟检查一次版本
    enableVersionCheck: true,
    debugMode: false,
    showPerformanceMetrics: false
  },

  // release线上版本特殊配置
  release: {
    enableLogs: false,
    cacheExpireTime: 60 * 60 * 1000, // 60分钟（线上版本缓存时间更长）
    enableHotReload: false,
    versionCheckInterval: 10 * 60 * 1000, // 10分钟检查一次版本
    enableVersionCheck: true,
    debugMode: false,
    showPerformanceMetrics: false,
    enableErrorReporting: true, // 启用错误上报
    enableAnalytics: true // 启用数据分析
  }
};

// 环境类型枚举
export enum Environment {
  DEVELOP = 'develop',    // 开发版
  TRIAL = 'trial',        // 体验版
  RELEASE = 'release'     // 线上版
}

// 获取当前环境类型
export function getCurrentEnvironment(): Environment {
  try {
    // @ts-ignore
    if (typeof __wxjs_environment !== 'undefined') {
      // @ts-ignore
      const env = __wxjs_environment;
      
      if (env === 'miniprogram') {
        return Environment.DEVELOP;
      } else if (env === 'trial') {
        return Environment.TRIAL;
      } else if (env === 'release') {
        return Environment.RELEASE;
      }
    }
    
    // 如果无法检测到环境，根据其他特征判断
    // 开发工具中通常会有一些特殊的全局变量
    // @ts-ignore
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      const systemInfo = wx.getSystemInfoSync();
      // 开发工具中 platform 通常是 'devtools'
      if (systemInfo.platform === 'devtools') {
        return Environment.DEVELOP;
      }
    }
    
    // 默认返回 TRIAL（体验版）
    return Environment.TRIAL;
  } catch {
    // 如果出现错误，默认返回 TRIAL（体验版）
    return Environment.TRIAL;
  }
}

// 判断是否为开发环境
export function isDevelopmentMode(): boolean {
  return getCurrentEnvironment() === Environment.DEVELOP;
}

// 判断是否为体验版
export function isTrialMode(): boolean {
  return getCurrentEnvironment() === Environment.TRIAL;
}

// 判断是否为线上版
export function isReleaseMode(): boolean {
  return getCurrentEnvironment() === Environment.RELEASE;
}

// 判断是否为生产环境（体验版 + 线上版）
export function isProductionMode(): boolean {
  const env = getCurrentEnvironment();
  return env === Environment.TRIAL || env === Environment.RELEASE;
}

// 获取当前环境配置
export function getCurrentConfig() {
  const env = getCurrentEnvironment();
  
  if (env === Environment.DEVELOP) {
    return config.development;
  } else if (env === Environment.RELEASE) {
    return config.release;
  } else {
    // TRIAL 体验版使用 production 配置
    return config.production;
  }
}

// 日志输出工具
export function log(message: string, ...args: any[]) {
  const currentConfig = getCurrentConfig();
  if (currentConfig.enableLogs) {
    console.log(message, ...args);
  }
}

// 调试日志工具（仅在开发环境显示）
export function debugLog(message: string, ...args: any[]) {
  if (isDevelopmentMode()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

// 性能监控工具（仅在开发环境显示）
export function performanceLog(label: string, startTime: number) {
  if (isDevelopmentMode()) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[PERFORMANCE] ${label}: ${duration}ms`);
  }
}

// 环境信息获取工具
export function getEnvironmentInfo() {
  const env = getCurrentEnvironment();
  const config = getCurrentConfig();
  
  return {
    environment: env,
    isDevelopment: isDevelopmentMode(),
    isTrial: isTrialMode(),
    isRelease: isReleaseMode(),
    isProduction: isProductionMode(),
    config: {
      enableLogs: config.enableLogs,
      cacheExpireTime: config.cacheExpireTime,
      enableVersionCheck: config.enableVersionCheck,
      versionCheckInterval: config.versionCheckInterval
    }
  };
} 