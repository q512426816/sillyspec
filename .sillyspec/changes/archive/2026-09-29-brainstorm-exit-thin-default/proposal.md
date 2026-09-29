---
author: flow-machine-draft
created_at: 2026-09-28T23:27:08.939Z
---
# 提案书（Proposal）— 2026-09-29-brainstorm-exit-thin-default

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:5fa0228aeefcf454496f61e8ea6cd40e621bfa81c94fb258c69d58c686960f40:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
任务原话转写：头脑风暴出口默认收编轻量道：判据轴从文件数换成复杂度/上下文轴。

动机：用户原始问题的另一半——实测头脑风暴完成后 agent 直奔 plan/execute 五阶段而非转轻量收编。三重厚偏向：① design-init 骨架预填 scale: large（不主动改就是厚）；② Step 8/Step 2 规模判据是文件数轴（≤2 文件才 small——模糊需求探索完很少只碰 2 文件，与选道表第 3 行自己的复杂度措辞不一致）；③ 收口提示「scale=large 或未标 small 走完整 plan」缺省即厚。与 thin-default-flip 哲学相悖（R16：预判反诱发误升厚，升厚留运行时证据＋用户决策）。

成功标准：
- design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规模评估落值）
- Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编排/上下文分片/多阶段治理需求）→ flow start 收编 2 调用收口；large=需要编排/分片/治理或用户显式要求；拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）
- 收口提示翻转：未标/small → flow start 收编；large → run plan
- 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿；行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d12444aed16e9aa5dd55fe459a697e064259c930239430c24550b812047e9350:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规模评估落值）
2. Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编排/上下文分片/多阶段治理需求）→ flow start 收编 2 调用收口
3. large=需要编排/分片/治理或用户显式要求
4. 拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）
5. 收口提示翻转：未标/small → flow start 收编
6. large → run plan
7. 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿
8. 行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7217c834f89e431a299a7562416220dea14bca5efad01ac9aa6daf73c49a4d61:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
1. design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规模评估落值）
2. Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编排/上下文分片/多阶段治理需求）→ flow start 收编 2 调用收口
3. large=需要编排/分片/治理或用户显式要求
4. 拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）
5. 收口提示翻转：未标/small → flow start 收编
6. large → run plan
7. 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿
8. 行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
