---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Conventions

## ESM Only

项目 `"type": "module"`，**顶层**统一使用 ES Module（`import`/`export`）。

**CJS 例外**：函数体内允许 `require()` 懒加载（推迟启动开销 / 打破循环依赖 / `doctor.js` 内嵌 bash 诊断需独立 node 进程无 ESM 上下文）。命中位置：`run.js`、`worktree-apply.js`、`stages/execute.js`、`stages/doctor.js`。顶层仍必须用 `import`。

`.cjs` 文件（如 git hooks）可用 CJS。

最低 Node.js 18，可安全使用 `fs/promises`、`structuredClone`、`fetch` 等原生 API。

## Naming

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `change-list.js` |
| 函数名 | camelCase | `parseFileChangeList` |
| 导出类 | PascalCase | `DB`、`ProgressManager` |
| 常量/配置 | UPPER_SNAKE_CASE 或小写字符串 | `SCAN_STATUS` |

## Error Handling

- CLI 层：`process.exit(1)` 终止并打印错误信息
- 业务逻辑层：抛出具体错误消息字符串，由调用方捕获
- 数据库操作：`DB` 类封装错误处理
- 无自定义 Error 类，使用原生 `Error` 或字符串消息

## Logging

- `console.log` / `console.error` / `console.warn` 直接输出
- 用户友好提示用 `chalk` 着色
- 进度展示用 `ora`（spinner）
- 交互式提示用 `@inquirer/prompts`

## CLI Entry

`bin/sillyspec.js` → `src/index.js`，所有命令通过 `main()` 函数分发。单入口，不使用 bin 多文件。

## Zero Config Init

`sillyspec init` 自动检测开发工具（Claude Code、Cursor 等），非交互式默认。`sillyspec init --interactive` 保留完整引导。

## Stage Definition Shape

`src/stages/*.js` 统一导出 `definition = { name, title, description, auxiliary?, _globalGuardrails?, steps }`：
- `name` 必须等于文件名（如 `scan.js` → `name: 'scan'`）
- 辅助阶段（scan/quick/explore/archive/status/doctor）必带 `auxiliary: true`
- 只读校验类阶段（verify）必带下划线前缀的 `_globalGuardrails`
- 新增阶段需在 `src/stages/index.js` 的 `stageRegistry` 注册

## 铁律段格式

派发给子代理的 step prompt 结尾必须含 `### 铁律`（或 `### ⚠️ 铁律`）固定段，用 `❌/✅/⚠️` emoji + 中文短句声明禁止动作（如「不要编造 CLI 子命令」「完成后立即执行 --done」「不要回头修改已完成步骤」）。新增/修改步骤 prompt 时须保留此段。

## 资产保护注释

触碰 `.sillyspec/changes/`、`projects/`、`sillyspec.db` 的清理/写入代码必须带中文注释 `// ⚠️ 必须保护真实资产`，防止误删真实数据。修改这类代码时不可删除该注释。
