#!/usr/bin/env python3
"""
脚本功能：将用户输入的 PNG 图像替换掉 src-tauri/icons/ 下的所有图片
要求：保持原文件的数量、文件名、尺寸完全一致
"""

import os
import sys
from pathlib import Path
from PIL import Image
import subprocess

# ICO 和 ICNS 格式需要特殊处理
try:
    import png2ico
except ImportError:
    png2ico = None

def get_image_size(image_path):
    """获取图片尺寸"""
    try:
        with Image.open(image_path) as img:
            return img.size
    except Exception as e:
        print(f"错误：无法读取图片 {image_path}: {e}")
        return None

def convert_to_template_icon(input_path, output_path, target_size):
    """将图片转换为 macOS 模板图标（纯黑白）
    
    macOS 模板图标要求：
    - 不透明部分必须是纯黑色 (0, 0, 0)
    - 透明部分保持透明
    - 系统会根据主题自动反转颜色（亮色主题显示黑色，暗色主题显示白色）
    """
    try:
        with Image.open(input_path) as img:
            # 转换为 RGBA 模式以支持透明通道
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 调整尺寸
            resized = img.resize(target_size, Image.Resampling.LANCZOS)
            
            # 转换为灰度以计算亮度
            gray = resized.convert('L')
            
            # 创建新的 RGBA 图像（全透明）
            template = Image.new('RGBA', target_size, (0, 0, 0, 0))
            
            # 获取像素数据
            gray_data = list(gray.getdata())
            alpha_data = list(resized.split()[3].getdata())  # 获取原始 alpha 通道
            
            # 转换为纯黑白模板图标
            # macOS 模板图标要求：所有不透明像素都必须是纯黑色 (0, 0, 0)
            # 系统会根据主题自动反转颜色（亮色主题显示黑色，暗色主题显示白色）
            # 我们可以使用 alpha 通道来保留一些细节（通过调整不透明度）
            new_data = []
            for gray_val, alpha_val in zip(gray_data, alpha_data):
                if alpha_val > 0:  # 如果有不透明部分
                    # 所有不透明像素都转为纯黑色
                    # 可以根据灰度值调整 alpha 来保留细节，但颜色必须是纯黑
                    # 使用灰度值来调整 alpha，保留更多细节
                    # 较亮的区域可以稍微降低 alpha，较暗的区域保持较高的 alpha
                    adjusted_alpha = int((alpha_val * gray_val) / 255)
                    # 确保至少有一些不透明度
                    adjusted_alpha = max(adjusted_alpha, alpha_val // 2)
                    new_data.append((0, 0, 0, adjusted_alpha))
                else:
                    new_data.append((0, 0, 0, 0))  # 完全透明
            
            template.putdata(new_data)
            template.save(output_path, 'PNG', optimize=True)
            print(f"✓ 已生成模板图标: {output_path} ({target_size[0]}x{target_size[1]}, 纯黑白)")
            return True
    except Exception as e:
        print(f"✗ 错误：处理模板图标 {output_path} 失败: {e}")
        return False

def resize_image(input_path, output_path, target_size, is_template=False):
    """将图片调整到指定尺寸并保存"""
    try:
        # 如果是 macOS 模板图标，使用特殊处理
        if is_template:
            return convert_to_template_icon(input_path, output_path, target_size)
        
        with Image.open(input_path) as img:
            # 转换为 RGBA 模式以支持透明通道
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 使用高质量的重采样算法
            resized = img.resize(target_size, Image.Resampling.LANCZOS)
            resized.save(output_path, 'PNG', optimize=True)
            print(f"✓ 已生成: {output_path} ({target_size[0]}x{target_size[1]})")
            return True
    except Exception as e:
        print(f"✗ 错误：处理 {output_path} 失败: {e}")
        return False

def convert_to_ico(png_path, ico_path, sizes=None):
    """将 PNG 转换为 ICO 格式"""
    try:
        # 使用 PIL 的 save 方法，指定 format='ICO'
        # ICO 格式可以包含多个尺寸
        if sizes is None:
            # 如果没有指定尺寸，读取原 ICO 文件中的尺寸
            sizes = [16, 32, 48, 64, 128, 256]
        
        images = []
        with Image.open(png_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            for size in sizes:
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                images.append(resized)
        
        # 保存为 ICO，PIL 会自动处理多尺寸
        if images:
            images[0].save(ico_path, format='ICO', sizes=[(img.size[0], img.size[1]) for img in images])
            print(f"✓ 已生成: {ico_path}")
            return True
    except Exception as e:
        print(f"✗ 错误：转换 ICO 失败 {ico_path}: {e}")
        return False

def convert_to_icns(png_path, icns_path):
    """将 PNG 转换为 ICNS 格式（macOS 图标格式）"""
    try:
        # ICNS 需要特定的尺寸序列
        icns_sizes = [16, 32, 64, 128, 256, 512, 1024]
        
        # 使用 iconutil 命令（macOS 自带）或 sips 命令
        # 首先创建一个 .iconset 目录
        iconset_dir = icns_path.replace('.icns', '.iconset')
        os.makedirs(iconset_dir, exist_ok=True)
        
        with Image.open(png_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 生成所有需要的尺寸
            for size in icns_sizes:
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                # ICNS 格式需要特定的文件名
                if size == 1024:
                    resized.save(f"{iconset_dir}/icon_512x512@2x.png", 'PNG')
                elif size == 512:
                    resized.save(f"{iconset_dir}/icon_512x512.png", 'PNG')
                elif size == 256:
                    resized.save(f"{iconset_dir}/icon_256x256.png", 'PNG')
                    resized.save(f"{iconset_dir}/icon_128x128@2x.png", 'PNG')
                elif size == 128:
                    resized.save(f"{iconset_dir}/icon_128x128.png", 'PNG')
                elif size == 64:
                    resized.save(f"{iconset_dir}/icon_32x32@2x.png", 'PNG')
                elif size == 32:
                    resized.save(f"{iconset_dir}/icon_32x32.png", 'PNG')
                elif size == 16:
                    resized.save(f"{iconset_dir}/icon_16x16.png", 'PNG')
                    resized.save(f"{iconset_dir}/icon_16x16@2x.png", 'PNG')
        
        # 使用 iconutil 转换为 ICNS
        result = subprocess.run(
            ['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path],
            capture_output=True,
            text=True
        )
        
        # 清理临时目录
        import shutil
        shutil.rmtree(iconset_dir, ignore_errors=True)
        
        if result.returncode == 0:
            print(f"✓ 已生成: {icns_path}")
            return True
        else:
            print(f"✗ 错误：iconutil 转换失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ 错误：转换 ICNS 失败 {icns_path}: {e}")
        return False

def process_icon_file(source_png, target_file, icons_dir):
    """处理单个图标文件"""
    target_path = icons_dir / target_file
    
    if not target_path.exists():
        print(f"⚠ 警告：文件不存在 {target_file}，跳过")
        return False
    
    # 获取目标文件的尺寸
    if target_file.endswith('.png'):
        size = get_image_size(str(target_path))
        if size:
            # 创建临时 PNG 文件
            temp_png = str(target_path) + '.tmp.png'
            if resize_image(source_png, temp_png, size):
                # 替换原文件
                os.replace(temp_png, str(target_path))
                return True
    
    elif target_file.endswith('.ico'):
        # 对于 ICO 文件，先读取原文件看看包含哪些尺寸
        try:
            with Image.open(str(target_path)) as img:
                # ICO 文件可能包含多个尺寸，我们使用常见的尺寸
                sizes = [16, 32, 48, 64, 128, 256]
        except:
            sizes = [16, 32, 48, 64, 128, 256]
        
        # 先创建临时 PNG（使用最大尺寸）
        temp_png = str(target_path) + '.tmp.png'
        if resize_image(source_png, temp_png, (256, 256)):
            if convert_to_ico(temp_png, str(target_path), sizes):
                os.remove(temp_png)
                return True
            else:
                os.remove(temp_png)
        
        # 如果是 macOS 托盘图标，同时生成 PNG 版本（纯黑白模板格式）
        if 'tray-icon' in target_file:
            png_file = target_file.replace('.ico', '.png')
            png_path = icons_dir / png_file
            # 读取原 ICO 的尺寸（通常是 16x16）
            ico_size = get_image_size(str(target_path))
            if ico_size:
                temp_png = str(png_path) + '.tmp.png'
                # 对于 macOS 托盘图标，使用模板模式（纯黑白）
                # 判断是否是单色图标（mono）
                is_mono = 'mono' in target_file
                if resize_image(source_png, temp_png, ico_size, is_template=is_mono):
                    os.replace(temp_png, str(png_path))
                    if is_mono:
                        print(f"✓ 已生成 macOS 模板图标: {png_file} ({ico_size[0]}x{ico_size[1]}, 纯黑白)")
                    else:
                        print(f"✓ 已生成 macOS PNG 版本: {png_file} ({ico_size[0]}x{ico_size[1]})")
    
    elif target_file.endswith('.icns'):
        # 对于 ICNS 文件
        temp_png = str(target_path) + '.tmp.png'
        if resize_image(source_png, temp_png, (1024, 1024)):
            if convert_to_icns(temp_png, str(target_path)):
                os.remove(temp_png)
                return True
            else:
                os.remove(temp_png)
    
    return False

def main():
    # 获取用户输入的 PNG 图像路径
    if len(sys.argv) > 1:
        source_png = sys.argv[1]
    else:
        source_png = input("请输入 PNG 图像路径（例如 ~/Downloads/re-verge-logo.png）: ").strip()
    
    # 展开 ~ 路径
    source_png = os.path.expanduser(source_png)
    
    # 检查源文件是否存在
    if not os.path.exists(source_png):
        print(f"错误：文件不存在: {source_png}")
        sys.exit(1)
    
    # 检查是否是 PNG 文件
    try:
        with Image.open(source_png) as img:
            print(f"✓ 源图片: {source_png} ({img.size[0]}x{img.size[1]})")
    except Exception as e:
        print(f"错误：无法读取 PNG 文件: {e}")
        sys.exit(1)
    
    # 定义 icons 目录
    script_dir = Path(__file__).parent
    icons_dir = script_dir / 'src-tauri' / 'icons'
    
    if not icons_dir.exists():
        print(f"错误：icons 目录不存在: {icons_dir}")
        sys.exit(1)
    
    # 获取所有图标文件
    icon_files = sorted([f.name for f in icons_dir.iterdir() 
                        if f.is_file() and f.suffix.lower() in ['.png', '.ico', '.icns']])
    
    if not icon_files:
        print(f"警告：在 {icons_dir} 中没有找到图标文件")
        sys.exit(1)
    
    print(f"\n找到 {len(icon_files)} 个图标文件需要处理:")
    for f in icon_files:
        print(f"  - {f}")
    
    # 确认
    response = input(f"\n确认要替换所有 {len(icon_files)} 个图标文件吗？(y/n): ").strip().lower()
    if response != 'y':
        print("已取消")
        sys.exit(0)
    
    print("\n开始处理...")
    success_count = 0
    fail_count = 0
    
    for icon_file in icon_files:
        if process_icon_file(source_png, icon_file, icons_dir):
            success_count += 1
        else:
            fail_count += 1
    
    print(f"\n完成！成功: {success_count}, 失败: {fail_count}")

if __name__ == '__main__':
    main()

