---
author: flow-machine-draft
created_at: 2026-09-29T08:47:31.956Z
---
# 提案书（Proposal）— 2026-09-29-watcher-fakecheck-retire

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:35fe61eab36fca5b159a7632b4d19e5745056d4fc414b8b509b4c053309f80c8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
任务原话转写：动机：watcher R1 fake-check 实时警告（「tasks 勾选 task-NN 无对应提交…假勾选嫌疑，人判」）与现行勾选协议系统性冲突——逐格勾选本来就发生在提交之前（提交是交付期动作、review.json 是评审期产物），勾选时刻零证据是正常时序而非嫌疑；真裁决已在收口哨兵（detectFakeCheckCompletion 逐 task 证据）+ 单拍勾选硬门（2026-09-29-batch-tick-gate）。该警告现为纯噪音（每次合法逐格勾选都会闪一条待消解的嫌疑），用户裁决移除。

成功标准：
- ruleFakeCheck 与 fake-check-cleared 消解机制从 watcher.js 移除（含 state.fakeCheckPending 与仅此处使用的 import）；其余 watcher 规则零改动
- watcher-alerts/watcher-timeline/watcher 测试中 fake-check 相关 fixture 与断言适配，全量 npm test + test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:4ec4957dcdf434f9d2fbf2cd4e8f3edea3ca3265eeb6aa0d228e78494fdd7695:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
按成功标准机械推导，共 3 条验收面：
1. ruleFakeCheck 与 fake-check-cleared 消解机制从 watcher.js 移除（含 state.fakeCheckPending 与仅此处使用的 import）
2. 其余 watcher 规则零改动
3. watcher-alerts/watcher-timeline/watcher 测试中 fake-check 相关 fixture 与断言适配，全量 npm test + test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:9f6e32b23371ddafbb94539b3825dc4c55c237d1afcef623599d67d342a2ca39:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
1. ruleFakeCheck 与 fake-check-cleared 消解机制从 watcher.js 移除（含 state.fakeCheckPending 与仅此处使用的 import）
2. 其余 watcher 规则零改动
3. watcher-alerts/watcher-timeline/watcher 测试中 fake-check 相关 fixture 与断言适配，全量 npm test + test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
