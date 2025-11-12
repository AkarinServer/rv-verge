# RV Verge

Clash Verge Rev - Lightweight version for RISC-V devices (Lichee RV Dock)

## 项目概述

RV Verge 是 Clash Verge Rev 的精简版本，专门为低资源设备（如 Lichee RV Dock）设计。

## 项目状态

⚠️ **当前状态**: 基础结构已创建，正在测试基础功能

## 快速开始

### 安装依赖

```bash
# 删除旧的 node_modules 和锁文件
rm -rf node_modules package-lock.json

# 安装依赖
npm install
# 或
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

### 构建项目

#### macOS

```bash
# 构建 macOS ARM64 版本
npm run tauri build -- --target aarch64-apple-darwin

# 构建 macOS x64 版本
npm run tauri build -- --target x86_64-apple-darwin
```

#### RISC-V (Linux)

```bash
# 在 RISC-V 设备上构建
npm run tauri build -- --target riscv64gc-unknown-linux-gnu
```

## CI 构建

项目已配置 GitHub Actions CI，支持自动构建：

- **RISC-V (Linux)**: 在 QEMU 模拟的 RISC-V 环境中构建
- **macOS**: 在 macOS runner 上构建（ARM64 和 x64）

### 触发构建

1. 推送到 `main` 或 `master` 分支
2. 创建 Pull Request
3. 手动触发 workflow（GitHub Actions 页面）

### 构建产物

构建完成后，可以在 GitHub Actions 页面下载构建产物：

- **RISC-V**: `rv-verge-riscv64` artifact
- **macOS**: `rv-verge-macos` artifact

## 项目结构

```
.
├── src/                    # 前端代码（React + TypeScript）
│   ├── components/         # UI 组件
│   ├── pages/             # 页面
│   ├── hooks/             # React Hooks
│   ├── services/          # 服务层
│   ├── providers/         # 数据提供者
│   └── utils/             # 工具函数
├── src-tauri/             # Rust 后端代码
│   ├── src/               # Rust 源代码
│   ├── Cargo.toml         # Rust 依赖配置
│   └── tauri.conf.json    # Tauri 配置
├── scripts/               # 构建脚本
│   ├── prebuild.mjs       # 预构建脚本（下载 mihomo 内核）
│   └── utils.mjs          # 工具函数
└── package.json           # 前端依赖配置
```

## 功能特性

### 当前功能（基础版本）

- ✅ 基础 UI 框架
- ✅ 主题支持（亮色/暗色）
- ✅ 错误处理
- ✅ 基础路由

### 计划功能

- ⚠️ 代理管理
- ⚠️ 配置管理（使用简单文本编辑器）
- ⚠️ 系统代理设置
- ⚠️ 基本设置

## 技术栈

### 前端
- React 19
- TypeScript
- Material-UI（基础组件）
- React Router
- Tauri API
- SWR

### 后端
- Rust
- Tauri 2
- Clash Meta (mihomo) 插件

### 移除的依赖
- Monaco Editor（使用简单文本编辑器替代）
- @dnd-kit（拖拽功能）
- react-virtuoso（虚拟列表）
- @mui/x-data-grid（复杂表格）
- @mui/lab（实验性组件）
- react-markdown（Markdown 渲染）

## 开发计划

### 阶段 1: 基础结构 ✅
- [x] 创建项目结构
- [x] 配置构建工具
- [x] 创建基础组件
- [x] 创建 CI 配置

### 阶段 2: 核心功能 🚧
- [ ] 移植 Rust 后端
- [ ] 实现代理管理
- [ ] 实现配置管理
- [ ] 实现系统设置

### 阶段 3: 优化 🚧
- [ ] 优化资源使用
- [ ] 性能测试
- [ ] 在 RV Dock 上测试

## 测试

### 本地测试

```bash
# 开发模式
npm run dev

# 构建测试
npm run build
```

### CI 测试

推送到 GitHub 后，CI 会自动构建并测试。

## 已知问题

1. **Rust 后端**: 当前是占位符，需要从 clash-verge-rev 参考复制完整代码
2. **前端功能**: 当前只有基础 UI，功能还未实现
3. **资源文件**: 需要添加图标等资源文件

## 贡献

欢迎贡献！请参考 [CONTRIBUTING.md](CONTRIBUTING.md)（待创建）

## 许可证

GPL-3.0 License

## 参考

- **clash-verge-rev**: https://github.com/clash-verge-rev/clash-verge-rev
- **Tauri**: https://tauri.app/
- **Clash Meta**: https://github.com/MetaCubeX/mihomo

---

**状态**: 开发中
**版本**: 0.1.0
**目标平台**: RISC-V (Lichee RV Dock), macOS, Linux
