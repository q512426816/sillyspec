---
id: task-05
title: verify-real-drift-live-fix
title_zh: 真实漂移实测自动重锚
author: qinyi
created_at: 2026-08-18 22:42:51
priority: P0
depends_on: [task-04]
blocks: [task-06]
requirement_ids: [FR-01]
decision_ids: [D-002@v2, D-003@v2]
allowed_paths:
  - docs/sillyspec/platform-interface-map.md
goal: >
  在真实仓库上端到端实测——人为制造源码漂移后用 --fix 自动重锚 platform-interface-map.md，验证修复结果过 doc-ref-check 并完整还原现场。
implementation:
  - 在 src/ 任选 sync.js 相关位置临时插入一行使行号下移，制造一处真实漂移（git diff 确认只此一处）
  - 跑 --fix --dry-run 检查预览——正确指出旧引用与新行号，且文档未被写
  - 跑 --fix 写回，复查 git diff 确认只有行号数字变化、引用文件名与 token 不变（D-003）
  - 跑 node test/doc-ref-check.test.mjs 确认修复后引用全过
  - 严格还原——git checkout 还原 sync.js 与 platform-interface-map.md，git status 回到干净态
  - npm test 全量绿后退出本任务
acceptance:
  - 漂移被 --fix 自动修到 token 当前行，doc-ref-check 通过
  - dry-run 阶段文档零写入；git diff 修复面仅行号数字
  - 还原后 git status 干净，npm test 全绿
verify:
  - node test/doc-ref-check.test.mjs
  - npm test
constraints:
  - 临时改动必须 git 还原离场，禁止把漂移 fixture 留在仓库
  - 若实测暴露实现缺陷，回 task-01~04 修复后重测，不在本任务顺手改 src
  - 多 agent 并行风险——动手前 git status 确认无他 session 未提交改动，还原只触及本任务制造的两文件
---
