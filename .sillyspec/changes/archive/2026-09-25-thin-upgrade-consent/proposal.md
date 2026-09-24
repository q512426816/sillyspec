---
author: flow-machine-draft
created_at: 2026-09-24T17:41:52.764Z
---
# 提案书（Proposal）— 2026-09-25-thin-upgrade-consent

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:4d1a4567bc8dc9a321771e739a55a60d66a0619fe1daa3d97cf5aa49095b2fb5:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
任务原话转写：动机：R16 实测暴露——复杂度预判是 advisory，但 agent 把建议当指令自行升厚转完整流程，用户毫不知情。升厚=成本数倍的资源决策，必须用户点头才转。
成功标准：
- 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未带 --upgrade-thick 时拒跑 exit 2 并指路（征得同意带 flag 重跑 / 未确认回薄道）；带 flag 才落 legacy_fallback 且留痕同意时点
- flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照办式表述）
- agents-instruction 规则同步（升厚需用户同意）
- 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:70a021a2753f262fade384986dd09fdebd8858704d8ed4c260799f6c5643fb5f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未带 --upgrade-thick 时拒跑 exit 2 并指路（征得同意带 flag 重跑 / 未确认回薄道）；带 flag 才落 legacy_fallback 且留痕同意时点
2. flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照办式表述）
3. agents-instruction 规则同步（升厚需用户同意）
4. 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:4c757e50f6b18c219877c6a5c28bb8a4008647e42fa3fb52e0144912744f2e6b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
1. 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未带 --upgrade-thick 时拒跑 exit 2 并指路（征得同意带 flag 重跑 / 未确认回薄道）；带 flag 才落 legacy_fallback 且留痕同意时点
2. flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照办式表述）
3. agents-instruction 规则同步（升厚需用户同意）
4. 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
