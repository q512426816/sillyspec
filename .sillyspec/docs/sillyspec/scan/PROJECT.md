---
created_at: 2026-06-03T06:40:00+08:00
author: qinyi
source_commit: 4401b3d
updated_at: 2026-08-16T19:30:00+08:00
generator: sillyspec-scan
---

# PROJECT

## 项目简介

**SillySpec** 是一个面向 AI 辅助开发的 **spec-driven 流程状态机 CLI 工具**，一句话定位：**「流程状态机，让 AI 严格按步骤来」**。

它解决的核心问题是：当 Claude / Cursor 等 AI agent 直接上手编码时，容易跳过需求澄清、方案设计、任务拆解等关键步骤，产出偏离预期且难以审计。SillySpec 把一个完整的变更生命周期固化为一组强制阶段（brainstorm → plan → execute → verify → archive，以及辅助的 scan / status / doctor / quick），每个阶段有明确的入口契约、产物文件名和门禁校验，AI 必须按状态机推进，不能跳步、不能偷工。进度、决策、产物全部持久化到 SQLite（Node 原生 `node:sqlite`，非 WASM），并可选同步到 SillyHub 平台做团队协作与审批。

### 核心能力

- **阶段状态机**：以 stage + step 为粒度强制流转，progress.db（sillyspec.db）为唯一权威状态源，worktree-guard hook 直读 DB 做写入/命令守卫。
- **spec-driven 文档驱动**：每个变更在 `changes/<变更名>/` 下沉淀 brainstorm.md / design.md / plan.md 等结构化产物，可审计可回溯。
- **AI 协作流程**：内置 prompts 把每个 step 的指令输出给 AI；「CLI 算事实注入」——postcheck / docs-check / verify-postcheck 等由 CLI 亲自核验（不信任 agent 自报告），known_failures 可声明预存豁免。
- **worktree 隔离**：变更可在 git worktree / native worktree / in-place-fallback 三种模式下隔离执行，子代理改动可 diff 合回主仓库；副本漂移自动锚回主仓。
- **scan 工具链**：扫描任意项目代码库，生成结构 / 架构 / 约定 / 测试 / 关注点 / 集成 / 项目概览七份文档 + 模块映射（本文件即由 scan 产出），scan-staleness 提示文档新鲜度。
- **平台同步**：原生 fetch 与 SillyHub 平台对接（进度 / 文档同步、approve / reject 审批、platform pointer 多仓接管）；SillyHub MCP 客户端 + dispatch 派发抽象支持把子代理任务派发给 SillyHub worker。
- **机器接口层**：machine-interface v1 提供统一 JSON envelope + 退出码契约（gate / derive），为 SillyHub driver 模式打地基。

### 目标用户

- 用 Claude Code / Cursor / 其他 AI coding agent 做严肃开发，但苦于 AI 流程失控、产物不可追溯的开发者与小团队
- 希望用 spec-driven（先写规格再写码）方式约束 AI 的工程团队

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 语言 | 纯 JavaScript（ESM），无 TypeScript，无构建步骤 |
| 运行时 | Node.js >= 22.13（`engines.node`；node:sqlite 原生引擎要求） |
| 入口 | `bin/sillyspec.js` → `src/index.js` |
| 版本 | v3.26.8（见 `package.json`，`src/version.js` 轻量读取） |
| 存储 | `node:sqlite`（DatabaseSync，经 `src/db-engine.js` 抽象；WAL + busy_timeout；sql.js WASM 已移除）— `.sillyspec/.runtime/sillyspec.db` |
| 同步 | 原生 fetch（HTTP POST）；MCP 客户端同走原生 fetch，无额外 HTTP 库 |
| 交互 UI | `@inquirer/prompts`（交互输入）、`chalk`（着色）、`ora`（spinner，仅 setup） |
| 配置 / 文档 | `js-yaml`（YAML 解析；`src/config-schema.js` 为 local.yaml 键单一数据源） |
| 测试 | 自定义 runner（`node:test`/自定义断言混用），无第三方测试库 |
| 源码规模 | `src/` 82 个 JS 文件，~37000 行（含 run/ progress/ dispatch/ sillyhub-mcp/ stages/ hooks/ 子目录） |
| 子包 | `packages/dashboard/` — 独立 dashboard 前端（chokidar + ws，dist/ 预构建产物） |
| License | MIT |
| 仓库 | https://github.com/q512426816/sillyspec.git |
| 主页 | https://sillyspec.ppdmq.top/ |

## CLI 入口与主要命令

`bin/sillyspec.js` 是 Node shebang 入口，转发到 `src/index.js` 的命令路由（64 个 case 分支，子命令模块全部 `await import` 懒加载）。顶层命令覆盖完整变更生命周期：

- `init` — 绿地项目初始化（路线图 + 需求文档；平台模式写双指针）
- `setup` — AI 工具 / MCP 安装引导
- `brainstorm` / `plan` / `execute` / `verify` / `archive` / `auto` — 核心五阶段 + 自动模式（顶层别名，等同 `run <stage>`）
- `scan` — 项目代码库扫描（`--quick / --standard / --deep` 三档 + `--force-rescan`）
- `status` / `doctor` — 查看进度 / 自检修复（只读辅助阶段）
- `quick` — 跳过 brainstorm/plan 的快速通道（低风险小任务；`--linked-changes` / `--files` / `--allow-new` / `--allow-delete` / `--force-baseline` / `--confirm` 守卫 flag）
- `explore` — 只读自由讨论
- `progress` — 进度库管理（init / status / show / check / repair / validate / reset / set-stage / add-step / update-step / complete-stage / batch）
- `worktree` — worktree 生命周期（create / apply / assess / meta / diff / list / cleanup / doctor）
- `dispatch` — SillyHub 派发能力探测与策略生成（probe / hint，agent 调用桥）
- `platform` — 平台连接 / 同步 / 审批（connect / disconnect / sync / sync-docs / status / pull / resolve / approve / reject / pointer）
- `docs` — 文档工具（migrate / check / gate）
- `knowledge` — 知识库管理（search / inspect / validate / refresh / propose）
- `gate` / `derive` / `backfill-reviews` / `register-stage-review` — 机器接口 / 评审回填
- `workflow` / `modules` / `local` / `config` / `runtime` / `change-rename` / `dashboard` — 工作流 / 模块文档 / 本地配置 / 运行时 / 改名 / 面板

> 恢复中断工作不靠专用 CLI 命令：进度由 `--done` 自动落盘，恢复用 `status` 查看进度后 `run <stage>` 续跑（`--reopen --from-step` 可重开已完成阶段）。

## 子项目 / 多仓结构

`.sillyspec/projects/` 下按子项目注册（本仓库 dogfood 自管理：`dashboard.yaml` + `sillyspec.yaml`）；scan 阶段 perProject 步骤按项目列表展开。平台模式（`platform pointer`）支持多仓共享单一进度库根。
