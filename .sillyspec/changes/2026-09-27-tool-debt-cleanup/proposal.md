---
author: flow-machine-draft
created_at: 2026-09-27T09:44:22.950Z
---
# 提案书（Proposal）— 2026-09-27-tool-debt-cleanup

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:aed895e15609c32262877597153b9279fd035685d0abd53759dce2cc5de3be1a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
任务原话转写：背景：本会话三次归档评审两次抓到 patch 冻结面口径缺陷——①flow.js 提交面过滤把 .sillyspec 目录下除本变更目录外全部滤除，致 gate-docs-cleanup 已提交的三张模块卡（交付文档）漏出审计 patch；②变更目录整目录遍历把 flow-state.yaml 运行态（未跟踪、机器写、冻结后仍变）收进 patch 当 new file。另有工具债：ui-visual.js 与 hunk-attribution.js 未入模块图；test-bindings.js 导出 normalizeTestsRootRel 无外部引用致 check-syntax 全仓 lint 门常红（他会话存量债，机械清偿解锁）。
成功标准：
- patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood 模块卡不再漏），过滤逻辑抽为 flow-parity 导出的纯函数供单测锁定
- 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）
- _module-map.yaml 的 cli-entry paths 登记 ui-visual.js 与 hunk-attribution.js
- test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消费保留），check-syntax 本仓侧清零
- 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）
- 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:8b8520e8218780eaa8468dc8c8ca44426544e7a79c5a9cc5edb2071553c33dfc:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood 模块卡不再漏），过滤逻辑抽为 flow-parity 导出的纯函数供单测锁定
2. 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）
3. _module-map.yaml 的 cli-entry paths 登记 ui-visual.js 与 hunk-attribution.js
4. test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消费保留），check-syntax 本仓侧清零
5. 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）
6. 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:58b6f48d62d53a7a34df8122547a048e10d7ebb9cb2c81a111ca88354c8f73c4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
1. patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood 模块卡不再漏），过滤逻辑抽为 flow-parity 导出的纯函数供单测锁定
2. 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）
3. _module-map.yaml 的 cli-entry paths 登记 ui-visual.js 与 hunk-attribution.js
4. test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消费保留），check-syntax 本仓侧清零
5. 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）
6. 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
