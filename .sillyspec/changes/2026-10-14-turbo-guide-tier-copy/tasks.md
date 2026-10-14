---
author: flow-machine-draft
created_at: 2026-10-14T01:04:21.966Z
---
# 任务注册表（Tasks）— 2026-10-14-turbo-guide-tier-copy

- [x] task-01: --turbo --thick 同给时 start 不再输出「收口自动跳过实测与重仪式门」承诺，改输出档位如实文案（thick 起步走全量仪式）；--turbo 且 thin 时承诺文案照旧
- [x] task-02: turbo done 输出含 ui 探针跳过留痕行；带未提交交付缺口时 turbo 降 advisory 放行（exit 0）而非 turbo 同场景阻断（exit≠0 三选一）
- [x] task-03: flow-state turbo 值损坏（非布尔 true）时 done 走非 turbo 全量路径；flow-state.yaml 整体损坏时 done exit 2 报「无 flow-state」并指路
- [x] task-04: 新增断言全绿 + 全量测试核心套回归零失败
