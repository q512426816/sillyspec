---
id: task-01
title: plan.js review_plan 步骤 prompt 注入生成 module-impact.md 首版指引
title_zh: plan review_plan 步骤注入 module-impact 首版生成指引
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-07]
decision_ids: [D-001@v2, D-004@v1, D-008@v1]
allowed_paths:
  - src/stages/plan.js
goal: >
  在 plan 的 review_plan（审查计划）LLM 步骤注入生成 module-impact.md 首版的 prompt 指引，让 large 变更在 plan 阶段就产出首版（非 TaskCard allowed_paths 输入——review_plan 在 generate_blueprints 之前，用 design 文件清单 + plan 任务列表）。
implementation:
  - 读 src/stages/archive.js extract-module-impact 步骤 prompt（line 27-55），提取核心指引（读 _module-map.yaml → 对照变更文件 → 影响矩阵 → 落盘）
  - 注入 src/stages/plan.js review_plan 步骤 prompt，注释标注与 archive 同源（D-008）
  - 显式指引 agent 用 design.md 文件变更清单 + plan.md 任务列表作分析输入（review_plan 时 TaskCard 未生成）
  - 含无 _module-map.yaml 降级语义（复用 archive.js:38 fail-safe：生成只含 unmapped 部分 + 提示跑 scan）
acceptance:
  - review_plan 步骤 prompt 含「生成 module-impact.md」指引（grep 可验证）
  - 指引明确输入 = design 文件清单 + plan 任务列表
  - 含无模块映射的降级语义
verify:
  - grep review_plan prompt 含 module-impact + 文件清单
constraints:
  - 不改 archive.js（仅参照其 prompt 文本）
  - prompt 注入不破坏 review_plan 既有审查职责
  - 注释互指同源防漂移
---
