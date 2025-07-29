// app.ts
import { formatTime } from './utils/util'

// 全局数据
interface IAppOption {
  globalData?: {
    userInfo?: WechatMiniprogram.UserInfo,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}

App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      console.log('开始初始化云开发...');
      wx.cloud.init({
        env: 'cloudbase-1gk9t6w2d1d090af', // 您的云环境ID
        traceUser: true,
      });
      console.log('云开发初始化完成');
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
})