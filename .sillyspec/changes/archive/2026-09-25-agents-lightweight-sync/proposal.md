---
author: flow-machine-draft
created_at: 2026-09-25T09:24:23.411Z
---
# 提案书（Proposal）— 2026-09-25-agents-lightweight-sync

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:aa93e7d7e6a8bdce49c48777be36182763cf2940cad1eca68e6bfe2166a05f37:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
任务原话转写：动机：本仓 AGENTS.md（sillyspec init v3.28.3 生成）仍持旧选道口径——第 3 条附注称 flow start/done 为实验通道（local.yaml flow.mode: thin 显式开启）不作默认，第 4/6/7 条把小修复指向 quick、倒推 B 模式指 quick --done；而 2026-09-25-thin-default-flip 已把 flow.mode 缺省翻为 thin（入口归一，quick 退役第 1 步），templates/agents-instruction.md 已更新为轻量变更默认快道口径。本仓指引与 CLI 实际行为及最新模板不一致，agent 按旧指引会继续走退役中的 quick 道。
成功标准：
- AGENTS.md 第 3 条附注不再称 flow 为实验通道/需显式开启，改述为轻量变更默认快道（缺省 thin，legacy 显式回旧道）
- 第 4/6/7 条选道与倒推 B 模式改指轻量变更（flow start --input → flow done），quick 标注为存量过渡通道（退役中，新工作不再用）
- 第 15 条 quicklog 落盘补存量通道定位括注（新工作不再产生 quicklog 条目）
- 除上述口径同步外，AGENTS.md 其余条目（含本仓专属第 16-19 条纪律）逐字不动
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:8786191ee41fc787d30e3ecb43a9002cca50d0033ab12a1a6eae7a45c3ba1aec:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. AGENTS.md 第 3 条附注不再称 flow 为实验通道/需显式开启，改述为轻量变更默认快道（缺省 thin，legacy 显式回旧道）
2. 第 4/6/7 条选道与倒推 B 模式改指轻量变更（flow start --input → flow done），quick 标注为存量过渡通道（退役中，新工作不再用）
3. 第 15 条 quicklog 落盘补存量通道定位括注（新工作不再产生 quicklog 条目）
4. 除上述口径同步外，AGENTS.md 其余条目（含本仓专属第 16-19 条纪律）逐字不动
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:2302882f430361bde1e2abe6b44921b7fc759ba8db763503aa84f9c475781aec:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
1. AGENTS.md 第 3 条附注不再称 flow 为实验通道/需显式开启，改述为轻量变更默认快道（缺省 thin，legacy 显式回旧道）
2. 第 4/6/7 条选道与倒推 B 模式改指轻量变更（flow start --input → flow done），quick 标注为存量过渡通道（退役中，新工作不再用）
3. 第 15 条 quicklog 落盘补存量通道定位括注（新工作不再产生 quicklog 条目）
4. 除上述口径同步外，AGENTS.md 其余条目（含本仓专属第 16-19 条纪律）逐字不动
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
