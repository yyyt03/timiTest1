import os
import json
import requests
import time
from urllib.parse import urljoin

class EquipmentScraperEnhanced:
    def __init__(self):
        # 王者荣耀装备API接口
        self.equipment_api = "https://pvp.qq.com/web201605/js/item.json"
        
        # 多种图片URL格式
        self.image_url_patterns = [
            "https://game.gtimg.cn/images/yxzj/img201606/itemimg/{id}.jpg",
            "https://game.gtimg.cn/images/yxzj/img201606/itemimg/{id}.png",
            "https://pvp.qq.com/web201605/itemimg/{id}.jpg",
            "https://pvp.qq.com/web201605/itemimg/{id}.png",
            "https://game.gtimg.cn/images/yxzj/img201606/itemimg/{id}.webp",
            "https://pvp.qq.com/web201605/itemimg/{id}.webp",
        ]
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://pvp.qq.com/',
        })
        
        # 创建目录
        self.data_dir = os.path.join('json_make', 'equipment')
        self.img_dir = os.path.join('miniprogram', 'pages', 'images', 'equipment')
        self.ensure_directories()
        
        # 装备数据存储
        self.equipment_data = []
        self.failed_downloads = []
        
    def ensure_directories(self):
        """确保必要的目录存在"""
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.img_dir, exist_ok=True)
        
    def get_equipment_list(self):
        """获取装备列表数据"""
        try:
            print("正在获取装备列表...")
            response = self.session.get(self.equipment_api, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            equipment_list = response.json()
            print(f"成功获取 {len(equipment_list)} 个装备数据")
            return equipment_list
            
        except requests.RequestException as e:
            print(f"获取装备列表失败: {e}")
            return []
        except json.JSONDecodeError as e:
            print(f"解析装备数据失败: {e}")
            return []
            
    def download_equipment_image(self, equipment_id, equipment_name):
        """下载装备图片 - 增强版"""
        filename = f"equipment_{equipment_id}.jpg"
        filepath = os.path.join(self.img_dir, filename)
        
        # 检查本地是否已存在
        if os.path.exists(filepath):
            print(f"图片已存在: {filename}")
            return filename
            
        # 尝试所有图片URL格式
        for pattern in self.image_url_patterns:
            url = pattern.format(id=equipment_id)
            try:
                response = self.session.get(url, timeout=10, stream=True)
                if response.status_code == 200 and response.content[:4] != b'<!DO':
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    print(f"图片下载成功: {filename} (URL: {url})")
                    return filename
            except Exception as e:
                continue
                
        # 如果所有URL都失败，记录失败信息
        print(f"图片下载失败: {equipment_name} (ID: {equipment_id})")
        self.failed_downloads.append({
            'id': equipment_id,
            'name': equipment_name,
            'tried_urls': [pattern.format(id=equipment_id) for pattern in self.image_url_patterns]
        })
        return None
        
    def process_equipment_data(self, equipment_list):
        """处理装备数据"""
        print("开始处理装备数据...")
        
        for i, equipment in enumerate(equipment_list, 1):
            print(f"正在处理第 {i}/{len(equipment_list)} 个装备: {equipment.get('item_name', 'Unknown')}")
            
            # 标准化装备数据
            processed_equipment = {
                'id': equipment.get('item_id', ''),
                'name': equipment.get('item_name', ''),
                'type': equipment.get('item_type', ''),
                'price': equipment.get('price', ''),
                'description': equipment.get('des1', '') + ' ' + equipment.get('des2', ''),
                'attributes': self.parse_attributes(equipment),
                'image_filename': ''
            }
            
            # 下载装备图片
            if processed_equipment['id']:
                image_filename = self.download_equipment_image(
                    processed_equipment['id'], 
                    processed_equipment['name']
                )
                if image_filename:
                    processed_equipment['image_filename'] = image_filename
                    
            self.equipment_data.append(processed_equipment)
            
            # 添加延迟避免请求过快
            time.sleep(0.3)
            
    def parse_attributes(self, equipment):
        """解析装备属性"""
        attributes = {}
        
        # 解析基础属性
        base_attrs = [
            'base_attack', 'base_defense', 'base_hp', 'base_mp',
            'attack', 'defense', 'hp', 'mp', 'crit', 'cd'
        ]
        
        for attr in base_attrs:
            value = equipment.get(attr, '')
            if value and value != '0':
                # 转换属性名称为中文
                attr_names = {
                    'base_attack': '基础攻击',
                    'base_defense': '基础防御', 
                    'base_hp': '基础生命',
                    'base_mp': '基础法力',
                    'attack': '攻击力',
                    'defense': '防御力',
                    'hp': '生命值',
                    'mp': '法力值',
                    'crit': '暴击率',
                    'cd': '冷却缩减'
                }
                attributes[attr_names.get(attr, attr)] = value
                
        return attributes
        
    def save_equipment_data(self):
        """保存装备数据到JSON文件"""
        data_file = os.path.join(self.data_dir, 'equipment_data.json')
        try:
            with open(data_file, 'w', encoding='utf-8') as f:
                json.dump(self.equipment_data, f, ensure_ascii=False, indent=2)
            print(f"装备数据已保存到: {data_file}")
            
            # 同时保存一个简化的版本
            simplified_data = []
            for equipment in self.equipment_data:
                simplified_equipment = {
                    'id': equipment['id'],
                    'name': equipment['name'],
                    'type': equipment['type'],
                    'price': equipment['price'],
                    'image': equipment['image_filename']
                }
                simplified_data.append(simplified_equipment)
                
            simplified_file = os.path.join(self.data_dir, 'equipment_simplified.json')
            with open(simplified_file, 'w', encoding='utf-8') as f:
                json.dump(simplified_data, f, ensure_ascii=False, indent=2)
            print(f"简化装备数据已保存到: {simplified_file}")
            
            # 保存失败下载的记录
            if self.failed_downloads:
                failed_file = os.path.join(self.data_dir, 'failed_downloads.json')
                with open(failed_file, 'w', encoding='utf-8') as f:
                    json.dump(self.failed_downloads, f, ensure_ascii=False, indent=2)
                print(f"失败下载记录已保存到: {failed_file}")
                print(f"共有 {len(self.failed_downloads)} 个装备图片下载失败")
            
        except Exception as e:
            print(f"保存数据失败: {e}")
            
    def generate_summary_report(self):
        """生成下载总结报告"""
        total_equipment = len(self.equipment_data)
        successful_downloads = len([e for e in self.equipment_data if e['image_filename']])
        failed_downloads = len(self.failed_downloads)
        
        print("\n" + "="*50)
        print("装备数据爬取总结报告")
        print("="*50)
        print(f"总装备数量: {total_equipment}")
        print(f"图片下载成功: {successful_downloads}")
        print(f"图片下载失败: {failed_downloads}")
        print(f"成功率: {successful_downloads/total_equipment*100:.1f}%")
        
        if failed_downloads > 0:
            print("\n失败的装备:")
            for failed in self.failed_downloads:
                print(f"  - {failed['name']} (ID: {failed['id']})")
                
        print("="*50)
            
    def scrape_all_equipment(self):
        """爬取所有装备数据"""
        print("开始爬取王者荣耀装备数据...")
        
        # 获取装备列表
        equipment_list = self.get_equipment_list()
        if not equipment_list:
            print("未获取到装备数据")
            return
            
        # 处理装备数据
        self.process_equipment_data(equipment_list)
        
        # 保存数据
        self.save_equipment_data()
        
        # 生成总结报告
        self.generate_summary_report()
        
        print(f"爬取完成！共获取 {len(self.equipment_data)} 个装备数据")

def main():
    """主函数"""
    scraper = EquipmentScraperEnhanced()
    scraper.scrape_all_equipment()

if __name__ == "__main__":
    main() 