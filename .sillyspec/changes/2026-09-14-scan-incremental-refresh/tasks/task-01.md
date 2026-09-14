---
id: task-01
title: 'scan-diff 聚合改落后最多 + collectStaleRefs/parseNameStatus 导出'
title_zh: 'scan-diff 聚合改落后最多 + collectStaleRefs/parseNameStatus 导出'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-4]
decision_ids: ['D-003@v2', 'D-009@v1']
allowed_paths:
  - src/scan-diff.js
  - test/scan-diff.test.mjs
target_files:
  - src/scan-diff.js
  - test/scan-diff.test.mjs
provides:
  - 'collectStaleRefs(scanDir, fullChangedMap) -> [{doc,ref,change,file}]（含 rename 旧路径与 src/ 前缀归一）'
  - 'parseNameStatus(out) -> [{status,path,oldPath?}]'
  - 'readSourceCommit 聚合语义=落后最多（rev-list 计数最大，fail-soft 回退首个命中）'
goal: >
  readSourceCommit 批次同值假设升级为多文档异基线保守聚合（落后最多）；staleRefs 命中段与 parseNameStatus 抽导出供 scan-refresh 复用（防双源漂移）。
implementation:
  - readSourceCommit：全文档收集 source_commit，去重基线逐个 rev-list --count 取计数最大者（拓扑序，免疫日期倒挂；git 失败 fail-soft 回退首个命中）
  - staleRefs 命中段（fullChanged/hitChange/src 前缀归一/rename 旧路径）抽为导出函数 collectStaleRefs(scanDir, fullChangedMap)，computeScanDiff 改调用（行为等价）
  - parseNameStatus 转导出
  - test 新增多文档异基线聚合用例（落后最多选择 + fail-soft 回退）；存量单文档断言不动
acceptance:
  - 异基线 scan 目录取落后最多基线（临时 git 仓三文档三基线断言）
  - collectStaleRefs/parseNameStatus 可 import 且行为与抽取前一致
  - 存量用例零删除零改写，全量 npm test 通过
verify:
  - npm test -- test/scan-diff.test.mjs
  - npm test
constraints:
  - 不新增对外 CLI 面；computeScanDiff 返回结构不变
  - 存量断言不删不改（R-03 红线：预期单文档断言不变）
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
