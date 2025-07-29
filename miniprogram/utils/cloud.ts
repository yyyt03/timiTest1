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

  /**
   * 批量获取云存储临时URL
   * @param fileList 云存储fileID数组
   * @returns 临时URL数组，顺序与fileList一致
   */
  static async getTempFileURLs(fileList: string[]): Promise<string[]> {
    if (!fileList || fileList.length === 0) return [];
    try {
      const res = await wx.cloud.getTempFileURL({
        fileList
      });
      // 返回临时URL数组，顺序与fileList一致
      return res.fileList.map(item => item.tempFileURL || '');
    } catch (error) {
      console.error('获取临时URL失败:', error);
      return fileList.map(() => '');
    }
  }
}