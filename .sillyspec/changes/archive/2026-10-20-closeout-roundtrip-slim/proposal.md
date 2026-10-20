---
author: flow-machine-draft
created_at: 2026-10-20T16:02:36.739Z
---
# 提案书（Proposal）— 2026-10-20-closeout-roundtrip-slim

## 动机

任务原话转写：自会话耗时画像实证（用户裁决：考虑清楚优化好）：收口往返是全量测试外第二大真实成本——①reviewedAgainst 校验整串拒收带注记 sha（评审代理习惯在 sha 后附实测说明），今晚两次被拒各多一轮 flow done+代理往返；②共享仓每变更必撞 dirty-gap 中断再带 flag 重跑一轮。修法：①isAnchorSha 容忍注记——字段含 7-40 位 hex 词元即通过并归一化（字符串/workspace/repos 三处），纯垃圾仍拒；②dirty-gap 中断文案补快速通道指引（脏面全属他会话/残渣且不在本变更交付面时直接 --accept-dirty-gap 重跑，pathspec 提交面已隔离归属）。

成功标准：
- reviewedAgainst 三形态（字符串/workspace/repos 值）含合法 hex 词元+任意注记文本均通过校验且 review 对象内归一化为纯 sha；无 hex 词元仍整串拒收
- dirty-gap 阻断文案含快速通道指引句（属他会话/残渣且非本变更交付面→直接重跑带 --accept-dirty-gap）
- 新增测试锁归一化矩阵与文案锚；变更测试面+lint 绿（新口径，不跑全量）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. reviewedAgainst 三形态（字符串/workspace/repos 值）含合法 hex 词元+任意注记文本均通过校验且 review 对象内归一化为纯 sha；无 hex 词元仍整串拒收
2. dirty-gap 阻断文案含快速通道指引句（属他会话/残渣且非本变更交付面→直接重跑带 --accept-dirty-gap）
3. 新增测试锁归一化矩阵与文案锚；变更测试面+lint 绿（新口径，不跑全量）

## 成功标准（可验证）

1. reviewedAgainst 三形态（字符串/workspace/repos 值）含合法 hex 词元+任意注记文本均通过校验且 review 对象内归一化为纯 sha；无 hex 词元仍整串拒收
2. dirty-gap 阻断文案含快速通道指引句（属他会话/残渣且非本变更交付面→直接重跑带 --accept-dirty-gap）
3. 新增测试锁归一化矩阵与文案锚；变更测试面+lint 绿（新口径，不跑全量）
