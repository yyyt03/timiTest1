#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版JSON格式转换脚本
将当前目录下的JSON文件转换为微信云平台MongoDB导入格式
支持多种输入格式，包含完善的错误处理和验证功能
"""

import json
import os
import glob
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

class JSONFormatConverter:
    """JSON格式转换器"""
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.stats = {
            'total_files': 0,
            'converted_files': 0,
            'skipped_files': 0,
            'error_files': 0
        }
    
    def log(self, message: str):
        """输出日志"""
        if self.verbose:
            print(message)
    
    def validate_json_lines_format(self, file_path: str) -> Tuple[bool, str]:
        """验证文件是否已经是正确的JSON Lines格式"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if not lines:
                return False, "文件为空"
            
            # 检查每行是否都是有效的JSON对象
            for line_num, line in enumerate(lines, 1):
                line = line.strip()
                if not line:  # 跳过空行
                    continue
                
                # 检查是否以 { 开始，以 } 结束
                if not (line.startswith('{') and line.endswith('}')):
                    return False, f"第{line_num}行格式不正确"
                
                try:
                    json.loads(line)
                except json.JSONDecodeError as e:
                    return False, f"第{line_num}行JSON解析错误: {str(e)}"
            
            return True, "已经是正确的JSON Lines格式"
            
        except Exception as e:
            return False, f"读取文件失败: {str(e)}"
    
    def detect_format(self, file_path: str) -> str:
        """检测JSON文件的格式类型"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            if not content:
                return "empty"
            
            # 尝试解析为完整JSON
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    return "array"
                else:
                    return "single_object"
            except json.JSONDecodeError:
                pass
            
            # 检查是否为JSON Lines格式
            lines = content.split('\n')
            if len(lines) > 1 and all(
                line.strip().startswith('{') and line.strip().endswith('}') 
                for line in lines if line.strip()
            ):
                return "json_lines"
            
            # 检查是否为多行JSON对象格式
            if content.startswith('{') and '}\n{' in content:
                return "multiline_objects"
            
            return "unknown"
            
        except Exception:
            return "unknown"
    
    def convert_array_to_json_lines(self, file_path: str, output_path: Optional[str] = None) -> Tuple[bool, str]:
        """将JSON数组格式转换为JSON Lines格式"""
        if output_path is None:
            base_name = os.path.splitext(file_path)[0]
            output_path = f"{base_name}_converted.json"
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            data = json.loads(content)
            if not isinstance(data, list):
                return False, "文件不是JSON数组格式"
            
            # 转换并验证每个对象
            valid_objects = []
            for i, item in enumerate(data):
                if not isinstance(item, dict):
                    self.log(f"警告: 第{i+1}个元素不是对象，跳过")
                    continue
                
                # 确保时间字段格式正确
                item = self.ensure_time_format(item)
                valid_objects.append(item)
            
            if not valid_objects:
                return False, "没有有效的JSON对象"
            
            # 写入JSON Lines格式
            with open(output_path, 'w', encoding='utf-8') as f:
                for obj in valid_objects:
                    f.write(json.dumps(obj, ensure_ascii=False) + '\n')
            
            return True, f"转换成功: {output_path} ({len(valid_objects)}个对象)"
            
        except json.JSONDecodeError as e:
            return False, f"JSON解析错误: {str(e)}"
        except Exception as e:
            return False, f"转换失败: {str(e)}"
    
    def convert_multiline_to_json_lines(self, file_path: str, output_path: Optional[str] = None) -> Tuple[bool, str]:
        """将多行JSON对象格式转换为JSON Lines格式"""
        if output_path is None:
            base_name = os.path.splitext(file_path)[0]
            output_path = f"{base_name}_converted.json"
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 使用更精确的JSON对象匹配
            json_objects = []
            current_obj = ""
            brace_count = 0
            in_string = False
            escape_next = False
            
            for char in content:
                if escape_next:
                    current_obj += char
                    escape_next = False
                    continue
                
                if char == '\\':
                    escape_next = True
                    current_obj += char
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                
                current_obj += char
                
                # 当一个完整的JSON对象结束时
                if brace_count == 0 and current_obj.strip():
                    try:
                        obj = json.loads(current_obj.strip())
                        obj = self.ensure_time_format(obj)
                        json_objects.append(obj)
                    except json.JSONDecodeError as e:
                        self.log(f"警告: JSON对象解析失败: {str(e)}")
                    current_obj = ""
            
            if not json_objects:
                return False, "未找到有效的JSON对象"
            
            # 写入JSON Lines格式
            with open(output_path, 'w', encoding='utf-8') as f:
                for obj in json_objects:
                    f.write(json.dumps(obj, ensure_ascii=False) + '\n')
            
            return True, f"转换成功: {output_path} ({len(json_objects)}个对象)"
            
        except Exception as e:
            return False, f"转换失败: {str(e)}"
    
    def ensure_time_format(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        """确保时间字段格式正确"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, dict):
                    obj[key] = self.ensure_time_format(value)
                elif isinstance(value, list):
                    obj[key] = [
                        self.ensure_time_format(item) if isinstance(item, dict) else item 
                        for item in value
                    ]
                elif key in ['createTime', 'updateTime'] and isinstance(value, str):
                    # 如果是字符串格式的时间，转换为MongoDB格式
                    try:
                        # 尝试解析时间字符串
                        if value.endswith('Z'):
                            value = value[:-1] + '+00:00'
                        dt = datetime.fromisoformat(value)
                        obj[key] = {"$date": dt.isoformat()}
                    except:
                        # 如果解析失败，保持原样
                        pass
        return obj
    
    def convert_file(self, file_path: str) -> bool:
        """转换单个JSON文件"""
        self.log(f"\n处理文件: {file_path}")
        
        # 首先验证是否已经是正确格式
        is_valid, message = self.validate_json_lines_format(file_path)
        if is_valid:
            self.log(f"✓ {message}")
            self.stats['skipped_files'] += 1
            return True
        
        # 检测文件格式
        format_type = self.detect_format(file_path)
        self.log(f"检测到格式类型: {format_type}")
        
        success = False
        if format_type == "array":
            success, message = self.convert_array_to_json_lines(file_path)
        elif format_type == "multiline_objects":
            success, message = self.convert_multiline_to_json_lines(file_path)
        elif format_type == "single_object":
            # 单个对象，包装成数组后转换
            success, message = self.convert_array_to_json_lines(file_path)
        elif format_type == "empty":
            self.log("✗ 文件为空")
            self.stats['error_files'] += 1
            return False
        else:
            self.log("✗ 无法识别的JSON格式")
            self.stats['error_files'] += 1
            return False
        
        if success:
            self.log(f"✓ {message}")
            self.stats['converted_files'] += 1
        else:
            self.log(f"✗ {message}")
            self.stats['error_files'] += 1
        
        return success
    
    def convert_all_files(self, directory: str = ".") -> None:
        """转换目录下的所有JSON文件"""
        self.log("JSON格式转换脚本 (增强版)")
        self.log("=" * 60)
        
        # 获取所有JSON文件
        pattern = os.path.join(directory, "*.json")
        json_files = glob.glob(pattern)
        
        # 过滤掉已经转换过的文件
        json_files = [f for f in json_files if not f.endswith('_converted.json')]
        
        if not json_files:
            self.log("当前目录下没有找到需要转换的JSON文件")
            return
        
        self.stats['total_files'] = len(json_files)
        self.log(f"找到 {len(json_files)} 个JSON文件:")
        for file in json_files:
            self.log(f"  - {os.path.basename(file)}")
        
        # 转换文件
        for file_path in json_files:
            self.convert_file(file_path)
        
        # 输出统计信息
        self.log(f"\n转换完成！")
        self.log(f"总文件数: {self.stats['total_files']}")
        self.log(f"成功转换: {self.stats['converted_files']}")
        self.log(f"跳过文件: {self.stats['skipped_files']}")
        self.log(f"错误文件: {self.stats['error_files']}")
        
        if self.stats['converted_files'] > 0:
            self.log(f"\n注意事项:")
            self.log("- 转换后的文件会保存为 *_converted.json 格式")
            self.log("- 请检查转换后的文件内容是否正确")
            self.log("- 建议在导入MongoDB前先验证数据格式")
            self.log("- 时间字段已自动转换为MongoDB ISODate格式")

def main():
    """主函数"""
    converter = JSONFormatConverter(verbose=True)
    converter.convert_all_files()

if __name__ == "__main__":
    main() 