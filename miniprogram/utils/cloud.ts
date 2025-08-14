// 云开发工具类

// 调用云函数
export function callFunction(name: string, data: any = {}) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({
      name: name,
      data: data
    }).then(function(result) {
      // 如果result.result为null，返回空对象
      resolve(result.result || {});
    }).catch(function(error) {
      console.error('云函数调用失败:', name, '错误:', error);
      reject(error);
    });
  });
}

// 获取用户信息
export function getUserInfo() {
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
export function uploadFile(filePath: string, cloudPath: string) {
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
export function downloadFile(fileID: string) {
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
export function getTempFileURLs(fileList: string[]): Promise<Record<string, string>> {
  if (fileList.length === 0) {
    return Promise.resolve({});
  }

  return new Promise(function(resolve, reject) {
    wx.cloud.getTempFileURL({
      fileList: fileList
    }).then(function(res) {
      const urlMap: Record<string, string> = {};
      res.fileList.forEach(function(item) {
        if (item.fileID && item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL;
        }
      });
      resolve(urlMap);
    }).catch(function(error) {
      console.error('获取临时文件URL失败:', error);
      // 返回空的映射对象
      resolve({});
    });
  });
}

// 获取数据库实例
export function getDatabase() {
  return wx.cloud.database();
}

// 格式化时间
export function formatTime(dateString: string | Date): string {
  if (!dateString) return '';
  
  let date: Date;
  if (typeof dateString === 'string') {
    // 处理MongoDB的日期格式
    if (dateString.includes('$date')) {
      try {
        const dateObj = JSON.parse(dateString);
        date = new Date(dateObj.$date);
      } catch (e) {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
  } else {
    date = dateString;
  }
  
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}