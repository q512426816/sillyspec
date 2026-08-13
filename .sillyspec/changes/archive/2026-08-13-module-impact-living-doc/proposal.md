---
author: qinyi
created_at: 2026-08-13 09:30:00
---

# Proposal：module-impact.md 分阶段生成 + archive 终审

## 方案概述

把 `module-impact.md`（模块影响分析）从「archive 阶段一次性反向生成」改为「plan 阶段(large)生成首版 + execute/verify 可选更新 + archive 终审」。方案 A：prompt 注入 + 最小 validator（1 条 error），不抽公共生成函数（SillySpec 是流程控制器，module-impact 内容是 agent 分析活，CLI 不算矩阵）。

核心改动：
- large 变更在 plan 的 review_plan 步骤生成首版（LLM 步骤，TaskCard 的 allowed_paths 已明确）
- execute 主代理在每个 Wave 后汇总更新（非 task 子代理各改，避免并行覆盖）
- verify 核对 module-impact 与实际变更一致
- archive 的 extract-module-impact 步骤改为最终确认 + 同步模块卡片
- small 变更豁免（本就是剥离仪式产物的轻量路径）

## 不在范围内 / Non-Goals

- small 变更不生成 module-impact.md（quick 流程轻量，module-impact 对 quick 无用）
- 不抽公共 module-impact 生成函数（CLI 不处理业务逻辑，不算影响矩阵）
- 不改 quick 流程（module-impact 仅 large 路径）
- 不强制 execute/verify 阶段更新（可选 prompt 指引，不阻断）
- 不改 scan 阶段（_module-map.yaml 仍由 scan 产出，本变更只消费它）
