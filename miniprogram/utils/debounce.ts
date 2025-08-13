// 防抖工具类
import { logger } from './logger';

// 防抖配置接口
export interface DebounceConfig {
  delay: number; // 延迟时间（毫秒）
  leading?: boolean; // 是否在开始时执行
  trailing?: boolean; // 是否在结束时执行
  maxWait?: number; // 最大等待时间
}

// 防抖函数类型
export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  isPending: () => boolean;
};

// 防抖管理器类
export class DebounceManager {
  private static instance: DebounceManager;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pendingRequests: Map<string, boolean> = new Map();

  static getInstance(): DebounceManager {
    if (!DebounceManager.instance) {
      DebounceManager.instance = new DebounceManager();
    }
    return DebounceManager.instance;
  }

  // 创建防抖函数
  createDebounced<T extends (...args: any[]) => any>(
    func: T,
    config: DebounceConfig = { delay: 300 }
  ): DebouncedFunction<T> {
    const { delay, leading = false, trailing = true, maxWait } = config;
    let timeoutId: NodeJS.Timeout | null = null;
    let lastCallTime = 0;
    let lastExecTime = 0;
    let isPending = false;

    const debounced = ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      const timeSinceLastExec = now - lastExecTime;

      // 如果设置了最大等待时间且超过最大等待时间，立即执行
      if (maxWait && timeSinceLastExec >= maxWait) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        lastExecTime = now;
        isPending = false;
        func.apply(this, args);
        return;
      }

      // 如果是第一次调用且需要立即执行
      if (leading && !timeoutId) {
        lastExecTime = now;
        isPending = true;
        func.apply(this, args);
      }

      // 清除之前的定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 设置新的定时器
      timeoutId = setTimeout(() => {
        if (trailing) {
          lastExecTime = Date.now();
          isPending = false;
          func.apply(this, args);
        }
        timeoutId = null;
      }, delay);

      lastCallTime = now;
    }) as DebouncedFunction<T>;

    // 添加控制方法
    debounced.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isPending = false;
    };

    debounced.flush = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (isPending) {
        lastExecTime = Date.now();
        isPending = false;
        func.apply(this, []);
      }
    };

    debounced.isPending = () => isPending;

    return debounced;
  }

  // 为特定操作创建防抖函数
  createOperationDebounce<T extends (...args: any[]) => any>(
    operationName: string,
    func: T,
    config: DebounceConfig = { delay: 300 }
  ): DebouncedFunction<T> {
    const debounced = this.createDebounced(func, config);
    
    // 包装函数，添加日志记录
    const wrapped = ((...args: Parameters<T>) => {
      logger.debug(`防抖操作触发: ${operationName}`, { 
        operationName, 
        args: args.length,
        timestamp: new Date().toISOString()
      });
      debounced(...args);
    }) as DebouncedFunction<T>;

    // 复制控制方法
    wrapped.cancel = debounced.cancel;
    wrapped.flush = debounced.flush;
    wrapped.isPending = debounced.isPending;

    return wrapped;
  }

  // 检查操作是否正在等待中
  isOperationPending(operationName: string): boolean {
    return this.pendingRequests.get(operationName) || false;
  }

  // 设置操作状态
  setOperationPending(operationName: string, pending: boolean): void {
    this.pendingRequests.set(operationName, pending);
  }

  // 清理所有定时器
  clearAllTimers(): void {
    for (const [name, timer] of this.timers.entries()) {
      clearTimeout(timer);
      logger.debug(`清理防抖定时器: ${name}`);
    }
    this.timers.clear();
    this.pendingRequests.clear();
  }

  // 获取统计信息
  getStats(): {
    activeTimers: number;
    pendingOperations: number;
    totalOperations: number;
  } {
    return {
      activeTimers: this.timers.size,
      pendingOperations: Array.from(this.pendingRequests.values()).filter(Boolean).length,
      totalOperations: this.pendingRequests.size
    };
  }
}

// 导出单例实例
export const debounceManager = DebounceManager.getInstance();

// 便捷的防抖函数创建方法
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300,
  config?: Omit<DebounceConfig, 'delay'>
): DebouncedFunction<T> {
  return debounceManager.createDebounced(func, { delay, ...config });
}

// 为操作创建防抖函数
export function debounceOperation<T extends (...args: any[]) => any>(
  operationName: string,
  func: T,
  delay: number = 300,
  config?: Omit<DebounceConfig, 'delay'>
): DebouncedFunction<T> {
  return debounceManager.createOperationDebounce(operationName, func, { delay, ...config });
}

// 默认导出
export default debounceManager;
