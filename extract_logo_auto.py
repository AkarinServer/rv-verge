#!/usr/bin/env python3
"""
从 re-verge-logo.png 中自动检测并提取红色圆环内的 logo
"""
from PIL import Image, ImageDraw
import sys
import os

def detect_red_circle(img):
    """检测红色圆环的位置和大小"""
    width, height = img.size
    
    # 转换为 RGB 以便检测红色
    if img.mode != 'RGB':
        rgb_img = img.convert('RGB')
    else:
        rgb_img = img
    
    pixels = rgb_img.load()
    
    # 查找红色像素（红色通道值高，绿色和蓝色通道值低）
    red_pixels = []
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            # 检测红色：R 值高，G 和 B 值相对较低
            if r > 200 and r > g * 1.5 and r > b * 1.5:
                red_pixels.append((x, y))
    
    if not red_pixels:
        # 如果找不到红色，使用图片中心
        print("未检测到红色边框，使用图片中心")
        return width // 2, height // 2, min(width, height) // 2
    
    # 计算红色像素的边界框
    x_coords = [p[0] for p in red_pixels]
    y_coords = [p[1] for p in red_pixels]
    
    min_x, max_x = min(x_coords), max(x_coords)
    min_y, max_y = min(y_coords), max(y_coords)
    
    # 计算中心点和半径
    center_x = (min_x + max_x) // 2
    center_y = (min_y + max_y) // 2
    radius = min(max_x - min_x, max_y - min_y) // 2
    
    # 稍微缩小半径，确保不包含红色边框
    radius = int(radius * 0.98)
    
    print(f"检测到红色圆环: 中心=({center_x}, {center_y}), 半径={radius}")
    return center_x, center_y, radius

def extract_circle_logo(input_path, output_path):
    """提取红色圆环内的 logo"""
    try:
        # 打开图片
        img = Image.open(input_path)
        print(f"原始图片尺寸: {img.size}, 模式: {img.mode}")
        
        # 转换为 RGBA 模式以支持透明度
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        width, height = img.size
        
        # 自动检测红色圆环
        center_x, center_y, radius = detect_red_circle(img)
        
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
    
    extract_circle_logo(input_file, output_file)
    print("\n完成！提取的 logo 已保存。")

