---
author: flow-machine-draft
created_at: 2026-10-12T12:45:51.186Z
---
# 任务注册表（Tasks）— 2026-10-12-approve-channel-attest

- [x] task-01: flow.js cmdFlowApprove 通道化——--user-confirmed/--self-approved 互斥解析（分派层）、unattested 默认留痕+警示、spec_approved_channel/spec_attested_by 落盘
- [x] task-02: cmdFlowReject 新增（--reason 必填、撤销 spec_approved）+ 拒后派生授权硬拦（spec_rejected 在场无显式通道 exit 2）+ flow done channel 回显与 approveChannel 遥测
- [x] task-03: 新增 test/approve-channel-attest.test.mjs 五态（三通道留痕/互斥/reject 撤销/拒后无 flag 拒/拒后显式放行）跑绿 + flow-protocol、check-approval-status 回归族全绿
