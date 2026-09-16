---
author: qinyi
created_at: 2026-09-16 11:35:20
---

# 模块影响分析（骨架由 `sillyspec module-impact --change <变更名>` 生成）

> CLI 骨架扫描时无 diff 文件可归类（execute 未开始），本矩阵按 design.md 文件变更清单手写。
> 影响类型与 review 标记以 design.md 文件变更清单为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/verify-facts-schema.js | 逻辑变更（parseEvidenceSlots 回执槽双形态解析：单行正则保留 + 多行 YAML 聚合） | 是（facts v2 四方同源单点，回执消费链 change-risk-profile/stage-contract 依赖） |
| runtime | src/verify-probes.js | 文案变更（backfillMissingEvidenceSlots 回执骨架双形态示例，注释级） | 否（不触碰渲染逻辑/幂等口径） |
| stages | src/stages/verify.js | 文案变更（verify prompt 槽行结构说明双形态） | 否（纯 prompt 说明） |
| stages | src/stages/plan-postcheck.js | 接口变更（新增导出 detectDuplicateTopKeys）+ 逻辑变更（validatePlanFeasibility 重复键检测接线） | 是（plan --done 硬门新拦截面） |
| worktree | src/worktree-apply.js | 逻辑变更（resolveApplyAllowSet 条件加白 + declaredFace 审计报备，D-003@v2） | 是（Gate1/patch 圈定/hashMismatch 靶面同源 allowSet） |
| setup | src/config-schema.js | 配置变更（登记 gate_snapshot.copy 键） | 否（纯增量可选键，默认缺省零行为） |
| runtime | src/run/gate-snapshot.js | 逻辑变更（createGateSnapshot copy 面 junction/copy 回退） | 是（verify/quick 双门禁快照基建） |
| core-engine | src/probe7-anchor-check.js | 逻辑变更（covered 证据锚点口径扩 .test. 文件名） | 否（advisory 不阻断，零依赖单文件） |
| runtime | src/run/gates.js | 文案变更（probe7 advisory 提示语同步） | 否（纯输出文案） |
| （测试，跨模块） | NEW:test/receipt-multiline-parse.test.mjs | 新增 | 否 |
| （测试，跨模块） | NEW:test/taskcard-duplicate-key.test.mjs | 新增 | 否 |
| （测试，跨模块） | NEW:test/apply-docs-allowlist.test.mjs | 新增 | 否 |
| （测试，跨模块） | NEW:test/gate-snapshot-copy.test.mjs | 新增 | 否 |
| （测试，跨模块） | NEW:test/probe7-anchor-testfile.test.mjs | 新增 | 否 |
| （模块文档） | .sillyspec/docs/sillyspec/modules/（stages/core-engine/worktree/runtime/setup 侧车 changelog 认领） | 文档变更 | 否 |

## 未匹配文件

无（本变更全部文件均匹配 _module-map.yaml 归属；主仓工作区当前干净，无并行会话在途文件混入）。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增 / 文案变更 / 文档变更；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无未匹配文件（paths 归属无变化） | skipped |
| `.sillyspec/docs/sillyspec/modules/core-engine.changelog.md` | execute 后认领 verify-facts-schema 双形态/probe7 口径（sidecar changelog，主仓提交 21ef3ad） | done |
| `.sillyspec/docs/sillyspec/modules/stages.changelog.md` | execute 后认领 feasibility 重复键检测（sidecar changelog，同上） | done |
| `.sillyspec/docs/sillyspec/modules/worktree.changelog.md` | execute 后认领条件加白/declaredFace（sidecar changelog，同上） | done |
| `.sillyspec/docs/sillyspec/modules/runtime.changelog.md` | execute 后认领 gate-snapshot copy 面（sidecar changelog，同上） | done |
| `.sillyspec/docs/sillyspec/modules/setup.changelog.md` | execute 后认领 gate_snapshot.copy 键（sidecar changelog，同上） | done |

## 归档对账裁决（2026-09-16，三重核对报告两类不一致的处置）

1. 「diff 有而 module-impact 未列（39）」——其中 5 个 sidecar 文件实已在上方矩阵（模块列「（模块文档）」为跨模块行，机械核对未映射不等于未列）；其余 34 项为 .sillyspec 变更产物（changes/ 文档、runtime 台账）与并行会话在途文件，不属本变更交付面，无需入矩阵。
2. 「module-impact 列而 diff 无（6）」——系更新结果表目标列此前误写 `docs/sillyspec/modules/<mod>.md`（正确实做目标是 `.sillyspec/docs/.../<mod>.changelog.md` sidecar），已修正目标列；模块主文档正文本次未动（行为契约详情在 sidecar，符合「内部实现变化不更新卡片」惯例）。
