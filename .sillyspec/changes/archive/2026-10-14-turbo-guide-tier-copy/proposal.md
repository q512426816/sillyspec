---
author: flow-machine-draft
created_at: 2026-10-14T01:04:21.966Z
---
# 提案书（Proposal）— 2026-10-14-turbo-guide-tier-copy

## 动机

任务原话转写：评审 P3 清偿：--turbo --thick 同给时 start 极速指引行只查 flag 不查 tier（flow.js:662/:1028），该 combo 下 done 实际全量仪式（D-007）但文案仍承诺「自动跳过」——cli-copy-selfsufficient② 文案漂移。顺带清 three 便宜测试债：dirty 降 advisory 行为断言、ui 探针跳过行断言、turbo 值损坏/flow-state 损坏 fail-soft 断言。

成功标准：
- --turbo --thick 同给时 start 不再输出「收口自动跳过实测与重仪式门」承诺，改输出档位如实文案（thick 起步走全量仪式）；--turbo 且 thin 时承诺文案照旧
- turbo done 输出含 ui 探针跳过留痕行；带未提交交付缺口时 turbo 降 advisory 放行（exit 0）而非 turbo 同场景阻断（exit≠0 三选一）
- flow-state turbo 值损坏（非布尔 true）时 done 走非 turbo 全量路径；flow-state.yaml 整体损坏时 done exit 2 报「无 flow-state」并指路
- 新增断言全绿 + 全量测试核心套回归零失败

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. --turbo --thick 同给时 start 不再输出「收口自动跳过实测与重仪式门」承诺，改输出档位如实文案（thick 起步走全量仪式）；--turbo 且 thin 时承诺文案照旧
2. turbo done 输出含 ui 探针跳过留痕行；带未提交交付缺口时 turbo 降 advisory 放行（exit 0）而非 turbo 同场景阻断（exit≠0 三选一）
3. flow-state turbo 值损坏（非布尔 true）时 done 走非 turbo 全量路径；flow-state.yaml 整体损坏时 done exit 2 报「无 flow-state」并指路
4. 新增断言全绿 + 全量测试核心套回归零失败

## 成功标准（可验证）

1. --turbo --thick 同给时 start 不再输出「收口自动跳过实测与重仪式门」承诺，改输出档位如实文案（thick 起步走全量仪式）；--turbo 且 thin 时承诺文案照旧
2. turbo done 输出含 ui 探针跳过留痕行；带未提交交付缺口时 turbo 降 advisory 放行（exit 0）而非 turbo 同场景阻断（exit≠0 三选一）
3. flow-state turbo 值损坏（非布尔 true）时 done 走非 turbo 全量路径；flow-state.yaml 整体损坏时 done exit 2 报「无 flow-state」并指路
4. 新增断言全绿 + 全量测试核心套回归零失败
