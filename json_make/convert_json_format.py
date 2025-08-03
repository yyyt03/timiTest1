#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSON格式转换脚本
将当前目录下的JSON文件转换为微信云平台MongoDB导入格式
"""

import json
import os
import glob
from datetime import datetime
import re

def convert_json_file(file_path):
    """转换单个JSON文件"""
    print(f"\n处理文件: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        # 检查是否已经是JSON Lines格式
        lines = content.split('\n')
        if len(lines) > 1 and all(line.strip().startswith('{') and line.strip().endswith('}') for line in lines if line.strip()):
            print("✓ 已经是正确的JSON Lines格式")
            return True
        
        # 尝试解析为JSON数组
        try:
            data = json.loads(content)
            if isinstance(data, list):
                output_path = f"{os.path.splitext(file_path)[0]}_converted.json"
                with open(output_path, 'w', encoding='utf-8') as f:
                    for item in data:
                        f.write(json.dumps(item, ensure_ascii=False) + '\n')
                print(f"✓ 数组格式转换成功: {output_path}")
                return True
        except json.JSONDecodeError:
            pass
        
        # 尝试解析为多行JSON对象
        json_objects = []
        current_obj = ""
        brace_count = 0
        
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            current_obj += line
            brace_count += line.count('{') - line.count('}')
            
            if brace_count == 0 and current_obj:
                try:
                    obj = json.loads(current_obj)
                    json_objects.append(obj)
                    current_obj = ""
                except json.JSONDecodeError:
                    pass
        
        if json_objects:
            output_path = f"{os.path.splitext(file_path)[0]}_converted.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                for obj in json_objects:
                    f.write(json.dumps(obj, ensure_ascii=False) + '\n')
            print(f"✓ 多行对象格式转换成功: {output_path}")
            return True
        
        print("✗ 无法识别的JSON格式")
        return False
        
    except Exception as e:
        print(f"✗ 处理失败: {str(e)}")
        return False

def main():
    """主函数"""
    print("JSON格式转换脚本")
    print("=" * 50)
    
    # 获取当前目录下的所有JSON文件
    json_files = glob.glob("*.json")
    json_files = [f for f in json_files if not f.endswith('_converted.json')]
    
    if not json_files:
        print("当前目录下没有找到需要转换的JSON文件")
        return
    
    print(f"找到 {len(json_files)} 个JSON文件:")
    for file in json_files:
        print(f"  - {file}")
    
    success_count = 0
    for file_path in json_files:
        if convert_json_file(file_path):
            success_count += 1
    
    print(f"\n转换完成！成功转换: {success_count}/{len(json_files)} 个文件")

if __name__ == "__main__":
    main() 