---
author: flow-machine-draft
created_at: 2026-10-12T12:45:51.186Z
---
# 提案书（Proposal）— 2026-10-12-approve-channel-attest

## 动机

任务原话转写：dogfood 实证驱动（2026-10-10~12 fire-equipment 会话复盘，子代理取证）：8 次 flow approve 中 2 次为 agent 自批，其中一次发生在用户明确拒绝方案之后（agent 把用户重复催促反读为授权）；且 flow-state 留痕层面用户真批转述与 agent 自批不可区分（spec_approved_by 恒为 agent session id）。approve 信任模型需要：channel 如实留痕 + 拒绝后派生授权有牙。

成功标准：
- flow approve 新增两种显式 attest 通道：--user-confirmed（agent 转述用户已确认）/ --self-approved（agent 自批如实声明）；无 flag 默认路径行为不变（零破坏）但按 unattested 留痕并打印警示
- flow-state 新增 spec_approved_channel / spec_attested_by 字段，flow done 收口输出回显 channel（agent-self 与 unattested 醒目标注）
- 新增 flow reject --reason <文本>：写 spec_rejected/spec_rejected_at/spec_rejected_reason 并撤销既有 spec_approved；存在 spec_rejected 记录时，approve 不带显式 attest flag 直接拒绝执行（exit 2，提示拒绝后派生授权须 --user-confirmed 或 --self-approved 显式再确认）
- 新增单测覆盖：三通道留痕字段 / reject 撤销 / reject 后无 flag 拒绝 / reject 后显式通道放行 / 既有无 flag 路径回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. flow approve 新增两种显式 attest 通道：--user-confirmed（agent 转述用户已确认）/ --self-approved（agent 自批如实声明）；无 flag 默认路径行为不变（零破坏）但按 unattested 留痕并打印警示
2. flow-state 新增 spec_approved_channel / spec_attested_by 字段，flow done 收口输出回显 channel（agent-self 与 unattested 醒目标注）
3. 新增 flow reject --reason <文本>：写 spec_rejected/spec_rejected_at/spec_rejected_reason 并撤销既有 spec_approved；存在 spec_rejected 记录时，approve 不带显式 attest flag 直接拒绝执行（exit 2，提示拒绝后派生授权须 --user-confirmed 或 --self-approved 显式再确认）
4. 新增单测覆盖：三通道留痕字段 / reject 撤销 / reject 后无 flag 拒绝 / reject 后显式通道放行 / 既有无 flag 路径回归

## 成功标准（可验证）

1. flow approve 新增两种显式 attest 通道：--user-confirmed（agent 转述用户已确认）/ --self-approved（agent 自批如实声明）；无 flag 默认路径行为不变（零破坏）但按 unattested 留痕并打印警示
2. flow-state 新增 spec_approved_channel / spec_attested_by 字段，flow done 收口输出回显 channel（agent-self 与 unattested 醒目标注）
3. 新增 flow reject --reason <文本>：写 spec_rejected/spec_rejected_at/spec_rejected_reason 并撤销既有 spec_approved；存在 spec_rejected 记录时，approve 不带显式 attest flag 直接拒绝执行（exit 2，提示拒绝后派生授权须 --user-confirmed 或 --self-approved 显式再确认）
4. 新增单测覆盖：三通道留痕字段 / reject 撤销 / reject 后无 flag 拒绝 / reject 后显式通道放行 / 既有无 flag 路径回归
