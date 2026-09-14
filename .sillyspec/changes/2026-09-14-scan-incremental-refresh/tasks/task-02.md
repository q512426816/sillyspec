---
id: task-02
title: 'scan-staleness 基线收集改全文档聚合'
title_zh: 'scan-staleness 基线收集改全文档聚合'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-4]
decision_ids: ['D-003@v2']
allowed_paths:
  - src/scan-staleness.js
  - test/scan-staleness.test.mjs
target_files:
  - src/scan-staleness.js
  - test/scan-staleness.test.mjs
goal: >
  堵「任一文档 break 首个命中」的 readdirSync 顺序随机失真：per-doc bump 后 advisory 按全文档最坏情况（落后最多）计。
implementation:
  - computeScanStaleness：去 break 全收集全部 scan 文档 source_commit（无字段 unknown 语义不变）
  - 去重基线逐个 rev-list --count 取最大者为 behindCommits（git 失败/非祖先 unknown 降级路径保留）
  - test 新增多文档异基线用例（新/旧基线混排，任意 readdir 顺序恒报旧基线落后数）；存量断言不动
acceptance:
  - 异基线目录 behindCommits 恒=落后最多基线计数（与文件顺序无关）
  - 无 source_commit 的 unknown 语义不变
  - 存量用例零删除零改写，npm test 通过
verify:
  - npm test -- test/scan-staleness.test.mjs
  - npm test
constraints:
  - 签名不变；注入点 prompt.js 零改动
  - 存量断言不删不改
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
