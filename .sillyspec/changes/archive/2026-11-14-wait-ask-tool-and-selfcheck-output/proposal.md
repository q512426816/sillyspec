---
author: flow-machine-draft
created_at: 2026-11-14T14:12:32.544Z
---
# 提案书（Proposal）— 2026-11-14-wait-ask-tool-and-selfcheck-output

## 动机

任务原话转写：等待点询问工具化与方案自检入产物

动机与背景：2026-11-13-brainstorm-solution-constraint-gate 上线后实测两处缺口：① 方案步「### 输出」契约未把自检结果列为产物，模型按输出契约组织产物导致自检表被整体跳过；② 完整流程各阶段 wait 等待点只注入命令模板（src/run/prompt.js「完成后执行」段），无提问方式指引，agent 只发纯文字问题不触发交互询问工具——轻量变更体验好是因为 src/flow.js 三断点横幅明确要求 AskUserQuestion，run 层注入框架缺同款指引。

成功标准：
- src/stages/brainstorm.js 方案步「### 输出」行补自检结果产物（四行检查逐行打勾，有 ✗ 回到对应处理），使自检可审计
- src/run/prompt.js 完成后执行段的 requiresWait 分支与 mayNeedWait 分支注入提问方式指引：优先用 harness 交互询问工具（Claude Code 即 AskUserQuestion）呈现问题与候选项，拿到回答逐字带入 --answer 收口；harness 无该工具才退纯文字提问
- auto 模式不注入该指引（脚本驱动无交互 UI）
- docs/prompt/_extracted.json 与 docs/prompt/brainstorm.md 镜像逐字同步，README 注入框架节同步新指引
- test/brainstorm-solution-constraint-gate.test.mjs 与 test/output-step-render.test.mjs 补断言并全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. src/stages/brainstorm.js 方案步「### 输出」行补自检结果产物（四行检查逐行打勾，有 ✗ 回到对应处理），使自检可审计
2. src/run/prompt.js 完成后执行段的 requiresWait 分支与 mayNeedWait 分支注入提问方式指引：优先用 harness 交互询问工具（Claude Code 即 AskUserQuestion）呈现问题与候选项，拿到回答逐字带入 --answer 收口；harness 无该工具才退纯文字提问
3. auto 模式不注入该指引（脚本驱动无交互 UI）
4. docs/prompt/_extracted.json 与 docs/prompt/brainstorm.md 镜像逐字同步，README 注入框架节同步新指引
5. test/brainstorm-solution-constraint-gate.test.mjs 与 test/output-step-render.test.mjs 补断言并全绿

## 成功标准（可验证）

1. src/stages/brainstorm.js 方案步「### 输出」行补自检结果产物（四行检查逐行打勾，有 ✗ 回到对应处理），使自检可审计
2. src/run/prompt.js 完成后执行段的 requiresWait 分支与 mayNeedWait 分支注入提问方式指引：优先用 harness 交互询问工具（Claude Code 即 AskUserQuestion）呈现问题与候选项，拿到回答逐字带入 --answer 收口；harness 无该工具才退纯文字提问
3. auto 模式不注入该指引（脚本驱动无交互 UI）
4. docs/prompt/_extracted.json 与 docs/prompt/brainstorm.md 镜像逐字同步，README 注入框架节同步新指引
5. test/brainstorm-solution-constraint-gate.test.mjs 与 test/output-step-render.test.mjs 补断言并全绿
