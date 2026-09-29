---
author: flow-machine-draft
created_at: 2026-09-29T06:51:24.318Z
---
# 提案书（Proposal）— 2026-09-29-flow-skill-heartbeat-doc

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:03c80fa02c19ccf9ca8d38ab9b03fe086d4cb30e9d270709a8b4fa4eb5b72a19:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-skill-heartbeat-doc 留痕重锚 -->
任务原话转写：动机：flow skill 文档（.claude/skills/sillyspec-flow/SKILL.md）的勾选口径停在旧版——41 行「干活时逐条勾」未含心跳循环协议，54 行「flow status 随时查看」未提节拍器语义。2026-09-29-flow-task-heartbeat 已把 flow status 升为执行期节拍器（②阶段给下一任务指针+进度+循环指引），skill 文档面需同步，否则 agent 按旧口径干活仍会一把勾。纯 doc 变更，测试门自动跳过。

成功标准：
- SKILL.md ②节勾选行改为心跳循环口径（做一件→勾一格→重跑 flow status 取下一个；全勾后 flow done）
- SKILL.md 边界节中断恢复行补节拍器语义（②执行阶段 status 给下一任务指针与进度）
- 其余内容零改动
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:86ce95a6fba5f0bf9ca63c9b40163e16f18cc0d0c2c76a011bdb308fbaf2ff9c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-skill-heartbeat-doc 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. SKILL.md ②节勾选行改为心跳循环口径（做一件→勾一格→重跑 flow status 取下一个
2. 全勾后 flow done）
3. SKILL.md 边界节中断恢复行补节拍器语义（②执行阶段 status 给下一任务指针与进度）
4. 其余内容零改动
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7de035f1d42dc9034f6b330088f66fb37dbef261b17bf5ef5dbb47069c93a246:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-skill-heartbeat-doc 留痕重锚 -->
1. SKILL.md ②节勾选行改为心跳循环口径（做一件→勾一格→重跑 flow status 取下一个
2. 全勾后 flow done）
3. SKILL.md 边界节中断恢复行补节拍器语义（②执行阶段 status 给下一任务指针与进度）
4. 其余内容零改动
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
