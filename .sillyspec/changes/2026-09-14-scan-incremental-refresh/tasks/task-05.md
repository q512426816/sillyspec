---
id: task-05
title: 'scan-refresh 计算层 computeRefreshPlan（含纯函数单测）'
title_zh: 'scan-refresh 计算层 computeRefreshPlan（含纯函数单测）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: ['task-01', 'task-04']
blocks: []
requirement_ids: [FR-2, FR-5]
decision_ids: ['D-002@v1', 'D-004@v1', 'D-005@v1', 'D-007@v1', 'D-008@v1']
allowed_paths:
  - src/scan-refresh.js
  - test/scan-refresh.test.mjs
target_files:
  - NEW:src/scan-refresh.js
  - NEW:test/scan-refresh.test.mjs
expects_from:
  - 'task-01: collectStaleRefs/parseNameStatus 导出与 readSourceCommit 落后最多聚合'
  - 'task-04: guard 握手字段契约（mode/refreshDocs/sourceCommit 7 位）'
provides:
  - 'computeRefreshPlan({projectRoot,specBase,projectName,force}) -> 计划对象（affectedDocs[{file,base,staleRefs,hunks,commits}]/gate/warnings 或 ok:false+kind）'
goal: >
  增量刷新计划计算层：门控（dirty 三硬一软）+ per-doc 基线分组 diff + 受影响文档集 + 工单材料 + guard 握手原子写。分层仿 scan-diff。
implementation:
  - 新建 src/scan-refresh.js：computeRefreshPlan({projectRoot,specBase,projectName,force})；dirtyCheck：scope 非空限 module-map scope、空回退全仓源码面（排除 .sillyspec/node_modules/dist/build/.git），in-scope 脏返回 kind=dirty-worktree
  - 硬门：任一文档无 source_commit（no-baseline）/基线非 HEAD 祖先（non-ancestor）/受影响文档含 scan_depth:quick（quick-depth）拒绝，force 不可越，各附建议命令
  - 软门：scope 过滤后漂移大于 100 或 behindCommits 大于 200 告警，force 可继续
  - 受影响集：文档按 source_commit 分组去重，每组 git diff --name-status --find-renames base..HEAD（全量变更集不经 scope 过滤），复用 task-01 collectStaleRefs/parseNameStatus 归属；source_commit 等于 HEAD 的文档标 fresh 跳过
  - 工单材料：每文档过时引用清单 + hunks（每文档 200 行截断）+ commits（oneline 30 条截断）
  - guard 握手：writeAtomicSync 写 scan-guard.json（mode/refreshDocs/docHashes sha256/sourceCommit 7 位/startedAt/forceRescan false），对齐 task-04 契约
  - 纯函数单测入 scan-refresh.test.mjs（门控四类/软门/分组归属/fresh 跳过/截断/guard 内容）
acceptance:
  - computeRefreshPlan 输出结构与 design 接口定义一致
  - dirty fail-closed 不产工单；force 只越软门不越硬门
  - guard 文件原子写且字段与 task-04 hook 分支匹配
verify:
  - npm test -- test/scan-refresh.test.mjs
constraints:
  - 不接 index.js（task-06）；渲染/审计归 IO 面
  - 复用 scan-diff 导出零拷贝（禁平行实现 staleRefs）
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
