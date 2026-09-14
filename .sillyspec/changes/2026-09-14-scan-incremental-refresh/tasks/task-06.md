---
id: task-06
title: 'scan-refresh IO 面 + index.js 接线'
title_zh: 'scan-refresh IO 面 + index.js 接线'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: ['task-03', 'task-05']
blocks: []
requirement_ids: [FR-2, FR-3, FR-6]
decision_ids: ['D-002@v1', 'D-006@v1', 'D-009@v1']
allowed_paths:
  - NEW:src/scan-refresh.js
  - src/index.js
  - NEW:test/scan-refresh.test.mjs
target_files:
  - NEW:src/scan-refresh.js
  - src/index.js
  - NEW:test/scan-refresh.test.mjs
expects_from:
  - 'task-03: bumpScanDocBaselines 签名与幂等语义'
  - 'task-05: computeRefreshPlan 输出结构'
provides:
  - 'CLI 面：sillyspec scan refresh [--project] [--force] [--json] 与 scan refresh --done [--docs]，退出码 0/1/2 契约'
goal: >
  两拍命令收口：runRefresh 工单渲染（检出极限声明）、finalizeRefresh 内容比对门+bump+postcheck+审计、index.js 接线与 help。
implementation:
  - runRefresh：computeRefreshPlan 后渲染工单（过时引用 A/D/M/R + hunks + commits + 编辑纪律）；退出码 0=工单/零漂移、2=拒绝；文案零「一致」断言（检出极限声明之一）
  - finalizeRefresh：内容比对门（逐文档 sha256 对比 guard.docHashes，未变默认不 bump，提示显式 --docs 或 force）；bumpScanDocBaselines（task-03）；runScanPostCheck（specDir=platformOpts 的 specRoot 或 null 转换传入）；审计落 .runtime/scan-refresh-时间戳.json（平台模式 resolveRuntimeRoot 定根）
  - index.js 接线：scan refresh [--project] [--force] [--json] 与 scan refresh --done [--docs]，仿 scan diff 转发（specBase/projectName 同口径）；help 补 refresh 行 + 检出极限声明
  - IO 单测：runRefresh 渲染/退出码、finalize 比对门与 postCheck 透传
acceptance:
  - scan refresh 在含漂移仓输出工单退出 0；拒绝场景退出 2 含建议命令
  - --done 后已编辑受影响文档 source_commit 推进、未编辑不推进
  - help 含检出极限声明、文案零「一致」断言
  - npm test + npm run lint 通过
verify:
  - npm test
  - npm run lint
  - node src/index.js --help 查看 refresh 行
constraints:
  - 不改 stages/scan.js 步骤结构
  - 审计文件只写不读
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
