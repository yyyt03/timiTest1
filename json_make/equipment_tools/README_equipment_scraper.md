# 王者荣耀装备数据爬取工具

这个工具用于爬取王者荣耀的装备数据和图片，支持批量下载和数据处理。

## 文件说明

- `download_equipment_data.py` - 完整版装备爬取脚本（基于网页解析）
- `download_equipment_simple.py` - 简化版装备爬取脚本（基于API接口）
- `requirements.txt` - Python依赖包列表
- `README_equipment_scraper.md` - 使用说明文档

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 方法一：使用增强版脚本（推荐）

增强版脚本使用王者荣耀官方API接口，支持多种图片URL格式和详细的失败记录：

```bash
cd playground
python download_equipment_enhanced.py
```

### 方法二：使用简化版脚本

简化版脚本使用王者荣耀官方API接口，基础功能：

```bash
cd playground
python download_equipment_simple.py
```

### 方法三：使用完整版脚本

完整版脚本通过解析网页来获取数据：

```bash
cd playground
python download_equipment_data.py
```

## 输出文件

脚本运行后会生成以下文件：

### 数据文件
- `json_make/equipment/equipment_data.json` - 完整的装备数据
- `json_make/equipment/equipment_simplified.json` - 简化的装备数据
- `json_make/equipment/failed_downloads.json` - 图片下载失败记录（仅增强版）

### 图片文件
- `miniprogram/pages/images/equipment/equipment_[ID].jpg` - 装备图片

## 数据格式

### 完整装备数据格式
```json
{
  "id": "装备ID",
  "name": "装备名称",
  "type": "装备类型",
  "price": "价格",
  "description": "装备描述",
  "attributes": {
    "攻击力": "数值",
    "防御力": "数值",
    "生命值": "数值"
  },
  "image_filename": "equipment_123.jpg"
}
```

### 简化装备数据格式
```json
{
  "id": "装备ID",
  "name": "装备名称",
  "type": "装备类型",
  "price": "价格",
  "image": "equipment_123.jpg"
}
```

## 功能特点

1. **自动创建目录** - 自动创建必要的数据和图片目录
2. **重复下载检查** - 避免重复下载已存在的图片
3. **错误处理** - 完善的错误处理和日志输出
4. **请求延迟** - 添加延迟避免请求过快被限制
5. **多种图片格式** - 支持jpg、png、webp等多种图片格式
6. **多种URL格式** - 尝试多个图片服务器地址
7. **数据标准化** - 统一的数据格式和属性解析
8. **失败记录** - 详细记录下载失败的装备和尝试的URL
9. **总结报告** - 生成详细的下载成功率报告

## 注意事项

1. 请遵守网站的robots.txt和使用条款
2. 建议在非高峰时段运行脚本
3. 如果遇到网络问题，可以调整延迟时间
4. 图片下载可能需要较长时间，请耐心等待

## 故障排除

### 常见问题

1. **网络连接失败**
   - 检查网络连接
   - 尝试使用VPN或代理

2. **图片下载失败**
   - 检查图片URL是否有效
   - 确认图片目录权限

3. **数据解析错误**
   - 检查API接口是否正常
   - 确认JSON格式是否正确

### 调试模式

可以在脚本中添加调试信息：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 更新日志

- v1.0.0 - 初始版本，支持基础装备数据爬取
- v1.1.0 - 添加图片下载功能
- v1.2.0 - 优化错误处理和性能

## 许可证

本项目仅供学习和研究使用，请勿用于商业用途。 