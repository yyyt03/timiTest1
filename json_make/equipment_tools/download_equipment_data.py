import os
import json
import requests
import re
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin, urlparse

class EquipmentScraper:
    def __init__(self):
        self.base_url = "https://pvp.qq.com/web201605/item.shtml"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # 创建目录
        self.data_dir = os.path.join('json_make', 'equipment')
        self.img_dir = os.path.join('miniprogram', 'pages', 'images', 'equipment')
        self.ensure_directories()
        
        # 装备数据存储
        self.equipment_data = []
        
    def ensure_directories(self):
        """确保必要的目录存在"""
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.img_dir, exist_ok=True)
        
    def get_page_content(self, url):
        """获取页面内容"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except requests.RequestException as e:
            print(f"获取页面失败: {url}, 错误: {e}")
            return None
            
    def parse_equipment_list(self, html_content):
        """解析装备列表页面"""
        soup = BeautifulSoup(html_content, 'html.parser')
        equipment_links = []
        
        # 查找装备链接 - 根据实际页面结构调整选择器
        # 这里需要根据实际页面结构来调整
        links = soup.find_all('a', href=re.compile(r'item\.shtml\?id=\d+'))
        
        for link in links:
            href = link.get('href')
            if href:
                full_url = urljoin(self.base_url, href)
                equipment_links.append(full_url)
                
        return equipment_links
        
    def parse_equipment_detail(self, url, html_content):
        """解析装备详情页面"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        equipment = {
            'id': '',
            'name': '',
            'type': '',
            'price': '',
            'description': '',
            'attributes': {},
            'image_url': '',
            'image_filename': ''
        }
        
        try:
            # 从URL中提取装备ID
            equipment_id = re.search(r'id=(\d+)', url)
            if equipment_id:
                equipment['id'] = equipment_id.group(1)
            
            # 提取装备名称
            name_elem = soup.find('h1') or soup.find('title')
            if name_elem:
                equipment['name'] = name_elem.get_text().strip()
            
            # 提取装备图片
            img_elem = soup.find('img', src=re.compile(r'\.(jpg|png|webp)'))
            if img_elem:
                img_src = img_elem.get('src')
                if img_src:
                    equipment['image_url'] = urljoin(url, img_src)
                    # 生成图片文件名
                    img_filename = f"equipment_{equipment['id']}.jpg"
                    equipment['image_filename'] = img_filename
            
            # 提取装备属性信息
            # 这里需要根据实际页面结构来调整
            attr_elements = soup.find_all(['p', 'div'], string=re.compile(r'(攻击|防御|生命|法力|冷却|暴击)'))
            for elem in attr_elements:
                text = elem.get_text().strip()
                # 解析属性文本
                if ':' in text:
                    key, value = text.split(':', 1)
                    equipment['attributes'][key.strip()] = value.strip()
            
            # 提取装备描述
            desc_elem = soup.find('div', class_=re.compile(r'desc|description|intro'))
            if desc_elem:
                equipment['description'] = desc_elem.get_text().strip()
            
            # 提取装备类型和价格
            info_elements = soup.find_all(['p', 'span'], string=re.compile(r'(类型|价格|金币)'))
            for elem in info_elements:
                text = elem.get_text().strip()
                if '类型' in text:
                    equipment['type'] = text.split('：')[-1].strip()
                elif '价格' in text or '金币' in text:
                    equipment['price'] = text.split('：')[-1].strip()
                    
        except Exception as e:
            print(f"解析装备详情失败: {url}, 错误: {e}")
            
        return equipment
        
    def download_image(self, image_url, filename):
        """下载装备图片"""
        if not image_url:
            return False
            
        try:
            response = self.session.get(image_url, timeout=10, stream=True)
            response.raise_for_status()
            
            filepath = os.path.join(self.img_dir, filename)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"图片下载成功: {filename}")
            return True
        except Exception as e:
            print(f"图片下载失败: {filename}, 错误: {e}")
            return False
            
    def save_equipment_data(self):
        """保存装备数据到JSON文件"""
        data_file = os.path.join(self.data_dir, 'equipment_data.json')
        try:
            with open(data_file, 'w', encoding='utf-8') as f:
                json.dump(self.equipment_data, f, ensure_ascii=False, indent=2)
            print(f"装备数据已保存到: {data_file}")
        except Exception as e:
            print(f"保存数据失败: {e}")
            
    def scrape_all_equipment(self):
        """爬取所有装备数据"""
        print("开始爬取王者荣耀装备数据...")
        
        # 获取装备列表页面
        html_content = self.get_page_content(self.base_url)
        if not html_content:
            print("无法获取装备列表页面")
            return
            
        # 解析装备链接
        equipment_links = self.parse_equipment_list(html_content)
        print(f"找到 {len(equipment_links)} 个装备链接")
        
        # 爬取每个装备的详细信息
        for i, link in enumerate(equipment_links, 1):
            print(f"正在处理第 {i}/{len(equipment_links)} 个装备: {link}")
            
            # 获取装备详情页面
            detail_html = self.get_page_content(link)
            if not detail_html:
                continue
                
            # 解析装备详情
            equipment = self.parse_equipment_detail(link, detail_html)
            
            if equipment['id']:  # 只保存有ID的装备
                # 下载装备图片
                if equipment['image_url']:
                    self.download_image(equipment['image_url'], equipment['image_filename'])
                
                self.equipment_data.append(equipment)
                
            # 添加延迟避免请求过快
            time.sleep(1)
            
        # 保存数据
        self.save_equipment_data()
        print(f"爬取完成！共获取 {len(self.equipment_data)} 个装备数据")

def main():
    """主函数"""
    scraper = EquipmentScraper()
    scraper.scrape_all_equipment()

if __name__ == "__main__":
    main() 