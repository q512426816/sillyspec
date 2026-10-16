---
author: flow-machine-draft
created_at: 2026-10-16T11:15:20.392Z
---
# 任务注册表（Tasks）— 2026-10-16-fix-downstream-tool-defects

- [x] task-01: 回归用例红→绿：progress 冲突/熔断窗口内本地删除 spec 文件后，后续 pullSpecBundle / resolve --take-platform 不把服务器旧文件写回本地（活跃变更内单文件粒度；基线有、盘面无=本地删除的抑制判定，且随删除成功上行自然衰减；全新空环境无基线时全量回放行为不变）
- [x] task-02: 回归用例红→绿：progress 409/熔断不再阻断 spec 树 delete op 上行（spec 树与 progress 六表是独立通道，冲突分流不互相封锁）
- [x] task-03: 回归用例红→绿：mergeProbeSection 不再携载 :---/—/待填 等占位与分隔形态行（合法键漂移已填行仍携载且带归属注释）；extractAcceptanceMatrixSlots 对无表头归属的孤行不再栽给最近 task 锚行，改为独立「孤行」报错要求裁决删除或补归属
- [x] task-04: 回归用例红→绿：快照失败分支带出结构化原因（pnpm 布局/变更文件集为空三分成因/junction 失败/worktree 异常详情），两处调用方文案替换硬编码；--done 路径把 usedSnapshot 降级事实落进结果记录
- [x] task-05: 三端兼容 Windows/Linux/macOS；既有相关测试全绿（sync/spec-sync/pull-spec-bundle/verify-papercuts/acceptance-matrix-gate/verify-gate-snapshot 族）
