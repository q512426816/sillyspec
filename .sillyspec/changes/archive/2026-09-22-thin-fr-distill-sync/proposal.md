---
author: flow-machine-draft
created_at: 2026-09-22T12:30:16.590Z
---
# 提案书（Proposal）— 2026-09-22-thin-fr-distill-sync

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:a1a64170822b1e20958ec9933a0080165dfe81bdfd5539b2c72328a7a200feec:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-22-thin-fr-distill-sync 留痕重锚 -->
任务原话转写：薄流程两个断链修复：①flow done 的 distill 子步只蒸馏 decisions 不调 indexRequirements——薄道归档的 requirements 永不进 knowledge/fr 索引，知识复利在新默认道断流；且薄变更无 design.md，域路由需用基线以来交付文件清单（deliverableFiles）走伪域回退。②flow start/done 绕过 runCommand 不触发 triggerSync——薄道变更的 docs/knowledge 不推平台。成功标准：flow done 归档含 requirements.md 的薄变更后 knowledge/fr/ 出现对应 FR 条目（无 design.md 时按交付文件伪域路由）；flow start 与 flow done 尾部各有一次 triggerSync 触发（best-effort 不阻断）；fr-index 接受 deliverableFiles 参数旁路 design.md 解析；既有 fr-index 行为零回归（无参数时逐字走 design.md 路径）。
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:2ad7b02691c7d907e1d2c9e853d9134f164a9bcdcef5d7db52d0af11c4bfbd30:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-22-thin-fr-distill-sync 留痕重锚 -->
（--input 未含成功标准条目——flow done 测试门与工件校验为默认验收面）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:a51de969f5ead9a789fdde1476c1242c83293cf63ac80a43d63bd08ee3588533:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-22-thin-fr-distill-sync 留痕重锚 -->
1. flow done 六子步全绿（测试门实测通过+工件指纹校验通过）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
