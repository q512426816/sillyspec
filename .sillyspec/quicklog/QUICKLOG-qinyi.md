
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
