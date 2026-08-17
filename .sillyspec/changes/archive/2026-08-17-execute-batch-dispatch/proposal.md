---
author: qinyi
created_at: 2026-08-17 16:14:16
---

# Proposal — execute 阶段 task 执行 batch 调度

## 背景与动机

plan 阶段 TaskCard 生成已落地 batch 分派（commit 9aa91aa）：2~4 个 task 由一个子代理一次生成全部 task-N.md，避免子代理调用随 task 数线性爆炸。

execute 阶段存在同样的问题：`buildWavePrompt`（`src/stages/execute.js:846`）当前铁律要求「每个任务必须由独立子代理执行」+「同一 Wave 内的任务必须并行启动子代理」。一个 Wave 含 5~8 个 task 时，主 agent 要并发启动 5~8 个子代理——每个子代理都要读 design/plan/源文件、各自维护上下文，token 与协调开销随 task 数线性增长，且高并发还会撞 API 429/529 限流（见 memory：plan TaskCard 并行 529 实录）。

实际上同 Wave 的 task 定义就是「无依赖可并行」，其中大量 task 的 allowed_paths 完全正交（改不同文件、无契约消费），由一个子代理顺序做完与由多个子代理并行做，产出等价，但开销差数倍。

## 提议

把 plan 阶段的 batch 分派模式推广到 execute 阶段，档位取「平衡：可选 batch」：

- 默认仍每 task 独立子代理（安全默认，零行为回归）
- 同 Wave 内满足全部可判定条件时，主 agent 可把 task 合并为 batch（≤3 个）交给一个子代理**串行**执行：
  1. allowed_paths 两两无交集（文件正交）
  2. 无 provides/expects_from 契约依赖链
- 同 Wave 的多个子代理（独立 task 子代理或 batch 子代理）之间仍并行启动

## 不在范围内 / Non-Goals

- 不改 plan.md 结构或 plan 阶段 batch 行为（9aa91aa 已落地，不动）
- 不新增 CLI 硬校验或 batch 落盘 schema（方案 B 已否决，YAGNI；review.json 缺失由既有 Task Review Gate 兜底）
- 不做 CLI 侧自动 batch 规划（方案 C 已否决，正交≠安全，语义判定交给有 design/plan 上下文的主 agent）
- 不改 task-review 契约：每 task 仍独立 review.json，由主 agent 审查产出（现状语义），不因 batch 下放给实现子代理
- 不改派发后端（SillyHub MCP / Local）：batch 是 Agent tool 调度策略，与 dispatchSection 正交
- 不改 worktree / 分支 / 基线语义

## 预期收益

- 同 Wave 子代理调用数从 N 降至 ceil(正交分组数)，典型 5-task Wave 从 5 个子代理降到 2~3 个
- 降低同 Wave 高并发撞限流（429/529）的概率
- batch 子代理一次加载 design/plan 上下文复用于多个 task，token 开销下降
