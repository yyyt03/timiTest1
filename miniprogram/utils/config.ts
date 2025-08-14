// 应用配置管理
import { errorHandler, handleError, ErrorType } from './errorHandler';
import { logger } from './logger';
import cacheManager from './cacheManager';

// 应用配置接口
export interface AppConfig {
  // 基础配置
  appName: string;
  version: string;
  
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

// 应用配置
export const appConfig: AppConfig = {
  appName: '王者荣耀攻略助手',
  version: '2.0.0',
  cloudEnv: 'cloudbase-1gk9t6w2d1d090af',
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

// 配置管理器类
class ConfigManager {
  private config: AppConfig;
  private isInitialized = false;

  constructor() {
    this.config = { ...appConfig };
  }

  // 初始化配置管理器
  init(): void {
    if (this.isInitialized) return;
    
    try {
      // 初始化子系统
      this.initializeSubsystems();
      
      this.isInitialized = true;
      // 使用console.log避免循环依赖
      console.log('配置管理器初始化完成');
    } catch (error) {
      console.error('配置管理器初始化失败:', error);
      throw error;
    }
  }

  // 初始化子系统
  private initializeSubsystems(): void {
    try {
      // 初始化缓存管理器
      if (this.config.cacheEnabled) {
        try {
          cacheManager.init();
          console.log('缓存管理器初始化完成');
        } catch (error) {
          console.warn('缓存管理器初始化失败:', error);
        }
      }

      // 初始化错误处理器
      if (this.config.enableErrorReporting) {
        try {
          errorHandler.init();
          console.log('错误处理器初始化完成');
        } catch (error) {
          console.warn('错误处理器初始化失败:', error);
        }
      }

      // 初始化日志系统
      if (this.config.enableLogs) {
        try {
          logger.init();
          console.log('日志系统初始化完成');
        } catch (error) {
          console.warn('日志系统初始化失败:', error);
        }
      }
    } catch (error) {
      console.error('子系统初始化失败:', error);
      // 不抛出错误，允许部分子系统初始化失败
    }
  }

  // 获取当前配置
  getCurrentConfig(): AppConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(updates: Partial<AppConfig>): void {
    try {
      this.config = { ...this.config, ...updates };
      logger.info('配置更新成功');
    } catch (error) {
      handleError(ErrorType.UNKNOWN, '配置更新失败');
    }
  }

  // 获取配置值
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  // 获取版本信息
  getVersionInfo(): { version: string; appName: string } {
    return {
      version: this.config.version,
      appName: this.config.appName
    };
  }

  // 获取云环境ID
  getCloudEnvironment(): string {
    return this.config.cloudEnv;
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
    try {
      this.config = { ...appConfig };
      logger.info('配置已重置为默认值');
    } catch (error) {
      handleError(ErrorType.UNKNOWN, '配置重置失败');
    }
  }

  // 导出配置
  exportConfig(): AppConfig {
    return { ...this.config };
  }

  // 导入配置
  importConfig(config: Partial<AppConfig>): void {
    try {
      this.config = { ...this.config, ...config };
      logger.info('配置导入成功');
    } catch (error) {
      handleError(ErrorType.UNKNOWN, '配置导入失败');
    }
  }
}

// 创建全局配置管理器实例
export const configManager = new ConfigManager();

// 便捷函数
export function getCurrentConfig(): AppConfig {
  return configManager.getCurrentConfig();
}

export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return configManager.get(key);
}

export function updateConfig(updates: Partial<AppConfig>): void {
  configManager.updateConfig(updates);
}

export function isFeatureEnabled(feature: keyof Pick<AppConfig, 'enableLogs' | 'enableDebug' | 'enableAnalytics' | 'enableErrorReporting' | 'cacheEnabled' | 'enablePerformanceMonitoring' | 'enableSensitiveWordCheck'>): boolean {
  return configManager.get(feature);
}

// 默认导出
export default configManager; 