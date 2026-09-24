---
author: qinyi
created_at: 2026-09-24 14:10:00
---
# 任务注册表（Tasks）— 2026-09-24-fr-test-readside

## Wave 1（核心，无依赖）
- [x] task-01: 锚点集+残差计算+悬空硬错——resolveVerifyAnchorSet/
  resolveTraceResidual（active/非 superseded/锚命中过滤，orphan·candidate 不进）+
  门入口 fail-fast；单测。
- [x] task-02: 残差执行段——runTraceResidual 复用 buildDepsBatches 组卷口径
  （node --test/pytest 前缀；无法归一硬错）；单测。

## Wave 2（接线，依赖 W1）
- [x] task-03: 执行矩阵合并——5 动作×trace 空/非空（skip 类→跑 trace；其余主跑+
  补），结果 mode 附 +trace(N)、失败透传；trace 空零漂移回归钉；单测。
- [x] task-04: 披露 sidecar——verify-trace-disclosure.json（锚点/行映射/可证来源/
  残差清单）+console 摘要行；单测。
- [x] task-05: 账本停复用护栏——gates.js verify 门 consult/record 前查 trace
  非空即跳过；单测。

## Wave 3（验证门）
- [x] task-06: 全量验证——test:core+新测试入清单全绿+lint+dogfood（本变更自身
  verify 即残差路径实跑）。
