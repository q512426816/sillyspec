---
author: flow-machine-draft
created_at: 2026-09-26T01:07:12.250Z
---
# 提案书（Proposal）— 2026-09-26-slot4-distill-fix

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:02c7a8353be17cf5fcaa19edd6239c2dc550ac402cb8d675f1867db0fde6c693:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
任务原话转写：动机：用户核验「枚举开放世界教训是否进知识库」暴露断链——槽4 收割器（harvestSlot4Decision）产出的 decisions.md 条目只有「- 决策：」行、无「状态：」字段，而决策蒸馏（distillIntoKnowledge）只入选 confirmed|accepted|rejected 状态条目 → 收割条目永不入选，「随蒸馏链进 knowledge」的宣称断链（thin-agent-tasks 的教训实证：留档在归档、knowledge/decisions 零落地、INDEX 零路由）。
成功标准：
- harvestSlot4Decision 收割条目补「状态：confirmed」行（槽4 是定案的风险取舍，confirmed 语义成立）——经 distillIntoKnowledge 实测入选并落 knowledge/decisions
- 既有收割测试（如有）同步；thin-agent-tasks 的教训条目重放蒸馏补进 knowledge/decisions 与 INDEX 路由（幂等重跑）
- 新用例：收割→蒸馏全链（收割条目经蒸馏入选）+ 无状态旧格式不入选的行为回归
- 既有套件零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d05f954958e3251b61bc877c3ea2a82d8e87db025f42530c5a3743b2ab5a27d7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. harvestSlot4Decision 收割条目补「状态：confirmed」行（槽4 是定案的风险取舍，confirmed 语义成立）——经 distillIntoKnowledge 实测入选并落 knowledge
2. decisions
3. 既有收割测试（如有）同步
4. thin-agent-tasks 的教训条目重放蒸馏补进 knowledge
5. decisions 与 INDEX 路由（幂等重跑）
6. 新用例：收割→蒸馏全链（收割条目经蒸馏入选）+ 无状态旧格式不入选的行为回归
7. 既有套件零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:9aa874de99bcc9fcd40026f7d1b69c9f1db4e1f5b20b7ae4b32bfc329542a9ec:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
1. harvestSlot4Decision 收割条目补「状态：confirmed」行（槽4 是定案的风险取舍，confirmed 语义成立）——经 distillIntoKnowledge 实测入选并落 knowledge
2. decisions
3. 既有收割测试（如有）同步
4. thin-agent-tasks 的教训条目重放蒸馏补进 knowledge
5. decisions 与 INDEX 路由（幂等重跑）
6. 新用例：收割→蒸馏全链（收割条目经蒸馏入选）+ 无状态旧格式不入选的行为回归
7. 既有套件零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
