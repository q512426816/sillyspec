---
author: qinyi
created_at: 2026-09-21 07:59:28
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
R5 对撞+第 1 批 verify 实证移交：指令注入 252KB/73 次全量重印（P8）、gate 快照双写分叉取主仓致假红一轮（P16 移交）、per-task 派发交接税（P13/GSD：15 卡 3 批 19min）、无主代理直写通道（A 组 7′ vs B 70′）。

## 关键问题
①步骤指引每次 CLI 调用全量重印，同步骤复入无指纹机制——「轮数×上下文」基数浪费；②快照分叉取主仓在「定向 worktree 跑+主仓并行异动」下拿错血统（batch1 实证假红）；③第 1 批 batch 通道靠 agent 自判，无 CLI 预计算默认；④清晰输入任务被迫走派发模式（GSD 亦无直写，属本仓数据结论）。

## 变更范围
四模块：M1 指令指纹增量（run/prompt.js）/ M2 快照分叉态取 worktree 血统（gate-snapshot.js 仅③态）/ M3 PLAN 粒度派发默认化（execute.js 预计算分组+SillyHub 互斥）/ M4 execution_mode: main|dispatch 通道（缺省 dispatch 零回归）。

## 不在范围内（显式清单）
- ceremony-tier 决策密度轴（定价引擎，第 3 批独立审查）
- 状态机步数折叠（F8）
- 四道防线判定语义/请求钳/allowed_paths 门禁/DB schema
- SillyHub 派发后端改造

## 成功标准（可验证）
- 全量测试零回归+lint 过
- M1 同指纹复入 ≤10 行断言 + --json 全量不回归
- M2 三态回归钉（保护取主仓/正常取 worktree/分叉取 worktree）+ 既有 5 快照测试零回归
- M3 分组纯函数单测 + 渲染含推荐分组 + 不满足条件与旧版逐字节一致
- M4 缺省 dispatch 零回归钉 + main 含直写段不含派发段
