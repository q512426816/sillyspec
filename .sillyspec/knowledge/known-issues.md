---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Known Issues

## sqljs-wasm-only

项目使用 `sql.js`（WASM SQLite），不依赖 native SQLite binding。这意味着：
- 无需系统级 SQLite 安装
- WASM 加载有初始开销（首次约 100-200ms）
- 不支持 SQLite 的某些 native 扩展（如 FTS5）

## Sub Package Isolation

`packages/dashboard/` 是独立 Vue 3 子包，使用 Vite 构建。与 CLI 核心松耦合，仅通过共享 `sillyspec.db` 数据库文件交互。不要在 CLI 核心中直接引用 dashboard 子包的模块。

## Hook Import Restriction

`src/hooks/worktree-guard.js` 会被测试直接以 ESM 导入。不要在 hook 中引入 `package.json` 未声明的外部包；简单本地配置解析优先使用项目内已有实现或标准库，否则 `npm test` 会在导入阶段失败。

参见 `uncategorized.md` 中的 ql-20260604-001-7a4c。

## Propose 死代码

`src/stages/propose.js` 的 `definition` 标注 `@deprecated` 且**未在 `stageRegistry` 注册**，文件头注释明确「保留备用」。新增功能不要复用 propose，也不要误判它是活跃阶段（`sillyspec run propose` 不可用）。

## 平台审核占位

`src/sync.js:406`/`:411` 的平台 approve/reject 流程是**占位实现，未真正可用**。接入平台变更审核功能前需先补全这两处。

## 无 Build/Lint 框架

sillyspec 纯源码分发（package.json 无 `build` script，无打包器）。无 eslint/prettier/biome，语法检查靠自定义 `test/check-syntax.mjs`。不要假设 `npm run build` 可用；CI/工具链改造时需注意无标准 lint。
