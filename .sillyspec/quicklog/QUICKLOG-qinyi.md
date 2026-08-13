
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
