---
author: flow-machine-draft
created_at: 2026-09-24T16:40:05.518Z
---
# 提案书（Proposal）— 2026-09-25-thin-brainstorm-prestage

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:cc447dd7cdb331234a6183b48fd9713db73aa7e8369b808fa8d645be3d7fc432:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
任务原话转写：动机：头脑风暴保留为薄流程预段——需求不清晰时先进 brainstorm 出设计与原型，产出被 flow start 收编后续跑薄道实现归档；指令面（agents-instruction 模板与 SKILL.md）同步新流程拓扑。
成功标准：
- flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时 exit 2 并给两选一（头脑风暴预段 / 补成功标准重跑）；重入与 adopt 路径不受此门影响
- adopt 收编：变更目录存在 brainstorm 产物（proposal/design 在场）且无 flow-state 时，flow start 收编进薄道——写 flow-state（adopted_from=brainstorm）、redraft 只补缺件（criteria 从 proposal 成功标准回提）、requirements 无测试绑定槽则机器追加绑定节
- flow done 对 adopted 变更豁免 design 四节槽门（brainstorm 设计更丰富，打印豁免说明）；绑定门不豁免
- agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口
- 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:407fc71af1fb55b5edcb79f0d03a485f21d5c75ef9baa058ba146c8561958c1c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时 exit 2 并给两选一（头脑风暴预段 / 补成功标准重跑）；重入与 adopt 路径不受此门影响
2. adopt 收编：变更目录存在 brainstorm 产物（proposal/design 在场）且无 flow-state 时，flow start 收编进薄道——写 flow-state（adopted_from=brainstorm）、redraft 只补缺件（criteria 从 proposal 成功标准回提）、requirements 无测试绑定槽则机器追加绑定节
3. flow done 对 adopted 变更豁免 design 四节槽门（brainstorm 设计更丰富，打印豁免说明）；绑定门不豁免
4. agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口
5. 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:0b399b2a3dd3b7dba56f5ec61dbbe15230af91b5c7500d5dccb650e12a7144bd:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
1. flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时 exit 2 并给两选一（头脑风暴预段 / 补成功标准重跑）；重入与 adopt 路径不受此门影响
2. adopt 收编：变更目录存在 brainstorm 产物（proposal/design 在场）且无 flow-state 时，flow start 收编进薄道——写 flow-state（adopted_from=brainstorm）、redraft 只补缺件（criteria 从 proposal 成功标准回提）、requirements 无测试绑定槽则机器追加绑定节
3. flow done 对 adopted 变更豁免 design 四节槽门（brainstorm 设计更丰富，打印豁免说明）；绑定门不豁免
4. agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口
5. 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
