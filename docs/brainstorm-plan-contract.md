---
author: qinyi
created_at: 2026-06-19 00:45:00
---

# Brainstorm → Plan Contract

## 核心契约

`design.md` 是 plan 阶段的**主要设计输入**。plan 不应该在空的或缺少关键决策的 design.md 上生成任务。

## design.md 结构要求

### 必须包含（error — 阻断 plan）

| # | 章节 | 匹配关键词 |
|---|------|-----------|
| 1 | 目标/背景/问题描述 | 目标、goal、objective、背景、background、问题、problem、purpose、目的 |
| 2 | 范围/总体方案/设计 | 范围、scope、总体方案、方案、approach、solution、设计、design |
| 3 | 决策/方案选择 | 决策、decision、选择、choice、方案选择、D-xxx@vN（decisions.md 引用） |

### 建议包含（warning — 不阻断 plan）

| # | 章节 | 匹配关键词 |
|---|------|-----------|
| 4 | 非目标/Non-goals | 非目标、non-goals、不做、out of scope |
| 5 | 约束/风险/Trade-off | 约束、constraint、风险、risk、trade-off |
| 6 | 文件变更清单 | 文件变更、变更清单、changed files |

## 校验规则

plan 启动时（第一个步骤执行前）调用 `validateDesignForPlan(designContent)`：

| 结果 | 行为 |
|------|------|
| 全部通过 | 正常进入 plan |
| 有 warning | 继续执行，展示警告 |
| 有 error | fail-fast，提示修复 design.md |

## 第一版设计原则

- **轻量 markdown 契约**：检查标题和关键词，不强 schema
- **关键词宽泛**：中英文都支持
- **decisions.md 引用也算决策**：`D-xxx@vN` 或 `decisions.md` 引用即满足决策检查
- **不做 brainstorm postcheck 阻断**：brainstorm 完成时不校验此契约（brainstorm 可以产出不完整的 design.md），只在 plan 启动时校验

## 错误处理

| 场景 | 行为 |
|------|------|
| design.md 不存在 | 不校验（向后兼容，plan 可以独立运行） |
| design.md 空 | fail-fast |
| 缺目标/背景 | fail-fast |
| 缺范围/方案 | fail-fast |
| 缺决策 | fail-fast |
| 缺非目标/约束/文件清单 | warning，继续执行 |

## 完整契约链

```
brainstorm → design.md → [Plan Contract 校验] → plan → plan.md → [Execute Contract 校验] → execute
```

每个阶段启动前都校验上游产物，形成双重保险。
