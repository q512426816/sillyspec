---
author: flow-machine-draft
created_at: 2026-09-24T16:25:47.327Z
---
# 提案书（Proposal）— 2026-09-25-thin-patch-bindings

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:667efacac07ade261acf627322754181ba3fc88b24b1c69bf94b838c74dc2741:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
任务原话转写：动机：入口统一薄流程前的两块能力补齐——quick 取消后变更自身要留范围冻结审计件（patch 留档，noAI）；薄道机器 FR 入了索引但零测试锚（撞实验 5 个 P1 全是承诺无锚形态），FR↔测试绑定要进薄道。
成功标准：
- flow done 新增 patch 子步（ledger 后 noAI）：buildFrozenPatch 以 baseline 为基、归属收窄后的本变更文件面冻结（含工作树未提交与 untracked），落 changes/<名>/change.patch 与 change-patch.json（行数统计+sha256 锚），fail-soft 不阻断
- requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flow done artifacts 校验槽非空（不适用加理由=已答；零槽=骨架过旧，指引删除后重入 start 补生成）
- distill 在 indexRequirements 前从槽位提取绑定行落 test-trace.json（FR 局部锚、candidate、machine 口径），随既有归档提升铸全局
- 新增测试覆盖三件，flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:aecb274451cf91bfcae45b43b0fc5cd55c30c74b1e4a03e8e5463d1ebdef05f2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. flow done 新增 patch 子步（ledger 后 noAI）：buildFrozenPatch 以 baseline 为基、归属收窄后的本变更文件面冻结（含工作树未提交与 untracked），落 changes/<名>/change.patch 与 change-patch.json（行数统计+sha256 锚），fail-soft 不阻断
2. requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flow done artifacts 校验槽非空（不适用加理由=已答；零槽=骨架过旧，指引删除后重入 start 补生成）
3. distill 在 indexRequirements 前从槽位提取绑定行落 test-trace.json（FR 局部锚、candidate、machine 口径），随既有归档提升铸全局
4. 新增测试覆盖三件，flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:b269cafbeaedfda6a38293ab0fd19eacc9323788f1ecac780244b6d4b22d9457:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
1. flow done 新增 patch 子步（ledger 后 noAI）：buildFrozenPatch 以 baseline 为基、归属收窄后的本变更文件面冻结（含工作树未提交与 untracked），落 changes/<名>/change.patch 与 change-patch.json（行数统计+sha256 锚），fail-soft 不阻断
2. requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flow done artifacts 校验槽非空（不适用加理由=已答；零槽=骨架过旧，指引删除后重入 start 补生成）
3. distill 在 indexRequirements 前从槽位提取绑定行落 test-trace.json（FR 局部锚、candidate、machine 口径），随既有归档提升铸全局
4. 新增测试覆盖三件，flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
