// 云开发工具类
export class CloudService {
  // 调用云函数
  static callFunction(name: string, data: any = {}) {
    console.log('CloudService.callFunction 开始调用:', name, '参数:', data);
    
    return new Promise(function(resolve, reject) {
      wx.cloud.callFunction({
        name: name,
        data: data
      }).then(function(result) {
        console.log('云函数调用成功:', name, '结果:', result);
        // 如果result.result为null，返回空对象
        resolve(result.result || {});
      }).catch(function(error) {
        console.error('云函数调用失败:', name, '错误:', error);
        console.error('错误详情:', error.errMsg, error.errCode);
        reject(error);
      });
    });
  }

  // 获取用户信息
  static getUserInfo() {
    return new Promise(function(resolve, reject) {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: function(res) {
          resolve(res.userInfo);
        },
        fail: function(error) {
          reject(error);
        }
      });
    });
  }

  // 上传文件
  static uploadFile(filePath: string, cloudPath: string) {
    return new Promise(function(resolve, reject) {
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      }).then(function(result) {
        resolve(result);
      }).catch(function(error) {
        console.error('上传文件失败:', error);
        reject(error);
      });
    });
  }

  // 下载文件
  static downloadFile(fileID: string) {
    return new Promise(function(resolve, reject) {
      wx.cloud.downloadFile({
        fileID: fileID
      }).then(function(result) {
        resolve(result);
      }).catch(function(error) {
        console.error('下载文件失败:', error);
        reject(error);
      });
    });
  }

  // 获取临时文件URL
  static getTempFileURLs(fileList: string[]): Promise<string[]> {
    if (fileList.length === 0) {
      return Promise.resolve([]);
    }

    return new Promise(function(resolve, reject) {
      wx.cloud.getTempFileURL({
        fileList: fileList
      }).then(function(res) {
        var urls = res.fileList.map(function(item) {
          return item.tempFileURL || '';
        });
        resolve(urls);
      }).catch(function(error) {
        console.error('获取临时文件URL失败:', error);
        resolve(fileList.map(function() {
          return '';
        }));
      });
    });
  }

  // 获取数据库实例
  static getDatabase() {
    return wx.cloud.database();
  }
}