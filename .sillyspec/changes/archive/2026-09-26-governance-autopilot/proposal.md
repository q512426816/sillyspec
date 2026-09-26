---
author: flow-machine-draft
created_at: 2026-09-26T09:20:26.198Z
---
# 提案书（Proposal）— 2026-09-26-governance-autopilot

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:4d5b815606a3a37f23bb05fd95426c5d347a175fad6c96c91a5df4a09e0d13ae:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
任务原话转写：动机：R20 实证 thin 比 OS 多 38 轮全部来自治理工件的交互开销（Edit +12/Read +5/Write +3/Bash +10/TodoWrite +4 = +34 次工具操作均匀分布在全程，每次全上下文重读 150K+）——本质是 agent 手工做机器能推断的事。修法三条：机器推断+单次确认取代 agent 手工操作。
成功标准：
- 自动勾选（flow done ledger 子步）：哨兵检查前，解析区间提交的 task-NN token 自动勾选 tasks.md 对应未勾条目（有证据但未勾=漏账非假勾——机器代勾，agent 零手工编辑 tasks.md）
- 自动绑定填充（flow done artifacts 子步）：绑定槽校验前，从实测结果（test-result.json / gate 面）提取实际执行的测试文件路径自动填入空绑定槽（agent 可覆盖已填的；空槽自动补全不再拒收）
- FR 区机器预填 GWT（flow start draftAll）：requirements FR 区不再留空——从成功标准自动生成 Given/When/Then 骨架（Given=系统默认态 When=标准描述的动作 Then=标准描述的预期），agent 可覆盖——空槽拒收降为「骨架已预填可编辑」
- 三条均向后兼容（已有 agent 填写的内容不覆盖）
- 测试：自动勾选（token 有但未勾→代勾）/自动绑定（空槽+测试结果→补全）/GWT 预填（成功标准→骨架在场）+ 既有套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:a085465a61aabcc80779903db81ba06b2a329087c9bf4748e0075ddc24697b59:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. 自动勾选（flow done ledger 子步）：哨兵检查前，解析区间提交的 task-NN token 自动勾选 tasks.md 对应未勾条目（有证据但未勾=漏账非假勾——机器代勾，agent 零手工编辑 tasks.md）
2. 自动绑定填充（flow done artifacts 子步）：绑定槽校验前，从实测结果（test-result.json / gate 面）提取实际执行的测试文件路径自动填入空绑定槽（agent 可覆盖已填的
3. 空槽自动补全不再拒收）
4. FR 区机器预填 GWT（flow start draftAll）：requirements FR 区不再留空——从成功标准自动生成 Given/When/Then 骨架（Given=系统默认态 When=标准描述的动作 Then=标准描述的预期），agent 可覆盖——空槽拒收降为「骨架已预填可编辑」
5. 三条均向后兼容（已有 agent 填写的内容不覆盖）
6. 测试：自动勾选（token 有但未勾→代勾）/自动绑定（空槽+测试结果→补全）/GWT 预填（成功标准→骨架在场）+ 既有套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:f9950c54a882c516d9059f5e621952680d0e2129ba645b8957318612636aa74f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
1. 自动勾选（flow done ledger 子步）：哨兵检查前，解析区间提交的 task-NN token 自动勾选 tasks.md 对应未勾条目（有证据但未勾=漏账非假勾——机器代勾，agent 零手工编辑 tasks.md）
2. 自动绑定填充（flow done artifacts 子步）：绑定槽校验前，从实测结果（test-result.json / gate 面）提取实际执行的测试文件路径自动填入空绑定槽（agent 可覆盖已填的
3. 空槽自动补全不再拒收）
4. FR 区机器预填 GWT（flow start draftAll）：requirements FR 区不再留空——从成功标准自动生成 Given/When/Then 骨架（Given=系统默认态 When=标准描述的动作 Then=标准描述的预期），agent 可覆盖——空槽拒收降为「骨架已预填可编辑」
5. 三条均向后兼容（已有 agent 填写的内容不覆盖）
6. 测试：自动勾选（token 有但未勾→代勾）/自动绑定（空槽+测试结果→补全）/GWT 预填（成功标准→骨架在场）+ 既有套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
