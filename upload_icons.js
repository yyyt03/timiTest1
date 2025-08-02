// 云存储图标上传脚本
// 使用方法：在小程序开发工具中运行此脚本

const cloud = require('wx-server-sdk')
cloud.init({
  env: 'your-env-id' // 请替换为您的云环境ID
})

const fs = require('fs')
const path = require('path')

// 上传配置
const uploadConfig = {
  "status": {
    "local_path": "images_backup/icons",
    "cloud_path": "icons/status",
    "files": [
      "favorite-outline.png",
      "favorite-filled.png",
      "like-outline.png",
      "like-filled.png"
    ]
  },
  "features": {
    "local_path": "images_backup/icons",
    "cloud_path": "icons/features",
    "files": [
      "hero-category.png",
      "beta-plan.png",
      "recommend-plan.png",
      "create-plan.png",
      "favorite-plan.png"
    ]
  },
  "tabbar": {
    "local_path": "images_backup/icons",
    "cloud_path": "icons/tabbar",
    "files": [
      "tabbar-strategy.png",
      "tabbar-strategy-selected.png",
      "tabbar-user.png",
      "tabbar-user-selected.png"
    ]
  }
}

async function uploadIcons() {
  console.log('开始上传图标文件到云存储...')
  
  for (const [category, config] of Object.entries(uploadConfig)) {
    console.log(`\n上传 ${category} 分类图标...`)
    
    for (const fileName of config.files) {
      const localPath = path.join(config.local_path, fileName)
      const cloudPath = `${config.cloud_path}/${fileName}`
      
      try {
        // 检查文件是否存在
        if (!fs.existsSync(localPath)) {
          console.log(`⚠ 文件不存在: ${localPath}`)
          continue
        }
        
        // 上传到云存储
        const result = await cloud.uploadFile({
          cloudPath: cloudPath,
          fileContent: fs.readFileSync(localPath)
        })
        
        console.log(`✓ 上传成功: ${fileName} → ${result.fileID}`)
      } catch (error) {
        console.error(`✗ 上传失败: ${fileName}`, error)
      }
    }
  }
  
  console.log('\n图标上传完成！')
}

// 执行上传
uploadIcons().catch(console.error)
