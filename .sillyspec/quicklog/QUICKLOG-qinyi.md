
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
