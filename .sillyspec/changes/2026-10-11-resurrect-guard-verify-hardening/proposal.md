---
author: flow-machine-draft
created_at: 2026-10-11T13:55:38.251Z
---
# 提案书（Proposal）— 2026-10-11-resurrect-guard-verify-hardening

## 动机

任务原话转写：动机：上一会话已完成三处修复与配套资产但未收口（代码已先写好，倒推收尾）。其一，归档幽灵复活双门（坑 archived-change-resurrect-by-merge 2026-10-10 实证：远端 merge 把已归档变更四件套带回活跃路径，run verify 自动注册幽灵行推上平台）——run <stage> 注册前拒绝对「活跃目录与 changes/archive 同名并存且库内无活跃行」的变更注册（exit 2 双出口指引），doctor 归档完整性重扫对同形态报 FAILED 给处置指引；其二，verify 对账基点 merge-base 化（坑 verify-reconcile-base-stale-parallel-drift：执行期合入 main 后立项 diffBase..HEAD 把主仓并行演进算成本变更产出，21 条 undeclared 噪声淹没信号）——仅 merge-base 为立项点严格后代时收窄窗口否则退旧锚；其三，SILLYSPEC_TEST_TIMEOUT_MS 单位二义统一（秒契约为准，≥10000 按毫秒兼容并告警）；另 quick 快道 skill 落地 .claude/skills/sillyspec-quick/ 与 auto/brainstorm 技能文案对齐 run quick 新面，docs 引用漂移全量重锚（12 文件自动重锚 + 2 处手工：core-engine.md 调用点锚 4310、unmapped.md 裸名补全路径），docs gate 基线棘轮收紧至 0；平台墓碑收敛（2026-10-06-cli-flows-and-module-duty 目录隔离）已单独 chore 提交。

成功标准：
- run <stage> 对「活跃目录与 changes/archive/<同名>/ 并存且库内无活跃行」的变更名拒绝注册 exit 2 并给双出口指引；doctor detectArchiveIntegrity 对同形态 pass=false severity=FAILED 给处置指引（test/archived-resurrect-guard.test.mjs 全绿）
- verify 对账 diff 面锚点：merge-base(<主分支>,HEAD) 仅为立项点严格后代时采用（窗口只收窄），mb==HEAD、mb==立项点、非后代三形态一律退旧区间（test/verify-reconcile-merge-base.test.mjs 全绿）
- resolveTestTimeoutMs 与 TEST_TIMEOUT_MS 同口径解析 SILLYSPEC_TEST_TIMEOUT_MS：<10000 按秒×1000，≥10000 按毫秒并告警促改秒
- .claude/skills/sillyspec-quick/SKILL.md 存在且描述 run quick 三步生命周期与 --linked-changes 语义；auto/brainstorm SKILL.md 分叉文案指向 quick --linked-changes
- node --test test/doc-ref-check.test.mjs 绿（platform-interface-map.md 零失效）；sillyspec docs check 全量 846 处引用零失效；docs gate 基线=0
- 全量 npm test 零失败（749 文件）

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. run <stage> 对「活跃目录与 changes/archive/<同名>/ 并存且库内无活跃行」的变更名拒绝注册 exit 2 并给双出口指引；doctor detectArchiveIntegrity 对同形态 pass=false severity=FAILED 给处置指引（test/archived-resurrect-guard.test.mjs 全绿）
2. verify 对账 diff 面锚点：merge-base(<主分支>,HEAD) 仅为立项点严格后代时采用（窗口只收窄），mb==HEAD、mb==立项点、非后代三形态一律退旧区间（test/verify-reconcile-merge-base.test.mjs 全绿）
3. resolveTestTimeoutMs 与 TEST_TIMEOUT_MS 同口径解析 SILLYSPEC_TEST_TIMEOUT_MS：<10000 按秒×1000，≥10000 按毫秒并告警促改秒
4. .claude/skills/sillyspec-quick/SKILL.md 存在且描述 run quick 三步生命周期与 --linked-changes 语义；auto/brainstorm SKILL.md 分叉文案指向 quick --linked-changes
5. node --test test/doc-ref-check.test.mjs 绿（platform-interface-map.md 零失效）；sillyspec docs check 全量 846 处引用零失效；docs gate 基线=0
6. 全量 npm test 零失败（749 文件）

## 成功标准（可验证）

1. run <stage> 对「活跃目录与 changes/archive/<同名>/ 并存且库内无活跃行」的变更名拒绝注册 exit 2 并给双出口指引；doctor detectArchiveIntegrity 对同形态 pass=false severity=FAILED 给处置指引（test/archived-resurrect-guard.test.mjs 全绿）
2. verify 对账 diff 面锚点：merge-base(<主分支>,HEAD) 仅为立项点严格后代时采用（窗口只收窄），mb==HEAD、mb==立项点、非后代三形态一律退旧区间（test/verify-reconcile-merge-base.test.mjs 全绿）
3. resolveTestTimeoutMs 与 TEST_TIMEOUT_MS 同口径解析 SILLYSPEC_TEST_TIMEOUT_MS：<10000 按秒×1000，≥10000 按毫秒并告警促改秒
4. .claude/skills/sillyspec-quick/SKILL.md 存在且描述 run quick 三步生命周期与 --linked-changes 语义；auto/brainstorm SKILL.md 分叉文案指向 quick --linked-changes
5. node --test test/doc-ref-check.test.mjs 绿（platform-interface-map.md 零失效）；sillyspec docs check 全量 846 处引用零失效；docs gate 基线=0
6. 全量 npm test 零失败（749 文件）
