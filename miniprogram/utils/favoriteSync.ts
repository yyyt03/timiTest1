// 收藏状态同步工具
import { logger } from './logger';

// 收藏操作类型
export enum FavoriteAction {
  ADD = 'add',
  REMOVE = 'remove'
}

// 点赞操作类型
export enum LikeAction {
  ADD = 'add',
  REMOVE = 'remove'
}

// 收藏状态变化事件
export interface FavoriteChangeEvent {
  action: FavoriteAction;
  planId: string;
  timestamp: number;
}

// 点赞状态变化事件
export interface LikeChangeEvent {
  action: LikeAction;
  planId: string;
  timestamp: number;
}

// 统一的交互状态变化事件
export interface InteractionChangeEvent {
  type: 'favorite' | 'like';
  action: FavoriteAction | LikeAction;
  planId: string;
  timestamp: number;
}

// 交互状态同步管理器
class InteractionSyncManager {
  private static instance: InteractionSyncManager;
  private favoriteListeners: Set<(event: FavoriteChangeEvent) => void> = new Set();
  private likeListeners: Set<(event: LikeChangeEvent) => void> = new Set();
  private interactionListeners: Set<(event: InteractionChangeEvent) => void> = new Set();
  private lastFavoriteChangeTime: number = 0;
  private lastLikeChangeTime: number = 0;
  private changeThreshold: number = 1000; // 1秒内的变化合并处理

  private constructor() {}

  static getInstance(): InteractionSyncManager {
    if (!InteractionSyncManager.instance) {
      InteractionSyncManager.instance = new InteractionSyncManager();
    }
    return InteractionSyncManager.instance;
  }

  // 添加收藏状态监听器
  addFavoriteListener(listener: (event: FavoriteChangeEvent) => void): void {
    this.favoriteListeners.add(listener);
    logger.debug('收藏状态监听器已添加');
  }

  // 移除收藏状态监听器
  removeFavoriteListener(listener: (event: FavoriteChangeEvent) => void): void {
    this.favoriteListeners.delete(listener);
    logger.debug('收藏状态监听器已移除');
  }

  // 添加点赞状态监听器
  addLikeListener(listener: (event: LikeChangeEvent) => void): void {
    this.likeListeners.add(listener);
    logger.debug('点赞状态监听器已添加');
  }

  // 移除点赞状态监听器
  removeLikeListener(listener: (event: LikeChangeEvent) => void): void {
    this.likeListeners.delete(listener);
    logger.debug('点赞状态监听器已移除');
  }

  // 添加统一交互状态监听器
  addInteractionListener(listener: (event: InteractionChangeEvent) => void): void {
    this.interactionListeners.add(listener);
    logger.debug('交互状态监听器已添加');
  }

  // 移除统一交互状态监听器
  removeInteractionListener(listener: (event: InteractionChangeEvent) => void): void {
    this.interactionListeners.delete(listener);
    logger.debug('交互状态监听器已移除');
  }

  // 通知收藏状态变化
  notifyFavoriteChange(action: FavoriteAction, planId: string): void {
    const now = Date.now();
    
    // 如果距离上次变化时间太短，延迟处理
    if (now - this.lastFavoriteChangeTime < this.changeThreshold) {
      setTimeout(() => {
        this.notifyFavoriteChange(action, planId);
      }, this.changeThreshold - (now - this.lastFavoriteChangeTime));
      return;
    }

    const event: FavoriteChangeEvent = {
      action,
      planId,
      timestamp: now
    };

    this.lastFavoriteChangeTime = now;
    
    // 更新全局收藏变化时间戳，供其他页面检查
    try {
      wx.setStorageSync('last_global_favorite_change', now);
    } catch (error) {
      logger.error('更新全局收藏变化时间戳失败', error);
    }
    
    // 通知收藏状态监听器
    this.favoriteListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('收藏状态监听器执行失败', error);
      }
    });

    // 通知统一交互状态监听器
    const interactionEvent: InteractionChangeEvent = {
      type: 'favorite',
      action,
      planId,
      timestamp: now
    };
    
    this.interactionListeners.forEach(listener => {
      try {
        listener(interactionEvent);
      } catch (error) {
        logger.error('交互状态监听器执行失败', error);
      }
    });

    logger.debug('收藏状态变化已通知', event);
  }

  // 通知点赞状态变化
  notifyLikeChange(action: LikeAction, planId: string): void {
    const now = Date.now();
    
    // 如果距离上次变化时间太短，延迟处理
    if (now - this.lastLikeChangeTime < this.changeThreshold) {
      setTimeout(() => {
        this.notifyLikeChange(action, planId);
      }, this.changeThreshold - (now - this.lastLikeChangeTime));
      return;
    }

    const event: LikeChangeEvent = {
      action,
      planId,
      timestamp: now
    };

    this.lastLikeChangeTime = now;
    
    // 更新全局点赞变化时间戳，供其他页面检查
    try {
      wx.setStorageSync('last_global_like_change', now);
    } catch (error) {
      logger.error('更新全局点赞变化时间戳失败', error);
    }
    
    // 通知点赞状态监听器
    this.likeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('点赞状态监听器执行失败', error);
      }
    });

    // 通知统一交互状态监听器
    const interactionEvent: InteractionChangeEvent = {
      type: 'like',
      action,
      planId,
      timestamp: now
    };
    
    this.interactionListeners.forEach(listener => {
      try {
        listener(interactionEvent);
      } catch (error) {
        logger.error('交互状态监听器执行失败', error);
      }
    });

    logger.debug('点赞状态变化已通知', event);
  }

  // 添加收藏
  addFavorite(planId: string): void {
    this.notifyFavoriteChange(FavoriteAction.ADD, planId);
  }

  // 移除收藏
  removeFavorite(planId: string): void {
    this.notifyFavoriteChange(FavoriteAction.REMOVE, planId);
  }

  // 添加点赞
  addLike(planId: string): void {
    this.notifyLikeChange(LikeAction.ADD, planId);
  }

  // 移除点赞
  removeLike(planId: string): void {
    this.notifyLikeChange(LikeAction.REMOVE, planId);
  }

  // 获取最后收藏变化时间
  getLastFavoriteChangeTime(): number {
    return this.lastFavoriteChangeTime;
  }

  // 获取最后点赞变化时间
  getLastLikeChangeTime(): number {
    return this.lastLikeChangeTime;
  }

  // 检查是否有新的收藏变化
  hasRecentFavoriteChanges(since: number): boolean {
    return this.lastFavoriteChangeTime > since;
  }

  // 检查是否有新的点赞变化
  hasRecentLikeChanges(since: number): boolean {
    return this.lastLikeChangeTime > since;
  }

  // 检查是否有任何新的交互状态变化
  hasRecentInteractionChanges(since: number): boolean {
    return this.lastFavoriteChangeTime > since || this.lastLikeChangeTime > since;
  }
}

// 导出单例实例
export const interactionSyncManager = InteractionSyncManager.getInstance();

// 为了向后兼容，保留原有的导出
export const favoriteSyncManager = {
  addListener: (listener: (event: FavoriteChangeEvent) => void) => 
    interactionSyncManager.addFavoriteListener(listener),
  removeListener: (listener: (event: FavoriteChangeEvent) => void) => 
    interactionSyncManager.removeFavoriteListener(listener),
  addFavorite: (planId: string) => interactionSyncManager.addFavorite(planId),
  removeFavorite: (planId: string) => interactionSyncManager.removeFavorite(planId),
  getLastChangeTime: () => interactionSyncManager.getLastFavoriteChangeTime(),
  hasRecentChanges: (since: number) => interactionSyncManager.hasRecentFavoriteChanges(since)
};

// 便捷函数
export function notifyFavoriteAdded(planId: string): void {
  interactionSyncManager.addFavorite(planId);
}

export function notifyFavoriteRemoved(planId: string): void {
  interactionSyncManager.removeFavorite(planId);
}

export function notifyLikeAdded(planId: string): void {
  interactionSyncManager.addLike(planId);
}

export function notifyLikeRemoved(planId: string): void {
  interactionSyncManager.removeLike(planId);
}

// 在页面交互操作后调用这些函数
export function syncFavoriteChange(action: FavoriteAction, planId: string): void {
  if (action === FavoriteAction.ADD) {
    notifyFavoriteAdded(planId);
  } else {
    notifyFavoriteRemoved(planId);
  }
}

export function syncLikeChange(action: LikeAction, planId: string): void {
  if (action === LikeAction.ADD) {
    notifyLikeAdded(planId);
  } else {
    notifyLikeRemoved(planId);
  }
}
