---
id: task-03
title: test-reopen-stale-confirm-gate
title_zh: W1 回归测试 reopen stale confirm 门控
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-07]
decision_ids: []
allowed_paths:
  - test/reopen-stale-confirm.test.mjs
provides: {}
expects_from: {}
goal: >
  覆盖 reopen stale 回填 confirm 门控三场景与 complete-stage stale 拒绝
implementation:
  - 新建 test/reopen-stale-confirm.test.mjs
  - 场景一：reopen --from-step N 后 --done 无 confirm 不回填且阶段不完成
  - 场景二：reopen 后 --done --confirm 回填生效 + 审计日志含 reopen-stale-backfill
  - 场景三：progress complete-stage 遇 stale 拒绝，--force 放行
  - 场景四：常规零介入场景验证无 stale 时行为不变
  - 用临时变更目录 + cleanup 隔离，不污染主仓
acceptance:
  - 场景一断言返回值含 staleBlocked true 且 stale 步骤保持原状态
  - 场景二断言审计日志条目 action 字段为 reopen-stale-backfill
  - 场景三断言 complete-stage 报错信息含 stale 步骤名
  - 场景四断言无 stale 时原有完成流程不受影响
  - 四场景均在 Windows + Linux 兼容测试通过
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 测试需独立进程跑 CLI 命令，非直导函数
  - cleanup 完整删除临时变更目录与 DB 记录
  - 断言覆盖 stale 步骤名列表与审计日志字段
related_tests: []

---
