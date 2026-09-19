---
author: qinyi
created_at: 2026-09-19 16:48:30
---

# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/span-risk-surface.js | 新增（span 轴路径模式声明面装载：四导出，纯函数+两 IO 装载） | 是（等价性口径） |
| core-engine | src/change-risk-profile.js | 删除收口（QUICK_RISK_PATH_PATTERNS 定义/导出/头注段退役，D-003） | 是 |
| core-engine | src/ceremony-tier.js | 接口变更（computeCeremonyTier 增 opts.spanRiskPatterns、reconcileDualRun 增 factSpanRiskPatterns——向后兼容增参）+ 逻辑变更（span 命中循环改共享 matcher） | 是 |
| core-engine | src/quick-gate-profile.js | 逻辑变更（riskTable 默认改 []，头注/JSDoc 口径改声明面） | 是 |
| core-engine | src/review-tier.js | 调用关系变更（评审档定价点装载声明表接线） | 否 |
| core-engine | src/scope-audit.js | 调用关系变更（:435 重放态装载注入；:517 不动） | 否 |
| core-engine | src/verify-postcheck.js | 调用关系变更（双跑事实面双点装载穿透） | 是（双跑口径） |
| runtime | src/run/gates.js | 调用关系变更（阶段门定价点装载接线） | 否 |
| runtime | src/run/shared.js | 调用关系变更（quick 审计点装载 → gateOpts.riskTable） | 否 |
| setup | src/config-schema.js | 配置变更（ceremony 段 note 文本补 span_risk 输入源表述；无新键） | 否 |
| docs-consistency | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 配置变更（顶层 span_risk 段 9 token+段内注释；core-engine paths 补 span-risk-surface.js） | 是（回插钉） |
| docs-consistency | .sillyspec/knowledge/known-issues.md、INDEX.md | 配置变更（blast 缺口登记 D-002 + span 退役行为面登记；INDEX 两路由行） | 否 |
| core-engine | .sillyspec/docs/sillyspec/modules/core-engine.md | 文档同步（模块卡：span-risk-surface 登记+退役收口+riskTable 口径，task-04） | 否 |
| runtime | .sillyspec/docs/sillyspec/modules/runtime.md | 文档同步（模块卡：gates/shared 接线条目，task-04） | 否 |
| setup | .sillyspec/docs/sillyspec/modules/setup.md | 文档同步（模块卡：config-schema note 条目，task-04） | 否 |
| docs-consistency | .sillyspec/docs/sillyspec/modules/docs-consistency.md | 文档同步（模块卡：span_risk 段维护纪律+knowledge 登记，task-04） | 否 |

## 归档终审裁决（三重核对报告 2026-09-19）

- 「diff 有而未列」26 项逐类裁决：①归档步 decision-distill/FR 索引自动产物（knowledge/decisions/*、fr/*、uncategorized、INDEX 等）——.sillyspec 产物不参与核对，豁免；②并行会话 2026-09-19-review-material-cli-wiring 主仓在途面（docs/prompt/*、src/review-material-pack.js、src/run/prompt.js、src/stages/*、test/review-material-pack.test.mjs）——非本变更产出（verify ③类 advisory 同源结论），不属本矩阵；③本变更模块卡 4 张——已补录上方矩阵行。
- 「列而 diff 无」6 项裁决：核对读主仓 diff 时点先于 apply，worktree 内交付面（src/test/map/模块卡）尚未回主仓——apply 后即为一致；矩阵行维持（真实 > 记录，记录以 worktree 交付面为准）。

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths——确认是模块索引过期（该跑 `sillyspec modules rebuild`）还是真的游离文件：

- `src/span-risk-surface.js` → 已补录：core-engine paths 增登记（本变更 task-03 完成，非索引过期）
- `src/change-risk-profile.js` / `src/ceremony-tier.js` / `src/quick-gate-profile.js` / `src/review-tier.js` / `src/scope-audit.js` → 索引在前缀匹配面外误报：五文件均在 core-engine paths 字面量清单（骨架生成期匹配口径差异），非游离
- `src/run/gates.js` / `src/run/shared.js` → 命中 runtime paths `src/run/`（骨架未匹配系生成期口径），非游离
- `src/verify-postcheck.js` → core-engine paths 字面量在案，同上
- `src/config-schema.js` → setup paths 字面量在案，同上
- `test/*.test.mjs`（六文件） → 测试文件本就不入模块 paths（仓惯例），非游离

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | span-risk-surface 登记+QUICK 表退役收口+riskTable/spanRiskPatterns 口径（task-04 完成） | done |
| `modules/runtime.md` | gates/shared 两装载接线条目（task-04 完成） | done |
| `modules/setup.md` | config-schema note 条目（task-04 完成） | done |
| `modules/docs-consistency.md` | span_risk 段维护纪律+knowledge 登记职责（task-04 完成） | done |
| `_module-map.yaml` | core-engine paths 补 src/span-risk-surface.js + 顶层 span_risk 段（task-03 完成；回插钉在盘） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
