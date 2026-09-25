---
author: flow-machine-draft
created_at: 2026-09-25T06:04:13.840Z
---
# 需求规格（Requirements）— 2026-09-25-flow-tick-prototype

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 勾选纪律与产物必读
Given 轻量变更执行期
When fresh 或 adopt 路径启动
Then 简报含勾选纪律、adopt 列产物必读清单、status 显勾选进度
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: fresh 与 adopt 简报加任务勾选纪律：干活时逐条勾选 tasks.md 的 - [ ] task-NN → [x]（勾选=收口哨兵证据面；全勾无证据会被拒收）
FR-02: adopt 简报动态枚举变更目录实际产物（design.md/decisions.md/proposal.md/requirements.md/prototypes/*.html/*.md）为必读列表——原型显式点名必看必用
FR-03: flow status 显示 tasks.md 勾选进度（checked/total）
FR-04: flow done 收口 advisory：有 tasks 且全未勾但有交付提交时提醒（不阻断——不勾选是记账缺失非假勾）
FR-05: 测试：简报勾选纪律断言/adopt 产物列举断言/status 勾选显示/收口 advisory 三面
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-tick-prototype.test.mjs 三用例（勾选纪律/产物枚举/缺失 advisory）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-tick-prototype.test.mjs 三用例（勾选纪律/产物枚举/缺失 advisory）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-tick-prototype.test.mjs 三用例（勾选纪律/产物枚举/缺失 advisory）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-tick-prototype.test.mjs 三用例（勾选纪律/产物枚举/缺失 advisory）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-tick-prototype.test.mjs 三用例（勾选纪律/产物枚举/缺失 advisory）
