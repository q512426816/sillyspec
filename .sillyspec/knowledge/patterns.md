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
