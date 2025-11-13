#!/usr/bin/env python3
"""
从 re-verge-logo.png 中提取圆环内的 logo（简化版，不依赖 numpy）
"""
from PIL import Image, ImageDraw
import sys
import os

def extract_circle_logo(input_path, output_path, radius_ratio=0.75):
    """提取圆环内的 logo
    
    Args:
        input_path: 输入图片路径
        output_path: 输出图片路径
        radius_ratio: 圆环半径相对于图片最小边的比例（0-1），默认 0.75
    """
    try:
        # 打开图片
        img = Image.open(input_path)
        print(f"原始图片尺寸: {img.size}, 模式: {img.mode}")
        
        # 转换为 RGBA 模式以支持透明度
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        width, height = img.size
        
        # 假设圆环在图片中心
        center_x = width // 2
        center_y = height // 2
        
        # 计算半径（使用图片最小边）
        radius = int(min(width, height) / 2 * radius_ratio)
        
        print(f"中心: ({center_x}, {center_y}), 半径: {radius}")
        
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
        print("错误: 需要安装 PIL (Pillow)")
        print("请运行: pip3 install Pillow")
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
    
    # 提取圆环内的 logo（红框内的部分）
    # radius_ratio 设置为略小于 1，确保只提取圆环内的内容，不包含红色边框
    # 0.95 = 95%，这样可以提取圆环内的所有内容，但排除最外层的红色边框
    extract_circle_logo(input_file, output_file, radius_ratio=0.95)
    
    print("\n提示: 如果提取的范围不对，可以修改脚本中的 radius_ratio 参数")
    print("例如: extract_circle_logo(input_file, output_file, radius_ratio=0.65)")

