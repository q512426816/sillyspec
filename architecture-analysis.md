# SillySpec 项目架构分析报告

> 分析时间：2026-08-25  
> 项目版本：3.27.5  
> 分析范围：全量代码库

---

## 1. 项目定位与概述

SillySpec 是一个**给 AI Agent 调用的 CLI 流程状态机**，让 AI 严格按步骤来执行文档驱动开发。它不是给人类直接使用的产品，而是 Agent（如 Claude Code、Cursor）的流程控制器——Agent 通过 CLI 告诉它"我在哪"，它告诉 Agent"下一步做什么"；Agent 执行步骤，它校验产出、推进状态，人类只在关键决策点介入审批。

核心理念：**Spec-Driven Development（规范驱动开发）**——先有文档（brainstorm → design → plan），再写代码（execute），再验证（verify），最后归档（archive）。

---

## 2. 整体架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Entry (bin/sillyspec.js)             │
│                         → src/index.js (主路由)                  │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
    ┌──────────▼──────────┐       ┌───────────▼──────────┐
    │  阶段执行引擎         │       │  子命令路由             │
    │  src/run/            │       │  progress / worktree  │
    │  command→stage→      │       │  gate / derive /      │
    │  prompt→complete     │       │  docs / knowledge /   │
    └──────────┬───────────┘       │  workspace / dashboard │
               │                   └───────────┬───────────┘
    ┌──────────▼───────────┐       ┌───────────▼───────────┐
    │  阶段定义层            │       │  状态管理层             │
    │  src/stages/*.js     │       │  src/progress.js       │
    │  (10 个阶段)          │       │  src/progress/*.js     │
    └──────────┬───────────┘       │  (facade + 4 submod)   │
               │                   └───────────┬───────────┘
               │                               │
    ┌──────────▼───────────────────────────────▼───────────┐
    │                    数据层                               │
    │  src/db.js (node:sqlite) → sillyspec.db              │
    │  src/db-engine.js (引擎抽象)                           │
    │  .sillyspec/.runtime/sillyspec.db (SQLite WAL)        │
    └──────────────────────────────────────────────────────┘
```

### 2.1 架构分层（自顶向下）

| 层级 | 职责 | 关键文件 |
|------|------|---------|
| **CLI 入口层** | 参数解析、路由分发、全局 flag 处理 | `bin/sillyspec.js`, `src/index.js` |
| **命令分发层** | runCommand 主入口、auto 模式、stage 路由 | `src/run/command.js` |
| **阶段执行层** | step prompt 渲染、complete 校验、wait/continue | `src/run/stage.js`, `src/run/prompt.js`, `src/run/complete.js` |
| **阶段定义层** | 10 个阶段的 steps/prompt/校验器 | `src/stages/*.js` |
| **协议校验层** | StageContract 状态机、gate/derive 机器接口 | `src/stage-contract.js`, `src/machine-interface.js` |
| **状态管理层** | ProgressManager facade + 4 个子模块 | `src/progress.js`, `src/progress/*.js` |
| **数据持久化层** | SQLite WAL 数据库、原子写、备份恢复 | `src/db.js`, `src/db-engine.js`, `src/fs-atomic.js` |
| **辅助基础设施** | git 操作、平台同步、worktree 隔离、dashboard | `src/git-helper.js`, `src/sync.js`, `src/worktree*.js` |

---

## 3. 技术栈选择

### 3.1 运行时

| 技术 | 版本要求 | 选型理由 |
|------|---------|---------|
| **Node.js** | ≥ 22.13.0 | 使用 `node:sqlite` 内置模块（22.5+ stable），无需 WASM/sql.js；原生 SQLite 性能 + 真 WAL |
| **ES Modules** | `"type": "module"` | 全量 ESM，动态 import 实现懒加载优化（E22 启动性能） |

### 3.2 数据库

| 技术 | 选型理由 |
|------|---------|
| **node:sqlite (DatabaseSync)** | Node 22 内置原生 SQLite 绑定，同步 API 简化状态管理；真 WAL 支持并发读写；.bak 损坏自动回退 |
| **WAL 模式** | `journal_mode=WAL` + `busy_timeout=5000` + `synchronous=NORMAL`，兼顾性能与安全 |
| **Schema 版本管理** | `DB_SCHEMA_VERSION=5` + `.schema-version` 戳，避免每次启动重建表 |

历史：v1/v2 使用 `progress.json` 文件，v3 全量迁移至 SQLite。

### 3.3 外部依赖（7 个，极度精简）

| 依赖 | 用途 | 选型理由 |
|------|------|---------|
| `@inquirer/prompts` | 交互式用户输入 | 标准 Node 交互 prompt 库 |
| `chalk` | 终端彩色输出 | CLI 美化 |
| `chokidar` | 文件系统监控 | dashboard 实时更新 |
| `js-yaml` | YAML 解析/序列化 | local.yaml / 项目配置 / module-map |
| `open` | 打开浏览器 | dashboard 自动打开 |
| `ora` | 终端 spinner | 长操作进度提示 |
| `ws` | WebSocket | dashboard 实时通信 |

### 3.4 测试/构建

| 技术 | 说明 |
|------|------|
| 自研测试运行器 | `test/run-tests.mjs`（无 jest/vitest 依赖，自研轻量 runner） |
| 自研 lint | `test/check-syntax.mjs`（自研语法检查，非 eslint） |
| 零构建步骤 | 纯 ESM 直接运行，无 tsc/webpack/rollup |

---

## 4. 核心功能模块划分

### 4.1 阶段系统（Stage System）— 核心流程引擎

10 个阶段注册在 `src/stages/index.js`，分为两类：

#### 主流程阶段（必须按序）
| 阶段 | 文件 | 职责 |
|------|------|------|
| **brainstorm** | `brainstorm.js` | 需求澄清 → 产出 proposal/design/tasks |
| **plan** | `plan.js` | 任务拆解 → 产出 plan.md + tasks.md（Wave 分组） |
| **execute** | `execute.js` | 按 plan 执行代码 → 产出 per-task review.json |
| **verify** | `verify.js` | 验证实现符合 design → 产出 verify-result.md |
| **brainstorm-auto** | `brainstorm-auto.js` | brainstorm 自动模式变体 |

#### 辅助阶段（可在无活跃变更时执行）
| 阶段 | 文件 | 职责 |
|------|------|------|
| **quick** | `quick.js` | 快速任务（≤3 文件），跳过完整流程 |
| **scan** | `scan.js` | 代码库扫描 → 产出架构/约定/结构文档 |
| **explore** | `explore.js` | 自由讨论/调研，不修改文件 |
| **archive** | `archive.js` | 归档已完成变更 → archive 目录 |
| **status** | `status.js` | 查看当前进度 |
| **doctor** | `doctor.js` | 进度库健康检查 + 修复 |

### 4.2 状态管理子系统

**ProgressManager**（`src/progress.js`）是 facade，委托 4 个子模块：

| 子模块 | 文件 | 职责 |
|--------|------|------|
| `ChangeRegistry` | `progress/change-registry.js` | 变更注册/查询/归档（active/archived 状态管理） |
| `StageMachine` | `progress/stage-machine.js` | 阶段状态机（pending→in_progress→completed 转换规则） |
| `StepStore` | `progress/step-store.js` | 步骤级 CRUD（每个阶段的 steps 状态） |
| `ConsistencyDoctor` | `progress/consistency-doctor.js` | 一致性检查与修复 |

### 4.3 运行时子系统（src/run/）

| 模块 | 文件 | 职责 |
|------|------|------|
| **command** | `command.js` | runCommand 主入口、flag 解析、stage 路由、auto 模式 |
| **prompt** | `prompt.js` | prompt 渲染引擎（persona/铁律/占位符替换/完成后命令模板） |
| **stage** | `stage.js` | 单阶段执行器（遍历 steps → outputStep） |
| **complete** | `complete.js` | 步骤完成处理（--done/--skip/--wait/--continue） |
| **complete-handlers** | `complete-handlers.js` | 各阶段特化的完成处理器 |
| **gates** | `gates.js` | 门控引擎（Stage Review Gate / Task Review Gate / symbol-impact） |
| **shared** | `shared.js` | 共享工具（resolveSpecDir / git / worktree drift 检测等） |
| **quick-audit** | `quick-audit.js` | quick 完成审计（边界文件检测/归属） |
| **scan-profile** | `scan-profile.js` | scan 规模判定（quick/standard/deep 三档） |
| **concurrent-detect** | `concurrent-detect.js` | 并发变更检测 |
| **multi-repo-context** | `multi-repo-context.js` | 跨仓上下文构造 |
| **next** | `next.js` | 项目状态探测（下一步命令建议） |

### 4.4 协议与门控子系统

| 模块 | 文件 | 职责 |
|------|------|------|
| **StageContract** | `stage-contract.js` | 阶段合约（前置条件/产出校验/状态转换） |
| **stage-contract-engine** | `stage-contract-engine.js` | 合约规则引擎 |
| **stage-contract-spec** | `stage-contract-spec.js` | 合约规则定义 |
| **MachineInterface** | `machine-interface.js` | 机器接口 v1（gate/derive JSON envelope） |
| **task-review** | `task-review.js` | per-task review.json 生成/校验/adopt |
| **stage-review** | `stage-review.js` | stage 级 review.json 注册/刷新 |

### 4.5 Worktree 隔离子系统

| 模块 | 文件 | 职责 |
|------|------|------|
| **WorktreeManager** | `worktree.js` | worktree 创建/清理/doctor |
| **worktree-apply** | `worktree-apply.js` | 校验 + 应用变更到主工作区（含 merge fallback） |
| **worktree-guard** | `hooks/worktree-guard.js` | pre-push hook 拦截未合并 worktree |

### 4.6 平台集成（SillyHub）

| 模块 | 文件 | 职责 |
|------|------|------|
| **sync** | `sync.js` | 进度库 ↔ 平台双向同步 |
| **dispatch** | `dispatch/` | SillyHub MCP 派发（probe + strategy） |
| **sillyhub-mcp** | `sillyhub-mcp/` | MCP client/config |
| **platform-pointer** | (in progress.js) | 平台指针管理（fail-closed 设计） |

### 4.7 辅助工具集

| 模块 | 文件 | 职责 |
|------|------|------|
| **docs-check** | `docs-check.js` | 文档 file:line 引用校验 + 自动重锚 |
| **docs-gate** | `docs-gate.js` | 文档质量门控（pre-push 第三道关） |
| **knowledge** | `stages/knowledge.js` + `knowledge-match.js` | 知识库搜索/校验/提议 |
| **commit-suggest** | `commit-suggest.js` | 智能提交建议（conventional commit） |
| **module-impact** | `module-impact.js` | 模块影响矩阵骨架生成 |
| **endpoint-extractor** | `endpoint-extractor.js` | 后端路由静态扫描（FastAPI/Express/Spring） |
| **quicklog** | `quicklog.js` | QUICKLOG 管理 |
| **workspace** | `workspace.js` | 多项目工作区管理 |
| **dashboard** | `packages/dashboard/` | Web Dashboard（Vite + WebSocket 实时） |

---

## 5. 代码组织结构

```
sillyspec/
├── bin/sillyspec.js              # CLI 入口（2 行，import src/index.js）
├── src/
│   ├── index.js                  # 主路由（~1800 行，CLI arg 解析 + 子命令分发）
│   ├── run.js                    # barrel（重导出 run/* 子模块）
│   ├── run/                      # 运行时子系统（12 个文件）
│   │   ├── command.js            # runCommand 主入口
│   │   ├── prompt.js             # prompt 渲染引擎
│   │   ├── stage.js              # 阶段执行器
│   │   ├── complete.js           # 步骤完成处理
│   │   ├── complete-handlers.js  # 阶段特化完成器
│   │   ├── gates.js              # 门控引擎
│   │   ├── shared.js             # 共享工具（最大文件）
│   │   ├── quick-audit.js        # quick 审计
│   │   ├── scan-profile.js       # scan 规模判定
│   │   ├── concurrent-detect.js  # 并发检测
│   │   ├── multi-repo-context.js # 跨仓上下文
│   │   └── next.js               # 状态探测
│   ├── stages/                   # 阶段定义（10 个）
│   │   ├── index.js              # 阶段注册表
│   │   ├── brainstorm.js         # brainstorm 定义
│   │   ├── plan.js               # plan 定义
│   │   ├── execute.js            # execute 定义
│   │   ├── verify.js             # verify 定义
│   │   ├── quick.js              # quick 定义（最大阶段文件）
│   │   ├── scan.js               # scan 定义
│   │   ├── explore.js            # explore 定义
│   │   ├── archive.js            # archive 定义
│   │   ├── status.js             # status 定义
│   │   ├── doctor.js             # doctor 定义
│   │   ├── knowledge.js          # knowledge 命令
│   │   ├── plan-postcheck.js     # plan 后置校验
│   │   ├── brainstorm-auto.js    # 自动 brainstorm
│   │   └── cmd-existence.js      # 命令存在性校验
│   ├── progress.js               # ProgressManager facade
│   ├── progress/                 # 进度子模块
│   │   ├── change-registry.js    # 变更注册
│   │   ├── stage-machine.js      # 阶段状态机
│   │   ├── step-store.js         # 步骤存储
│   │   ├── consistency-doctor.js # 一致性修复
│   │   └── shared.js             # 共享常量/类型
│   ├── db.js                     # SQLite 数据库管理
│   ├── db-engine.js              # 数据库引擎抽象
│   ├── stage-contract.js         # 阶段合约
│   ├── stage-contract-engine.js  # 合约规则引擎
│   ├── stage-contract-spec.js    # 合约规则定义
│   ├── machine-interface.js      # 机器接口（gate/derive）
│   ├── worktree.js               # worktree 管理
│   ├── worktree-apply.js         # worktree 应用
│   ├── sync.js                   # 平台同步
│   ├── dispatch/                 # SillyHub 派发
│   │   ├── probe.js
│   │   ├── strategy.js
│   │   └── backends/
│   │       ├── local-agent.js
│   │       └── sillyhub-mcp.js
│   ├── sillyhub-mcp/             # MCP 集成
│   ├── hooks/
│   │   └── worktree-guard.js     # pre-push hook
│   ├── fs-atomic.js              # 原子写工具
│   ├── git-helper.js             # git 操作封装
│   ├── init.js                   # init 命令
│   ├── setup.js                  # setup 命令
│   ├── quicklog.js               # QUICKLOG 管理
│   ├── commit-suggest.js         # 提交建议
│   ├── docs-check.js             # 文档引用校验
│   ├── docs-gate.js              # 文档门控
│   ├── docs-debt.js              # 文档债管理
│   ├── knowledge-match.js        # 知识库匹配
│   ├── module-impact.js          # 模块影响分析
│   ├── module-resolve.js         # 模块解析
│   ├── modules.js                # 模块管理
│   ├── endpoint-extractor.js     # 端点提取
│   ├── config-cat.js             # 配置查看
│   ├── config-schema.js          # 配置 schema
│   ├── local-detect.js           # 本地配置检测
│   ├── local-register.js         # 本地注册
│   ├── doctor-diagnostics.js     # 诊断工具
│   ├── classify-change.js        # 变更分类
│   ├── change-risk-profile.js    # 变更风险分析
│   ├── change-list.js            # 变更文件列表
│   ├── verify-postcheck.js       # verify 后置校验
│   ├── scan-postcheck.js         # scan 后置校验
│   ├── scan-diff.js              # scan 漂移检测
│   ├── scan-staleness.js         # scan 过期检测
│   ├── plan-adopt-waves.js       # plan Wave 重排
│   ├── task-review.js            # task review 管理
│   ├── stage-review.js           # stage review 管理
│   ├── verify-probes.js          # verify 机械探针
│   ├── machine-interface.js      # 机器接口
│   └── ...
├── packages/
│   └── dashboard/                # Web Dashboard
│       ├── server/               # Node.js 后端（Express + WebSocket）
│       ├── src/                  # Vue.js 前端
│       └── dist/                 # 构建产物
├── test/                         # 测试（~250 个 .test.mjs 文件）
├── docs/                         # 文档
│   ├── prompt/                   # 阶段提示词原文
│   └── sillyspec/                # 项目文档
├── templates/                    # 模板文件
├── eval/                         # 评估工具
└── .claude/
    └── skills/                   # Claude Code SKILL 定义
```

---

## 6. 关键设计模式与架构决策

### 6.1 状态机模式（Stage Machine）

核心设计：阶段转换由 `StageContract` 严格控制，不允许跳跃。

```
brainstorm → plan → execute → verify → archive
                                      ↑
quick (辅助，可随时) ─────────────────┘
scan (辅助，独立) 
explore (辅助，独立)
```

每个阶段有：
- `allowedFrom`: 允许的前置阶段
- `validators`: 校验器数组（产出文件存在性、内容完整性等）
- `steps[]`: 步骤定义（每个 step 有 prompt + outputHint + optional 标记）

### 6.2 门控模式（Gate Pattern）

**Stage Review Gate**: 每个主流程阶段完成后，检查 stage 级 review.json
**Task Review Gate**: execute 阶段每个 task 完成后，检查 per-task review.json
**Docs Gate**: pre-push 时检查文档引用有效性

所有 gate 遵循：**fail-closed**（无法判断时拒绝通过）+ **只读语义**（不修改状态）

### 6.3 Machine Interface（机器接口）

把人类可读的校验输出抽象为机器可消费的 JSON envelope：
- `runGate(stage, change)` → 判断阶段能否标记完成
- `runDerive(facet, change)` → 查询特定事实的真实状态
- 退出码三段：0=通过 / 1=阻断 / 2=无法核验

### 6.4 Worktree 隔离（execute 阶段）

execute 阶段在独立 git worktree 中运行，避免并行变更冲突：
- `worktree create` → 创建隔离工作区
- `worktree apply` → 校验 + 合并回主工作区
- `worktree cleanup` → 清理

支持三种模式：`worktree`（标准 git worktree）/ `native-worktree`（原生）/ `in-place-fallback`（降级就地执行）

### 6.5 平台指针（Platform Pointer）

fail-closed 设计：平台声明接管时，指针缺失则拒绝回退到本地模式
- `.sillyspec-platform.json` 平台指针
- `*-managed` 接管声明文件
- 成对存在，成对删除

### 6.6 懒加载优化（E22）

`src/index.js` 对轻路径（--version/help）不做重 import，progress.js 和 run/shared.js 链在 main() 早退后才动态加载，省 ~78ms 启动税。

### 6.7 原子写 + 并发安全

- `fs-atomic.js`: 写临时文件 → renameSync 覆盖（Windows EPERM 重试机制）
- `db.js`: WAL 模式 + `busy_timeout=5000` + 应用层 `MAX_BUSY_RETRIES=3` 退避
- 主仓 apply 互斥锁（`withMainRepoLock`）

---

## 7. 数据存储结构

```
.sillyspec/
├── .runtime/
│   └── sillyspec.db              # SQLite 数据库（权威状态源）
├── changes/
│   └── <change-name>/
│       ├── design.md             # 设计文档
│       ├── plan.md               # 实现计划
│       ├── tasks.md              # 任务注册表
│       ├── verify-result.md      # 验证报告
│       ├── symbol-impact.md      # 符号影响分析
│       ├── module-impact.md      # 模块影响矩阵
│       └── tasks/
│           └── task-01.md        # per-task 卡片
├── docs/
│   └── <project>/
│       ├── scan/                 # scan 产出文档
│       │   ├── ARCHITECTURE.md
│       │   ├── CONVENTIONS.md
│       │   ├── STRUCTURE.md
│       │   ├── INTEGRATIONS.md
│       │   ├── TESTING.md
│       │   ├── CONCERNS.md
│       │   └── PROJECT.md
│       └── modules/              # 模块文档
│           ├── _module-map.yaml
│           └── <module>.md
├── knowledge/                    # 知识库
├── projects/                     # 多项目工作区配置
├── archive/                      # 已归档变更
├── quicklog/                     # QUICKLOG
├── local.yaml                    # 本地配置
└── docs-check-baseline           # 文档检查基线
```

---

## 8. 测试架构

- **~250 个测试文件**（`.test.mjs`），自研测试运行器 `test/run-tests.mjs`
- 覆盖面：CLI 端到端（子进程模式）、单元测试、集成测试
- 测试模式：`seed-real-steps`（CLI 子进程 seed 真实步骤）+ 直接 import 测试
- 特殊测试：flaky 测试隔离（`--spec-dir` 隔离防文件锁竞争）、跨仓测试、平台同步测试

---

## 9. 关键配置文件

| 文件 | 用途 |
|------|------|
| `package.json` | 项目元数据、依赖、脚本 |
| `.sillyspec/local.yaml` | 本地配置（构建命令、测试命令、docs-check 路径等） |
| `.sillyspec/.runtime/sillyspec.db` | 权威状态数据库 |
| `.sillyspec-platform.json` | 平台指针 |
| `.claude/skills/` | Claude Code SKILL 定义 |
| `.husky/pre-push` | Git pre-push hook（worktree guard + docs gate） |

---

## 10. 风险与观察

1. **src/index.js 过大**：~1800 行的主路由文件，承载了所有子命令的 flag 解析和分发逻辑。虽然已有 W6 重构将 run.js 抽为 barrel，但 index.js 本身仍是单体。

2. **自研测试/ lint 工具**：未使用社区标准工具（jest/vitest/eslint），维护成本自担，但换来了零依赖的轻量启动。

3. **平台集成复杂度**：SillyHub 集成（sync/dispatch/mcp/pointer）引入了大量 fail-closed 守卫和并发安全逻辑，是 bug 高发区（从 MEMORY.md 的大量 worktree/sync 相关经验可见）。

4. **Windows 兼容性**：多个 MEMORY 条目记录了 Windows 特有问题（rename EPERM、CRLF、路径分隔符），代码中已有针对性处理但仍需持续关注。

5. **测试覆盖广度**：~250 个测试文件覆盖了极广的功能面，但部分测试有 flaky 问题（worktree/git 操作的时序敏感性）。

---

*报告产出路径：`architecture-analysis.md`（工作区根目录）*
