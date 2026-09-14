---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Patterns

## Stage Step Pattern

每个阶段对应 `src/stages/` 下的独立模块，导出 `definition` 对象（含 `steps` 数组）。`run.js` 的 `getStageSteps()` 动态加载并逐步执行，支持 `--done`/`--skip`/`--status` 控制。

步骤字段：`name`、`prompt`（markdown 模板）、`outputHint`、`optional`、`perProject`（对多项目展开）。

## Database First

所有状态数据（进度、变更记录）存储在 SQLite（sql.js WASM），路径 `.sillyspec/sillyspec.db`。`src/db.js` 的 `DB` 类封装所有 CRUD。代码不直接操作文件状态来查询进度。

## Progress Management

`src/progress.js` 的 `ProgressManager` 类管理变更阶段状态。所有阶段推进通过 `ProgressManager` 方法，不手动改 DB。

## Stage Registry

`src/stages/index.js` 维护 `stageRegistry`，注册所有阶段定义。新增阶段需在此注册。阶段间转换通过 `ProgressManager` 校验。

## Worktree Isolation

`src/worktree.js` 的 `WorktreeManager` 管理 git worktree 生命周期。execute 阶段默认在独立 worktree 中执行，避免污染主分支。`src/hooks/worktree-guard.js` 提供守卫钩子。

## Platform Mode

平台模式通过 `--spec-dir` 指定规范根目录（specRoot），与源码根目录（sourceRoot）分离。所有 `.sillyspec/` 产物写入 specRoot，禁止写入 sourceRoot（postcheck 校验）。

`run.js` 中三处路径渲染代码处理 `{DOCS_ROOT}`、`{KNOWLEDGE_ROOT}`、`{PROJECTS_ROOT}` 等占位符。

## Postcheck

`src/scan-postcheck.js` 在 scan 完成后强制校验：
- source_root 污染检查
- 7 份 scan 文档完整性
- 文档 header（author/created_at）
- local.yaml 命令有效性
- knowledge 目录和 INDEX.md 引用完整性（平台模式）

## Knowledge Lifecycle

- **写入**：scan 阶段「Extract Project Knowledge」步骤提取
- **索引**：`knowledge/INDEX.md` 维护分类索引
- **消费**：execute 启动时按 Task 关键词匹配读取
- **审阅**：execute 收尾「知识库审阅」步骤检查 uncategorized.md
- **分类**：conventions.md / patterns.md / known-issues.md / uncategorized.md

## validateTaskReviews 真实签名是单 opts 解构，非 (changeDir, {gitDir})

`src/task-review.js` 的 `validateTaskReviews(opts)` 是**单个 opts 对象解构** `{ planContent, runtimeRoot, executeRunId, allowCannotVerify=true, changeDir=null, gitDir=null }`，返回 `{ ok, errors, warnings, requiredEvidence }`。task 蓝图/文档常误写为 `validateTaskReviews(changeDir, {gitDir})`。聚合调用（如 gate/derive）需自行组装：planContent 读 `changes/<c>/plan.md`、runtimeRoot = specBase/.runtime（或平台 runtimeRoot）、executeRunId 从 `<runtimeRoot>/current-execute-run-id-<changeName>` 读、gitDir 优先 WorktreeManager.getMeta().worktreePath（校验 mode!=='in-place-fallback'）。现成范式见 `src/run/gates.js:274-294` 与 `src/machine-interface.js` runGate/runDerive。建议归类到 patterns.md（task-review 调用范式）。

## plan-postcheck 与 worktree-apply 存在既有依赖边，反向复用 filterDeliverableFiles 会成环

worktree-apply.js:21 已 `import { parseAllowedPaths } from './stages/plan-postcheck.js'`——因此 plan-postcheck 侧不能反向 import worktree-apply 的 filterDeliverableFiles（ESM 循环）。需要在 plan-postcheck 内做「流程产物过滤」时，硬编码同口径清单（.sillyspec/changes|.runtime|quicklog + meta.json，保留 .sillyspec/docs/）并注释锚定来源，不引依赖。同类需求先 grep 双向 import 边再决定复用还是同口径复制。（来源：2026-09-06-ir-stage-p3a task-03）
