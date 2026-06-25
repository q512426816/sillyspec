---
created_at: 2026-06-03T06:40:00+08:00
author: qinyi
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# PROJECT

## 项目简介

**SillySpec** 是一个面向 AI 辅助开发的 **spec-driven 流程状态机 CLI 工具**，一句话定位：**「流程状态机，让 AI 严格按步骤来」**。

它解决的核心问题是：当 Claude / Cursor 等 AI agent 直接上手编码时，容易跳过需求澄清、方案设计、任务拆解等关键步骤，产出偏离预期且难以审计。SillySpec 把一个完整的变更生命周期固化为一组强制阶段（brainstorm → plan → execute → verify → archive，以及辅助的 scan / status / doctor / quick），每个阶段有明确的入口契约、产物文件名和门禁校验，AI 必须按状态机推进，不能跳步、不能偷工。进度、决策、产物全部持久化到 SQLite（sql.js WASM），并可选同步到 SillyHub 平台做团队协作与审批。

### 核心能力

- **阶段状态机**：以 stage + step 为粒度强制流转，gate-status.json + progress.db 双轨记录当前状态。
- **spec-driven 文档驱动**：每个变更在 `changes/<变更名>/` 下沉淀 brainstorm.md / design.md / plan.md 等结构化产物，可审计可回溯。
- **AI 协作流程**：内置 prompts 把每个 step 的指令输出给 AI，含 postcheck 规则识别 AI 偷懒（占位符、fallback、未分析等模式）。
- **worktree 隔离**：变更可在 git worktree / native worktree / in-place-fallback 三种模式下隔离执行，子代理改动可 diff 合回主仓库。
- **scan 工具链**：扫描任意项目代码库，生成结构 / 架构 / 约定 / 测试 / 关注点 / 集成 / 项目概览七份文档 + 模块映射（本文件即由 scan 产出）。
- **平台同步**：通过 ws + fetch 与 SillyHub 平台对接，支持文档同步、审批（approve/reject 当前占位待平台侧实现）。

### 目标用户

- 用 Claude Code / Cursor / 其他 AI coding agent 做严肃开发，但苦于 AI 流程失控、产物不可追溯的开发者与小团队
- 希望用 spec-driven（先写规格再写码）方式约束 AI 的工程团队

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 语言 | 纯 JavaScript（ESM），无 TypeScript，无构建步骤 |
| 运行时 | Node.js >= 18 |
| 入口 | `bin/sillyspec.js` → `src/index.js` |
| 版本 | v3.19.2（见 `package.json`） |
| 存储 | sql.js（SQLite WASM）— progress.db / sillyspec.db |
| 同步 | ws（WebSocket 客户端）+ 原生 fetch |
| 交互 UI | `@inquirer/prompts`（交互输入）、`chalk`（着色）、`ora`（spinner）、`open`（浏览器） |
| 文件监听 | `chokidar` |
| 配置 / 文档 | `js-yaml`（YAML frontmatter 解析） |
| 测试 | 原生 `node:test` + `node:assert/strict`，自实现 runner（无第三方测试库） |
| 源码规模 | `src/` 约 34 个 JS 文件，~17000 行（含 stages / hooks 子目录） |
| 子包 | `packages/dashboard/` — 独立 dashboard 前端（dist/ 预构建产物） |
| License | MIT |
| 仓库 | https://github.com/q512426816/sillyspec.git |
| 主页 | https://sillyspec.ppdmq.top/ |

## CLI 入口与主要命令

`bin/sillyspec.js` 是 Node shebang 入口，转发到 `src/index.js` 的命令路由。顶层命令（基于 `test/cli-top-level-aliases.test.mjs` 与 stages 目录推断）覆盖完整变更生命周期：

- `init` — 绿地项目初始化（路线图 + 需求文档）
- `brainstorm` / `plan` / `execute` / `verify` / `archive` — 核心五阶段
- `scan` — 项目代码库扫描（产出七份文档）
- `status` — 查看进度
- `doctor` — 自检与状态修复
- `quick` — 跳过 brainstorm/plan 的快速通道（低风险小任务）
- `explore` — 只读自由讨论
- `resume` / `continue` — 从中断处恢复推进
- `platform` — 平台连接 / 文档同步 / 审批
