// 收藏状态同步工具
import { logger } from './logger';

// 收藏操作类型
export enum FavoriteAction {
  ADD = 'add',
  REMOVE = 'remove'
}

// 收藏状态变化事件
export interface FavoriteChangeEvent {
  action: FavoriteAction;
  planId: string;
  timestamp: number;
}

// 收藏同步管理器
class FavoriteSyncManager {
  private static instance: FavoriteSyncManager;
  private listeners: Set<(event: FavoriteChangeEvent) => void> = new Set();
  private lastChangeTime: number = 0;
  private changeThreshold: number = 1000; // 1秒内的变化合并处理

  private constructor() {}

  static getInstance(): FavoriteSyncManager {
    if (!FavoriteSyncManager.instance) {
      FavoriteSyncManager.instance = new FavoriteSyncManager();
    }
    return FavoriteSyncManager.instance;
  }

  // 添加监听器
  addListener(listener: (event: FavoriteChangeEvent) => void): void {
    this.listeners.add(listener);
    logger.debug('收藏状态监听器已添加');
  }

  // 移除监听器
  removeListener(listener: (event: FavoriteChangeEvent) => void): void {
    this.listeners.delete(listener);
    logger.debug('收藏状态监听器已移除');
  }

  // 通知收藏状态变化
  notifyChange(action: FavoriteAction, planId: string): void {
    const now = Date.now();
    
    // 如果距离上次变化时间太短，延迟处理
    if (now - this.lastChangeTime < this.changeThreshold) {
      setTimeout(() => {
        this.notifyChange(action, planId);
      }, this.changeThreshold - (now - this.lastChangeTime));
      return;
    }

    const event: FavoriteChangeEvent = {
      action,
      planId,
      timestamp: now
    };

    this.lastChangeTime = now;
    
    // 更新全局收藏变化时间戳，供其他页面检查
    try {
      wx.setStorageSync('last_global_favorite_change', now);
    } catch (error) {
      logger.error('更新全局收藏变化时间戳失败', error);
    }
    
    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('收藏状态监听器执行失败', error);
      }
    });

    logger.debug('收藏状态变化已通知', event);
  }

  // 添加收藏
  addFavorite(planId: string): void {
    this.notifyChange(FavoriteAction.ADD, planId);
  }

  // 移除收藏
  removeFavorite(planId: string): void {
    this.notifyChange(FavoriteAction.REMOVE, planId);
  }

  // 获取最后变化时间
  getLastChangeTime(): number {
    return this.lastChangeTime;
  }

  // 检查是否有新的收藏变化
  hasRecentChanges(since: number): boolean {
    return this.lastChangeTime > since;
  }
}

// 导出单例实例
export const favoriteSyncManager = FavoriteSyncManager.getInstance();

// 便捷函数
export function notifyFavoriteAdded(planId: string): void {
  favoriteSyncManager.addFavorite(planId);
}

export function notifyFavoriteRemoved(planId: string): void {
  favoriteSyncManager.removeFavorite(planId);
}

// 在页面收藏操作后调用这些函数
export function syncFavoriteChange(action: FavoriteAction, planId: string): void {
  if (action === FavoriteAction.ADD) {
    notifyFavoriteAdded(planId);
  } else {
    notifyFavoriteRemoved(planId);
  }
}
