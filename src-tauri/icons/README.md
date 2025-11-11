# 图标文件

Tauri 需要以下尺寸的图标文件：

- 32x32.png
- 128x128.png
- 128x128@2x.png (256x256)
- 256x256.png
- 256x256@2x.png (512x512)
- 512x512.png
- 512x512@2x.png (1024x1024)

## 生成图标

如果您有 ImageMagick 安装，可以运行以下命令生成基本图标：

```bash
# 在 src-tauri/icons 目录下
for size in 32 128 256 512; do
  convert -size ${size}x${size} xc:blue -pointsize $((size/4)) -fill white -gravity center -annotate +0+0 "T" ${size}x${size}.png
done

# 生成 @2x 版本
convert -size 256x256 xc:blue -pointsize 64 -fill white -gravity center -annotate +0+0 "T" 128x128@2x.png
convert -size 512x512 xc:blue -pointsize 128 -fill white -gravity center -annotate +0+0 "T" 256x256@2x.png
convert -size 1024x1024 xc:blue -pointsize 256 -fill white -gravity center -annotate +0+0 "T" 512x512@2x.png
```

或者，您可以使用任何图像编辑工具创建这些图标文件。

**注意**: 在构建之前，您需要将实际的图标文件放在此目录中，否则构建可能会失败。

