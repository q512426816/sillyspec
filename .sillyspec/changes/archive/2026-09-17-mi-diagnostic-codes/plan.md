---
author: qinyi
created_at: 2026-09-17 22:20:00
generated_by: agent
change: 2026-09-17-mi-diagnostic-codes
plan_level: full
---

# 实现计划（Plan）

> 任务真相源：tasks.md（本文件为 Wave 编排与执行指引；checkbox 状态以 tasks.md 为准——task-truth-unify 契约）。

## Wave 1：码表地基

- task-01

**执行指引**：落 `NEW:src/diagnostic-codes.js`（冻结表 10 码，surface/exit/trigger 严格按 design.md 接口定义——信封级 4 码含 db_missing/change_not_found/unknown_facet/internal_error，check 级 6 码含 artifacts_invalid[gate+derive]/design_file_ref_invalid/transition_blocked/execute_evidence_unchanged[gate+derive]/task_reviews_invalid[gate+derive]/verify_test_failed[gate+derive]，Object.freeze + checkCode(checkId) 映射）。

## Wave 2：信封发射与契约对账（并行无共享文件）

- task-02
- task-03

**执行指引**：task-02 machine-interface.js 加法式发射——buildEnvelope 加 codes 可选参遵循 optional-once；gate 每个 check 恒挂 code；gate/derive/progress show 的信封级错误路径单码直挂；顶层 codes 按失败 check push 序去重。铁律：errors/warnings/退出码/中文 message/schema_version=1 零改动。task-03 interface-contract.md 三项对账（progress show 子节编号顺延不撞 §1.3/§1.3b；check 表补 design-file-list 行；§2.3 重写为参与综合 ok 并全文清扫 informational 残留 :123/:135/:241；161-173 旧示例替换）+ 新增诊断码目录节（锚定标题+码 token 行格式，内容与 DIAGNOSTIC_CODES 逐码一致）与 v1 存续期语义变更记录节（transition 条目含日期/旧语义/新语义/SillyHub gate.py 实证）。

## Wave 3：第三真相源同步与 parity 防线（并行无共享文件）

- task-04
- task-05

**执行指引**：task-04 模块卡 machine-interface.md :28 同步改写 + 契约摘要补 codes 键语义 + frontmatter/最近变更登记。task-05 `NEW:test/diagnostic-codes-parity.test.mjs` 三段——①双向 parity（import DIAGNOSTIC_CODES + 解析契约码目录节 token，⊆ 双向断言）②发射抽查（tmp fixture：无 db 目录→db_missing、假 change→change_not_found、假 facet→unknown_facet；gate 成功路径 check.code 恒在场）③codes push 序断言（artifacts 先于 transition）；另 machine-interface.test.mjs 增补 codes 可选键行为。

## Wave 4：全量验收

- task-06

**执行指引**：全量 npm test + CLI 实测三面（gate/derive/progress show --json 对样）+ 契约/模块卡/实现三处零漂移终检。

## 风险与回退

- R-01/R-03（codes 误读）由契约目录节语义说明兜底；R-02（parity 脆断）由锚定标题+token 格式测试钉死。
- 回退路径：删除发射侧挂码即回现状（既有键从未动过）；契约文档回退走 git。
- Wave 对齐说明：原三 Wave 分组将依赖边置于同 Wave（同 Wave=并行契约不允许），已按 plan 独立审查建议预对齐拓扑序（01 / 02,03 / 04,05 / 06），避免 --done 自动改写使已审版本漂移。
