---
schema_version: 1
doc_type: module-card
module_id: stages
author: qinyi
created_at: 2026-06-04T16:55:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# stages

## 定位

定义 SillySpec 所有工作流阶段的步骤和 prompt，是 CLI 状态引擎的核心配置层。

## 契约摘要

| 接口 | 说明 | 调用方 |
|------|------|--------|
| `definition.steps` | 阶段步骤定义数组 | run.js（getStageSteps） |
| `definition.name` | 阶段名 | stages/index.js（registry） |
| `buildExecuteSteps(planFile)` | 动态生成 execute 步骤 | run.js |
| `buildPlanSteps(changeDir)` | 动态生成 plan 步骤 | run.js |

## 关键逻辑

每个阶段由 `export const definition = { name, title, description, steps: [...] }` 导出。steps 数组中每个 step 包含 name、prompt、outputHint、optional 字段。CLI 通过 `ProgressManager` 写入 SQLite，并以兼容旧 progress JSON 的对象跟踪每个 step 的执行状态。

**核心阶段**（按流程顺序）：brainstorm → plan → execute → verify → archive
**辅助阶段**：scan、quick、explore、status、doctor

**brainstorm-auto.js** — auto/full 模式使用的 brainstorm 步骤定义（artifact-first 直接写文件对话只出摘要、按 AC-001~AC-011 checklist 自动决策、产出 next-action.json 驱动下游推进、步骤从 ~13 步精简为 4 步）；与 brainstorm.js 同为 name: 'brainstorm' 阶段，由 run 层按模式选择定义。

**knowledge.js** — agent-safe knowledge 管理命令（search / inspect / validate / refresh / 新知识提案 五个子命令）：全部输出 JSON、不打开编辑器、不直接覆盖人工区、失败带明确错误码；`sillyspec knowledge` 顶层命令的实现，配套 skill sillyspec-knowledge。

**execute prompt 路径约定**（2026-07-11 占位符化，坑 2）：execute stage prompt 中 review.json / endpoints.json 路径用 `{SPEC_ROOT}/.runtime/` 占位符（非裸 `.sillyspec/.runtime/` 硬编码）。`{SPEC_ROOT}` 由 run 层平台路径重写消费（W6 后在 `src/run/prompt.js`）——仓库内模式→`.sillyspec`，平台模式（specDir 指向外部目录）→specDir。修复平台模式下 review.json 落盘路径错位（如 `src/stages/execute.js:908/937`）。

**plan 完成校验**（2026-08-05，`plan-postcheck.js`）：`validateTaskCommands` 扫每个 TaskCard 的 `verify`/`implementation` 字段里 `npm/pnpm/yarn run <script>` 命令，按 `cd <subdir> &&` 前缀或 local.yaml `modules` 块定位子包 package.json 查脚本是否存在（monorepo 感知），不存在 → error 硬阻断 plan 完成（共享 helper `validateScriptCommands` 在 `src/stages/cmd-existence.js`，scan-postcheck 复用时维持 warning）。`validatePlanFeasibility` 另加 acceptance best-effort 字段 grep——从 acceptance 文本提 snake_case/camelCase 标识符 grep `allowed_paths` 源文件，未命中 → warning（不阻断，给 LLM 审查提线索）；`plan.js` `stepReviewPlan` 审查清单加「acceptance 对照实际 schema/类型源核验存在性与形态」条。

**verify detectChangeRisk 早期 warning**（坑2，2026-08-06，`stage-contract.js:319-327`）：`detectChangeRisk` 判定高危（design/plan 含 session/lease/daemon 等关键词）且 design.md frontmatter 未显式声明 `risk_level`（!explicit）时，在 verify evidence gate 前发 warning——引导在 design.md frontmatter 加 `risk_level:` 显式覆盖关键词判级（防「不改动 daemon」类否定语境被误判高危）。加了 frontmatter 显式等级后不发 warning（explicit 覆盖）；FAIL 结论照常透出不拦。遵 6417a27：只做关键词级 early-warning 引导，不扩成 design body 语义扫描。

**决策知识库闭环**（2026-08-23-adopt-harness-practices）：archive 六步化——新第 4 步「decision-distill 决策提炼」位于 sync-module-docs 之后、确认归档之前（`src/stages/archive.js:135-144`），把变更 decisions.md 中有实现影响的决策提炼进 `.sillyspec/knowledge/decisions/<模块域>.md` 并幂等维护 INDEX 路由行（提炼/幂等/域兜底本体在 CLI 纯函数 src/decision-distill.js，归 docs-consistency 卡，本步只接线勿手工改写条目格式）；`conditionalWait`（同 sync-module-docs 先例）——常规提炼直接 --done，仅 rejected 条目缺否决理由/复潮条件（`distillIntoKnowledge` 返回 `needsWait` 非空）才 --wait 请用户裁决（`waitOptions` 补录后继续/跳过该条，repeatableWait 上限 3 轮），勿引入 requiresWait 硬门——与下一步「确认归档 --confirm」重复确认（坑 archive-subconfirm-redundant）。
末步「更新路线图和提交」加 `git add .sillyspec/knowledge/decisions/`（`src/stages/archive.js:190`）——精确到 decisions 子目录、勿 add 整个 .sillyspec/knowledge/，不 commit（由用户统一提交工具处理）。

**brainstorm 决策防复潮路由**（2026-08-23-adopt-harness-practices）：Step2「加载项目上下文」加 decisions 库路由（`src/stages/brainstorm.js:49`）——INDEX.md `## Decisions` 段路由行命中时读取对应决策文件，rejected 条目须见否决理由：复潮条件不满足不得重新提出该方案（防复潮），确要复潮在本变更 decisions.md 记 D-xxx@vN+1 新条目说明依据；CLI 预注入 `{DECISION_HITS}` 占位符（runtime 层消费，无命中替换空串零输出）。Step6 决策条目模板加四个可选字段（`src/stages/brainstorm.js:344-347`）：锚点（status=confirmed 时必填）、模块域（取 _module-map.yaml 模块 ID，可多个逗号分隔）、否决理由/复潮条件（status=rejected 时必填）——供归档时 decision-distill 提炼消费。

**verify 检查选择指引与纪律**（2026-08-23-adopt-harness-practices）：新增「检查选择与重复执行纪律」两条（`src/stages/verify.js:37`）——不为凑检查重复执行已通过的检查 + 本地验证聚焦本次变更范围（全量留给 CI/用户明确要求）；新增「检查选择指引（按变更影响面收窄，本地聚焦）」节（`src/stages/verify.js:189`）与 `{EVIDENCE_AUTO_RECOMMENDATION}` 占位符（`src/stages/verify.js:197`，runtime 层注入 evidence-auto 推荐组合供用户否决）；探针/postcheck 检出实现偏差时建议补轻量 postmortem 记录进 QUICKLOG（`src/stages/verify.js:148`，根因块内按列表行写四子字段）。

**quick 嵌套子字段说明**（2026-08-23-adopt-harness-practices）：step2 单行旧形式警告补「嵌套列表行合法」说明（`src/stages/quick.js:103`）——根因块内以列表行形态出现的 `- 现象：`/`- 根因：`/`- 护栏：`/`- 证据：` 嵌套子字段是合法形态（「- 」前缀不构成顶层标签、不参与拆分判定，顶层四字段边界不受影响）；step3 加可选提示（`src/stages/quick.js:105`）——postmortem 场景可改用多行 --output 在根因块内按列表行补四子字段，常规场景仍推荐四参数形式。

**doctor 决策待复核检查**（2026-08-23-adopt-harness-practices，5→6 步）：新第 5 步「决策待复核检查」（`src/stages/doctor.js:331`）——调 docs-check 决策规则族（runDecisionRules，本体归 docs-consistency 卡）扫 knowledge/decisions/ 的 implemented 条目：锚点存在性 + 锚定模块源码 behind 超阈值复核（decisions.behind_threshold 缺省 10），advisory 不阻断、无信号零输出；无法定位 sillyspec 源码时跳过。汇总报告步（`src/stages/doctor.js:391`）加「决策待复核（advisory）」段 + 状态错乱修复后补轻量 postmortem 提示（`src/stages/doctor.js:438`）。

当前固定阶段步骤数：

| 阶段 | 步骤数 | 说明 |
|---|---:|---|
| scan | 10 | step 2 后按项目动态展开 perProject 步骤 |
| brainstorm | 13 | 含可选的需求澄清 Grill 和默认执行的 Design Grill 交叉审查 |
| verify | 7 | 只读验证并写 `verify-result.md` |
| archive | 6 | 第 4 步 decision-distill 决策提炼（conditionalWait）；第 5 步必须带 `--confirm` 才移动归档目录 |
| quick | 3 | 直接在主工作区实现，完成后重置辅助阶段 gate |

## 注意事项

- 修改阶段步骤数量时，ensureStageSteps 会自动同步到 progress.json（检测 steps.length 不匹配）
- archive 步骤顺序不能乱：extract-module-impact 必须在 sync-module-docs 之前；decision-distill 决策提炼在 sync-module-docs 之后、确认归档之前（提炼本体 src/decision-distill.js 归 docs-consistency 卡，stages 卡只管步骤接线与 wait 语义）
- archive `确认归档` 未带 `--confirm` 时会回退为 pending；带 `--confirm` 时由 run.js 移动目录并注销 active change
- quick 的模块同步逻辑与 archive 一致，但跳过用户确认

## 人工备注

<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES 区已迁出至 stages.changelog.md（手工批次，2026-09-07）——新条目追加到 sidecar，勿写回本卡 -->
<!-- MANUAL_NOTES_END -->

## verify 阶段槽位指引（2026-09-08-ir-verify-facts）

verify.js step2（Execute Evidence 传递检查）改 v2 硬门口径：结论写「## 证据账（cannot_verify 任务）」槽段（三选一状态 + verifiedFiles 精确路径 + 豁免后缀）；step7 报告结构章节序列增证据账/集成验证回执两槽段 + 回执四字段说明（绿判据四条件，literals 仅存量回退）。docs/prompt/verify.md 镜像经 _extract/_sync 同步。
