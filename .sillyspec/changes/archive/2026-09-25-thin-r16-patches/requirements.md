---
author: flow-machine-draft
created_at: 2026-09-25T04:09:24.337Z
---
# 需求规格（Requirements）— 2026-09-25-thin-r16-patches

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:140ee4bc4361d2223c884d3bd55b8965340ae2c8f70d27eee4a7e15bd168a6ae:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
### FR-01: patch 冻结面双修：flow start 简报钉死交付代码先提交再 done
Given 平台按当前契约运行
When 本变更交付并运行
Then patch 冻结面双修：flow start 简报钉死交付代码先提交再 done；会话专属 worktree 判定下未提交 dirty 交付面一并入冻结，共享主仓则打未提交警告

### FR-02: 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与
Given 平台按当前契约运行
When 本变更交付并运行
Then 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与否与理由，未裁决视为未审，不可接受边界按发现分级上报

### FR-03: ledger 子步断点续跑 skip 时从 verify-runs 最近 tes
Given 平台按当前契约运行
When 本变更交付并运行
Then ledger 子步断点续跑 skip 时从 verify-runs 最近 test-result 回填实测面摘要（回执不失忆）

### FR-04: 新增测试覆盖三件；flow 系全绿
Given 平台按当前契约运行
When 本变更交付并运行
Then 新增测试覆盖三件；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决（FR 语义改写不走此槽——直接编辑机器段后跑 flow amend-draft 留痕，槽内容不进 FR 索引）——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ⑭（共享警告/独占入面双路径）+ test/flow-protocol.test.mjs ⑥b（wip-dirty 不入冻结面+警告点名+简报钉死断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-review.test.mjs ②（边界裁决条款+未裁决=未审断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ⑮（最近匹配/无匹配 null）+ test/flow-protocol.test.mjs ⑮（回执实测面断言）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst 52 例
