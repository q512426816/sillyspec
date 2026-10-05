---
author: qinyi
created_at: 2026-10-06T00:30:00+08:00
---
# 完整流程五阶段（brainstorm → plan → execute → verify → archive）

## 目标

大改动（跨模块取舍 / Wave 计划编排 / 多阶段治理 / 设计期人机对抗）走五阶段强制状态机：每阶段有入口契约、产物文件名与门禁校验，不能跳步、不能偷工；进度/决策/审批全部持久化 SQLite，可审计可断点恢复。

## 参与模块

- run.js + run/：阶段状态机引擎（每阶段一次渲染 + `--done` 收口）
- stages/：各阶段定义（scan / brainstorm / plan / execute / verify / …）
- stage-contract*.js / stage-templates.js：阶段契约与模板
- plan-adopt-waves.js：plan 阶段 Wave 依赖拓扑（depends_on 排序，同 Wave 并行）
- worktree*.js：execute 阶段隔离执行（见 recovery-concurrency 流程）
- verify-*.js / check-primitives.js / contract-matrix.js：实测验收与 API 契约矩阵
- archive-delta.js / knowledge-*.js：archive 阶段沉淀与知识飞轮
- progress.js + progress/ / db*.js：进度唯一权威

## 流程摘要

```
brainstorm（需求探索 → design.md + tasks.md；头脑风暴预段可收编续跑，design 以预段版为准）
   → plan（实现计划：文件路径 + 任务描述 + Wave 拓扑分组；provider/consumer 契约注入）
   → execute（worktree 隔离 + 子代理并行；写码前强制读现有源码）
   → verify（对照规范 + 测试套件 + 代码审查；前后端 API parity 对账）
   → archive（spec 沉淀 knowledge/；模块卡 changelog；变更目录移入 changes/archive/）
```

## 关键规则

- 每阶段一次渲染 + 一次 `--done` 收口；恢复 = `run <stage> --change <名>` 续跑。
- 锚定确认：各阶段执行前逐个确认读过规范文件。
- postcheck 识别偷懒（占位符 / fallback / 未分析）。
- 范围对账三态：planned / unplanned / untouched——计划外改动被告警。
- 文档一致性棘轮：文档源码引用真实性校验（HEAD 模式），失败数只降不升。
