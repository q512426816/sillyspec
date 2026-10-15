---
author: flow-machine-draft
created_at: 2026-10-15T02:26:13.257Z
---
# 提案书（Proposal）— 2026-10-15-classify-surface

## 动机

任务原话转写：效果评估实证：knowledge classify 工具在位（uncategorized 条目归类迁移四步动作+审计遥测齐全）但遥测零消费——入口隐身是根因：digest 收件箱信号只在 >20 积压时报警，1~20 条常态化静默，classify 永不出现在治理视野。修法：digest 增 info 级收件箱提示（1~20 条给 inbox 信号+classify 可执行命令行 inbox 看清单→classify --ql --file 逐条归类），healthy 语义同步收窄为只看 warn 级（info 是提示不是超阈，低量收件箱不该把治理卡打成告警面）；渲染面 warn/info 分区。

成功标准：
- 收件箱 1~20 条时 digest 出 info 级 inbox 信号且带 classify 命令建议，healthy 保持 true
- 收件箱 >20 时仍 warn 级且 healthy=false（既有阈值语义不变）；空收件箱零信号
- 渲染面 warn/info 分区，既有 digest 测试零回归+新增断言全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 收件箱 1~20 条时 digest 出 info 级 inbox 信号且带 classify 命令建议，healthy 保持 true
2. 收件箱 >20 时仍 warn 级且 healthy=false（既有阈值语义不变）；空收件箱零信号
3. 渲染面 warn/info 分区，既有 digest 测试零回归+新增断言全绿

## 成功标准（可验证）

1. 收件箱 1~20 条时 digest 出 info 级 inbox 信号且带 classify 命令建议，healthy 保持 true
2. 收件箱 >20 时仍 warn 级且 healthy=false（既有阈值语义不变）；空收件箱零信号
3. 渲染面 warn/info 分区，既有 digest 测试零回归+新增断言全绿
