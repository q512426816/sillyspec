---
author: flow-machine-draft
created_at: 2026-10-19T07:38:24.187Z
---
# 任务注册表（Tasks）— 2026-10-19-approve-gate-tick-nudge

- [x] task-01: flow-draft.js——verifyThinDocsV2/verifyFlowDrafts 加 repair 只读开关（approve 传 false：问题行不回填、违规照报不写盘）；flow-review.js 新增共享 designSectionsFilled（v1 槽/v2 节双格式）
- [x] task-02: flow.js——cmdFlowApprove 批准前跑双轨校验（v2/v1 violations 硬拒 exit 1+修复指引；brainstorm skipDesign 豁免；ledger 缺失 fail-open 降级标注+verifyDesignRecordFilled 兜底；advisory 只警示）；status 内联判定改调共享函数（输出零变化）
- [x] task-03: task-tick.js——回显末尾条件警示（design 四节未答或未批准且非 autopilot 时一行 advisory，读失败静默，齐备时零新增行）
- [x] task-04: 新增 test/approve-gate-tick.test.mjs（硬拒/齐备放行/approve 只读字节不变/brainstorm 豁免/ledger 缺失降级/共享判定双格式/tick 警示与静默），全绿 + 既有 status/tick/approve 锚零回归
