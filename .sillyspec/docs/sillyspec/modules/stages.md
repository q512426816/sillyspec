---
schema_version: 1
doc_type: module-card
module_id: stages
author: qinyi
created_at: 2026-06-04T16:55:00+08:00
updated_at: 2026-08-06T06:34:27+08:00
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

**execute prompt 路径约定**（2026-07-11 占位符化，坑 2）：execute stage prompt 中 review.json / endpoints.json 路径用 `{SPEC_ROOT}/.runtime/` 占位符（非裸 `.sillyspec/.runtime/` 硬编码）。`{SPEC_ROOT}` 由 `run.js` 平台路径重写消费——仓库内模式→`.sillyspec`，平台模式（specDir 指向外部目录）→specDir。修复平台模式下 review.json 落盘路径错位（`execute.js:623/644`）。

**plan 完成校验**（2026-08-05，`plan-postcheck.js`）：`validateTaskCommands` 扫每个 TaskCard 的 `verify`/`implementation` 字段里 `npm/pnpm/yarn run <script>` 命令，按 `cd <subdir> &&` 前缀或 local.yaml `modules` 块定位子包 package.json 查脚本是否存在（monorepo 感知），不存在 → error 硬阻断 plan 完成（共享 helper `validateScriptCommands` 在 `src/stages/cmd-existence.js`，scan-postcheck 复用时维持 warning）。`validatePlanFeasibility` 另加 acceptance best-effort 字段 grep——从 acceptance 文本提 snake_case/camelCase 标识符 grep `allowed_paths` 源文件，未命中 → warning（不阻断，给 LLM 审查提线索）；`plan.js` `stepReviewPlan` 审查清单加「acceptance 对照实际 schema/类型源核验存在性与形态」条。

**verify detectChangeRisk 早期 warning**（坑2，2026-08-06，`stage-contract.js:448`）：`detectChangeRisk` 判定高危（design/plan 含 session/lease/daemon 等关键词）且 design.md frontmatter 未显式声明 `risk_level`（!explicit）时，在 `validateVerifyResult` 的 evidence gate 前发 warning——引导在 design.md frontmatter 加 `risk_level:` 显式覆盖关键词判级（防「不改动 daemon」类否定语境被误判高危）。加了 frontmatter 显式等级后不发 warning（explicit 覆盖）；FAIL 结论照常透出不拦。遵 6417a27：只做关键词级 early-warning 引导，不扩成 design body 语义扫描。

当前固定阶段步骤数：

| 阶段 | 步骤数 | 说明 |
|---|---:|---|
| scan | 10 | step 2 后按项目动态展开 perProject 步骤 |
| brainstorm | 13 | 含可选的需求澄清 Grill 和默认执行的 Design Grill 交叉审查 |
| verify | 7 | 只读验证并写 `verify-result.md` |
| archive | 5 | 第 4 步必须带 `--confirm` 才移动归档目录 |
| quick | 3 | 直接在主工作区实现，完成后重置辅助阶段 gate |

## 注意事项

- 修改阶段步骤数量时，ensureStageSteps 会自动同步到 progress.json（检测 steps.length 不匹配）
- archive 步骤顺序不能乱：extract-module-impact 必须在 sync-module-docs 之前
- archive `确认归档` 未带 `--confirm` 时会回退为 pending；带 `--confirm` 时由 run.js 移动目录并注销 active change
- quick 的模块同步逻辑与 archive 一致，但跳过用户确认

## 人工备注

<!-- MANUAL_NOTES_START -->
- ql-20260604-001-7a4c | 对齐 file-lifecycle 文档与阶段实现，修复 brainstorm/propose 步骤丢失和 archive confirm 生命周期。
- ql-20260617-003-c3d9 | 收紧 Grill 流程语义，合并需求澄清 pass，并增强决策 ID/record 解析。
- ql-20260617-004-a91f | 缺 priority 的 unresolved/blocking decision 按 P1 阻断，并补充 parser 回归测试。
- ql-20260803-002-eff0 | archive step3 sync-module-docs 加 requiresWait，--continue 确认后回到本步由 agent 写模块卡片（修 verify-archive-flow-pitfalls 坑4）。
- ql-20260804-003-e439 | plan-postcheck 加 title_zh 完整性硬校验（prompt-control-debt plan-b：防子代理为压 20~40 行静默丢 frontmatter 字段）。
- ql-20260806-001-3e12 | 工具驾驭复盘 3 条反馈：brainstorm §6 文件变更清单加「字段数据流标注」引导（新增字段须交代 producer→consumer + 每跳归一化点）；plan related_tests 判据由「源文件是否共享」改为「既有测试断言是否失效」（覆盖 UI 文案/常量/签名等单文件场景）；stage-review review.json missing 加 .sillyspec 拼写变体检测提示（新增 src/spec-dir-typo.js）。
- ql-20260806-002-c4dd | 工具驾驭复盘第二批 exec-e/f：execute.js buildWavePrompt 调度要求 item4 + acceptanceSteps「运行测试」步加「既跑 lint check 也跑 formatter（ruff format/prettier --write）」引导（只 check 不 format 会留到 commit 被 pre-commit hook 拦）；「确认 worktree 路径」步加工具链预告（先 --version 确认，缺则 uv tool install/uv sync）。
- ql-20260807-002-cc15 | 修复 sss.md 报告的 4 个 P0 提示词/源码一致性缺陷：verify 探针5/6 把 advisory 误写成硬门控→措辞降级为 advisory（verify-probes.md+verify.js，源码本就 advisory 不硬阻断）；review-tier 示例 ≤5→≤3（docs/prompt 5 处说明段，源码阈值=3）；archive step2 删跑不通的伪 workflow 命令；doctor step0 删悬空 else/fi；同步 docs/prompt 镜像 + 重跑 _extract。
- ql-20260809-005-491b | brainstorm「生成规范文件」step 的 proposal/requirements/tasks 模板顶部内联 author/created_at frontmatter 块（tasks 补骨架模板插到 decisions 前），消除 agent 照抄 H1 标题漏写元数据；末尾注把"第一行标题"改为"标题（frontmatter 在前）"并文件列表补 tasks；同步 docs/prompt/brainstorm.md 镜像（重跑 _extract + 正则逐字替换 step8 块）。
- ql-20260812-006-d70c | execute.js buildWavePrompt「子代理 prompt 要点」加第 5 项「测试用例设计」复制引导 + `{{include: testcase-design}}`（task 含测试代码时调度者整段复制进子代理 prompt）；单一源 templates/prompts/testcase-design.md 6 条检查（覆盖/断言/行为vs实现/契约回归/时间敏感分支/隔离确定性），复用 P2.2.3 include 机制防三处手抄漂移；同步 docs/prompt 重提取 + README include 表。
- ql-20260812-009-dcb9 | verify 探针 3 加第 5 点「断言有效性抽查」（advisory persuasion 非硬门，同 full-a 集成盲区提示先例）：对核心测试抽查 ① 真实断言非空断言/getter setter ② 边界异常覆盖 ③ 测行为不测实现，与 execute testcase-design.md 6 条闭环；verify.js verify-result.md「探针结果」模板「测试覆盖」行改「测试覆盖（含断言有效性抽查）」；同步 docs/prompt 重提取 + verify.md 模板行；新增回归测试 verify-probes-assertion-quality.test.mjs 8 断言。
<!-- MANUAL_NOTES_END -->
