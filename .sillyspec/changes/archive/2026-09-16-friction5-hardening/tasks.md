---
author: qinyi
created_at: 2026-09-16 11:27:58
---
# 任务清单（Tasks）

<!-- plan 阶段展开细节并写回本文件；Wave 1 五码任务零依赖（各改各文件）并行，Wave 2 认领依赖全勾 -->

- [x] task-01: 回执双形态解析——verify-facts-schema.js parseEvidenceSlots 多行 YAML 聚合（单行正则保留）+ 骨架/prompt 双形态文案 + test/receipt-multiline-parse.test.mjs
- [x] task-02: TaskCard 重复键检测——plan-postcheck.js detectDuplicateTopKeys 纯函数 + feasibility 接线硬报错 + test/taskcard-duplicate-key.test.mjs
- [x] task-03: apply docs 白名单——worktree-apply.js resolveApplyAllowSet 条件加白 + declaredFace 审计报备 + test/apply-docs-allowlist.test.mjs
- [x] task-04: 快照 copy 面——config-schema.js 登记 gate_snapshot.copy + gate-snapshot.js junction/copy 回退 + test/gate-snapshot-copy.test.mjs
- [x] task-05: probe7 锚点对齐——probe7-anchor-check.js .test. 口径 + run/gates.js advisory 文案 + test/probe7-anchor-testfile.test.mjs
- [x] task-06: 模块文档认领——五模块 sidecar changelog 追加条目（回执双形态/重复键检测/docs 条件白名单/copy 面/锚点口径） (depends_on: task-01,task-02,task-03,task-04,task-05)
