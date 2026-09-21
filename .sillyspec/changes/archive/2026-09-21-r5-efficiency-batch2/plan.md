---
author: qinyi
created_at: 2026-09-21T17:05:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-21-r5-efficiency-batch2

## Wave 1（并行，M1+M2 独立测试面、allowed_paths 正交）
- task-01
- task-02

## Wave 2（依赖 W1；M3 先行）
- task-03

## Wave 3（依赖 W2；M4 与 M3 同触 execute.js 强制串行）
- task-04

## Wave 4（依赖 W1~W3 全部代码任务）
- task-05

> 依赖说明：task-03/04 同触 src/stages/execute.js，按同波并行硬拦拆为 W2/W3 串行（task-04 的 main 渲染引用 M3 分组抑制点）；task-01/02 文件正交（run/prompt.js vs run/gate-snapshot.js）合法并行；task-05 镜像重生成须在全部源码面定稿后跑。

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | M1 指令指纹增量：run/prompt.js 静态段 sha256 指纹+落盘 .runtime/step-guides/、复入 ≤10 行短输出、动态段永不缓存、--json 全量 | W1 | P0 | — | FR-01, D-001@v1 | 指纹=本次实际渲染静态段（条件渲染差异自然换指纹）；新增 test/step-guide-fingerprint.test.mjs |
| task-02 | M2 快照分叉态取 worktree：gate-snapshot.js:424-426 分支翻转+警告补对齐指引；①②态逐字节不动 | W1 | P0 | — | FR-02, D-002@v2 | 三态回归钉 test/gate-snapshot-lineage.test.mjs（保护取主仓/正常取 worktree/分叉取 worktree）；batch1 假红场景复刻 |
| task-03 | M3 PLAN 分组默认化：纯函数 recommendWaveGroups（三条件）+ buildWavePrompt 注入推荐分组行 + checkBatchAdvisory 附分组 + SillyHub 互斥 | W2 | P0 | task-01,task-02 | FR-03, D-003@v1 | 不满足条件时渲染与旧版逐字节一致（零回归钉）；test/plan-grouping-recommend.test.mjs |
| task-04 | M4 execution_mode 通道：plan.js frontmatter 键 + execute.js main 模式直写渲染分支（逐任务读卡→实现→commit→锚点→review write），派发段/工作目录段/并发帽段不渲染；main 抑制分组注入 | W3 | P0 | task-03 | FR-04, D-004@v1 | 缺省 dispatch 逐字节零回归钉；test/execution-mode-render.test.mjs |
| task-05 | 文档收口：node docs/prompt/_extract.mjs 重生成镜像 + stages 模块卡增补两行为行（指纹增量/direct 通道）+ core-engine 卡（分组函数若落位）+ docs-check 重锚 | W4 | P1 | task-01,task-02,task-03,task-04 | FR-01~04 | 镜像只由 _extract.mjs 机械生成禁手编 |

## 执行模式

execution_mode: dispatch（本变更自身走既有派发流程——主代理直写通道由本批建成，作为第 3 批/R5 重跑的验证面；W1 两任务文件正交可并行，W2 同文件串行）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）

- 四道防线判定语义/请求钳/allowed_paths 门禁/状态机步数/DB schema/ceremony 定价引擎零触碰
- M2 仅改 :424-426 分叉分支，①态（cwdDiff&&!wtDiff→取主仓）与②态（wtDiff&&!cwdDiff→保持 worktree）逐字节不动
- M1 指纹=本次实际渲染静态段 sha256（非模板原文）；动态注入段（材料包/知识命中/{DOCS_DEBT}）每次渲染永不缓存
- M3 推荐分组仅本地 Agent tool 派发路径渲染（SillyHub 一 Wave 一 mission 互斥）；agent 可偏离须披露
- M4 execution_mode 缺省 dispatch，既有变更（含归档变更重放）逐字节零回归
