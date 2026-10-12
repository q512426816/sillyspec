---
author: flow-machine-draft
created_at: 2026-10-12T12:45:51.186Z
---
# 需求规格（Requirements）— 2026-10-12-approve-channel-attest

## 功能需求

### FR-01: flow approve 新增两种显式 attest 通道：--user-confirmed（agent 转述用户已确认）/ --self-approved（agent 自批如实声明）；无 flag 默认路径行为不变（零破坏）但按 unattested 留痕并打印警示

- flow approve **必须**接受互斥 flag `--user-confirmed`（agent 转述用户已确认方案）与 `--self-approved`（agent 自批如实声明），二者同给时**必须**拒绝执行（exit 2）；不带 flag 的默认路径**必须**保持既有行为成功留痕（零破坏），channel 按 `unattested` 落盘并在输出中打印警示（评审/审计无法区分用户确认与 agent 自批）。带 flag 路径**必须**在输出中明示所声明通道；`--self-approved` **必须**附带自批警示与撤销指引（flow reject）。

#### 场景：主路径

Given 在途变更存在；When 分别运行 `flow approve`（无 flag）/ `--user-confirmed` / `--self-approved`；Then 三次均 exit 0，flow-state 的 `spec_approved_channel` 依次为 `unattested` / `user-confirmed` / `agent-self`，`spec_attested_by` 在带 flag 时为当前会话身份、无 flag 时缺省；无 flag 输出含「unattested」警示行，`--self-approved` 输出含自批警示行。

#### 场景：互斥校验

When 同时给 `--user-confirmed --self-approved`；Then exit 2，flow-state 不变。

### FR-02: flow-state 新增 spec_approved_channel / spec_attested_by 字段，flow done 收口输出回显 channel（agent-self 与 unattested 醒目标注）

- flow approve **必须**把通道写入 flow-state 新键 `spec_approved_channel`（三态封闭集：`user-confirmed` / `agent-self` / `unattested`）与 `spec_attested_by`（带 flag 时的声明者身份）；flow done 收口时**必须**回显批准 channel 一行——`agent-self` 与 `unattested` 用警示标记（⚠️）醒目输出，`user-confirmed` 常规输出；flow-telemetry.jsonl **必须**新增 `approveChannel` 字段（历史变更无 channel 记 `unattested-legacy`）。既有键 `spec_approved` 的收口硬门判据语义**禁止**变化。

#### 场景：收口回显

Given 变更以 `--self-approved` 批准且其余门全过；When `flow done`；Then 输出含 channel=agent-self 的 ⚠️ 回显行，遥测行含 `"approveChannel":"agent-self"`，收口正常完成。

### FR-03: 新增 flow reject --reason <文本>：写 spec_rejected/spec_rejected_at/spec_rejected_reason 并撤销既有 spec_approved；存在 spec_rejected 记录时，approve 不带显式 attest flag 直接拒绝执行（exit 2，提示拒绝后派生授权须 --user-confirmed 或 --self-approved 显式再确认）

- 新增 `flow reject` 子命令：`--reason <文本>` **必须**非空（空/缺失 exit 2），执行时**必须**写 `spec_rejected: true` / `spec_rejected_at` / `spec_rejected_reason` / `spec_rejected_by`（会话身份），并把既有 `spec_approved` 撤销为 `false`（flow done 机器门随之重新拦收）。flow-state 存在未再确认的 `spec_rejected` 记录时，`flow approve` 不带显式 attest flag **必须**拒绝执行（exit 2）并提示「拒绝后派生授权须显式通道再确认」；带显式通道放行时**必须**写 `spec_rejected_superseded_at` 时间戳保序可审计（`spec_rejected*` 历史字段保留不删）。

#### 场景：拒绝撤销

Given 变更已 approve；When `flow reject --reason 方案不对`；Then exit 0，`spec_approved` 变 false、`spec_rejected: true`、reason 落盘；再跑 `flow approve`（无 flag）→ exit 2 拒绝。

#### 场景：显式再确认

Given 上例拒绝态；When `flow approve --user-confirmed`；Then exit 0，`spec_approved: true`、`spec_approved_channel: user-confirmed`、`spec_rejected_superseded_at` 在场，`spec_rejected_reason` 仍保留。

### FR-04: 新增单测覆盖：三通道留痕字段 / reject 撤销 / reject 后无 flag 拒绝 / reject 后显式通道放行 / 既有无 flag 路径回归

- **必须**新增 `test/approve-channel-attest.test.mjs` 覆盖上述五态（三通道留痕、reject 撤销、拒后无 flag 拒绝、拒后显式通道放行、无 flag 默认路径回归），全部走真实 CLI（spawnSync）断言 exit 码 + flow-state 字段；相关既有测试族（flow-protocol / check-approval-status）**必须**保持全绿。

#### 场景：主路径

When `node --test test/approve-channel-attest.test.mjs test/flow-protocol.test.mjs test/check-approval-status.test.mjs`；Then 全部 pass。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/approve-channel-attest.test.mjs「三通道留痕与互斥校验」
FR-02: test/approve-channel-attest.test.mjs「approveChannelOf 单元——flow done 回显与遥测同源取值（三态/legacy 归一/autopilot）」
FR-03: test/approve-channel-attest.test.mjs「reject 撤销与拒后派生授权硬拦」
FR-04: test/approve-channel-attest.test.mjs「五态全绿 + 既有族回归」
