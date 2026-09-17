---
author: qinyi
created_at: 2026-09-17 22:15:00
generated_by: agent
change: 2026-09-17-mi-diagnostic-codes
---

# 任务清单（Tasks）

- [x] task-01: 新建 src/diagnostic-codes.js 码表单一源——冻结表 DIAGNOSTIC_CODES 恰 10 码（信封级 4 + check 级 6，surface 与退出码语义按 design 接口定义）+ checkCode(checkId) 映射
- [x] task-02: machine-interface.js 信封加法式发射——buildEnvelope 加 codes 可选参（optional-once）、gate checks 逐个恒挂 code、四个信封级错误路径 + derive unknown facet 挂码、顶层 codes 按失败 check 序去重聚合；既有键/退出码/message 零改动 (depends_on: task-01)
- [x] task-03: interface-contract.md 对账——命令面新增 progress show 子节（编号顺延不撞 §1.3/§1.3b）、check 表补 design-file-list 行、transition §2.3 重写为参与 ok + :123/:135/:241 informational 残留全清 + 161-173 旧示例替换、新增诊断码目录节（与码表对账）与 v1 存续期语义变更记录节、frontmatter updated_at (depends_on: task-01)
- [x] task-04: 模块卡 .sillyspec/docs/sillyspec/modules/machine-interface.md 第三真相源同步——:28 行旧 informational 说法改写 + 契约摘要补 codes 键语义 + frontmatter/最近变更行 (depends_on: task-03)
- [x] task-05: 新建 test/diagnostic-codes-parity.test.mjs（双向 parity：注册码⊆文档目录 ∧ 目录码⊆注册表 + 发射抽查：db_missing/change_not_found/unknown_facet 信封级码 + gate check.code 恒在场 + codes push 序断言）+ test/machine-interface.test.mjs 回归增补（codes 键可选行为） (depends_on: task-01, task-02, task-03)
- [x] task-06: 全量验收——npm test 全绿 + CLI 实测三面（gate/derive/progress show --json 人工对样）+ 契约/模块卡/实现三处零漂移终检 (depends_on: task-02, task-03, task-04, task-05)
