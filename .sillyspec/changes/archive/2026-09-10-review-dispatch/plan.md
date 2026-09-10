---
author: qinyi
created_at: 2026-09-10T13:46:09+0800
plan_level: full
---

# plan：review-dispatch（P2）

## 任务分解与 Wave

### Wave 1（基础件，无内部依赖）
- task-01
  - target_files: NEW:src/stage-review-checklist.js, src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js, NEW:test/stage-review-checklist.test.mjs
- task-02
  - target_files: src/sillyhub-mcp/client.js, test/sillyhub-mcp-platform-fixes.test.mjs

### Wave 2（命令核心，依赖 Wave1 的清单单源）
- task-03
  - target_files: NEW:src/review-dispatch.js, NEW:test/review-dispatch.test.mjs

### Wave 3（接线，依赖 Wave2）
- task-04
  - target_files: src/index.js, src/run/command.js
- task-05
  - target_files: src/stage-review.js
- task-06
  - target_files: src/review-dispatch.js, .sillyspec/local.yaml.example

### Wave 4（验证，依赖全部）
- task-07
  - target_files: NEW:test/review-dispatch.test.mjs

## 关键契约（task 卡展开）

- 在途记录 schema：{ change, stage, missionId, workerId, state: dispatching|in-flight|completed|failed|abandoned, createdAt, lastState, lastStateAt, errorCode? }（无 terminalAt——终态即清记录，与 design 架构图对齐）
- task-01 常量导出名：`REVIEW_CHECKLISTS`（{ brainstorm: string[], plan: string[], execute: string[] }）；task-04 命令入口：`runReviewDispatch(opts)`（src/review-dispatch.js 导出，index.js 注册）
- worker_prompt 必含：单源清单 + renderReviewJsonContract(独立段) + 期望 review.json 路径 + 「read_only：禁止修改任何文件、禁止 git commit，结论只经 artifacts 返回」
- --status 输出三行式：状态行（state/最近迁移时间）/ 停滞行（仅 stalled 时，三选项）/ 下一步行
- 降级指引与 P1 channel_priority 同源（readReviewChannelPriority 取 platform 之后的剩余序）
