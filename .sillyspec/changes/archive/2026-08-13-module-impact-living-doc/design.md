---
author: qinyi
created_at: 2026-08-13 09:30:00
scale: large
revision: 3
risk_level: unit-sufficient
---

# Design：module-impact.md 分阶段生成 + archive 终审

> revision 3：plan 审查（独立子代理）发现步骤序事实错误——review_plan 在 generate_blueprints **之前**（plan.js:500 fixedPrefix=[classify,generate_plan,review_plan] + plan.js:572 [...fixedPrefix, coordinator, postcheck]），TaskCard/allowed_paths 在 review_plan 时**尚未生成**。更正 D-001@v2/FR-01：module-impact 首版输入依据 = design.md 文件变更清单 + plan.md 任务列表（非 TaskCard allowed_paths）。方案决策不变（review_plan 仍是生成点）。另：task-06 约束不改 step 名只改 prompt（消除 stage-definitions.test.mjs:37 硬编码断点）。
>
> revision 2：Design Grill（独立子代理）首轮 fail，致命伤已修订——large 生成点从 plan postcheck（noAI，agent 读不到 prompt）改为 review_plan（LLM 步骤）；small 从"也生成简版"改为豁免（与 quick 剥离仪式产物哲学冲突）；补充 validatePlanOutputs 的 scale 读取链路（必调）、execute 更新归属、archive prompt 抽取策略、step2 改名 migratedFrom。

## 背景与目标

`module-impact.md`（模块影响分析）当前仅在 **archive 阶段** `extract-module-impact` 步骤一次性反向生成（`src/stages/archive.js:27`），校验 `archive.module-impact.exists` 是 warning 级、root=archive（`src/stage-contract-spec.js:405`）。它依赖 scan 产出的 `_module-map.yaml`，由 archive 的 `sync-module-docs` 步骤读取以更新模块卡片。

问题：归档时才回顾整个变更的影响太晚，且一次性生成质量靠 agent 临场回顾。

**目标**：把 module-impact.md 改成「分阶段生成 + archive 终审」——large 变更在 plan 阶段生成首版（task+allowed_paths 明确时），execute/verify 阶段可选更新，archive 改为最终确认 + 同步模块卡片。small 变更豁免（本就是剥离仪式产物的轻量路径）。

## 总体方案

方案 A（选定）：**prompt 注入 + 最小 validator**。在 plan 的 LLM 步骤注入生成 module-impact.md 指引；validator 加 1 条 error（plan large 首版强制）；execute/verify/archive 纯 prompt 不校验。不抽公共生成函数——SillySpec 是流程控制器，module-impact 内容是 agent 分析活，CLI 不算矩阵。

### 首版生成点（仅 large，强制 error）

| 规模 | 生成点 | 步骤类型 | validator |
|------|--------|---------|-----------|
| large | plan 的「审查计划」(review_plan) 步骤 | LLM 步骤（agent 读得到 prompt） | `plan.module-impact.exists`（error，condition `scale≠small`，root=change） |
| small | 豁免（不生成） | — | 无 |

**为何 review_plan**：plan 步骤序为 classify → generate_plan → **review_plan → generate_blueprints(生成TaskCard)** → postcheck(noAI)（`plan.js:500` fixedPrefix + `plan.js:572` [...fixedPrefix, coordinator, postcheck]）。Grill 否决了 postcheck（noAI，`plan.js:488 prompt:''`/`plan.js:491 noAI:true`，`stage.js:344` 直接 `executePlanPostcheck()` 不调 agent——agent 读不到 prompt）。review_plan 是 LLM 步骤（agent 读得到 prompt），职责是"审查计划"——叠加"生成 module-impact"语义自然；此时 plan.md 已由 generate_plan 产出（含任务列表 `- [ ] task-XX:`），design.md 文件变更清单在 brainstorm 已定稿，二者作为 module-impact 分析输入。**注（rev3 修正）**：review_plan 在 generate_blueprints **之前**，TaskCard/allowed_paths 此时**尚未生成**——module-impact 首版用 plan 任务列表 + design 文件清单（非 TaskCard allowed_paths），粒度与 archive 现状一致（archive 也是基于文件清单 + git diff）。否决 generate_plan（职责是生成 plan.md 本身，叠加生成 module-impact 混淆职责）。

### 后续更新点（可选 prompt，不校验）

- execute：**主代理**在每个 Wave 完成后汇总该 Wave 实际代码变更更新 module-impact.md（不由 task 子代理各改——同 Wave 并行 task 子代理会互相覆盖，`execute.js:786` 每个 task 由独立子代理执行）
- verify「输出验证报告」：prompt 加「核对 module-impact.md 与实际变更一致」
- archive 原 `extract-module-impact` 步骤改为「最终确认 module-impact.md（核对一致）」后进 sync-module-docs

### 无 _module-map.yaml 降级

复用 archive 现有 fail-safe（`archive.js:38`：模块映射缺失 → 降级生成只含 unmapped 部分的版本 + 提示跑 scan）。plan review_plan 生成首版的 prompt 继承该降级语义，不阻断。

## 决策

- **D-001@v2**：large 首版生成点 = plan review_plan 步骤（rev1 锚 postcheck 已否决——noAI agent 读不到 prompt）。review_plan 是 LLM 步骤，职责"审查计划"叠加"生成 module-impact"语义自然；输入 = plan.md 任务列表 + design.md 文件变更清单（rev3 修正：review_plan 在 generate_blueprints 之前，TaskCard/allowed_paths 尚未生成）。否决 generate_plan（职责是生成 plan.md 本身，叠加混淆）；否决 execute（最晚，task 子代理归属复杂）。
- **D-002@v1**：更新强制性 = 首版 error 阻断 + 后续可选 prompt。
- **D-003@v2**：small 豁免（rev1「也生成简版」已否决——`brainstorm.js:466` small 本就是剥离仪式产物，module-impact 对 quick 无用，强行生成收益近零）。
- **D-004@v1**：无 _module-map.yaml 降级生成 unmapped 版 + 提示（不阻断）。
- **D-005@v2**：archive step2 改为最终确认（不删除），**不改 step 名**只改 prompt（rev1「若改名配 migratedFrom」否决——`test/stage-definitions.test.mjs:37` 硬编码 `extract-module-impact`，改名必断且需配 migratedFrom 防回跳；改 prompt 只改语义不动名，零迁移成本，消除 stage-definitions 连带断点）。
- **D-006@v1**：不抽公共生成函数（CLI 不处理业务逻辑）。
- **D-007@v1**（grill 补）：execute 更新归属 = 主代理 Wave 后汇总（非 task 子代理各改，避免并行覆盖）。
- **D-008@v1**（grill 补）：archive extract-module-impact prompt 是 inline 字符串 + 引用 `workflows/archive-impact.yaml`（`archive.js:28`）。抽取到 plan review_plan 的策略：复制核心指引（读 _module-map.yaml → 对照变更文件 → 影响矩阵 → 落盘），注释标注与 archive 同源；接受两处漂移风险（archive step2 改终审后 archive 侧 prompt 亦变）。
- **D-009@v1**（grill 补）：validatePlanOutputs 必须新增 design.md scale 读取链路（参照 `stage-contract.js:264-272` validateBrainstormOutputs 读 scale 的 8 行），把 `{ changeDir }` 改为 `{ changeDir, scale }`——这是必调项（rev1「若需调」措辞纠正），否则 condition scale≠small 不生效。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 修改 | src/stages/plan.js | review_plan 步骤 prompt 加生成 module-impact.md 首版指引（复用 archive extract-module-impact 核心指引，D-008） |
| 修改 | src/stages/execute.js | Wave 步骤 prompt 加「主代理 Wave 后汇总更新 module-impact.md」指引（D-007） |
| 修改 | src/stages/verify.js | 「输出验证报告」步骤 prompt 加核对 module-impact.md 指引 |
| 修改 | src/stages/archive.js | extract-module-impact 步骤改为最终确认（prompt 改写）；若改名配 migratedFrom（D-005） |
| 修改 | src/stage-contract-spec.js | 新增 `plan.module-impact.exists`（error, condition scale≠small, root=change）；保留 `archive.module-impact.exists` warning |
| 修改 | src/stage-contract.js | validatePlanOutputs 新增 design.md scale 读取链路，`evaluateRules('plan', { changeDir, scale })`（D-009，必调） |
| 修改 | docs/sillyspec/file-lifecycle.md | 记录 module-impact.md 在 plan(large) 生成、archive 终审；更新 updated_at |
| 修改 | docs/prompt/_extracted.json + plan.md/execute.md/verify.md/archive.md | 跑 `node docs/prompt/_extract.mjs` 再生 |
| 修改 | .claude/skills/*/SKILL.md | plan/execute/verify/archive skill 同步 module-impact 要点 |

## 风险登记

- **R-01（中）**：module-impact 内容质量靠 agent——CLI 不算矩阵。缓解：prompt 复用 archive 成熟指引。
- **R-02（中）**：plan review_plan + execute Wave prompt 变长。缓解：核心指引复用、不重复造。
- **R-03（中）**：现有 archive 测试（run-complete-step-archive / archive-cli-git-add / archive-idempotent-selfheal / archive-sync-module-docs-wait）依赖 extract-module-impact 步骤行为，step2 改造可能破。缓解：execute 阶段逐个修 + 跑全量。
- **R-04（低）**：archive step2 改名若配 migratedFrom 可忽略；不改名则 prompt 改写即可。
- **R-05（低）**：plan.module-impact.exists condition scale≠small 依赖新增 scale 读取链路（D-009）——已列入硬性修改。
- **R-06（中，grill 补）**：archive prompt 与 plan review_plan prompt 两处复制同源指引会漂移。缓解：注释互指 + archive step2 改终审后两侧语义本就分化。

## 自审

- ✅ 覆盖 grill 全部 4 个 blocker：large 生成点（postcheck noAI → review_plan）、small 冲突（豁免）、scale 读取链路（D-009 必调）、execute 归属（D-007 主代理汇总）
- ✅ archive prompt 抽取策略明确（D-008 复制+注释同源，接受漂移）
- ✅ archive step2 改名配 migratedFrom（D-005）
- ✅ 文件清单含全部触及面（4 阶段定义 + 校验规则2文件 + 文档 + 提示词 + skills）
- ✅ 不涉及生命周期契约（无 session/lease/daemon/state_transition）
- ✅ 符合 SillySpec 定位（流程控制器，prompt 驱动，不算矩阵）
- ⚠ 待 plan 阶段细化：review_plan prompt 注入的具体文本、archive step2 是否改名、scale 读取链路的精确实现
