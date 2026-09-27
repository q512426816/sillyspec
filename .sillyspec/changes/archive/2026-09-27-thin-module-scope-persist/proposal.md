---
author: flow-machine-draft
created_at: 2026-09-27T13:09:56.350Z
---
# 提案书（Proposal）— 2026-09-27-thin-module-scope-persist

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:9c42a205682e7f207a250e3bf6480eb05c6e31223603cd9d1fbcc795778e2b9f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
任务原话转写：动机：平台侧（SillyHub 变更详情卡）要展示轻量变更的影响模块范围，但 flow done 时 reconcileModuleDocs 已算出的模块命中结果只打 console 不落盘，平台读不到、只能自建重算口径（两套口径会漂移）。
成功标准：
- flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块 id/命中文件数/文档相对路径/文档是否随变更更新，及未登记模块目录清单）
- 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）
- 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口
- 有测试锁定结构化落盘行为与向后兼容行为
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:64580dab17612e583946154ef577c7d99d3a325f981b6541c00cee755acd82bf:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块 id/命中文件数/文档相对路径/文档是否随变更更新，及未登记模块目录清单）
2. 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）
3. 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口
4. 有测试锁定结构化落盘行为与向后兼容行为
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:8892dd36cc1c1346de1e55677eaea92c8f06009901cc09e69619975fc5230fda:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-thin-module-scope-persist 留痕重锚 -->
1. flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块 id/命中文件数/文档相对路径/文档是否随变更更新，及未登记模块目录清单）
2. 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）
3. 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口
4. 有测试锁定结构化落盘行为与向后兼容行为
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
