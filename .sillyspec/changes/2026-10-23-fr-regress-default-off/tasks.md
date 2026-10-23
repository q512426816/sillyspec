---
author: flow-machine-draft
created_at: 2026-10-23T00:57:47.163Z
---
# 任务注册表（Tasks）— 2026-10-23-fr-regress-default-off

- [x] task-01: readFrRegressCap v2（缺省/坏值/不可读→0；off→0；N→N；all→null；CRLF 保留）——验证：unit 五态
- [x] task-02: 披露行开启指引+动态子集信息行按实际组面描述+flow start 横幅文案同步——验证：文本锚
- [x] task-03: 本仓 local.yaml 移除键留痕；fr-priority-overlap 夹具显式 all；fr-regress-cap 测试随 v2 更新——验证：两套件+verify-dynamic-subset 全绿
- [x] task-04: 既有面回归批跑（verify 族+本会话新增六套件抽验）全绿——验证：node --test 批跑
