---
author: flow-machine-draft
created_at: 2026-09-24T17:50:32.020Z
---
# 提案书（Proposal）— 2026-09-25-thin-parity-assets

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:a0356a346abbb85d229887ac0cf7413b7e4475e27948af87332302fcad35058e:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
任务原话转写：动机：能力/资产对照表终核——四个真缺口收口：模块文档同步对账（厚道 module-impact 死信门的薄道等价物，复利资产最隐蔽缺口）；verify-result 机器回执（人类可读收口结论，厚道有薄道缺）；design 槽4 风险与死路作答蒸馏进 decisions/knowledge（薄变更决策产出为零）；独立评审发现的 P2×2 遥测洞（失败面评审结论不落账、断点续跑不回填）。
成功标准：
- flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列出模块与文档路径，模块代码变更而文档未动给强提示（advisory）
- 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审/绑定/冻结 sha/基线区间），随归档留档
- distill 收割 design 槽4 实质作答合成 decisions.md（已有 decisions 不覆盖），随既有蒸馏链进 knowledge
- 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑 skip 时回填评审结论
- 新增测试四件；flow 系全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:934474a2760ec504a6a70e496ff14cbb8fb3f029460a9165fd29de88d06ad03d:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列出模块与文档路径，模块代码变更而文档未动给强提示（advisory）
2. 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审/绑定/冻结 sha/基线区间），随归档留档
3. distill 收割 design 槽4 实质作答合成 decisions.md（已有 decisions 不覆盖），随既有蒸馏链进 knowledge
4. 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑 skip 时回填评审结论
5. 新增测试四件；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:ed1aedc12363d08ed46b4f142d0f77c35ab24415a646e5dfd2a322ba19bb75ab:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
1. flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列出模块与文档路径，模块代码变更而文档未动给强提示（advisory）
2. 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审/绑定/冻结 sha/基线区间），随归档留档
3. distill 收割 design 槽4 实质作答合成 decisions.md（已有 decisions 不覆盖），随既有蒸馏链进 knowledge
4. 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑 skip 时回填评审结论
5. 新增测试四件；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
