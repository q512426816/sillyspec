---
id: task-07
title: '全链路 e2e 临时 git 仓验证'
title_zh: '全链路 e2e 临时 git 仓验证'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: ['task-06']
blocks: []
requirement_ids: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8]
decision_ids: ['D-001@v1', 'D-004@v1', 'D-005@v1', 'D-007@v1', 'D-008@v1', 'D-009@v1']
allowed_paths:
  - test/scan-refresh.test.mjs
target_files:
  - NEW:test/scan-refresh.test.mjs
expects_from:
  - 'task-06: CLI 面与退出码契约'
goal: >
  临时 git 仓端到端：门控四类拒绝/软门 force/编辑放行/bump 闭环/下轮 diff 新基线起算/写面限界。
implementation:
  - fixture：临时目录 git init + 3 文档 scan 产物（frontmatter source_commit）+ module-map + 基线后源码变更 commit，afterEach 自清理
  - e2e-1 门控：无 source_commit/非祖先/quick 浅文档/dirty 四类拒绝断言（退出 2 + kind + 建议命令 + force 不越）
  - e2e-2 软门：大漂移告警 + force 继续
  - e2e-3 闭环：工单后模拟编辑（fs 写）到 --done：受影响推进/未受影响不动/未编辑不 bump；再跑 scan diff 断言从新基线起算
  - e2e-4 guard：refresh 后直接调 shouldBlockScanDocOverwrite 断言白名单内放行、白名单外拦截
  - e2e-5 写面限界：全程断言 modules/ 与 knowledge/ 零写入
acceptance:
  - 五组 e2e 断言全绿（FR-1/2/3/5/7/8 对应）
  - npm test 全量通过
verify:
  - npm test -- test/scan-refresh.test.mjs
  - npm test
constraints:
  - 临时仓自清理
  - 不依赖宿主 hook 安装——直接调 hook 模块函数
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
