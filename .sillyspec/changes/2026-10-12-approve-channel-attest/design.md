---
author: flow-machine-draft
created_at: 2026-10-12T12:45:51.186Z
---
# 设计记录（Design Record）— 2026-10-12-approve-channel-attest

## 做法概述

`cmdFlowApprove`（src/flow.js）增加互斥的 attest 通道参数（`--user-confirmed` / `--self-approved`），批准时把「谁在主张这次批准」作为第一公民字段写进 flow-state（`spec_approved_channel` 三态 + `spec_attested_by`）；无 flag 默认路径行为不变（保平台脚本与既有调用零破坏），按 `unattested` 留痕并打印警示。新增 `cmdFlowReject`（`--reason` 必填）：写 `spec_rejected*` 系字段并把既有 `spec_approved` 撤销为 false（收口机器门随之重新拦收）；`spec_rejected` 在场且未被显式翻越时，approve 无显式通道直接 exit 2——拒绝后派生授权必须有显式再确认（dogfood 实证：用户拒绝方案后 agent 把重复催促反读为授权自批）。flow done 在断点门通过处回显 channel（agent-self/unattested 用 ⚠️），遥测行加 `approveChannel`。

选这个方案而非「防伪」：同机 agent 可伪造任何本地状态（包括 --user-confirmed 主张本身），CLI 层无法验证人机——诚实边界与 `--by` 既有口径一致。价值在于：主张必留痕、通道可区分（用户真批转述 vs agent 自批在审计面不再同形）、拒后有牙。

## 接口契约

- CLI 新 flag：`flow approve --change <名> [--user-confirmed | --self-approved] [--by <署名>]`——两通道互斥，同给 exit 2。
- CLI 新子命令：`flow reject --change <名> --reason <文本>`（reason 必填，空/缺失 exit 2）。
- flow-state.yaml 新键：`spec_approved_channel`（user-confirmed | agent-self | unattested）、`spec_attested_by`、`spec_rejected`、`spec_rejected_at`、`spec_rejected_reason`、`spec_rejected_by`、`spec_rejected_superseded_at`（显式通道翻越拒绝时写，历史拒绝字段保留）。
- flow done 输出新增 channel 回显一行；flow-telemetry.jsonl 每行新增 `approveChannel` 字段（历史变更无 channel 记 `unattested-legacy`）。
- 既有键 `spec_approved` / `spec_approved_at` / `spec_approved_by` 语义与收口硬门判据不变（v2 机器门仍只看 `spec_approved` 真值）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| M | src/flow.js | cmdFlowApprove 通道化 + cmdFlowReject 新增 + 分派/指引文案 + done 回显与遥测 |
| A | test/approve-channel-attest.test.mjs | 五态 CLI 级测试 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   批准/拒绝是人工决策动作，无自动乱序源；「拒绝→显式再确认」序由 `spec_rejected` 在场判定 + `spec_rejected_superseded_at` 时间戳固化，审计面可复原顺序。多次 reject/approve 交替为后写者胜，与既有 spec_approved 面同口径。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   flow-state 落盘走既有 writeAtomicSync + writeFlowState patch 合并（幂等），本变更不新增并发面；并发 approve 后写者胜——channel 取各自时点值，无撕裂态（单文件原子写）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   approve/reject 均为单命令原子落盘，无中间态；reject 撤销采用 `spec_approved: false` 显式值而非删键——任何重入读侧恒见该字段。归档后 change 目录只读，approve/reject 对归档变更仍按既有「变更不存在」口径拒绝。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   全部新字段都在 change 目录的 flow-state.yaml 内，变更级隔离，零跨仓/跨工作区面。`spec_approved_channel` 三态是治理域封闭集（谁在主张批准——非开放世界枚举，不承载内容语义）；开放内容（拒绝理由）走自由文本 `spec_rejected_reason`。

## 风险与死路

最大风险：留痕仍非防伪——同机 agent 可以谎报 `--user-confirmed`。接受：CLI 无法验证人机，价值在必留痕 + 通道可区分 + 评审抽查兜底（与 --by 诚实边界一致）；强凭据属平台层课题（CLI 直连用户问询通道），不与本变更耦合。

试过但放弃：① approve 默认拒绝（无 flag 不放行）——破坏全部既有调用方与平台脚本，收益不成比例，且无 flag 路径已按 unattested 醒目警示；② 批准时 inquirer 交互确认——agent 环境恒非 TTY，等价于默认拒绝同款破坏；③ channel 用自由文本——机器判读与遥测聚合需要封闭三态，自由文本留给 reason 才是对的分工。
