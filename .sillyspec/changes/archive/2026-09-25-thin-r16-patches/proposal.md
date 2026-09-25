---
author: flow-machine-draft
created_at: 2026-09-25T04:09:24.336Z
---
# 提案书（Proposal）— 2026-09-25-thin-r16-patches

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:6c96bddfd9d128cbccf8fa2fc7b2d04e898fdef3e2e94914f20ea0fba8ff0520:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
任务原话转写：动机：R16 三遗留收口——patch 冻结面漏未提交代码（P2：agent 提交晚于 done，冻结件只有治理件）；评审对已披露取舍偏钝（乱序边界被默认放行）；verify-result 断点续跑实测面失忆（HEAD 半已修，实测面未回填）。
成功标准：
- patch 冻结面双修：flow start 简报钉死交付代码先提交再 done；会话专属 worktree 判定下未提交 dirty 交付面一并入冻结，共享主仓则打未提交警告
- 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与否与理由，未裁决视为未审，不可接受边界按发现分级上报
- ledger 子步断点续跑 skip 时从 verify-runs 最近 test-result 回填实测面摘要（回执不失忆）
- 新增测试覆盖三件；flow 系全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:ba0343d8e4acb59aecdba21eb86e2e5c33b8952b34365179440b595ffa9c9ced:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. patch 冻结面双修：flow start 简报钉死交付代码先提交再 done；会话专属 worktree 判定下未提交 dirty 交付面一并入冻结，共享主仓则打未提交警告
2. 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与否与理由，未裁决视为未审，不可接受边界按发现分级上报
3. ledger 子步断点续跑 skip 时从 verify-runs 最近 test-result 回填实测面摘要（回执不失忆）
4. 新增测试覆盖三件；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:d3e31085c1efb618117bea9faa400bb45d97ec2b828c9828b3e8d295f8aca80c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
1. patch 冻结面双修：flow start 简报钉死交付代码先提交再 done；会话专属 worktree 判定下未提交 dirty 交付面一并入冻结，共享主仓则打未提交警告
2. 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与否与理由，未裁决视为未审，不可接受边界按发现分级上报
3. ledger 子步断点续跑 skip 时从 verify-runs 最近 test-result 回填实测面摘要（回执不失忆）
4. 新增测试覆盖三件；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
