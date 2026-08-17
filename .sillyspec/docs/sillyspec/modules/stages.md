---
schema_version: 1
doc_type: module-card
module_id: stages
author: qinyi
created_at: 2026-06-04T16:55:00+08:00
updated_at: 2026-08-16T19:05:00+08:00
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

**verify detectChangeRisk 早期 warning**（坑2，2026-08-06，`stage-contract.js:469-490`）：`detectChangeRisk` 判定高危（design/plan 含 session/lease/daemon 等关键词）且 design.md frontmatter 未显式声明 `risk_level`（!explicit）时，在 verify evidence gate 前发 warning——引导在 design.md frontmatter 加 `risk_level:` 显式覆盖关键词判级（防「不改动 daemon」类否定语境被误判高危）。加了 frontmatter 显式等级后不发 warning（explicit 覆盖）；FAIL 结论照常透出不拦。遵 6417a27：只做关键词级 early-warning 引导，不扩成 design body 语义扫描。

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
- ql-20260604-001-7a4c | 对齐 file-lifecycle 文档与阶段实现，修复 brainstorm 步骤丢失和 archive confirm 生命周期。
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
- ql-20260812-010-a950 | quick.js step2「实现并验证」操作 3 加"写测试时按下方「测试用例设计」检查" + 注入 `{{include: testcase-design}}`（复用单一源、模板自带标题；quick 静态 stage 无子代理派发，include 直接在 step prompt 解析）——quick 档位（≤3 文件小改动）测试质量与 execute/verify 同闭环；同步 docs/prompt 重提取 + quick.md step2 镜像 + include 注记；新增回归测试 quick-testcase-design-include.test.mjs 8 断言。
- ql-20260814-006-9a30 | review-tier tier 判定权归 plan_level（tier-plan-level 改造）：classifyReviewTier 改为确定性映射 none/light→self、full→independent，无 plan_level 阶段（brainstorm）才退文件数启发式（≤3 self）——此前 light+>3 文件被文件数强制 independent，agent 的 plan_level 自主判定被 CLI 第二套标准推翻且不透明（实证 agent 判 light 自审通过、完成时被 7 文件强制 independent review.json）。
- ql-20260814-007-b94b | brainstorm/brainstorm-auto 开放回答型 wait 步骤声明 waitFreeAnswer: true（「对话式探索与需求澄清」澄清追问），豁免 wait 选项单选强制（wait-choice-enforcement，complete.js enforceWaitChoice）——封闭单选 wait 的 --answer 必须命中 waitOptions，开放型为自由文本。**〔2026-08-16 移除〕**单选强制整道移除后 waitFreeAnswer 标记随之删除（豁免语义不再存在），wait 步骤 --answer 统一接受任意非空文本；waitOptions 保留仅作展示。
- ql-20260815-021-9886 | 坑6 修复：parseAllowedPaths/parseDependsOn 块正则 `[ \t]*` 化（原 `\s*\n` 贪婪吃换行，标准 YAML 顶格块列表 `allowed_paths:\n- a.js` 永远失配被静默判缺字段）+ 解析器入口统一 CRLF→LF（保护 worktree-apply/task-review 原生 readFileSync 调用方）+ allowed_paths 剥成对反引号；executePlanPostcheck 六检查改聚合输出（全部跑完一轮列出全部失败类，原失败一个抛一个）；stage-contract entry-point-wiring 复用 parseAllowedPaths 消同源漂移。
- ql-20260816-008-c809 | quick.js step3 prompt 删「QUICKLOG 在 .sillyspec/（gitignore）」错句——QUICKLOG 实际 git 跟踪（.sillyspec/quicklog/，--done 后需提交），改「.sillyspec/quicklog/（git 跟踪，--done 后需提交）」；同步 docs/prompt/quick.md 镜像（self-audit-2026-08-16 D21d）。
- ql-20260816-011-a79a | D 组 plan 系（self-audit D15/D19/D21b/D21c/D21）：plan step3 module-impact 生成段补「更新结果」表骨架（与 gates 死信门控同格式，agent 不再从 gate 报错反推格式）；主 agent TaskCard 验收清单改硬校验 9 字段/规范约定 5 字段分组（三份清单同源）；plan_level 落盘 plan.md frontmatter 持久锚点（治跨步对话记忆失忆）；taskcard-rules.md 补 title/title_zh 双语同义说明（治两字段逐字节相同的仪式化）；清 generate_blueprints 代号与 archive 维护注释。
- ql-20260816-012-a975 | D 组 verify 系（self-audit D16/D17/D21）：任务蓝图验收改对照 TaskCard frontmatter acceptance 列表逐条核验（原「checkbox 勾选」与 TaskCard 协议矛盾，产物正文无 checkbox）；verify-result Runtime Evidence 模板通用化（去 sillyhub 专有词，改按实际触碰组件填写，治模板教堆关键词过字面 gate 的自我拆台）；verify-probes.md 端点对账示例改通用占位；清旧 prompt 迁移史注释。
- ql-20260816-013-00e8 | D 组 scan/execute/brainstorm 系（self-audit D18/D21）：scan.js:141 node -e import 内部源码命令改 sillyspec workflow check scan-docs --project 子命令 + execute.js:326 改 sillyspec worktree meta（consumer 项目不再 ERR_MODULE_NOT_FOUND，同功能 CLI 子命令已存在）；brainstorm.js step8/scan.js Step11 检查项9 数字 step 引用改 step name（P6.4 裁决漏网）。同步 _extracted + 三镜像。
- ql-20260816-014-4a60 | D20 execute 指令强度收敛（纯减法）：去 5 处装饰性「（必须严格遵守）/（必须执行，不可跳过）」标题缀 + 收敛 Wave 步「必须并行+禁止串行等待」双强度为单一必须（必须 19→14、必须严格遵守 4→0）；保留全部承重 enforcement（并行/前台/Wave 字面/ID/编译纪律/lint+format）；同步 _extracted + execute.md 镜像 + 派发测试断言（旧标题字面）。
- 2026-08-17-quick-close-linked-changes | quick.js step3 prompt「收尾推荐顺序」第 2 步补自动归档说明：--linked-changes 关联的真实变更 tasks.md 全勾选时 CLI 自动归档到 changes/archive/，无需再跑完整 archive 阶段；同步 file-lifecycle.md / quick.md 镜像 / sillyspec-quick SKILL.md。
- ql-20260817-005-4369 | execute.js buildWavePrompt「子代理 prompt 要点」新增第 6 项「增量落盘与中断接手指引」（429/API 配额/会话中断时输出已完成清单，主代理按磁盘产物接手）和第 7 项「任务边界铁律」（严格只实现本 task allowed_paths、design 指定接入位置逐字遵守、禁止顺手实现其他 task）；同步 docs/prompt/execute.md 镜像 + execute-dispatch-integration 断言。
<!-- MANUAL_NOTES_END -->
