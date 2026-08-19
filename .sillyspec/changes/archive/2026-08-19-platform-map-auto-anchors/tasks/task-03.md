---
id: task-03
title: wire-fix-flags-in-docs-check-cli
title_zh: docs check 路由接线 --fix 与 --dry-run
author: qinyi
created_at: 2026-08-18 22:42:51
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1, D-006@v1]
allowed_paths:
  - src/index.js
provides:
  - contract: cli-fix-flags
    fields: [fix, dryRun]
expects_from:
  task-01:
    - contract: inv-fix-classification
      needs: [fixable, newLine, reason]
  task-02:
    - contract: applyFixes-export
      needs: [applied, skipped]
goal: >
  docs check 子命令路由接入 --fix 与 --dry-run flag，串起分类与写回并输出修复报告，exit code 表达修复余量。
implementation:
  - BARE_FLAGS 白名单加入 --fix 与 --dry-run 两个 bare flag，解析置位布尔变量（沿用 F-1 白名单化模式）
  - runDocsCheck 返回后，仅当 fix 置位时对 fixable 条目构造 fixes 列表调用 applyFixes，dryRun 置位时透传预览
  - 非 json 输出打印修复报告——已应用（文档/行/旧引用→新引用）与待人工（needs-manual 原因+候选行号）；json 输出附修复统计字段
  - exit code 语义——全修或原本全绿为 0，修复后仍有 needs-manual 或未修失效为 1，配置错误仍为 2（对齐 design §5.2 行为矩阵）
acceptance:
  - --fix --dry-run 组合只打印预览不写盘；--fix 修复全部 fixable 且无 needs-manual 时 exit 0，余 needs-manual 时 exit 1
  - 不传新 flag 时输出与 exit code 与现状逐字节一致（D-004）
  - 未知 flag 仍显式 exit 2 报错
verify:
  - node test/docs-check-cli.test.mjs
  - npm run lint
constraints:
  - 只改 docs check 分支路由，不动 docs gate 与 pre-push 链路（D-004）
  - 多命中条目只报告不修（D-006），不引入 --force 逃生口；--fix 与 --json 组合输出保持机器可解析（stdout 纯 JSON）
---
