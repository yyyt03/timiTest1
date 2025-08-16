// 统一错误处理机制
// 移除循环依赖的导入
// import { getCurrentConfig } from './config';
import { log } from './logger';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  UNKNOWN = 'UNKNOWN'
}

// 错误严重程度枚举
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 错误信息接口
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: number;
  userId?: string;
  page?: string;
  function?: string;
}

// 错误处理配置
interface ErrorHandlerConfig {
  enableErrorReporting: boolean;
  enableConsoleLogging: boolean;
  enableUserNotification: boolean;
  maxErrorHistory: number;
  errorHistoryExpireTime: number;
}

// 错误处理器类
class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorHistory: ErrorInfo[] = [];
  private isInitialized = false;

  constructor() {
    this.config = {
      // 默认关闭远程错误上报，避免未配置云函数时报错
      enableErrorReporting: false,
      enableConsoleLogging: true,
      enableUserNotification: true,
      maxErrorHistory: 100,
      errorHistoryExpireTime: 24 * 60 * 60 * 1000 // 24小时
    };
  }

  // 初始化错误处理器
  init(): void {
    if (this.isInitialized) return;
    
    try {
      // 设置全局错误处理
      this.setupGlobalErrorHandlers();
      this.cleanupExpiredErrors();
      this.isInitialized = true;
      
      log('错误处理器初始化成功');
    } catch (error) {
      console.error('错误处理器初始化失败:', error);
    }
  }

  // 设置全局错误处理
  private setupGlobalErrorHandlers(): void {
    // 小程序错误处理
    if (typeof wx !== 'undefined') {
      wx.onError((error: string) => {
        this.handleError({
          type: ErrorType.UNKNOWN,
          severity: ErrorSeverity.HIGH,
          message: error
        });
      });

      // Promise 拒绝处理
      wx.onUnhandledRejection((res: any) => {
        this.handleError({
          type: ErrorType.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          message: `Promise rejected: ${res.reason}`,
          details: res
        });
      });
    }
  }

  // 处理错误
  handleError(error: Omit<ErrorInfo, 'timestamp'>): void {
    const errorInfo: ErrorInfo = {
      ...error,
      timestamp: Date.now()
    };

    // 添加到错误历史
    this.addToHistory(errorInfo);

    // 根据配置处理错误
    if (this.config.enableConsoleLogging) {
      this.logError(errorInfo);
    }

    if (this.config.enableErrorReporting) {
      this.reportError(errorInfo);
    }

    if (this.config.enableUserNotification) {
      this.notifyUser(errorInfo);
    }
  }

  // 添加错误到历史记录
  private addToHistory(error: ErrorInfo): void {
    this.errorHistory.push(error);
    
    // 限制历史记录数量
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
    }
  }

  // 记录错误到控制台
  private logError(error: ErrorInfo): void {
    // 使用默认配置
    const currentConfig = {
      enableLogs: true // 默认开启日志
    };
    
    if (currentConfig.enableLogs) {
      const logMessage = `[ERROR] ${error.type} (${error.severity}): ${error.message}`;
      
      if (error.details) {
        console.error(logMessage, error.details);
      } else {
        console.error(logMessage);
      }
    }
  }

  // 上报错误
  private reportError(error: ErrorInfo): void {
    try {
      // 这里可以集成第三方错误监控服务
      // 例如：Sentry, Bugsnag 等
      
      // 注意：reportError 云函数不存在，暂时禁用远程上报
      // 如果需要错误上报，可以实现对应的云函数或使用其他监控服务
      console.error('错误信息记录:', error);
    } catch (reportError) {
      console.error('错误上报处理失败:', reportError);
    }
  }

  // 通知用户
  private notifyUser(error: ErrorInfo): void {
    // 只对高严重性错误显示用户通知
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      try {
        if (typeof wx !== 'undefined') {
          wx.showToast({
            title: '操作失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (notifyError) {
        console.error('用户通知失败:', notifyError);
      }
    }
  }

  // 清理过期错误
  private cleanupExpiredErrors(): void {
    const now = Date.now();
    this.errorHistory = this.errorHistory.filter(
      error => now - error.timestamp < this.config.errorHistoryExpireTime
    );
  }

  // 获取错误历史
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  // 获取错误统计
  getErrorStats(): { total: number; byType: Record<ErrorType, number>; bySeverity: Record<ErrorSeverity, number> } {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>
    };

    // 初始化计数
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // 统计
    this.errorHistory.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
    });

    return stats;
  }

  // 清除错误历史
  clearErrorHistory(): void {
    this.errorHistory = [];
    log('错误历史已清除');
  }

  // 更新配置
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log('错误处理器配置已更新');
  }

  // 获取当前配置
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

// 导出单例实例
export const errorHandler = new ErrorHandler();

// 便捷的错误处理函数
export function handleError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: any
): void {
  errorHandler.handleError({
    type,
    severity,
    message,
    details
  });
}

// 网络错误处理
export function handleNetworkError(message: string, details?: any): void {
  handleError(ErrorType.NETWORK, message, ErrorSeverity.MEDIUM, details);
}

// 数据库错误处理
export function handleDatabaseError(message: string, details?: any): void {
  handleError(ErrorType.DATABASE, message, ErrorSeverity.HIGH, details);
}

// 验证错误处理
export function handleValidationError(message: string, details?: any): void {
  handleError(ErrorType.VALIDATION, message, ErrorSeverity.LOW, details);
}

// 认证错误处理
export function handleAuthError(message: string, details?: any): void {
  handleError(ErrorType.AUTH, message, ErrorSeverity.HIGH, details);
}

// 未知错误处理
export function handleUnknownError(message: string, details?: any): void {
  handleError(ErrorType.UNKNOWN, message, ErrorSeverity.MEDIUM, details);
} 