---
id: task-03
title: living doc drift hint
title_zh: "#3 docsCheckHint 活文档漂移提示"
author: qinyi
created_at: 2026-08-16 23:25:00
priority: high
depends_on: []
blocks: [task-04]
allowed_paths:
  - src/run/shared.js
  - src/run/quick-audit.js
  - test/docs-living-drift-hint.test.mjs
goal: 改动活文档映射的源码文件时审计即时提示漂移风险
implementation: |
  shared.js docsCheckHint（:789 附近）扩展：动态 import collectDocRefs（docs-check.js 纯函数），
  读活文档（缺省 docs/sillyspec/platform-interface-map.md；local.yaml docs-check.living-docs 列表可配，
  未配用缺省）提取 file:line 引用的源码文件集（resolveCandidates 归一到 src 相对路径或直接比对文件名集），
  与本次审计 changedFiles（src/ 下）求交集，非空 → result.docsCheckHint.livingDocDrift = { files, hint }。
  quick-audit.js（:63 附近）输出提示："改动 X 被 platform-interface-map 引用——活文档引用可能失效，建议顺手跑 docs check 修引用行号"。
  纯 advisory 不阻断；性能（collectDocRefs 单文件解析毫秒级）。
  测试：fixture 活文档引用 src/a.js + 审计 changedFiles 含 src/a.js → 提示命中；不含 → 无提示；
  living-docs 配置生效；活文档缺失 → 静默跳过。
acceptance:
  - 交集非空输出 livingDocDrift 提示（含文件清单）
  - 无交集/活文档缺失不误报
  - local.yaml living-docs 配置可扩展集合
verify: node --test test/docs-living-drift-hint.test.mjs + npm test
constraints: advisory 不阻断；复用 collectDocRefs 不重写解析
---

