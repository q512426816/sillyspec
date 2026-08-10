---
id: task-04
title: index.js apply/assess printer add structured rescue block
title_zh: index.js apply/assess 打印器补结构化 rescue 段
author: qinyi
created_at: 2026-08-10 11:50:00
priority: P1
depends_on: [task-03]
blocks: [task-05]
requirement_ids: [FR-05]
decision_ids: [D-004@v1]
allowed_paths:
  - src/index.js
expects_from:
  - task-03:
      contract: rescueCommandsField
      needs: [commands, warnings, cpFileCount, excludedCount]
provides: []
goal: 让 rescue 指令在 CLI 人类输出中清晰可见，task-03 已把 rescue 拼进 result.errors（apply 经 :734 加 assess 经 reasons :790 现有打印器已输出主通道），本 task 补结构化 Rescue commands N safe M excluded 段提升 UX（rescueCommands 非空时额外打印，agent 一眼定位 cp 指令）
implementation: |
  - src/index.js case apply（:732-767）在现有 result.errors 打印（:734-736）后加 warnings 打印（:762-766）附近加——若 result.rescueCommands 非空，打印结构化 Rescue commands 段（cpFileCount safe 加 excludedCount excluded 加旁路 git apply 提示加 cp 后需手动 sillyspec worktree cleanup wtName）加逐行打印 rescueCommands.commands（缩进）加若有 warnings 逐行打印 rescueCommands.warnings
  - case assess（:769-817）在 decision 打印后（:780-785）加 blocked 分支（:810-815）附近加——若 assessment.rescueCommands 非空，打印同样结构化段
  - assess 的 rescueCommands 来自 task-03 的 assessment.rescueCommands 等于 checkResult.rescueCommands
  - 现有 errors 加 reasons 文本打印保留作主通道（task-03 已把 cp 块拼进 errors），结构化段是增强
acceptance:
  - sillyspec worktree apply change dirty 拦截时 stderr 含结构化 Rescue commands N safe M excluded 段加逐行 cp 指令
  - sillyspec worktree assess change 拦截时同样输出 rescue 段
  - rescueCommands 为 null（未拦截）时不打印 rescue 段（零回归）
  - 现有 apply 成功加 assess SAFE 路径输出不变
verify:
  - task-05 覆盖（若有 CLI 输出断言）加手动 sillyspec worktree apply test-change 造 dirty 场景核对输出
  - 现有 worktree CLI 无 exact-match 输出测试，打印变更不破回归
constraints:
  - additive 打印——仅 rescueCommands 非空时触发，不影响现有任何输出路径
  - 不改 apply 加 assess 的决策逻辑，不改 applyWorktree 调用
  - rescue 段文案明确旁路 git apply 加 cp 后需手动 cleanup（R-06 防 agent 习惯性绕过正常 apply 滞留 worktree）
  - 结构化段是 UX 增强，不是 rescue 可见性的依赖（主通道是 task-03 拼进 errors 文本，现有打印器已输出）
related_tests: []
---

# task-04：index.js 打印器补结构化 rescue 段

## 背景
rescue 人类可见性强化。task-03 已把 rescue 拼进 errors 主通道（现有打印器已输出）。本 task 补结构化段提升 UX，agent 一眼定位 cp 指令。非必需（可见性不依赖本 task）。

## 改动点
1. case apply rescueCommands 非空时打印结构化段
2. case assess assessment.rescueCommands 非空时同样打印
