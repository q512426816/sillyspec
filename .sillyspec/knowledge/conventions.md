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

## crypto.randomUUID 全局是 Node 19+，Node 18 需 import

`crypto.randomUUID()` 作为全局是 Node 19+ 才有；Node 18 需 `import { randomUUID } from 'crypto'`。本项目 `engines: node>=18`，故 Bug2 task-01 从 `node:crypto` import（而非用全局）。仍零新增依赖（node 内置模块）。建议归类到 conventions.md（Node 版本兼容）。

## 新增写入方不得无中生有建判别器依赖的文件

gates 侧 backfill（verify-facts 回填）曾对无 facts 的存量变更凭空创建 verify-facts.json，而 checkProbeConsistency 存在「有 facts 无探针子节 → error」判别——凭空建文件把相邻判别器对存量变更的 skip 误升 error（e2e run-complete-step-verify 抓出）。规则：给既有判别器生态新增写入方时，必须枚举所有「以文件存在性为输入」的判别器并核对创建语义；底稿类文件的创建应收敛到单一入口（如 verify-probes --init），回填只固化既有文件。（2026-09-08-ir-verify-facts）

## 双维度报同一漂移信号时后加维度须豁免

checkProbeConsistency 增 facts 基线对比维度后，probe6 在 HEAD 前移场景与既有 md 锚点维度重复报同一漂移（一条信号两条告警）。规则：给既有检测新增第二维度时，识别「同一根因产生多路信号」的场景并在后加维度里豁免（HEAD-advance 时 facts 侧 probe6 不报，漂移由 md 锚点维度单报）。（2026-09-08-ir-verify-facts）

## 判级/定价/门禁输入必须项目声明，禁全宇宙词表

危险度信号（判级 / 仪式定价 / 证据门）必须来自项目自己的声明面（路径前缀 / 结构件，如 `_module-map.yaml` blast 段），禁止工具自带的全宇宙关键词表当危险度——通用词表换个仓库全是噪声（HTTP session / lifecycle 回调 / 变量名 entryPoint 均为良性词），且判级引擎自身的源码与教学文案写满关键词，按「文档措辞 / 文件内容」判级必然打伤改引擎自身的变更（自指陷阱：扫变更面〔路径 / 行级 diff〕，不扫全文件不扫措辞）。显式人工通道（risk_level 类 frontmatter）是逃生补丁不是定价规则——出现「门禁逼 agent 虚标才放行」的信号时追输入源设计，不给机械字符串匹配加精度（否定抑制 / 枚举继承那类精修是给错误的仪器上油）；首次判级/定价早于显式声明落盘时声明会被粘住，此类机制必须给后补声明留重算通道。（2026-09-19-ceremony-pricing-five-cuts，api-matrix 变更因 design 措辞撞词被定 S3 顶档实证）
