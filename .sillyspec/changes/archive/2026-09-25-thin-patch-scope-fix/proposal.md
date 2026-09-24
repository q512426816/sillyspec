---
author: flow-machine-draft
created_at: 2026-09-24T16:32:39.752Z
---
# 提案书（Proposal）— 2026-09-25-thin-patch-scope-fix

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:bbe56212abb21d6c23d0b7cc434684506b826eaf1c32af3e932d6f384064edb7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
任务原话转写：动机：上一变更（thin-patch-bindings）实测暴露 patch 面泄漏——attributedChangedFiles 的 dirty 全扫面把并行会话 17+ 个未声明 WIP 文件冻结进了本变更 change.patch（49 文件 +2870 行，实际本变更约 10 文件）。留档范围必须是本变更可归属的变化。
成功标准：
- patch 面改为：baseline..HEAD 提交面（.sillyspec/ 下仅保留本变更目录）∪ 本变更目录全部工作树件（排除 change.patch/change-patch.json 自引用）；提交面仍过他侧声明切分
- flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.length 动态（现在是七子步）
- 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入 patch）；flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:ddd89271e5485f849b5e844e1db9ffbc76e29ad55c12f0574682421c455f2e58:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
按成功标准机械推导，共 3 条验收面：
1. patch 面改为：baseline..HEAD 提交面（.sillyspec/ 下仅保留本变更目录）∪ 本变更目录全部工作树件（排除 change.patch/change-patch.json 自引用）；提交面仍过他侧声明切分
2. flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.length 动态（现在是七子步）
3. 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入 patch）；flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:fff7f9264892cce21db5eefefae3ad22c1e328c091a9fca71b32ca23f376a1cd:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
1. patch 面改为：baseline..HEAD 提交面（.sillyspec/ 下仅保留本变更目录）∪ 本变更目录全部工作树件（排除 change.patch/change-patch.json 自引用）；提交面仍过他侧声明切分
2. flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.length 动态（现在是七子步）
3. 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入 patch）；flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
