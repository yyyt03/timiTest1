// 应用配置管理
import { errorHandler } from './errorHandler';
import { logger } from './logger';
import { cacheManager } from './cacheManager';

// 环境类型
export type Environment = 'development' | 'staging' | 'production';

// 应用配置接口
export interface AppConfig {
  // 基础配置
  appName: string;
  version: string;
  environment: Environment;
  
  // 云开发配置
  cloudEnv: string;
  
  // 功能开关
  enableLogs: boolean;
  enableDebug: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  
  // 缓存配置
  cacheEnabled: boolean;
  cacheTTL: number;
  
  // API配置
  apiTimeout: number;
  apiRetryCount: number;
  
  // 性能配置
  enablePerformanceMonitoring: boolean;
  performanceThreshold: number;
  
  // 安全配置
  enableSensitiveWordCheck: boolean;
  maxContentLength: number;
}

// 默认配置
const defaultConfig: AppConfig = {
  appName: '王者荣耀攻略助手',
  version: '2.0.0',
  environment: 'development',
  cloudEnv: 'cloudbase-1gk9t6w2d1d090af', // 修复：使用用户提供的正确云开发环境ID
  enableLogs: true,
  enableDebug: true,
  enableAnalytics: false,
  enableErrorReporting: true,
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5分钟
  apiTimeout: 10000, // 10秒
  apiRetryCount: 3,
  enablePerformanceMonitoring: true,
  performanceThreshold: 1000, // 1秒
  enableSensitiveWordCheck: true,
  maxContentLength: 1000
};

// 环境特定配置
const environmentConfigs: Record<Environment, Partial<AppConfig>> = {
  development: {
    enableLogs: true,
    enableDebug: true,
    enableErrorReporting: false,
    cacheTTL: 1 * 60 * 1000, // 1分钟
  },
  staging: {
    enableLogs: true,
    enableDebug: false,
    enableErrorReporting: true,
    cacheTTL: 3 * 60 * 1000, // 3分钟
  },
  production: {
    enableLogs: false,
    enableDebug: false,
    enableErrorReporting: true,
    cacheTTL: 10 * 60 * 1000, // 10分钟
    enableAnalytics: true,
  }
};

// 配置管理器类
class ConfigManager {
  private config: AppConfig;
  private isInitialized = false;

  constructor() {
    this.config = { ...defaultConfig };
  }

  // 初始化配置管理器
  init(): void {
    if (this.isInitialized) return;
    
    try {
      // 检测环境
      this.detectEnvironment();
      
      // 应用环境特定配置
      this.applyEnvironmentConfig();
      
      // 初始化子系统
      this.initializeSubsystems();
      
      this.isInitialized = true;
      
      console.log('配置管理器初始化成功', {
        environment: this.config.environment,
        version: this.config.version
      });
    } catch (error) {
      console.error('配置管理器初始化失败:', error);
    }
  }

  // 检测运行环境
  private detectEnvironment(): void {
    try {
      // 小程序环境检测
      if (typeof wx !== 'undefined') {
        // 检查是否在开发工具中
        const appBaseInfo = wx.getAppBaseInfo();
        if (appBaseInfo.platform === 'devtools') {
          this.config.environment = 'development';
        } else {
          // 生产环境
          this.config.environment = 'production';
        }
      } else {
        // Node.js 或其他环境
        // @ts-ignore
        this.config.environment = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') ? 'production' : 'development';
      }
    } catch (error) {
      console.warn('环境检测失败，使用默认配置:', error);
      this.config.environment = 'development';
    }
  }

  // 应用环境特定配置
  private applyEnvironmentConfig(): void {
    const envConfig = environmentConfigs[this.config.environment];
    this.config = { ...this.config, ...envConfig };
  }

  // 初始化子系统
  private initializeSubsystems(): void {
    // 初始化错误处理器
    if (this.config.enableErrorReporting) {
      errorHandler.init();
    }

    // 初始化日志系统
    if (this.config.enableLogs) {
      logger.init();
      
      // 根据环境设置日志级别
      if (this.config.environment === 'production') {
        logger.setLevel(2); // WARN
      } else if (this.config.environment === 'staging') {
        logger.setLevel(1); // INFO
      } else {
        logger.setLevel(0); // DEBUG
      }
    }

    // 初始化缓存管理器
    if (this.config.cacheEnabled) {
      cacheManager.init();
      
      // 更新缓存配置
      cacheManager.updateConfig({
        defaultTTL: this.config.cacheTTL,
        enableVersioning: true,
        cleanupInterval: 60 * 1000 // 1分钟
      });
    }
  }

  // 获取当前配置
  getCurrentConfig(): AppConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // 重新初始化受影响的子系统
    if (updates.enableLogs !== undefined) {
      if (updates.enableLogs) {
        logger.init();
      }
    }
    
    if (updates.enableErrorReporting !== undefined) {
      if (updates.enableErrorReporting) {
        errorHandler.init();
      }
    }
    
    if (updates.cacheEnabled !== undefined || updates.cacheTTL !== undefined) {
      if (updates.cacheEnabled) {
        cacheManager.init();
        cacheManager.updateConfig({
          defaultTTL: updates.cacheTTL || this.config.cacheTTL
        });
      }
    }
    
    console.log('配置已更新:', updates);
  }

  // 获取特定配置项
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  // 检查是否为开发环境
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  // 检查是否为生产环境
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  // 检查是否为测试环境
  isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  // 检查功能是否启用
  isFeatureEnabled(feature: keyof Pick<AppConfig, 'enableLogs' | 'enableDebug' | 'enableAnalytics' | 'enableErrorReporting' | 'cacheEnabled' | 'enablePerformanceMonitoring' | 'enableSensitiveWordCheck'>): boolean {
    return this.config[feature] === true;
  }

  // 获取环境信息
  getEnvironmentInfo(): { environment: Environment; isDev: boolean; isProd: boolean; isStaging: boolean } {
    return {
      environment: this.config.environment,
      isDev: this.isDevelopment(),
      isProd: this.isProduction(),
      isStaging: this.isStaging()
    };
  }

  // 获取版本信息
  getVersionInfo(): { version: string; appName: string } {
    return {
      version: this.config.version,
      appName: this.config.appName
    };
  }

  // 获取云开发环境
  getCloudEnvironment(): string {
    // 优先使用配置的环境ID
    if (this.config.cloudEnv && this.config.cloudEnv !== 'cloudbase-1gk9t6w2d1d090af') {
      return this.config.cloudEnv;
    }
    
    // 尝试从本地存储获取
    try {
      const savedEnv = wx.getStorageSync('cloud_env');
      if (savedEnv) {
        return savedEnv;
      }
    } catch (error) {
      console.warn('无法从本地存储获取云环境ID:', error);
    }
    
    // 返回默认环境ID（用户需要在微信开发者工具中配置）
    console.warn('请确保在微信开发者工具中正确配置云开发环境ID');
    return 'cloud1-8g0g5g5g5g5g5g5'; // 默认值，需要用户手动修改
  }

  // 获取API配置
  getApiConfig(): { timeout: number; retryCount: number } {
    return {
      timeout: this.config.apiTimeout,
      retryCount: this.config.apiRetryCount
    };
  }

  // 获取缓存配置
  getCacheConfig(): { enabled: boolean; ttl: number } {
    return {
      enabled: this.config.cacheEnabled,
      ttl: this.config.cacheTTL
    };
  }

  // 获取性能配置
  getPerformanceConfig(): { enabled: boolean; threshold: number } {
    return {
      enabled: this.config.enablePerformanceMonitoring,
      threshold: this.config.performanceThreshold
    };
  }

  // 获取安全配置
  getSecurityConfig(): { enableSensitiveWordCheck: boolean; maxContentLength: number } {
    return {
      enableSensitiveWordCheck: this.config.enableSensitiveWordCheck,
      maxContentLength: this.config.maxContentLength
    };
  }

  // 重置为默认配置
  resetToDefault(): void {
    this.config = { ...defaultConfig };
    this.detectEnvironment();
    this.applyEnvironmentConfig();
    this.initializeSubsystems();
    console.log('配置已重置为默认值');
  }

  // 导出配置（用于调试）
  exportConfig(): AppConfig {
    return { ...this.config };
  }

  // 导入配置
  importConfig(config: Partial<AppConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeSubsystems();
    console.log('配置已导入并应用');
  }
}

// 导出单例实例
export const configManager = new ConfigManager();

// 便捷的配置访问函数
export function getCurrentConfig(): AppConfig {
  return configManager.getCurrentConfig();
}

export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return configManager.get(key);
}

export function updateConfig(updates: Partial<AppConfig>): void {
  configManager.updateConfig(updates);
}

export function isDevelopment(): boolean {
  return configManager.isDevelopment();
}

export function isProduction(): boolean {
  return configManager.isProduction();
}

export function isFeatureEnabled(feature: keyof Pick<AppConfig, 'enableLogs' | 'enableDebug' | 'enableAnalytics' | 'enableErrorReporting' | 'cacheEnabled' | 'enablePerformanceMonitoring' | 'enableSensitiveWordCheck'>): boolean {
  return configManager.isFeatureEnabled(feature);
}

// 日志函数（从logger模块重新导出）
export { log, debug, warn, error } from './logger';

// 错误处理函数（从errorHandler模块重新导出）
export { 
  handleError, 
  handleNetworkError, 
  handleDatabaseError, 
  handleValidationError, 
  handleAuthError, 
  handleUnknownError 
} from './errorHandler';

// 缓存函数（从cacheManager模块重新导出）
export { 
  setCache, 
  getCache, 
  hasCache, 
  deleteCache, 
  clearCache 
} from './cacheManager'; 