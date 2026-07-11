---
id: task-01
title: execute.js prompt 路径占位符化（坑 2）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P0
depends_on: []
blocks: [task-03, task-04]
allowed_paths:
  - src/stages/execute.js
---
> 把 execute.js prompt 中硬编码的 .sillyspec/.runtime/ 路径改为 {SPEC_ROOT}/.runtime/ 占位符，让平台路径重写接管（D-003/004）。

## implementation
- grep `src/stages/execute.js` 全量 `.sillyspec/.runtime/`（调用点搜索已确认 :623 review.json + :644 endpoints.json）
- :623 改为 `{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json`
- :644 改为 `{SPEC_ROOT}/.runtime/contract-artifacts/<task-name>/endpoints.json`
- grep 发现其它 `.sillyspec/.runtime/` 硬编码一并占位符化（D-004）

## acceptance
- `grep -n "\.sillyspec/\.runtime" src/stages/execute.js` 无输出
- prompt 含 `{SPEC_ROOT}/.runtime/execute-runs/` 与 `{SPEC_ROOT}/.runtime/contract-artifacts/`
- `### 铁律` 段保留（CONVENTIONS #3）

## verify
- `node bin/sillyspec.js run execute --change <任意> --status` 加载 prompt 不报错
- `grep -c "{SPEC_ROOT}/.runtime" src/stages/execute.js` ≥ 2

## constraints
- 不改 gate 读侧（task-review.js/run.js 已对齐 specDir）
- 仅 prompt 文本替换，不新增输出文件类型
- 仓库内模式行为不变（{SPEC_ROOT} 重写为 .sillyspec，与原硬编码等价）
