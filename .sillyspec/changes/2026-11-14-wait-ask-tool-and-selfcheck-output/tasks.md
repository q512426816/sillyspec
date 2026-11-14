---
author: flow-machine-draft
created_at: 2026-11-14T14:12:32.544Z
---
# 任务注册表（Tasks）— 2026-11-14-wait-ask-tool-and-selfcheck-output

- [x] task-01: src/stages/brainstorm.js 方案步「### 输出」行补自检结果产物（四行检查逐行打勾，有 ✗ 回到对应处理），使自检可审计
- [x] task-02: src/run/prompt.js 完成后执行段的 requiresWait 分支与 mayNeedWait 分支注入提问方式指引：优先用 harness 交互询问工具（Claude Code 即 AskUserQuestion）呈现问题与候选项，拿到回答逐字带入 --answer 收口；harness 无该工具才退纯文字提问
- [x] task-03: auto 模式不注入该指引（脚本驱动无交互 UI）
- [x] task-04: docs/prompt/_extracted.json 与 docs/prompt/brainstorm.md 镜像逐字同步，README 注入框架节同步新指引
- [x] task-05: test/brainstorm-solution-constraint-gate.test.mjs 与 test/output-step-render.test.mjs 补断言并全绿
