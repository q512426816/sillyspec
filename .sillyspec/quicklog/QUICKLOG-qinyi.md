
## ql-20260813-003-37c5 | 2026-08-13 10:25:19 | stage review marker 格式 agent 猜错(应为 review- 前缀)
状态：已完成
关联变更：（无）
文件：
- src/run/gates.js（传 reviewRunId+runtimeRoot）
- src/stage-review.js（printStageReviewResult echo 完整路径）
- .claude/skills/sillyspec-execute/SKILL.md（补 run-id CLI 自动勿手算）
- .claude/skills/sillyspec-brainstorm/SKILL.md（同）
- .claude/skills/sillyspec-plan/SKILL.md（同）
- test/stage-review-gate-echo.test.mjs（5用例 echo 路径）
需求：stage review marker 格式 agent 猜错(应为 review- 前缀),改进让 CLI 自动填 runId agent 不算。
根因：CLI 已自动生成 runId+写 marker(prompt.js:460-467 review step 渲染+gates.js:301-304 gate 触发),但撞 gate 报缺 review.json 时没 echo 路径(printStageReviewResult 没用 context.reviewRunId,gates.js:312 没传),agent 不知 runId 手算猜错格式。
方案：gates.js 传 reviewRunId+runtimeRoot + stage-review.js printStageReviewResult FAILED echo 完整路径+勿手算 + 3 skill 补 CLI 自动勿手算 + 测试。
结果：gate-echo 10/10 + stage-review-contract + review-gate-block-message 6/6 + lint 265 过

## ql-20260813-004-1d03 | 2026-08-13 10:50:01 | 处理 sillyspec 工具反馈负面(#1-6)
状态：已完成
关联变更：（无）
文件：
- src/run/prompt.js（loadModuleContextIndex v1 warn 降级+export）
- src/quicklog.js（rotateIfNeeded echo 归档）
- docs/sillyspec/troubleshooting.md（新建 6 节踩坑参考）
- test/prompt-module-map-warn.test.mjs（4 用例 v1 静默）
需求：处理 sillyspec 工具反馈负面(#1-6),可改的 CLI 改(#4 刷屏止血/#5 轮转 echo),不可改的记 troubleshooting(#1/#2/#3/#6)。
根因：#4 刷屏是 prompt.js 对 schema_version=1 每步 warn(读端 buildModuleContextInjection 已 v1/v2 双兼容,warn 过激);#5 轮转是 rotateIfNeeded 静默(提交流漏);#1/#2/#3 是机制/外部不可 CLI 改。
方案：#4 prompt.js loadModuleContextIndex v1 warn 降级(仅缺 schema_version warn)+export 测试;#5 quicklog.js rotateIfNeeded echo 归档;新建 troubleshooting.md 记 6 经验;补 prompt-module-map-warn 测试。
结果：prompt-module-map-warn 4/4 + prompt-placeholders 11/11 + lint 266 过

## ql-20260813-005-fa32 | 2026-08-13 11:17:44 | #4 根治 L1(scan 产 v2 version 一致
状态：已完成
关联变更：（无）
文件：
- src/stages/scan.js（_module-map schema_version 1→2）
- docs/prompt/scan.md（同步 schema_version 1→2）
- docs/prompt/_extracted.json（extract 刷新）
需求：#4 根治 L1(scan 产 v2 version 一致,治根因)。
根因：scan.js prompt 模板仍写 _module-map schema_version:1(rebuild modules.js 已 v2),新 scan 永远产 v1,读端 loadModuleContextIndex 曾对 v1 每步 warn 刷屏(上轮已止血 v1 静默)。
方案：scan.js _module-map schema_version 1→2(line284/316 map,line413 模块卡片不改),字段不变(读端 v1/v2 双兼容 paths||core_files,scan v2 保留 v1 丰富字段 paths/tags/entrypoints/main_symbols/depends_on/used_by 有价值),extract 同步 docs/prompt/scan.md+_extracted.json。
结果：stage-definitions + scan-postcheck 19 + lint 266 过

## ql-20260813-006-9f1e | 2026-08-13 13:34:51 | 修复 scale/plan_level 缝隙
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（review_plan prompt 生成条件对齐 validator）
- docs/prompt/plan.md（同步 review_plan prompt 镜像）
需求：修复 scale/plan_level 缝隙
根因：plan.js review_plan prompt 生成条件 plan_level=full 且 scale≠small 与 validator condition scale≠small 不一致，plan_level=light+scale=large 时 validator 要求 module-impact 但 prompt 不指引
方案：prompt 条件去掉 plan_level=full 改 scale≠small 对齐 validator，同步 docs/prompt/plan.md
结果：npm test 182 绿，缝隙消除

## ql-20260813-007-b923 | 2026-08-13 14:04:48 | quick --files 空格分隔多文件时 CLI 只取首个
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（抽 detectSpaceSeparatedFiles 纯函数检测空格分隔误用加 fail-loud 退码 2）
- test/quick-files-space-separator.test.mjs（纯函数 11 场景加 CLI 子进程 E2E 退码 2 共 17 断言）
需求：quick --files 空格分隔多文件时 CLI 只取首个，其余静默丢失致 allowedFiles 边界失效、step3 --done 审计误拦。
根因：--files 是单值 flag（VALUE_FLAGS 校验循环只跳一个 token），空格分隔的多文件首个之后沦为位置参数，被双横线前缀校验静默忽略。
方案：src/run/command.js 抽 detectSpaceSeparatedFiles 纯函数检测空格分隔误用，fail-loud 退码 2 加 stderr 给出逗号修正建议，沿用 run --json 显式拒绝静默吞风格，不改单值框架。
结果：新增 test/quick-files-space-separator.test.mjs 共 17 断言（纯函数 11 场景加 CLI 子进程 E2E 退码 2），npm test 全量 183 文件零失败，lint 267 文件通过。

## ql-20260813-008-8fd5 | 2026-08-13 14:53:42 | execute review.json 提示路径与校验分裂
状态：已完成
关联变更：（无）
文件：src/run/prompt.js, test/prompt-spec-drift-anchor.test.mjs
需求：execute review.json 提示路径与校验分裂
根因：prompt.js outputStep 用 cwd 拼 SPEC_ROOT 忽略 specDriftAnchor
方案：resolvePromptSpecBase helper 统一 12 处路径根 + 补 specDrift 断言测试
结果：新测试 8/8 绿 + 回归 88 断言绿 + lint 269 过

## ql-20260813-009-2ab8 | 2026-08-13 16:32:41 | ①execute 批量完成路径 cleanup 删分支 ref 盲区（worktree 目录被提前删时 hasUnappliesChanges 判 false …
状态：已完成
关联变更：（无）
文件：
- src/worktree.js（hasUnappliesChanges 三处 fail-closed 保守化：目录不存在/无 diffBase/git 失败 → 保守 true 防 cleanup 删分支）
- src/run/command.js + complete.js + complete-handlers.js（--allow-delete flag 解析 + mergedGuard + 传递链）
- src/run/shared.js + quick-audit.js + stage.js（删除审计 allowDelete 放行 + 提示更新 + guard 持久化）
- src/stages/execute.js（diagnoseNoTaskRootCause 报错精度：4 种根因诊断）
- test/audit-quick-completion.test.mjs（allowDelete 放行 + 文案断言 22/22）
- test/worktree-has-unapplied-changes.test.mjs（保守 true 断言 37/37）
- .claude/skills/sillyspec-quick/SKILL.md（flag 表补 --allow-delete）
需求：①execute 批量完成路径 cleanup 删分支 ref 盲区（worktree 目录被提前删时 hasUnappliesChanges 判 false 致 cleanup 删分支丢 commit）；②quick 删除死代码被硬拦无解锁路径；③plan.md 格式隐性契约报错笼统靠试错。
根因：①hasUnappliesChanges 对目录不存在/无 diffBase/git 失败都返回 false（可安全清理），实际可能有未 apply commit；②删除审计裸判定不受任何 flag 门控；③validatePlanForExecute 只报'没有找到 checkbox task'不分 4 条隐性契约。
方案：①hasUnappliesChanges 三处改 fail-closed 保守 true（拿不准就保留）；②新增 --allow-delete 显式 opt-in 解锁删除（对称 --allow-new，默认仍 fail-closed）；③diagnoseNoTaskRootCause 诊断 4 种根因（Wave 标题格式/task checkbox/### 打断/缺任务区）；同步 SKILL.md flag 表。
结果：audit 22/22 + has-unapplied-changes 37/37 + cleanup-guard 23/23 + 全量 npm test 0 失败 + lint 271 通过。

## ql-20260814-001-4be0 | 2026-08-14 12:18:59 | 把 SillySpec 用企业4A框架映射成架构总纲文档
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/architecture-4a.md（新增4A架构总纲（8节，源码为准校正3处漂移））
需求：把 SillySpec 用企业4A框架映射成架构总纲文档，供对外讲清平台定位
根因：无，纯新增文档，平台此前缺少架构总纲
方案：4个子代理并行深析BA/DA/AA/TA四层并交叉印证，整合成 docs/sillyspec/architecture-4a.md 共8节，以源码为准校正引擎和阶段和步骤数三处旧文档漂移
结果：纯doc改动，lint不扫docs故跳过，无源码与测试影响，文档结构完整

## ql-20260814-002-ff45 | 2026-08-14 12:28:06 | 修 docs/sillyspec 三处文档漂移
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/file-lifecycle/storage-and-state.md（引擎名 better-sqlite3 改 node:sqlite）
- docs/sillyspec/sillyhub-progress-sync-contract.md（引擎名 better-sqlite3 WAL 改 node:sqlite WAL）
- docs/sillyspec/file-lifecycle.md（删 propose 残留行）
需求：修 docs/sillyspec 三处文档漂移，让文档引擎名与阶段表和源码一致
根因：无，纯文档订正。引擎迁 node:sqlite 后旧文档未同步、propose 阶段已并入 brainstorm 但阶段表残留行未删
方案：三处 Edit 改 storage-and-state.md 与 sillyhub-progress-sync-contract.md 的引擎名为 node:sqlite、删 file-lifecycle.md 的 propose 残留行
结果：纯 doc 改动 lint 不扫 docs 故跳过，无源码与测试影响，三处文档与源码对齐

## ql-20260814-003-2ba8 | 2026-08-14 13:23:58 | 订正 .bak 写时机的迁移遗留描述
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/file-lifecycle/storage-and-state.md（.bak 写前备份句改向后兼容兜底说明）
- src/db.js（_openWithFallback 注释订正 .bak 来源）
- src/fs-atomic.js（删 _atomicWriteSync 过时引用）
- src/index.js（文件清单 .bak 描述订正）
需求：订正 .bak 写时机的迁移遗留描述，让注释与文档和 node:sqlite 真相一致
根因：sql.js 时代 _save/_atomicWriteSync 写前备份主 .bak，迁 node:sqlite 后机制移除但 4 处描述未同步
方案：实证 _write 与 transaction 与 _openWithFallback 全路径确认无写入，订正 storage-and-state.md 与 db.js 与 fs-atomic.js 与 index.js 四处
结果：npm test EXIT=0 全量通过，npm run lint 271 files 通过，触及 src 实证核验无回归

## ql-20260814-004-db89 | 2026-08-14 13:38:26 | 闭合 architecture-4a.md §8 自洽
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/architecture-4a.md（§8 .bak 行待澄清改为已订正）
需求：闭合 architecture-4a.md §8 自洽，.bak 漂移行状态更新
根因：无，纯文档闭合。.bak 写时机已于 ql-20260814-003 定论，但 §8 表格仍标待澄清
方案：改 §8 表格 .bak 行最后一列，由需进一步澄清改为已订正见 ql-20260814-003
结果：纯 doc 改动 lint 不扫 docs 故跳过，无 src 与测试影响，§8 四行全部已订正或已校正闭合

## ql-20260814-005-9fdd | 2026-08-14 13:49:49 | completeStep --done 路径不识别 noAI 步骤
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（completeStep 标 completed 前新增 noAI 硬门：检测 currentStepDef.noAI，--done 落 noAI step 执行 _cliAction 三分支 CLI 校验，throw 则保持 pending；imports 补 resolveChangeDir/scan-profile 三函数/plan-postcheck）
- test/run-complete-noai-done-gate.test.mjs（新建回归测试：拦截用例 tasks/ 缺失 → exit 1 + step pending；放行用例合法卡片 → postcheck 完成）
- test/run-complete-step-validator-rollback.test.mjs（fixture 补三张连续卡片 + mkdirSync import：noAI 门后 Contract gate 仍可达，原断言全保留）
- docs/sillyspec/file-lifecycle.md（validator 回滚段补 noai-done-bypass 硬门说明 + updated_at）
- .sillyspec/docs/sillyspec/modules/runtime.md（正文补硬门条目 + 变更索引 ql-20260814-005-9fdd）
需求：completeStep --done 路径不识别 noAI 步骤，agent 对 planPostcheck 等 noAI step 直接 --done 可绕过 executePlanPostcheck 确定性校验。
根因：noAI 校验只在 runStage 推进路径自动执行，completeStep 无 noAI 检测直接标 completed，multi-agent-platform 2026-08-13-spec-sync-visibility tasks/ 从未生成但 plan 阶段 completed 即此漏洞实证。
方案：completeStep 在标记 completed 前检测 currentStepDef.noAI，--done 落到 noAI step 时执行对应 _cliAction 三分支（planPostcheck/scanPreflight/scanPostcheck）CLI 校验，校验 throw 则步骤保持 pending。
结果：新增 test/run-complete-noai-done-gate.test.mjs 两用例 6/6 过，修复受影响既有测试 fixture 一处，npm test 全量 188/0 绿，lint 过，file-lifecycle.md 与 runtime.md 模块文档已同步。

## ql-20260814-006-9a30 | 2026-08-14 14:21:36 | tier 判定不透明——agent 在 plan step1 判 plan_level=light 并按 prompt 自审通过
状态：已完成
关联变更：（无）
文件：
- src/review-tier.js（classifyReviewTier 判定顺序改 plan_level 确定性映射：none/light→self、full→independent；无 plan_level 才退文件数启发式；reason 文案标注判定来源；头注释同步）
- test/stage-review.test.mjs（tier 用例更新：新增 light+7文件→self 与 full+2文件→independent；fileCount 断言移到启发式分支）
- docs/sillyspec/file-lifecycle.md（Stage Review Gate 段判定描述更新 + updated_at）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引追加 ql-20260814-006-9a30）
需求：tier 判定不透明——agent 在 plan step1 判 plan_level=light 并按 prompt 自审通过，完成时 CLI 却按变更文件数 7>3 强制 tier=independent 要求独立 review.json，agent 自主判断被推翻。
根因：classifyReviewTier 判定顺序只认 plan_level=none，light 完全被忽略，文件数启发式成为第二套标准，与 agent 的 plan_level 分级规则（light 定义即 3-5 文件范围可控）直接冲突。
方案：tier 判定权归 plan_level——classifyReviewTier 改为确定性映射 none/light→self（agent 自主判定自审）、full→independent（full 语义即大变更需独立审查），无 plan_level 阶段（brainstorm 等 plan.md 未生成）才退变更文件数启发式（≤3 self）；reason 文案标注判定来源保证透明。
结果：test/stage-review.test.mjs 更新 tier 用例含 light+7文件→self 与 full+2文件→independent 新断言全过，npm test 全量 188/0 绿，lint 过，file-lifecycle.md 与 stages.md 模块文档同步。

## ql-20260814-007-b94b | 2026-08-14 15:33:34 | ①status 输出区分『当前操作目标 change』与『已存在活跃 change 列表』+ 标注空壳 default
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（enforceWaitChoice helper：requiresWait 门 --done --answer / 解 waiting / --continue 三条路径校验 --answer 命中 waitOptions，失败列选项 exit 1）
- src/progress/stage-machine.js（show() 多变更汇总新增「当前操作目标」行 + 目录缺失空壳 change 标注 ⚠️ 残留记录）
- src/stages/brainstorm.js + brainstorm-auto.js（开放回答型澄清追问步骤声明 waitFreeAnswer: true 豁免单选强制）
- test/wait-choice-enforcement.test.mjs（新建：封闭型非选项拦截/命中放行/开放型自由文本豁免 7/7）
- test/wait-done-answer-resolves-waiting.test.mjs（fixture --answer 改合法选项「确认」，原意保留）
- docs/prompt/_extracted.json + docs/prompt/execute.md（重跑 _extract.mjs 修复 4 处 pre-existing 提取漂移：plan review_plan module-impact 条件 scale≠small、execute Wave 补 MCP 派发提示段）
- docs/sillyspec/file-lifecycle.md（核心修正补 wait 单选强制 + status 输出区分两条 + updated_at）
- .sillyspec/docs/sillyspec/modules/runtime.md + stages.md（变更索引 ql-20260814-007-b94b）
需求：①status 输出区分『当前操作目标 change』与『已存在活跃 change 列表』+ 标注空壳 default；②方案选择类 wait 强制 --answer 命中 waitOptions 单选，防 AI 一句话代答。
根因：①StageMachine.show 多变更汇总无操作目标概念、不标目录缺失空壳；②completeStep/continueStep 的 --answer 只校验非空不校验命中选项。
方案：①stage-machine.js 新增『当前操作目标』行 + 空壳 ⚠️ 标注；②complete.js 新增 enforceWaitChoice helper 覆盖三条 answer 路径（requiresWait 门/解 waiting/--continue），开放回答型 waitFreeAnswer 豁免（brainstorm 澄清追问声明）；stage 定义改动触发 docs/prompt 重提取，顺带修复 4 处 pre-existing 提取漂移（plan review_plan/execute Wave MCP 段），同步 execute.md。
结果：wait-choice-enforcement.test.mjs 7/7 + wait-done-answer fixture 适配（--answer 改合法选项，原意保留）+ 全量 189/0 绿 + lint 过 + docs/prompt 与 file-lifecycle.md/模块文档同步。

## ql-20260814-008-fd62 | 2026-08-14 16:05:48 | 修正 src/sync.js 两处与实现不符的漂移注释
状态：已完成
关联变更：（无）
文件：
- src/sync.js（两处漂移注释修正（syncDocuments 触发源 + mcp 段 token 双写语义））
- .sillyspec/docs/sillyspec/modules/sync.md（变更索引追加 ql-20260814-008-fd62）
需求：修正 src/sync.js 两处与实现不符的漂移注释，消除文档/注释对同步行为的错误描述。
根因：① 头注释称 syncDocuments 由 run 流程触发，实际唯一调用点是手动 platform sync-docs（index.js:1255），run 流程不自动推文档；② mcp 段同源假设注释称复用 platform 的 url/token，实际 token 双写不同（platform 段写换发的 shpsync_ effectiveToken，mcp 段写原始 user token）。两处注释误导后续维护。
方案：① 头注释移除 syncDocuments，保留 sync/checkApproval 的 run 流程触发描述，注明 syncDocuments 仅手动触发；② mcp 段注释改为准确描述 url 复用 + token 用原始 user 级 token。同步 sync 模块文档 sync.md 变更索引。
结果：npm run lint（273 文件通过）+ npm test（189 文件 0 失败）+ platform-recovery-chain.test.mjs（15/15）全绿。

## ql-20260814-009-1887 | 2026-08-14 21:26:37 | 三维度安全审查后修复 P1 高危项（两 CVE + shell 注入面 + marker 注入链 + 入口消毒）
状态：已完成
关联变更：（无）
文件：
- package.json + package-lock.json（npm 升级 js-yaml 4.2.0→4.3.1 修 CVE-2026-59870 二次方 CPU DoS、ws 8.18→8.21.3 修内存披露+分片耗尽两个 CVE）
- src/verify-postcheck.js（git diff refSpec 由 execSync 字符串拼接迁 execFileSync 数组 + assertSafeRefSpec 白名单，堵 meta.json refSpec 注入 shell；正则放行 HEAD~1..HEAD 区间）
- src/worktree.js（junction 解链 rmdir 两处迁 execFileSync 数组，堵 meta.worktreePath 引号截断注入）
- src/worktree-deps.js（mklink /J 与 ln -s 迁 execFileSync 数组，堵 local.yaml 模块 path 反引号/$() 命令替换）
- src/task-review.js（新增 isValidExecuteRunId 格式校验；summarizeTaskCompletion/resolveLatestExecuteRunId/generateTaskReviewDrafts/getLatestExecuteRunId 四处 marker 读取点全覆盖，非法 warn+回退目录扫描）
- src/run/prompt.js（{EXECUTE_RUN_ID} 注入点接格式校验，非法视为缺失重生成）
- src/run/gates.js（enforceReviewJsonGate 与 task-reviews gate 两处 marker 读取接格式校验）
- src/run/complete.js（autoCheckPlanFromReviews marker 读取接格式校验，非法跳过不误勾）
- src/run/stage.js（execute 启动 marker 读取接格式校验）
- src/quicklog.js（新增 sanitizeQuicklogUser 白名单消毒 git user.name，QUICKLOG 文件/锁/轮转归档三处拼接防穿越写）
- src/index.js（gate/derive/backfill-reviews/register-stage-review/progress 五入口补 assertSafeChangeName，与 run 入口防护对齐）
- test/worktree-junction-fail-loud.test.mjs（mock 计数目标从 execSync 迁 execFileSync，仅计数 cmd.exe rmdir 调用避开 git-helper 干扰）
- test/execute-run-marker-drift.test.mjs（新增 isValidExecuteRunId 8 用例：合法/穿越/多行注入/非补零/null 等）
- test/gate-derive-spec-drift.test.mjs（fixture marker 改格式合法 ID，保负对照语义）
- docs/sillyspec/platform-interface-map.md（修 3 处行号漂移 command.js:245→247、index.js:1369→1368-1369）
需求：三维度安全审查后修复 P1 高危项。
根因：js-yaml/ws 两 CVE；三处 execSync 字符串拼接经 agent 可写的 meta.json/local.yaml 可注入 shell 命令；EXECUTE_RUN_ID marker 无格式校验直接注入 prompt + 拼 review 路径（提示词注入+路径穿越）；git user.name 与 5 个 CLI 顶层入口未消毒。
方案：npm 升级两依赖；全部迁 execFileSync 数组形式 + 白名单校验；isValidExecuteRunId 覆盖全部 8 个 marker 读取点；sanitizeQuicklogUser 消毒；5 入口补 assertSafeChangeName。
结果：npm audit 0 漏洞；全量 npm test 190 文件 0 失败；lint 274 文件过；doc-ref-check 78 处引用全绿。

## ql-20260814-010-5741 | 2026-08-14 21:34:50 | 把文档行号引用一致性变成 npm test 硬门——platform-interface-map.md 的 file:line 漂移自动红灯
状态：已完成
关联变更：2026-08-14-doc-ref-check
文件：
- test/doc-ref-check.test.mjs（新增文档行号引用校验（两层断言+多候选+token归一，进 npm test））
- docs/sillyspec/platform-interface-map.md（修 16 处行号漂移+token 错位（并行 agent 改动+方向1注释推动））
- .sillyspec/changes/2026-08-14-doc-ref-check/（brainstorm 四件套（proposal/design/requirements/tasks））
需求：把文档行号引用一致性变成 npm test 硬门——platform-interface-map.md 的 file:line 漂移自动红灯，治『每轮人工核对都能查出问题』。
根因：文档是源码二级抽象，行号随源码增删漂移且无自动检测；四轮人工核对查出 5 个实质错误证明纯人工不可靠。
方案：新增 test/doc-ref-check.test.mjs 单文件两层断言（存在性+代码符号关键词窗口）+多候选宽容+token 归一；首跑抓 16 处失效，修工具 4 缺陷后修文档 16 处真漂移；FR-07 双篡改自测过。
结果：doc-ref-check 77 处引用全绿（56 带关键词断言）；篡改自测红灯定位准确；全量 npm test 190 文件 0 失败；lint 274 文件过。

## ql-20260814-011-4ffb | 2026-08-14 21:55:20 | 安全审查 P2 遗留 6 项登记债单 + P1 修复显式 pathspec 提交（27d5f59）
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/prompt-control-debt.md（追加 2026-08-14 增补小节：P1 已修记录 + sec-a~f 六项 defer + 低优先杂项清单；updated_at 戳）
- （P1 提交 27d5f59 的 18 文件已随 ql-20260814-009 记录，此处含提交动作本身）
需求：安全审查 P1 修复提交后，把 6 项 P2 遗留登记 prompt-control-debt.md，防止丢失。
根因：审查产出只有会话内报告，不落债单会被下次『新发现』重复提议（memory：改进建议先查债单）。
方案：按债单惯例追加增补小节；显式 pathspec 提交隔离他者 doc-ref-check 暂存。
结果：npm test 190/0 + lint 274 过 + 提交后他者暂存文件完好（git status 核验）。

## ql-20260814-012-109e | 2026-08-14 22:01:05 | 债单 P2 第一批：URL encode/YAML 引号/note 单行化/SKILL 路径/https warn/dashboard 拒凭据/setup 锁版本
状态：已完成
关联变更：（无）
文件：
- src/sync.js（三处 changeName 拼 URL 补 encodeURIComponent 对齐 pull 范式；connect 写侧 yamlStr 双引号包裹 url/token/user；parseSimpleYaml 对称剥引号）
- src/quicklog.js（parseFileNotes note 单行化+限长 200，防 
## ql- 伪造条目结构）
- .claude/skills/sillyspec-execute/SKILL.md + sillyspec-plan/SKILL.md（repos 示例去 C:/Users/qinyi 本机路径改通用示例，sec-f）
- .claude/skills/sillyspec-knowledge/SKILL.md（author 示例 qinyi 改 <git-user>）
- src/sillyhub-mcp/client.js（构造器一次性 warn 非 https 且非 localhost url——sec-e 缓解）
- packages/dashboard/server/index.js（isCredentialPath 拒 local.yaml/.lock/平台指针经 /api/docs/content 暴露——sec-d 最小修；前端 bundle 零引用实证无破坏）
- src/setup.js（六个 MCP 版本锁定消 @latest trust-on-future-publish——sec-c；@anthropic-ai/agent-browser 404 改 agent-browser@0.34.0、@nicobailon/mysql-mcp-server 404 改 mysql-mcp-server@0.1.3；DB MCP 写 mcp.json 后 git 跟踪检测警告）
- test/local-yaml-preserve.test.mjs + test/platform-sync-user-config.test.mjs（yaml 断言改引号包裹格式，语义断言 _getPlatform 读回不变）
需求：债单 P2 第一批小改动合集（sec-c/d/e/f + 低优先杂项），均无需单独设计。
根因：URL 拼接未编码可路径注入；YAML 裸写 token 含 # : 时破坏段结构；note 带换行可伪造条目；SKILL 随包发布含开发者本机路径；非 https url 下 Bearer token 明文上线；dashboard 无鉴权可读 local.yaml 凭据；@latest 浮动版本是 trust-on-future-publish 供应链面。
方案：见文件括注。
结果：npm test 190/0 + lint 274 过；隔离环境验证 path-a-probe 59/0（主仓该用例失败系本机 local.yaml 有 mcp 段的环境依赖，非回归，与 memory spec-dir 隔离同款问题）。

## ql-20260814-013-ef64 | 2026-08-14 23:06:52 | 修复 platform resolve 参数解析 bug
状态：已完成
关联变更：（无）
文件：
- src/index.js（platform resolve 变更名解析：--change 优先→非 flag 位置参数→唯一冲突自动选中+报错列候选）
- src/sync.js（新增顶层 listConflictFiles(cwd) 便捷导出）
- test/platform-resolve-args.test.mjs（新建 6 场景回归测试（flag-first/--change/自动选中/报错列候选））
- docs/sillyspec/platform-interface-map.md（approve triggerPull 行号漂移同步 1368→1395）
需求：修复 platform resolve 参数解析 bug，flag 放前面时被误当变更名。
根因：case resolve 盲取 platformArgs[0] 当变更名，不剥离 flag，--change 写法被静默忽略，报错文案指向假变更名误导排查。
方案：变更名解析顺序改为 --change 值→非 flag 位置参数→唯一未决冲突自动选中；无变更名多冲突/指定名无冲突时报错列出 .runtime 现有候选；sync.js 新增 listConflictFiles 顶层导出。
结果：新增 test/platform-resolve-args.test.mjs 六场景全过，npm test 191 文件全绿，lint 通过，platform-interface-map.md 行号引用同步，sync.md 模块文档已更新。

## ql-20260814-014-1d5f | 2026-08-14 23:35:00 | 登记两份 SillyHub API 文档产出并入库
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/sillyhub-api-reference.md（新建 SillyHub 接口参考（REST 8 端点 + MCP 12 tool 完整调用规范））
- docs/sillyspec/api-verification-2026-08-14.md（新建全接口实测报告（12 MCP tool + REST 8 端点验证快照与当日修复记录））
- docs/sillyspec/platform-interface-map.md（配套文档行补两份新文档引用）
需求：登记两份 SillyHub API 文档产出并入库。
根因：无代码缺陷，纯文档新增（用户实测产出）。
方案：docs/sillyspec/ 下入库 api 参考与实测报告两份新文档，platform-interface-map.md 配套文档行同步引用。
结果：纯 doc 改动，lint 不扫 docs 跳过，无源码影响，文档齐备可随本次发布一起推送。

## ql-20260815-001-046c | 2026-08-15 13:19:24 | 处理三条负面反馈：①Wave 2b 标题解析报错不提示根因 ②worktree apply diff 规模 2000 行阈值误伤正常 change ③gen:t…
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（validatePlanForExecute 新增检查0：Wave 编号字母后缀（2b）显式报错（治静默截断合并））
- src/worktree-apply.js（检查6 diff 规模改两档：2000-5000 WARNING / >5000 BLOCKED）
- test/plan-diagnose-wave.test.mjs（新建 11 断言（字母后缀报错+4 诊断分支回归））
- test/worktree-apply-diff-size.test.mjs（新建 3 场景真实 git worktree（2368 警/5500 拦/1500 放））
- docs/sillyspec/platform-interface-map.md（execute.js 行号漂移 497→509）
- docs/sillyspec/prompt-control-debt.md（exec-h 补 2026-08-15 复盘观察（gen:types worktree 收尾预跑→commands.build 通用化 gate 思路））
需求：处理三条负面反馈：①Wave 2b 标题解析报错不提示根因 ②worktree apply diff 规模 2000 行阈值误伤正常 change ③gen:types 与 worktree 配合缺收尾预跑。
根因：①解析正则不锚定结尾，2b 被 parseInt 截断成 2 与显式 Wave 2 静默合并强制并行，串行意图失效无提示；②单档 >2000 即 BLOCKED，+2368 行正常变更被逼进 rescue cp 手动路径；③gen:types 是 consumer 命令，SillySpec 不该认识（定位约束），且 exec-h 债单已裁决 defer。
方案：①validatePlanForExecute 加字母后缀显式报错（说明截断风险+解法）；②两档阈值 2000 警/5000 拦；③债单 exec-h 补通用化思路（commands.build 收尾 gate）。
结果：新增两测试文件 14 断言全过，npm test 193 全绿，lint 277 过，platform-interface-map 行号同步，债单 exec-h 补观察。

## ql-20260815-002-d025 | 2026-08-15 13:56:15 | resolveSpecDir 加 home 拒绝守卫，根治 ~/.sillyspec 平行进度库污染
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（resolveSpecDir 加 home 拒绝守卫：向上遍历跳过 os.homedir() 层，home 下 .sillyspec 恒不命中，回退 cwd/.sillyspec）
- src/progress.js（同名 resolveSpecDir 拷贝删除，改 re-export run/shared.js 单一真相源，防双写漂移）
- test/spec-dir-home-guard.test.mjs（新建 8 断言：单元 5（子目录/home 自身/多层/真项目不受影响/正常链）+ e2e（home 存在 .sillyspec 时子目录跑 CLI 不写 home 库））
- docs/sillyspec/troubleshooting.md（补第 7 条：home 平行进度库两层根因与根治记录）
- docs/sillyspec/platform-interface-map.md（shared.js 函数行号漂移同步）
需求：resolveSpecDir 加 home 拒绝守卫并补测试，根治 ~/.sillyspec 平行进度库污染自我延续。
根因：resolveSpecDir 向上查找 .sillyspec 无 home 守卫，smoke 测试在 home 下临时目录种下 ~/.sillyspec 后，任何 home 子目录跑命令都向上撞它；且 ProgressManager._ensureDB 读路径即建库，读到哪建到哪。另发现 progress.js 存在同函数双源拷贝（无守卫），progress 命令实际走的是它。
方案：resolveSpecDir（src/run/shared.js）向上遍历跳过 os.homedir() 一层，home 下 .sillyspec 恒不命中回退 cwd/.sillyspec；progress.js 同名拷贝删除改 re-export run/shared.js（单一真相源防双写漂移）；存量 ~/.sillyspec 备份后整目录删除（备份 ~/.sillyspec-backup-20260815/）。
结果：新增 test/spec-dir-home-guard.test.mjs 8 断言全过（单元 5 + e2e：home 存在 .sillyspec 时子目录跑 CLI progress show 不写 home 库）；npm test 全量绿 + lint 278 过（本会话范围；另有 3 个失败文件系并行 session 未完成改动，stash 验证非本改动引入）；troubleshooting.md 补第 7 条；platform-interface-map.md 行号同步。

## ql-20260815-003-5a03 | 2026-08-15 13:56:33 | （废弃：--help 误开的空壳会话，无实际改动）
状态：已废弃
关联变更：（无）
文件：（无）

## ql-20260815-004-64fc | 2026-08-15 14:23:58 | (quick 任务)
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260815-005-c1b1 | 2026-08-15 14:41:42 | 修 `run quick --help` 误开会话写 QUICKLOG（--help 静默吞）
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（新增 printStageUsage helper + runCommand flag 校验后 --help/-h 短路退出 0（副作用前拦截）；knownFlags 补 -h）
- test/run-help-shortcircuit.test.mjs（新建 15 断言：三入口短路（exit 0+帮助文案）+ 副作用零容忍（不增 quick-sessions/不增 ql）+ 未知 flag 仍拦）
- docs/sillyspec/troubleshooting.md（补第 8 条：--help 静默吞根因与修复记录）
需求：run <stage> --help/-h 应在任何 stage 流程前短路返回帮助，不建会话不写库（run quick --help 此前误开 quick 会话+写 QUICKLOG 骨架）。
根因：--help 在 runCommand knownFlags 白名单里被静默吞掉，无任何短路逻辑，流程继续走 cwd 纠正→quick 会话创建→QUICKLOG 落盘；-h 不在白名单被当未知参数 exit 2。
方案：runCommand 在 flag 校验通过后、任何副作用之前检测 --help/-h 短路，新增 printStageUsage 打印 stage 用法帮助退出 0；-h 补进 knownFlags；未知 flag 校验不变。troubleshooting.md 补第 8 条。
结果：新增 test/run-help-shortcircuit.test.mjs 15 断言全过（run quick --help/-h 退出 0+输出帮助+不增 quick-sessions 目录+不增 ql 条目；brainstorm/scan/顶层别名同测；--halp 仍 exit 2）；npm test 全量绿；lint 280 过。
