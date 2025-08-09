// app.ts
import { configManager } from './utils/config';
import { errorHandler } from './utils/errorHandler';
import { logger } from './utils/logger';
import { cacheManager } from './utils/cacheManager';

// 全局数据
interface IAppOption {
  globalData?: {
    userInfo?: WechatMiniprogram.UserInfo | null,
    systemInfo?: WechatMiniprogram.SystemInfo | null,
    isLoggedIn?: boolean,
    currentUser?: any,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
  // 添加自定义方法到接口
  getSystemInfo(): void;
  checkLoginStatus(): void;
  initCloud(): void;
  checkForUpdates(): void;
  saveAppState(): void;
  getGlobalData(): any;
  setGlobalData(key: keyof IAppOption['globalData'], value: any): void;
  getAppConfig(): any;
  getCacheStats(): any;
  getErrorStats(): any;
  getLogStats(): any;
  clearCache(): void;
  clearLogs(): void;
}

App<IAppOption>({
  globalData: {
    userInfo: null,
    systemInfo: null,
    isLoggedIn: false,
    currentUser: null
  },

  onLaunch() {
    console.log('小程序启动');
    
    try {
      // 初始化配置系统
      configManager.init();
      
      // 获取系统信息
      this.getSystemInfo();
      
      // 检查登录状态
      this.checkLoginStatus();
      
      // 初始化云开发
      this.initCloud();
      
      console.log('小程序初始化完成');
    } catch (error) {
      console.error('小程序初始化失败:', error);
      // 使用错误处理器记录错误
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'CRITICAL' as any,
          message: '小程序初始化失败',
          details: error
        });
      }
    }
  },

  onShow() {
    console.log('小程序显示');
    
    try {
      // 记录应用显示事件
      if (logger) {
        logger.info('小程序显示');
      }
      
      // 检查更新
      this.checkForUpdates();
    } catch (error) {
      console.error('小程序显示处理失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'MEDIUM' as any,
          message: '小程序显示处理失败',
          details: error
        });
      }
    }
  },

  onHide() {
    console.log('小程序隐藏');
    
    try {
      // 记录应用隐藏事件
      if (logger) {
        logger.info('小程序隐藏');
      }
      
      // 保存当前状态
      this.saveAppState();
    } catch (error) {
      console.error('小程序隐藏处理失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'LOW' as any,
          message: '小程序隐藏处理失败',
          details: error
        });
      }
    }
  },

  onError(error: string) {
    console.error('小程序错误:', error);
    
    try {
      // 使用错误处理器记录错误
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'HIGH' as any,
          message: error
        });
      }
    } catch (handlerError) {
      console.error('错误处理器失败:', handlerError);
    }
  },

  onUnhandledRejection(res: any) {
    console.error('未处理的Promise拒绝:', res);
    
    try {
      // 使用错误处理器记录错误
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'MEDIUM' as any,
          message: `Promise rejected: ${res.reason}`,
          details: res
        });
      }
    } catch (handlerError) {
      console.error('错误处理器失败:', handlerError);
    }
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      // 使用新的 API 获取系统信息
      const appBaseInfo = wx.getAppBaseInfo();
      
      // 尝试获取设备信息，如果不可用则使用默认值
      let deviceInfo: any = {};
      try {
        // 检查新 API 是否可用
        if (typeof (wx as any).getDeviceInfo === 'function') {
          deviceInfo = (wx as any).getDeviceInfo();
        }
      } catch (deviceError) {
        console.warn('getDeviceInfo API 不可用，使用默认值:', deviceError);
      }
      
      // 创建兼容的系统信息对象，优先使用新 API 的数据
      const systemInfo = {
        platform: appBaseInfo.platform,
        system: deviceInfo.system || 'unknown',
        version: deviceInfo.version || appBaseInfo.version,
        SDKVersion: appBaseInfo.SDKVersion,
        language: appBaseInfo.language,
        host: appBaseInfo.host,
        brand: deviceInfo.brand || 'unknown',
        model: deviceInfo.model || 'unknown',
        pixelRatio: deviceInfo.pixelRatio || 1,
        screenWidth: deviceInfo.screenWidth || 0,
        screenHeight: deviceInfo.screenHeight || 0,
        windowWidth: deviceInfo.windowWidth || 0,
        windowHeight: deviceInfo.windowHeight || 0,
        statusBarHeight: deviceInfo.statusBarHeight || 0,
        safeArea: deviceInfo.safeArea || null
      } as any; // 使用 any 类型避免类型检查错误
      
      this.globalData!.systemInfo = systemInfo;
      
      // 记录系统信息
      if (logger) {
        logger.info('系统信息获取成功', {
          platform: systemInfo.platform,
          system: systemInfo.system,
          version: systemInfo.version
        });
      }
      
      console.log('系统信息:', systemInfo);
    } catch (error) {
      console.error('获取系统信息失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'MEDIUM' as any,
          message: '获取系统信息失败',
          details: error
        });
      }
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    try {
      // 检查本地存储的登录状态
      const token = wx.getStorageSync('user_token');
      const userInfo = wx.getStorageSync('user_info');
      
      if (token && userInfo) {
        this.globalData!.isLoggedIn = true;
        this.globalData!.currentUser = userInfo;
        
        if (logger) {
          logger.info('用户已登录', { userId: (userInfo as any)._id });
        }
      } else {
        this.globalData!.isLoggedIn = false;
        this.globalData!.currentUser = null;
        
        if (logger) {
          logger.info('用户未登录');
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'AUTH' as any,
          severity: 'MEDIUM' as any,
          message: '检查登录状态失败',
          details: error
        });
      }
    }
  },

  // 初始化云开发
  initCloud() {
    try {
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        return;
      }

      // 检查云开发是否已经初始化
      if ((wx.cloud as any).inited) {
        console.log('云开发已经初始化');
        return;
      }

      const cloudEnv = 'cloudbase-1gk9t6w2d1d090af'; // 使用正确的环境ID
      console.log('正在初始化云开发，环境ID:', cloudEnv);

      wx.cloud.init({
        env: cloudEnv,
        traceUser: true,
      });

      // 标记云开发已初始化
      (wx.cloud as any).inited = true;

      if (logger) {
        logger.info('云开发初始化成功');
      }
      
      console.log('云开发初始化成功');
    } catch (error) {
      console.error('云开发初始化失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'NETWORK' as any,
          severity: 'HIGH' as any,
          message: '云开发初始化失败',
          details: error
        });
      }
    }
  },

  // 检查更新
  checkForUpdates() {
    try {
      if (wx.canIUse('getUpdateManager')) {
        const updateManager = wx.getUpdateManager();

        updateManager.onCheckForUpdate((res) => {
          if (res.hasUpdate) {
            if (logger) {
              logger.info('发现新版本');
            }
            
            updateManager.onUpdateReady(() => {
              wx.showModal({
                title: '更新提示',
                content: '新版本已经准备好，是否重启应用？',
                success: (res) => {
                  if (res.confirm) {
                    updateManager.applyUpdate();
                  }
                }
              });
            });

            updateManager.onUpdateFailed(() => {
              if (logger) {
                logger.warn('新版本下载失败');
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'LOW' as any,
          message: '检查更新失败',
          details: error
        });
      }
    }
  },

  // 保存应用状态
  saveAppState() {
    try {
      // 保存当前状态到本地存储
      const appState = {
        timestamp: Date.now(),
        isLoggedIn: this.globalData!.isLoggedIn,
        userInfo: this.globalData!.userInfo
      };
      
      wx.setStorageSync('app_state', appState);
      
      if (logger) {
        logger.debug('应用状态已保存');
      }
    } catch (error) {
      console.error('保存应用状态失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'LOW' as any,
          message: '保存应用状态失败',
          details: error
        });
      }
    }
  },

  // 获取全局数据
  getGlobalData() {
    return this.globalData;
  },

  // 设置全局数据
  setGlobalData(key: keyof IAppOption['globalData'], value: any) {
    try {
      (this.globalData as any)[key] = value;
      
      if (logger) {
        logger.debug('全局数据已更新', { key, value });
      }
    } catch (error) {
      console.error('设置全局数据失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'LOW' as any,
          message: '设置全局数据失败',
          details: error
        });
      }
    }
  },

  // 获取应用配置
  getAppConfig() {
    return configManager.getCurrentConfig();
  },

  // 获取缓存统计
  getCacheStats() {
    if (cacheManager) {
      return cacheManager.getStats();
    }
    return null;
  },

  // 获取错误统计
  getErrorStats() {
    if (errorHandler) {
      return errorHandler.getErrorStats();
    }
    return null;
  },

  // 获取日志统计
  getLogStats() {
    if (logger) {
      return logger.getLogStats();
    }
    return null;
  },

  // 清理缓存
  clearCache() {
    try {
      if (cacheManager) {
        cacheManager.clear();
        if (logger) {
          logger.info('缓存已清理');
        }
      }
    } catch (error) {
      console.error('清理缓存失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'MEDIUM' as any,
          message: '清理缓存失败',
          details: error
        });
      }
    }
  },

  // 清理日志
  clearLogs() {
    try {
      if (logger) {
        logger.clearLogHistory();
        if (logger) {
          logger.info('日志已清理');
        }
      }
    } catch (error) {
      console.error('清理日志失败:', error);
      if (errorHandler) {
        errorHandler.handleError({
          type: 'UNKNOWN' as any,
          severity: 'LOW' as any,
          message: '清理日志失败',
          details: error
        });
      }
    }
  }
});