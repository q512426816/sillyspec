---
author: flow-machine-draft
created_at: 2026-10-02T16:34:26.303Z
---
# 提案书（Proposal）— 2026-10-03-fr-skeleton-gate

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:581fe5e585782e5c0a939459cc9ba6d61b5ee107ca691c188b0f9fb16085f5a4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
任务原话转写：骨架信息量门——治索引信噪比熵增。动机：薄道机器预填的空 GWT 骨架（When=标题回显、Then=占位句「行为符合本条标准描述」）永久入 knowledge/fr 索引（9 月平台仓 +661 条中相当部分为此形态），后续每个触达该域的变更注入面都被零信息条目占席。批次1 的排序止血后，骨架条目还会挤占 TierB 席位。方案：入索引时检测纯骨架（全部场景行含占位 Then）→ 条目落「骨架：thin」标记行；注入面排除骨架条目（TierA 覆盖命中者除外——它可能是该文件唯一行为痕迹）；查重/rot/测试绑定面一律不动（回归价值照旧）；存量一次性回填（幂等）。
成功标准：
- 纯骨架条目（全部场景行含「Then 行为符合本条标准描述」）入索引时自动带「骨架：thin」标记行；存量回填函数幂等（二次执行零变更）
- 注入面（buildFrIndexDigestSection 与 flowKnowledgeDigest）排除骨架条目；TierA 覆盖命中的骨架条目仍注入且带 🎯
- 注入行数/指针行/遥测既有字段语义不回归（非骨架场景行为与批次1 完全一致）
- 平台仓存量骨架条目完成回填（数量披露）
- 新增测试全绿 + 既有断言零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:9f4d55480c63142d065204de30bb408ced5181a64359fa82f9106c8aec0dd7b8:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 纯骨架条目（全部场景行含「Then 行为符合本条标准描述」）入索引时自动带「骨架：thin」标记行
2. 存量回填函数幂等（二次执行零变更）
3. 注入面（buildFrIndexDigestSection 与 flowKnowledgeDigest）排除骨架条目
4. TierA 覆盖命中的骨架条目仍注入且带 🎯
5. 注入行数/指针行/遥测既有字段语义不回归（非骨架场景行为与批次1 完全一致）
6. 平台仓存量骨架条目完成回填（数量披露）
7. 新增测试全绿 + 既有断言零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:216f261135c9ac0d07937c0832b3c1a37650490d49a2627feae8644fcd949e73:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
1. 纯骨架条目（全部场景行含「Then 行为符合本条标准描述」）入索引时自动带「骨架：thin」标记行
2. 存量回填函数幂等（二次执行零变更）
3. 注入面（buildFrIndexDigestSection 与 flowKnowledgeDigest）排除骨架条目
4. TierA 覆盖命中的骨架条目仍注入且带 🎯
5. 注入行数/指针行/遥测既有字段语义不回归（非骨架场景行为与批次1 完全一致）
6. 平台仓存量骨架条目完成回填（数量披露）
7. 新增测试全绿 + 既有断言零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
