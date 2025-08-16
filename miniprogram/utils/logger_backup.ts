// 配置化日志系统
// 移除循环依赖的导入
// import { getCurrentConfig } from './config';

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// 日志配置接口
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  maxLogHistory: number;
  logHistoryExpireTime: number;
  format: 'simple' | 'detailed' | 'json';
  includeTimestamp: boolean;
  includeLevel: boolean;
  includeContext: boolean;
}

// 日志条目接口
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  data?: any;
  userId?: string;
  page?: string;
  function?: string;
  stack?: string;
}

// 日志格式化器
class LogFormatter {
  static format(entry: LogEntry, config: LoggerConfig): string {
    const parts: string[] = [];

    if (config.includeTimestamp) {
      parts.push(`[${new Date(entry.timestamp).toISOString()}]`);
    }

    if (config.includeLevel) {
      parts.push(`[${LogLevel[entry.level]}]`);
    }

    if (config.includeContext && entry.context) {
      parts.push(`[${entry.context}]`);
    }

    parts.push(entry.message);

    if (entry.data) {
      if (config.format === 'json') {
        parts.push(JSON.stringify(entry.data));
      } else if (config.format === 'detailed') {
        parts.push(`\nData: ${JSON.stringify(entry.data, null, 2)}`);
      }
    }

    if (entry.stack && config.format === 'detailed') {
      parts.push(`\nStack: ${entry.stack}`);
    }

    return parts.join(' ');
  }
}

// 日志处理器类
class Logger {
  private config: LoggerConfig;
  private logHistory: LogEntry[] = [];
  private isInitialized = false;

  constructor() {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      maxLogHistory: 1000,
      logHistoryExpireTime: 7 * 24 * 60 * 60 * 1000, // 7天
      format: 'detailed',
      includeTimestamp: true,
      includeLevel: true,
      includeContext: true
    };
  }

  // 初始化日志系统
  init(): void {
    if (this.isInitialized) return;

    try {
      this.cleanupExpiredLogs();
      this.isInitialized = true;

      this.info('日志系统初始化成功');
    } catch (error) {
      console.error('日志系统初始化失败:', error);
    }
  }

  // 记录调试日志
  debug(message: string, data?: any, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  // 记录信息日志
  info(message: string, data?: any, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  // 记录警告日志
  warn(message: string, data?: any, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  // 记录错误日志
  error(message: string, data?: any, context?: string): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  // 核心日志记录方法
  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    // 移除循环依赖，直接假设日志启用
    // const currentConfig = getCurrentConfig();
    // if (!currentConfig.enableLogs) {
    //   return;
    // }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      data
    };

    // 获取调用栈信息（仅在详细模式下）
    if (this.config.format === 'detailed' && level >= LogLevel.WARN) {
      try {
        const stack = new Error().stack;
        if (stack) {
          entry.stack = stack;
        }
      } catch (e) {
        // 忽略获取调用栈失败的情况
      }
    }

    // 添加到历史记录
    this.addToHistory(entry);

    // 根据配置输出日志
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    if (this.config.enableFile) {
      this.outputToFile(entry);
    }

    if (this.config.enableRemote) {
      this.outputToRemote(entry);
    }
  }

  // 添加日志到历史记录
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);

    // 限制历史记录数量
    if (this.logHistory.length > this.config.maxLogHistory) {
      this.logHistory = this.logHistory.slice(-this.config.maxLogHistory);
    }
  }

  // 输出到控制台
  private outputToConsole(entry: LogEntry): void {
    const formattedMessage = LogFormatter.format(entry, this.config);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  // 输出到文件（小程序环境暂不支持）
  private outputToFile(entry: LogEntry): void {
    // 小程序环境不支持直接文件写入
    // 这里可以集成云存储或其他存储方案
    try {
      // 临时使用本地存储
      if (typeof wx !== 'undefined') {
        const logs = wx.getStorageSync('app_logs') || [];
        logs.push(entry);
        
        // 限制本地存储的日志数量
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        wx.setStorageSync('app_logs', logs);
      }
    } catch (error) {
      console.error('日志文件写入失败:', error);
    }
  }

  // 输出到远程服务
  private outputToRemote(entry: LogEntry): void {
    try {
      // 这里可以集成第三方日志服务
      // 例如：LogRocket, Loggly 等
      
      // 注意：reportLog 云函数不存在，暂时禁用远程上报
      // 如果需要远程日志，可以实现对应的云函数或使用其他日志服务
      console.log('远程日志记录:', entry);
    } catch (error) {
      console.error('远程日志输出失败:', error);
    }
  }

  // 清理过期日志
  private cleanupExpiredLogs(): void {
    const now = Date.now();
    this.logHistory = this.logHistory.filter(
      log => now - log.timestamp < this.config.logHistoryExpireTime
    );
  }

  // 获取日志历史
  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // 获取日志统计
  getLogStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const stats = {
      total: this.logHistory.length,
      byLevel: {} as Record<LogLevel, number>
    };

    // 初始化计数
    Object.values(LogLevel).forEach(level => {
      if (typeof level === 'number') {
        stats.byLevel[level] = 0;
      }
    });

    // 统计
    this.logHistory.forEach(log => {
      stats.byLevel[log.level]++;
    });

    return stats;
  }

  // 清除日志历史
  clearLogHistory(): void {
    this.logHistory = [];
    this.info('日志历史已清除');
  }

  // 更新配置
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.info('日志系统配置已更新');
  }

  // 获取当前配置
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // 设置日志级别
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`日志级别已设置为: ${LogLevel[level]}`);
  }

  // 启用/禁用控制台输出
  setConsoleOutput(enabled: boolean): void {
    this.config.enableConsole = enabled;
    this.info(`控制台日志输出已${enabled ? '启用' : '禁用'}`);
  }

  // 启用/禁用文件输出
  setFileOutput(enabled: boolean): void {
    this.config.enableFile = enabled;
    this.info(`文件日志输出已${enabled ? '启用' : '禁用'}`);
  }

  // 启用/禁用远程输出
  setRemoteOutput(enabled: boolean): void {
    this.config.enableRemote = enabled;
    this.info(`远程日志输出已${enabled ? '启用' : '禁用'}`);
  }
}

// 导出单例实例
export const logger = new Logger();

// 便捷的日志函数
export function log(message: string, data?: any, context?: string): void {
  logger.info(message, data, context);
}

export function debug(message: string, data?: any, context?: string): void {
  logger.debug(message, data, context);
}

export function warn(message: string, data?: any, context?: string): void {
  logger.warn(message, data, context);
}

export function error(message: string, data?: any, context?: string): void {
  logger.error(message, data, context);
}

// 性能日志装饰器
export function logPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const start = Date.now();
    const result = method.apply(this, args);

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = Date.now() - start;
        logger.info(`方法 ${propertyName} 执行完成`, { duration: `${duration}ms` }, 'Performance');
      });
    } else {
      const duration = Date.now() - start;
      logger.info(`方法 ${propertyName} 执行完成`, { duration: `${duration}ms` }, 'Performance');
      return result;
    }
  };

  return descriptor;
}

// 异步操作日志装饰器
export function logAsync(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    logger.info(`开始执行异步方法 ${propertyName}`, { args }, 'Async');

    const result = method.apply(this, args);

    if (result instanceof Promise) {
      return result
        .then(value => {
          logger.info(`异步方法 ${propertyName} 执行成功`, { result: value }, 'Async');
          return value;
        })
        .catch(error => {
          logger.error(`异步方法 ${propertyName} 执行失败`, { error: error.message }, 'Async');
          throw error;
        });
    }

    return result;
  };

  return descriptor;
}
