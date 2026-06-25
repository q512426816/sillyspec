---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Knowledge Index

> 子代理任务开始前查询此文件，按关键词匹配，只读命中的知识文件。
> execute/quick 执行中发现的坑自动追加到 uncategorized.md，经用户确认后归类到对应文件。

<!-- 格式：关键词1|关键词2|关键词3 → 文件路径 -->

## Conventions
- ESM|module|import|export → [conventions.md#esm-only](conventions.md#esm-only)
- 命名|naming|kebab-case|camelCase → [conventions.md#naming](conventions.md#naming)
- 错误处理|error|process.exit → [conventions.md#error-handling](conventions.md#error-handling)
- 日志|log|console|chalk|ora → [conventions.md#logging](conventions.md#logging)
- CLI入口|index.js|main → [conventions.md#cli-entry](conventions.md#cli-entry)
- 零配置|init|detect → [conventions.md#zero-config-init](conventions.md#zero-config-init)
- 阶段定义|definition|stageRegistry|auxiliary → [conventions.md#stage-definition-shape](conventions.md#stage-definition-shape)
- 铁律|guardrail|子代理prompt → [conventions.md#铁律段格式](conventions.md#铁律段格式)
- 资产保护|保护真实资产|清理 → [conventions.md#资产保护注释](conventions.md#资产保护注释)

## Patterns
- 阶段定义|stage|stages → [patterns.md#stage-step-pattern](patterns.md#stage-step-pattern)
- 数据库|SQLite|sql.js|DB → [patterns.md#database-first](patterns.md#database-first)
- 进度管理|ProgressManager|progress → [patterns.md#progress-management](patterns.md#progress-management)
- 模块注册|stageRegistry → [patterns.md#stage-registry](patterns.md#stage-registry)
- worktree|git-worktree|WorktreeManager → [patterns.md#worktree-isolation](patterns.md#worktree-isolation)
- 平台模式|specRoot|specDir → [patterns.md#platform-mode](patterns.md#platform-mode)
- postcheck|校验|check → [patterns.md#postcheck](patterns.md#postcheck)
- 知识库|knowledge|INDEX → [patterns.md#knowledge-lifecycle](patterns.md#knowledge-lifecycle)

## Known Issues
- WASM|sql.js|native|native binding → [known-issues.md#sqljs-wasm-only](known-issues.md#sqljs-wasm-only)
- 子包|packages|dashboard → [known-issues.md#sub-package-isolation](known-issues.md#sub-package-isolation)
- hook|worktree-guard|npm-test → [known-issues.md#hook-import-restriction](known-issues.md#hook-import-restriction)
- propose|死代码|deprecated → [known-issues.md#propose-死代码](known-issues.md#propose-死代码)
- 平台审核|approve|reject|SillyHub → [known-issues.md#平台审核占位](known-issues.md#平台审核占位)
- 无build|无lint|check-syntax → [known-issues.md#无-buildlint-框架](known-issues.md#无-buildlint-框架)
