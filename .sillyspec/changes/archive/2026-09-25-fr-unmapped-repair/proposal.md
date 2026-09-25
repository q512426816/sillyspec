---
author: flow-machine-draft
created_at: 2026-09-25T12:39:47.186Z
---
# 提案书（Proposal）— 2026-09-25-fr-unmapped-repair

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:38ef05047e4c9bd4596e7aca02b0c946c881997042b4a77445e1f59bf8094c26:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
任务原话转写：动机：unmapped.md 有 7 条缺 FR 节头的幽灵条目（git 追溯 80355e9b「合回知识面」引入时即缺——外部仓旧数据合并切割损伤，非本仓 distill 所写：renderFrLines 写入侧必然产出节头行；正文截断是 cut(80) 正常语义，唯一损伤是节头）。后果：splitKnowledgeSections 把无节头字段块归入 preamble，readActiveFrDigest/dup 门/rot/承接翻链全部漏读这些条目——知识复利断流。归档（workspace-spec-root-managed-p0、2026-09-20-workspace-member-visibility）在本仓在场，标题可按全文锚点恢复。
成功标准：
- 7 条幽灵条目全部补上 FR-unmapped-714 起接续编号的节头（标题从各自全文锚点指向的归档 requirements.md 恢复）
- 修复后 readActiveFrDigest 读到全部新条目（解析验证）
- 测试钉：indexRequirements+renderFrLines 产出的域文件经 splitKnowledgeSections 解析 preamble 零孤立字段行（变更：/状态：开头）——证明本仓写入路径不可能产出幽灵条目，此类损伤只能来自外部合回（人工操作面）
- flow 族与 fr-index 套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:705f24606e70f23c31b4075030627cc554186f7b6c280cf1e8f5b9e0c068bc25:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 7 条幽灵条目全部补上 FR-unmapped-714 起接续编号的节头（标题从各自全文锚点指向的归档 requirements.md 恢复）
2. 修复后 readActiveFrDigest 读到全部新条目（解析验证）
3. 测试钉：indexRequirements+renderFrLines 产出的域文件经 splitKnowledgeSections 解析 preamble 零孤立字段行（变更：
4. 状态：开头）——证明本仓写入路径不可能产出幽灵条目，此类损伤只能来自外部合回（人工操作面）
5. flow 族与 fr-index 套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:aac28d419687405d5934418c9022a25b9e94b9df4c5b9ffc6cbafcda6a64e338:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
1. 7 条幽灵条目全部补上 FR-unmapped-714 起接续编号的节头（标题从各自全文锚点指向的归档 requirements.md 恢复）
2. 修复后 readActiveFrDigest 读到全部新条目（解析验证）
3. 测试钉：indexRequirements+renderFrLines 产出的域文件经 splitKnowledgeSections 解析 preamble 零孤立字段行（变更：
4. 状态：开头）——证明本仓写入路径不可能产出幽灵条目，此类损伤只能来自外部合回（人工操作面）
5. flow 族与 fr-index 套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
