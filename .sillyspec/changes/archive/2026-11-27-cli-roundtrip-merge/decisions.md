---
author: t
created_at: 2026-11-27 07:51:24
---

# 决策记录

## D-002@v1 wt-commit 不做自动化机制，只做 prompt 行为引导

## D-003@v1 watcher 事件流接受密度减半

## D-001@v1 --done 尾接下一步渲染（方案 A）
- type: architecture
- source: user
- 状态：accepted
- 问题：--done 合并的技术形态？
- 决策：采用 A——--done 收尾时同一次 stdout 输出尾接下一步 prompt；旧 run <stage> 单独渲染保留（幂等兼容）。
- 故障面：--done 输出过长时下一步 prompt 被截断（CLI 输出截断上限需检查）；agent 侧旧会话不认识尾接段可能忽略。
- 替代：B 新命令 step；C 只做侧车化。

## D-004@v1 实证修正：--done 尾接机制已存在，代码改动降级为 prompt 引导
- type: consistency
- source: design-grill
- 状态：accepted
- 问题：平台日志核验发现 src/run/complete.js:1021 的 printNext 分支早已在同一次 stdout 里 outputStep 渲染下一步（fire-equipment run 的 tool_result 样本：Step 2/8 完成后直接跟 step 3/8 的完整 prompt）。D-001 的「每步两次调用」前提不成立——多余调用是 agent 习惯性重复 run <stage>。
- 决策：D-001 的代码改动（complete.js 尾接）取消——机制已在；改为 prompt 引导：run/prompt.js 完成契约加一句「--done 输出已尾接下一步 prompt，无需再调 run <stage>」。stage 边界尾接渲染留二期评估。
- 影响：task-01 改写为 prompt 文案；complete.js 零改动。
- 替代：按原计划改 complete.js（重复造已存在机制）。
