#!/usr/bin/env python3
"""
从 re-verge-logo.png 中提取圆环内的 logo
支持自动检测圆环位置或手动指定参数
"""
from PIL import Image, ImageDraw
import sys
import os
import numpy as np

def find_circle_center(img_array, threshold=200):
    """自动检测圆环中心（通过查找最亮的区域）"""
    # 转换为灰度
    if len(img_array.shape) == 3:
        gray = np.mean(img_array, axis=2)
    else:
        gray = img_array
    
    # 找到最亮的区域（可能是圆环）
    # 使用边缘检测或亮度阈值
    bright_mask = gray > threshold
    if np.any(bright_mask):
        y_coords, x_coords = np.where(bright_mask)
        center_x = int(np.mean(x_coords))
        center_y = int(np.mean(y_coords))
        return center_x, center_y
    
    # 如果找不到，返回图片中心
    return img_array.shape[1] // 2, img_array.shape[0] // 2

def extract_circle_logo(input_path, output_path, radius_ratio=0.75):
    """提取圆环内的 logo
    
    Args:
        input_path: 输入图片路径
        output_path: 输出图片路径
        radius_ratio: 圆环半径相对于图片最小边的比例（0-1）
    """
    try:
        # 打开图片
        img = Image.open(input_path)
        print(f"原始图片尺寸: {img.size}, 模式: {img.mode}")
        
        # 转换为 RGBA 模式以支持透明度
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        width, height = img.size
        
        # 尝试自动检测圆环中心
        img_array = np.array(img)
        center_x, center_y = find_circle_center(img_array)
        
        # 计算半径（使用图片最小边）
        radius = min(width, height) // 2 * radius_ratio
        
        print(f"检测到的中心: ({center_x}, {center_y}), 半径: {radius}")
        
        # 创建圆形遮罩
        mask = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse(
            (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
            fill=255
        )
        
        # 应用遮罩提取圆形区域
        output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        output.paste(img, (0, 0))
        output.putalpha(mask)
        
        # 裁剪到圆形边界框
        bbox = output.getbbox()
        if bbox:
            output = output.crop(bbox)
        
        # 保存结果
        output.save(output_path, 'PNG')
        print(f"✓ 已保存到: {output_path}")
        print(f"✓ 提取的 logo 尺寸: {output.size}")
        
        return output
        
    except ImportError:
        print("错误: 需要安装 PIL (Pillow) 和 numpy")
        print("请运行: pip3 install Pillow numpy")
        return None
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    input_file = '/Users/lolotachibana/Downloads/re-verge-logo.png'
    output_file = '/Users/lolotachibana/Downloads/rv-verge-logo-extracted.png'
    
    if not os.path.exists(input_file):
        print(f"✗ 文件不存在: {input_file}")
        sys.exit(1)
    
    # 可以调整 radius_ratio 参数来改变提取的圆环大小
    # 0.6 = 60%, 0.7 = 70%, 0.8 = 80% 等
    extract_circle_logo(input_file, output_file, radius_ratio=0.75)
