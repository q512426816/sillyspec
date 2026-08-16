---
created_at: 2026-05-13T08:38:55+08:00
author: qinyi
source_commit: 4401b3d
updated_at: 2026-08-16T19:30:00+08:00
generator: sillyspec-scan
---

# CONCERNS

按严重程度分组列出当前代码库实际存在的技术债务与风险，来源全部为 grep/rg 扫描得到的真实条目（不编造）。

## 代码质量

### 🔴 高

- ~~**propose 阶段死代码**~~ 已清理（2026-08-07 A6）：`src/stages/propose.js` 已删除，阶段注册表无 propose 条目。knowledge 阶段另有 `propose` 子命令（知识条目提议），与已移除的 propose 阶段无关。
- **无 lint 框架、无静态分析**：`npm run lint` 仅是 `node --check` 语法校验（见 `test/check-syntax.mjs`），未接入 ESLint/Biome。无未使用变量、未处理 Promise、import 顺序等检查，质量风险靠人工巡检 + pre-push 三道关兜底。
- **测试框架不统一**：210 个测试文件中约 22 个用 `node:test` 的 describe/it，其余多用内联自定义断言函数（`assertEqual`/`assertThrows`），无共享 util，断言失败信息与可读性参差。

### 🟡 中

- **TODO 未完成项**（grep `TODO` 真实命中，历史扫描后多数已消化）：
  - `src/sync.js:955` — `// TBD-hub-api: approve/reject 端点路径与请求体以 SillyHub 仓库实际 API 为准`——approve/reject 入口（`sync.js:1023`/`sync.js:1027`）与 `_submitApproval` 已实现，仅端点契约待 SillyHub 侧对齐（decisions.md D-006@v1：显式动作失败打 error 并置 exitCode=1，非 best-effort warn）。
- **大量 best-effort 容错点**（grep `console.warn(` 在 `src/` 共 200+ 处），关键路径降级后继续执行而非失败，包括：
  - `src/progress/` 子模块多处空值/异常跳过写入（`change-registry.js:28/66/94/166/170/245`——registerChange/renameChange/unregisterChange 空值跳过、isolation 状态更新失败仅 warn）。
  - gate-status.json 缓存双源已废除（progress.js 头注 task-10）：worktree-guard hook 直读 sillyspec.db，不再有「写入失败仅 warn 致门禁状态丢失」路径。
  - `src/run/` 模块多处校验失败仅 warn 不阻断（quick baseline 采集失败 `stage.js:246`、reset 清理 worktree 失败 `command.js:1080`、审批状态未知按本地模式放行 `command.js:1234` 等）。
  - `src/worktree.js` 占位 meta 写入失败仅 warn（`:498`，若 create 中断可能误判幽灵 worktree）；baseline overlay 同目录跳仅 warn（`:614`）。
- **`in-place-fallback` 降级路径**：`src/worktree.js` 多处出现 `in-place-fallback` 模式（`:474`、`:627`、`:664`、`:698`），当 git worktree 创建失败或 sandbox 权限不足时降级为主仓库内执行，标记为 `degraded`。这是核心隔离能力的降级路径，行为差异需文档化提醒用户。
- **多 agent 并发协作陷阱面大**（见 docs/sillyspec/troubleshooting.md #9 等）：git add/commit 会夹带他人已暂存文件、并行删除产生假审计信号、并发 archive 撞中途态——均靠 agent 纪律（显式 pathspec、仓外备份）而非机制硬拦。

### 🟢 低

- **历史迁移残留**：`src/migrate.js:51` 注释 `// 2. specs/ is deprecated — designs live in changes/<变更名>/design.md`，迁移代码保留以兼容老结构。
- **`@deprecated` 标注未清理**：`src/workflow.js:549` 注释 `* @deprecated 直接用 runPostCheck 返回的 retry_prompts`，旧 API 仍在文件内。
- **_module-map.yaml schema_version=1 警告刷屏**（troubleshooting #5）：已止血，根因待修。

## 依赖风险

### 🔴 高

- ~~**sql.js 体积与启动开销**~~ 已消除（2026-08-11 迁移）：数据库引擎已从 sql.js（SQLite WASM，~1MB+ wasm 冷启动）迁至 **node:sqlite 原生 DatabaseSync**（`src/db-engine.js` 抽象层），打开即持久化，无 WASM 加载开销。代价是 `engines.node >= 22.13` 硬性抬高（见下）。
- **平台同步链路依赖外部服务**：`src/sync.js` 的 approve/reject（`:1023`/`:1027`）依赖 SillyHub 平台侧实现，端点契约 TBD-hub-api 待对齐；本地侧已实现完整入口，无平台配置时完全本地运行。

### 🟡 中

- **Node 版本下限抬至 22.13**：`engines.node >= 22.13.0`（node:sqlite 要求），排除 LTS 18/20 用户群——发布 npm 包的可安装面收窄，属已知取舍。
- **依赖锁定粒度**：版本用 `^` 区间（如 `^7.10.1`、`^5.6.2`），有 `package-lock.json`（仓库内已存在），CI 未配置所以锁文件约束力靠本地纪律。
- **双数据库引擎过渡残留**：better-sqlite3 / sql.js 双引擎时期的经验教训（sql.js 宽容掩盖双引号 SQL 字面量 / 数组参数展开两类 bug）已随 node:sqlite 迁移收敛，但 `src/db.js` 仍保留 sql.js 时代 `.bak` 兼容回退分支（`:97` 注释），属向后兼容包袱。

### 🟢 低

- **无 build/打包步骤**：纯 ESM 源码直接发布，无 tree-shaking，`packages/dashboard/dist/` 是独立子包的预构建产物，主 CLI 体积与依赖直接成正比。
- **Windows 兼容为长期成本**：CRLF/文件锁/rename EPERM 等坑反复出现（fs-atomic 退避重试、测试 `--spec-dir` 隔离、bash 内联脚本转义陷阱均为此而生），每次跨平台改动需三平台顾忌。

## 平台 / 集成关注

- **平台模式状态分裂**：D1-D4 + pointer fail-closed 已落地，P2 migration 待办（旧项目迁移到平台模式的通道未完成）。
- **dispatch 路径 A 未完全支持**：SillyHub 侧 Path A（跨仓合并）stub 恒 false，策略层已做降级提示段 + Local 兜底指令（D-003@v2），但双后端完整体验依赖 SillyHub 侧实现进度。
- **文档一致性债**：enforcement 集中在 design↔代码，模块文档四环节（同步率）降级为劝说机制，债单见 `docs/sillyspec/doc-consistency-debt.md`（D-1~D-8）与 `docs/sillyspec/prompt-control-debt.md`。
