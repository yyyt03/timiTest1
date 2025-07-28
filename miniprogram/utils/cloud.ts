// 云函数调用工具类
export class CloudService {
  /**
   * 调用云函数
   * @param name 云函数名称
   * @param data 传递的数据
   */
  static async callFunction(name: string, data: any = {}) {
    try {
      const result = await wx.cloud.callFunction({
        name,
        data
      })
      return result.result
    } catch (error) {
      console.error(`调用云函数 ${name} 失败:`, error)
      throw error
    }
  }

  /**
   * 获取用户信息
   */
  static async getUserInfo() {
    return this.callFunction('getUserInfo')
  }

  /**
   * 获取数据库实例
   */
  static getDatabase() {
    return wx.cloud.database()
  }

  /**
   * 上传文件到云存储
   */
  static async uploadFile(filePath: string, cloudPath: string) {
    try {
      const result = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })
      return result.fileID
    } catch (error) {
      console.error('文件上传失败:', error)
      throw error
    }
  }

  /**
   * 从云存储下载文件
   */
  static async downloadFile(fileID: string) {
    try {
      const result = await wx.cloud.downloadFile({
        fileID
      })
      return result.tempFilePath
    } catch (error) {
      console.error('文件下载失败:', error)
      throw error
    }
  }
}