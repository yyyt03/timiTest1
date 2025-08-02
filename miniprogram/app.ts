// app.ts
import { formatTime } from './utils/util'

// 全局数据
interface IAppOption {
  globalData?: {
    userInfo?: WechatMiniprogram.UserInfo,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}

App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-1gk9t6w2d1d090af',
        traceUser: true,
      });
    }

    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: function(res) {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
  userInfoReadyCallback() {
    // this.setData({
    //   userInfo: this.globalData.userInfo,
    //   hasUserInfo: true,
    // })
  },

  onShow() {
    // 小程序显示时的逻辑
  },

  onHide() {
    // 小程序隐藏时的逻辑
  },

  onError(msg) {
    console.error('小程序错误:', msg);
  },

  onUnhandledRejection(res) {
    console.error('未处理的Promise拒绝:', res.reason);
  }
});