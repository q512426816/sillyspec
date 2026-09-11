---
plan_level: full
author: qinyi
created_at: 2026-09-11T14:50:00+08:00
---

# 实现计划（Plan）— 跨变更语义护栏

## Wave 1（并行，无依赖）
- task-01
- task-04

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2）
- task-03

## Wave 4（依赖 Wave 3，两卡并行）
- task-05
- task-06

## Wave 5（依赖 Wave 4）
- task-07

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | decision-distill 文件字段契约（解析+条件渲染） | W1 | P0 | — | FR-01, D-001@v1 | applyField/FIELD_LABEL_RE 增「文件\|files」；renderBlockLines 仅非空渲染；分隔符/归一双侧口径 |
| task-04 | config-schema semantic_guard 段登记 | W1 | P0 | — | FR-05 | enabled 默认 true，readers/desc/example 对齐 friction_hint 先例 |
| task-02 | knowledge-match 文件键反查 | W2 | P0 | task-01 | FR-02 | parseDecisionFile 增文件标签（锚点单独标签不进 reason 回填链）+ 锚点路径提取兜底；matchDecisionsByFiles 导出 |
| task-03 | semantic-guard 聚合模块 | W3 | P0 | task-02 | FR-03, FR-04 | 归因（git log 标记解析）/断言检测（git diff HEAD -U0）/渲染（零命中空串）/开关读取 |
| task-05 | quick step1 进场注入 | W4 | P0 | task-03 | FR-03 | run/prompt.js quick 分支尾部；开关入口短路；parsePorcelainPath 口径；fail-soft |
| task-06 | quick --done 断言 WARNING | W4 | P0 | task-03 | FR-04 | runQuickTestLintGate 内检测（主仓 cwd，步骤 0 开关短路）+ printQuickTestLintGate 点名；调用方零改动 |
| task-07 | 端到端验证 + 模块文档 | W5 | P0 | task-01..06 | NFR, D-002@v1 | 全量 npm test/lint；快速会话冒烟；模块 changelog 更新（核对并行会话夹带） |

## 关键路径
task-01 → task-02 → task-03 → task-05 → task-07（数据契约 → 反查引擎 → 聚合模块 → 注入消费 → 端到端）

## 全局验收标准
1. 全量 `npm test` 0 失败、`npm run lint` 通过（verify 阶段实测对账）
2. 断言检测反例全过：纯新增断言不算 / 非测试文件不查 / 无归因标记不点名 / reason 不被锚点污染 / 开关 false 双停 / 暂存后（git add）检测仍生效
3. 存量兼容：无「文件：」字段既有决策条目渲染字节级不变形；无 decisions 库/知识库时一切行为与现状一致
4. 零命中静默：无命中时 quick step1 prompt 与 --done 输出无新增段落
5. （brownfield）未配置 semantic_guard 时行为与现状一致（默认开但有命中才输出）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01..07 | AC-1..4（三层 advisory 全链落地） |
| D-002@v1 | task-07 | 本变更 tasks.md 自有未勾选任务行（防护已生效）+ 闸门修复移交记录 |
| FR-01 | task-01 | AC-3 存量字节级不变形 |
| FR-02 | task-02 | AC-2 锚点污染反例 + D-905 形态提取 |
| FR-03 | task-05 | AC-4 零命中静默 + 注入命中用例 |
| FR-04 | task-06 | AC-2 三反例 + WARNING 点名用例 |
| FR-05 | task-04 | AC-5 未配置行为一致 + 开关 false 双停 |
