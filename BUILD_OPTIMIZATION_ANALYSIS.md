# RISCV64 构建性能优化分析报告

## 当前构建时间（优化前）

- **Simulation 构建** (QEMU 模拟): 3-4 小时（3h52m - 3h55m）
- **Self-Hosted 构建** (原生 RISC-V): 2-3 小时（2h41m）

## 已实施的优化（2024-11-14）

### ✅ 已启用优化

1. **增量编译** - 已在 `Cargo.toml` 的 `fast-release` profile 中启用
   - 修改: `incremental = true`（之前是 `false`）
   - 影响: Simulation 和 Self-Hosted 构建

2. **构建缓存** - 已添加完整的缓存机制
   - **Simulation 构建**:
     - Cargo registry 缓存（`~/.cargo/registry`、`~/.cargo/git`）
     - Cargo target 目录缓存（包含增量编译数据）
     - node_modules 缓存
     - sccache 缓存
   - **Self-Hosted 构建**:
     - 优化了 Cargo target 缓存键（包含 `fast-release` profile）
     - 添加了 sccache 缓存

3. **sccache 编译缓存** - 已添加支持
   - **Simulation 构建**: 在 Docker 容器内安装和配置 sccache
   - **Self-Hosted 构建**: 安装和配置 sccache
   - 配置: `RUSTC_WRAPPER=sccache`

4. **移除增量编译禁用** - 已移除 `CARGO_INCREMENTAL=0`
   - **Self-Hosted 构建**: 移除了环境变量设置
   - 现在使用 `Cargo.toml` 中的配置

### 📊 预期效果

基于已实施的优化，预期构建时间：

- **Simulation 构建**: 从 3-4 小时减少到 **1-1.5 小时**（减少 60-70%）
- **Self-Hosted 构建**: 从 2-3 小时减少到 **30-60 分钟**（减少 70-80%）

**注意**: 首次构建仍然需要完整编译，后续构建将显著加速。

## 架构和环境说明

### Simulation 构建环境
- **平台**: x86_64 GitHub Actions runner
- **架构**: QEMU 模拟的 RISC-V (riscv64gc-unknown-linux-gnu)
- **特点**: 通过 Docker 容器在 x86_64 主机上模拟 RISC-V
- **性能**: 通常只有原生性能的 10-20%

### Self-Hosted 构建环境
- **平台**: 原生 RISC-V 硬件
- **架构**: riscv64gc-unknown-linux-gnu (原生)
- **特点**: 直接在 RISC-V 硬件上编译
- **性能**: 取决于硬件配置，但比 QEMU 快得多

## 主要瓶颈分析

### 1. Simulation 构建（QEMU 模拟）问题

**问题：**
- **QEMU 性能瓶颈**: 使用 QEMU 模拟 RISC-V 架构，性能极差（通常只有原生性能的 10-20%）
- **每次重新安装依赖**: 在 Docker 容器中重新安装所有依赖：
  - Rust 工具链（~5-10 分钟）
  - Node.js（~2-3 分钟）
  - 系统库（~3-5 分钟）
- **没有缓存机制**: 每次都是全新构建，没有利用 GitHub Actions cache
- **Docker 卷挂载性能**: `--volume` 挂载在 QEMU 环境下可能有额外开销
- **交叉编译工具链**: 在 x86_64 上运行 RISC-V 工具链，需要指令翻译

**时间分布估算：**
- 环境准备：10-15 分钟
- Rust 依赖编译：2-3 小时（QEMU 模拟下极慢）
- 项目代码编译：30-60 分钟
- 打包和验证：10-15 分钟

### 2. Self-Hosted 构建问题

**问题：**
- **缓存不够有效**: 虽然有缓存机制，但可能缓存策略不够优化
- **禁用增量编译**: `CARGO_INCREMENTAL=0` 禁用了增量编译，每次都是完整编译
- **没有编译缓存工具**: 没有使用 sccache 等编译缓存工具
- **依赖数量多**: 从 Cargo.toml 看有大量依赖（90+ 个 crate）
- **硬件性能限制**: RISC-V 硬件可能性能较弱

**时间分布估算：**
- 环境准备：5-10 分钟
- Rust 依赖编译：1.5-2 小时
- 项目代码编译：30-45 分钟
- 打包和验证：10-15 分钟

### 3. Rust 编译性能问题

**发现：**
- 使用 `fast-release` profile（`opt-level = 1`），但仍然是完整编译
- `CARGO_INCREMENTAL=0` 禁用了增量编译
- 没有使用 sccache 进行编译缓存
- 没有使用 cargo-chef 进行依赖层缓存

## 优化方案（考虑 RISC-V 架构支持）

### 方案 1：使用 sccache 进行编译缓存（推荐优先级：⭐⭐⭐⭐）

**RISC-V 支持情况：**
- ✅ **Self-Hosted (原生 RISC-V)**: sccache 支持所有架构，包括 RISC-V，可以正常使用
- ⚠️ **Simulation (QEMU)**: sccache 理论上支持，但需要注意：
  - sccache 本身是架构无关的（基于编译输出哈希）
  - 但在 QEMU 环境下，缓存查找和存储可能有性能开销
  - 需要确保缓存键包含目标架构信息

**效果：** 
- Self-Hosted: 可减少 50-80% 的编译时间（对于未更改的依赖）
- Simulation: 可减少 30-50% 的编译时间（受 QEMU 性能限制）

**实现：**
1. 在构建前安装 sccache（需要为 RISC-V 编译或使用预编译版本）
2. 配置 Cargo 使用 sccache: `RUSTC_WRAPPER=sccache`
3. 使用 GitHub Actions cache 缓存 sccache 数据
4. 确保缓存键包含目标架构: `sccache-riscv64gc-unknown-linux-gnu-...`

**优点：**
- 对于未更改的依赖，直接使用缓存，几乎不花时间
- 对于更改的代码，只编译更改部分
- 跨构建共享缓存
- 架构无关，支持交叉编译

**缺点：**
- 需要额外的存储空间（GitHub Actions cache 限制 10GB）
- 首次构建仍然需要完整编译
- 在 QEMU 环境下效果可能不如原生环境
- 需要为 RISC-V 编译 sccache（可能需要交叉编译）

### 方案 2：使用 cargo-chef 进行依赖层缓存（推荐优先级：⭐⭐）

**RISC-V 支持情况：**
- ⚠️ **Self-Hosted (原生 RISC-V)**: cargo-chef 主要用于 Docker 多阶段构建，在原生环境使用有限
- ❌ **Simulation (QEMU)**: cargo-chef 设计用于 Docker，但在 QEMU 模拟环境下效果不佳
- **问题**: cargo-chef 主要优化 Docker 镜像构建，对于我们的场景（GitHub Actions + 原生构建）帮助有限

**效果：** 
- 对于 Docker 构建场景可能有帮助，但我们的场景不太适用
- 不推荐用于当前构建流程

**实现：**
1. 使用 cargo-chef 预先编译依赖
2. 缓存依赖层（Docker 层）
3. 只编译项目代码

**优点：**
- 依赖变更时才重新编译依赖
- 项目代码变更时只编译项目代码
- 可以并行处理

**缺点：**
- **主要缺点**: 设计用于 Docker 多阶段构建，不适合我们的场景
- 需要修改构建流程
- 首次构建仍然需要完整编译
- 在 QEMU 环境下效果不佳
- 对于原生 RISC-V 构建帮助有限

### 方案 3：启用增量编译（推荐优先级：⭐⭐⭐⭐）

**RISC-V 支持情况：**
- ✅ **Self-Hosted (原生 RISC-V)**: Rust 增量编译完全支持 RISC-V，可以正常使用
- ⚠️ **Simulation (QEMU)**: 增量编译支持，但需要注意：
  - 增量编译数据存储在 `target/` 目录
  - 在 QEMU 环境下，增量编译的查找和更新可能有性能开销
  - 但总体效果仍然比完整编译好

**效果：** 
- Self-Hosted: 可减少 30-50% 的编译时间（对于频繁的小改动）
- Simulation: 可减少 20-40% 的编译时间（受 QEMU 性能限制）

**实现：**
1. 移除 `CARGO_INCREMENTAL=0` 环境变量
2. 在 `fast-release` profile 中启用 `incremental = true`（当前是 `false`）
3. 缓存 `target/` 目录的增量编译数据
4. 确保缓存键包含目标架构和 profile

**优点：**
- 对于小改动，只编译更改的部分
- 配置简单
- Rust 原生支持，无需额外工具
- 跨平台支持良好

**缺点：**
- 对于大改动，可能没有明显效果
- 需要更多存储空间（增量编译数据可能很大）
- 在 QEMU 环境下效果可能不如原生环境
- 需要正确配置缓存策略

### 方案 4：优化 Simulation 构建缓存（推荐优先级：⭐⭐⭐⭐⭐）

**RISC-V 支持情况：**
- ✅ **Simulation (QEMU)**: GitHub Actions cache 完全支持，可以缓存任何文件
- **关键点**: 需要正确配置缓存键，包含目标架构信息

**效果：** 可减少 40-60% 的构建时间（通过避免重复下载和编译）

**实现：**
1. **添加 Cargo registry 缓存**:
   - 缓存 `~/.cargo/registry` 和 `~/.cargo/git`
   - 缓存键: `cargo-registry-riscv64-${{ hashFiles('**/Cargo.lock') }}`
2. **添加 target 目录缓存**:
   - 缓存 `src-tauri/target/riscv64gc-unknown-linux-gnu/`
   - 缓存键: `cargo-target-riscv64-fast-release-${{ hashFiles('**/Cargo.lock') }}`
3. **添加 node_modules 缓存**:
   - 缓存 `node_modules` 和 `~/.npm`
   - 缓存键: `node-modules-riscv64-${{ hashFiles('**/package-lock.json') }}`
4. **使用预构建的 Docker 镜像**（可选）:
   - 创建包含 Rust、Node.js 的 Docker 镜像
   - 减少环境准备时间

**优点：**
- 减少环境准备时间（如果使用预构建镜像）
- 可以复用之前的构建结果
- 避免重复下载依赖
- 配置相对简单

**缺点：**
- 需要维护 Docker 镜像（如果使用）
- QEMU 模拟仍然很慢（这是根本限制）
- 缓存可能很大，需要注意 GitHub Actions 10GB 限制
- 首次构建仍然需要完整编译

### 方案 5：优化并行编译配置（推荐优先级：⭐⭐⭐）

**RISC-V 支持情况：**
- ✅ **Self-Hosted (原生 RISC-V)**: 完全支持，取决于硬件核心数
- ⚠️ **Simulation (QEMU)**: 支持，但受限于 QEMU 性能和主机 CPU

**效果：** 
- Self-Hosted: 可减少 20-40% 的构建时间（取决于核心数）
- Simulation: 可减少 10-20% 的构建时间（受 QEMU 限制）

**实现：**
1. **确保使用所有可用核心**:
   - 当前配置: `CARGO_BUILD_JOBS=$(nproc || echo 4)`
   - 验证实际使用的核心数
2. **优化 codegen-units**:
   - 当前 `fast-release` profile: `codegen-units = 64`（已优化）
   - 可以尝试调整以平衡编译速度和优化效果
3. **使用更大的 GitHub Actions Runner**（仅 Simulation）:
   - 使用 8-core runner（如果可用）
   - 注意：QEMU 模拟下效果有限

**优点：**
- 充分利用多核 CPU
- 配置简单
- 无需额外工具

**缺点：**
- 对于 QEMU 模拟，效果有限（QEMU 本身是瓶颈）
- 更大的 runner 成本更高
- 受硬件限制

### 方案 6：优化 Docker 卷挂载性能（仅 Simulation）（推荐优先级：⭐⭐）

**RISC-V 支持情况：**
- ⚠️ **Simulation (QEMU)**: Docker 卷挂载在 QEMU 环境下可能有性能问题
- ❌ **Self-Hosted**: 不适用（原生构建）

**效果：** 可减少 10-20% 的构建时间（通过减少 I/O 开销）

**实现：**
1. **使用 bind mount 而不是 volume**:
   - 当前: `--volume "${{ github.workspace }}:/workspace"`
   - 考虑: 使用 `--mount type=bind` 可能有更好性能
2. **优化文件系统**:
   - 确保使用高性能文件系统
   - 避免在挂载点进行大量小文件操作
3. **减少挂载数据量**:
   - 只挂载必要的目录
   - 排除 `node_modules`、`target/` 等（如果使用缓存）

**优点：**
- 减少 I/O 开销
- 配置相对简单

**缺点：**
- 效果可能不明显（QEMU 本身是主要瓶颈）
- 需要测试验证
- 可能影响构建流程

## 推荐的综合优化方案（考虑 RISC-V 支持）

### 短期优化（快速实施，效果明显）

#### 对于 Simulation 构建（QEMU）

1. **优化构建缓存**（预计减少 40-60% 时间）⭐⭐⭐⭐⭐
   - 添加 Cargo registry 缓存（`~/.cargo/registry`、`~/.cargo/git`）
   - 添加 target 目录缓存（`src-tauri/target/riscv64gc-unknown-linux-gnu/`）
   - 添加 node_modules 缓存
   - **注意**: 缓存键必须包含目标架构 `riscv64gc-unknown-linux-gnu`

2. **启用增量编译**（预计减少 20-30% 时间）⭐⭐⭐⭐
   - 移除 `CARGO_INCREMENTAL=0` 环境变量
   - 在 `fast-release` profile 中启用 `incremental = true`
   - 缓存增量编译数据（包含在 target 缓存中）

3. **使用 sccache**（预计减少 30-50% 时间）⭐⭐⭐
   - 安装 sccache（需要为 RISC-V 编译或使用预编译版本）
   - 配置 `RUSTC_WRAPPER=sccache`
   - 缓存 sccache 数据
   - **注意**: 需要验证 sccache 在 QEMU 环境下的性能

#### 对于 Self-Hosted 构建（原生 RISC-V）

1. **使用 sccache**（预计减少 50-70% 时间）⭐⭐⭐⭐⭐
   - 安装 sccache（原生 RISC-V 版本）
   - 配置 `RUSTC_WRAPPER=sccache`
   - 缓存 sccache 数据
   - **优势**: 原生环境性能更好，sccache 效果更明显

2. **启用增量编译**（预计减少 30-50% 时间）⭐⭐⭐⭐⭐
   - 移除 `CARGO_INCREMENTAL=0` 环境变量
   - 在 `fast-release` profile 中启用 `incremental = true`
   - 缓存增量编译数据
   - **优势**: 原生环境增量编译性能更好

3. **优化缓存策略**（预计减少 20-30% 时间）⭐⭐⭐⭐
   - 确保 Cargo registry 缓存有效
   - 优化 target 目录缓存策略
   - 验证缓存命中率

### 中期优化（需要更多工作，效果更好）

1. **优化并行编译**（预计减少 20-40% 时间）⭐⭐⭐
   - 验证 `CARGO_BUILD_JOBS` 实际使用的核心数
   - 根据硬件调整并行度
   - 优化 codegen-units 设置

2. **优化 Self-Hosted Runner 硬件**（预计减少 20-30% 时间）⭐⭐
   - 使用更强大的 RISC-V 硬件（更多核心、更快内存）
   - 优化系统配置（文件系统、内存设置等）
   - 使用 SSD 而不是 HDD

3. **预构建 Docker 镜像**（仅 Simulation，预计减少 10-20% 时间）⭐⭐
   - 创建包含 Rust、Node.js 的预构建镜像
   - 减少环境准备时间
   - 需要维护镜像

### 长期优化（架构级改进）

1. **完全迁移到 Self-Hosted Runner**（预计减少 80-90% 时间）⭐⭐⭐⭐⭐
   - **当前**: 已经有 Self-Hosted runner，但 Simulation 仍然在使用
   - **建议**: 如果可能，完全使用 Self-Hosted runner，避免 QEMU 模拟
   - **优势**: 原生性能，所有优化工具都能发挥最佳效果
   - **注意**: 需要确保 Self-Hosted runner 的稳定性和可用性

2. **使用交叉编译**（预计减少 60-80% 时间）⭐⭐⭐⭐
   - 在 x86_64 主机上交叉编译 RISC-V 目标
   - 利用 x86_64 的高性能
   - **优势**: 性能远超 QEMU 模拟
   - **缺点**: 需要配置交叉编译工具链，可能有兼容性问题

3. **使用分布式构建**（预计减少 30-50% 时间）⭐⭐⭐
   - 将依赖编译和项目编译分离到不同的 runner
   - 并行处理多个构建任务
   - **注意**: 需要复杂的协调机制

## 预期效果（考虑 RISC-V 架构特性）

### ✅ 已实施优化后的预期效果

**Simulation 构建 (QEMU)**:
- **优化前**: 3-4 小时
- **优化后预期**: **1-1.5 小时**（减少 60-70%）
  - 缓存机制: 减少 30-40% 时间
  - 增量编译: 减少 20-30% 时间
  - sccache: 减少 30-50% 时间（受 QEMU 性能限制）
- **注意**: QEMU 性能限制是根本瓶颈，优化效果有限，但仍有显著改善

**Self-Hosted 构建 (原生 RISC-V)**:
- **优化前**: 2-3 小时
- **优化后预期**: **30-60 分钟**（减少 70-80%）
  - sccache: 减少 50-70% 时间（原生环境效果最好）
  - 增量编译: 减少 30-50% 时间
  - 优化缓存: 减少 20-30% 时间
- **优势**: 原生环境，所有优化工具都能发挥最佳效果

### 未来可能的进一步优化

**Simulation 构建 (QEMU)**:
- 当前预期: 1-1.5 小时
- 进一步优化空间有限（QEMU 性能瓶颈）
- 建议: 考虑完全迁移到 Self-Hosted runner

**Self-Hosted 构建 (原生 RISC-V)**:
- 当前预期: 30-60 分钟
- 进一步优化可能: **20-40 分钟**
  - 优化并行编译配置
  - 升级硬件（更多核心、更快内存）
  - 使用 SSD 存储

**长期优化选项**:
- **完全使用 Self-Hosted Runner**: 避免 QEMU 性能损失
- **交叉编译 (x86_64 → RISC-V)**: 利用 x86_64 高性能，预计 **20-40 分钟**

## 实施状态

### ✅ 已实施（2024-11-14）

#### Simulation 构建（QEMU）

1. ✅ **优化构建缓存** - 已实施
   - ✅ Cargo registry 缓存
   - ✅ Cargo target 目录缓存（包含增量编译数据）
   - ✅ node_modules 缓存
   - ✅ sccache 缓存

2. ✅ **启用增量编译** - 已实施
   - ✅ 在 `Cargo.toml` 的 `fast-release` profile 中启用
   - ✅ 移除了禁用增量编译的环境变量

3. ✅ **使用 sccache** - 已实施
   - ✅ 在 Docker 容器内安装 sccache
   - ✅ 配置 `RUSTC_WRAPPER=sccache`
   - ✅ 缓存 sccache 数据

#### Self-Hosted 构建（原生 RISC-V）

1. ✅ **使用 sccache** - 已实施
   - ✅ 安装 sccache（原生 RISC-V 版本）
   - ✅ 配置 `RUSTC_WRAPPER=sccache`
   - ✅ 缓存 sccache 数据

2. ✅ **启用增量编译** - 已实施
   - ✅ 在 `Cargo.toml` 的 `fast-release` profile 中启用
   - ✅ 移除了 `CARGO_INCREMENTAL=0` 环境变量

3. ✅ **优化缓存策略** - 已实施
   - ✅ 优化了 Cargo target 缓存键（包含 profile 信息）
   - ✅ 添加了 sccache 缓存

## 重要注意事项

### RISC-V 架构特定注意事项

1. **工具支持验证**：
   - sccache: 需要验证在 RISC-V 上的编译和运行
   - 增量编译: Rust 原生支持，但需要测试性能
   - 其他工具: 需要验证 RISC-V 支持

2. **缓存键设计**：
   - **必须包含目标架构**: `riscv64gc-unknown-linux-gnu`
   - **必须包含 profile**: `fast-release` vs `release`
   - **必须包含工具链版本**: Rust 版本、Cargo 版本
   - 示例: `cargo-target-riscv64gc-fast-release-rust-1.91-${{ hashFiles('**/Cargo.lock') }}`

3. **QEMU 性能限制**：
   - QEMU 模拟是根本瓶颈（只有原生 10-20% 性能）
   - 优化效果有限，但仍有价值
   - 考虑完全迁移到 Self-Hosted runner

4. **原生 RISC-V 硬件**：
   - 硬件性能可能较弱
   - 优化工具效果更明显
   - 建议优先优化原生构建

### 通用注意事项

1. **缓存大小限制**：GitHub Actions cache 有 10GB 限制，需要合理管理
2. **首次构建**：优化方案主要针对后续构建，首次构建仍然需要完整编译
3. **依赖更新**：依赖更新时会触发重新编译，这是正常的
4. **测试验证**：每个优化都需要测试验证，确保不会影响构建结果
5. **架构隔离**：确保不同架构的缓存不会互相干扰

## 实施详情

### 修改的文件

1. **`src-tauri/Cargo.toml`**
   - 修改 `fast-release` profile: `incremental = true`（之前是 `false`）

2. **`.github/workflows/build-riscv64-simu.yml`**
   - 添加了 4 个缓存步骤（Cargo registry、target、node_modules、sccache）
   - 在 Docker 容器内安装和配置 sccache
   - 配置缓存目录挂载（`--volume "${{ github.workspace }}/.cache:/cache"`）
   - 恢复和保存缓存数据
   - 移除了增量编译禁用（使用 Cargo.toml 配置）

3. **`.github/workflows/build-riscv64-selfhosted.yml`**
   - 优化了 Cargo target 缓存键（包含 `fast-release` profile）
   - 添加了 sccache 缓存步骤
   - 安装和配置 sccache
   - 移除了 `CARGO_INCREMENTAL=0` 环境变量
   - 添加了 sccache 统计信息输出

### 缓存键设计

所有缓存键都包含了架构信息，确保不同架构的缓存不会互相干扰：

- **Simulation**: `simu-*-riscv64-*`
- **Self-Hosted**: `${{ runner.os }}-*-riscv64-*`

### 监控和验证

建议在下次构建后：
1. 检查构建时间是否减少
2. 查看 sccache 统计信息（缓存命中率）
3. 验证缓存是否正确保存和恢复
4. 确认增量编译是否正常工作

