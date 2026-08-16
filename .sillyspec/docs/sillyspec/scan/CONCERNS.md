---
created_at: 2026-05-13T08:38:55+08:00
author: qinyi
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# CONCERNS

按严重程度分组列出当前代码库实际存在的技术债务与风险，来源全部为 grep/rg 扫描得到的真实条目（不编造）。

## 代码质量

### 🔴 高

- **propose 阶段死代码已清理**（2026-08-07 A6）：`src/stages/propose.js` 已删除，阶段注册表无 propose 条目。历史扫描曾记录「文件保留 `@deprecated` 标注未清理」。
- **无 lint 框架、无静态分析**：`npm run lint` 仅是 `node --check` 语法校验（见 `test/check-syntax.mjs`），未接入 ESLint/Biome。无未使用变量、未处理 Promise、import 顺序等检查，质量风险靠人工巡检。
- **测试框架不统一**：28 个测试文件中只有 `test/contract-artifacts.test.mjs` 用了 `node:test` 的 describe/it，其余多用内联自定义断言函数（`assertEqual`/`assertThrows`），无共享 util，断言失败信息与可读性参差。

### 🟡 中

- **TODO 未完成项**（grep `TODO` 真实命中，历史扫描后多数已消化）：
  - `src/sync.js:955` — `// TBD-hub-api: approve/reject 端点路径与请求体以 SillyHub 仓库实际 API 为准`——approve/reject 入口（`sync.js:1023/1027`）与 `_submitApproval` 已实现，仅端点契约待 SillyHub 侧对齐（decisions.md D-006@v1：显式动作失败打 error 并置 exitCode=1，非 best-effort warn）。
- **大量 best-effort 容错点**（grep `console.warn(` 在 `src/` 共 50+ 处），关键路径降级后继续执行而非失败，包括：
  - `src/progress.js` 多处空值/异常跳过写入（`_write`、`registerChange`、`renameChange`、`unregisterChange`、`initChange` 空值跳过；`isolation` 状态更新失败仅 warn）。
  - gate-status.json 缓存双源已废除（progress.js 头注 task-10）：worktree-guard hook 直读 sillyspec.db，不再有「写入失败仅 warn 致门禁状态丢失」路径。
  - `src/run.js` 多处 manifest / baseline / workflow 校验失败仅 warn 不阻断（如 `:1065`、`:1596`、`:1644`、`:2670`、`:2798`、`:2831`）。
  - `src/worktree.js` 远程同步失败仅 warn（`:314`），baseline overlay 同目录跳过仅 warn（`:397`）。
- **`in-place-fallback` 降级路径**：`src/worktree.js` 多处出现 `in-place-fallback` 模式（`:281`、`:409`、`:444`、`:491`、`:554`），当 git worktree 创建失败或 sandbox 权限不足时降级为主仓库内执行，标记为 `degraded`。这是核心隔离能力的降级路径，行为差异需文档化提醒用户。

### 🟢 低

- **历史迁移残留**：`src/migrate.js:51` 注释 `// 2. specs/ is deprecated — designs live in changes/<变更名>/design.md`，迁移代码保留以兼容老结构。
- **`@deprecated` 标注未清理**：`src/workflow.js:552` 注释 `* @deprecated 直接用 runPostCheck 返回的 retry_prompts`，旧 API 仍在文件内。

## 依赖风险

### 🔴 高

- **sql.js 体积与启动开销**：`package.json` 依赖 `sql.js@^1.14.1`，SQLite 通过 WASM 实现，需加载 ~1MB+ wasm 文件，每次 CLI 调用若初始化数据库都有冷启动开销。CLI 工具对启动延迟敏感，是性能风险点。
- **平台同步链路依赖外部服务**：`src/sync.js` 全部 approve/reject（`:407`/`:412`）依赖 SillyHub 平台侧实现，目前本地侧仅占位 + warn，功能实际不可用，但 package 仍发布，用户可能误用。

### 🟡 中

- **运行时依赖链较重**：`dependencies` 含 `@inquirer/prompts`、`chalk`、`chokidar`、`ora`、`open`、`ws`、`js-yaml`，对 CLI 工具而言偏多（尤其 `chokidar` 文件监听、`ws` WebSocket），增加安装体积与潜在 CVE 暴露面。
- **依赖锁定粒度**：版本用 `^` 区间（如 `^7.10.1`、`^5.6.2`），无 `package-lock.json` 锁定信息可见（待确认），不同环境安装可能拉到不同补丁版本。

### 🟢 低

- **无 build/打包步骤**：纯 ESM 源码直接发布，无 tree-shaking，`packages/dashboard/dist/` 是独立子包的预构建产物，主 CLI 体积与依赖直接成正比。
- **Node 版本下限 18**：`engines.node >= 18`，部分较新的 `node:test` API（如 20+ 才稳定的特性）在 18 上不可用，可能是仅 1 个测试文件使用 `node:test` 的原因之一。
