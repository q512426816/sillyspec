---
author: qinyi
created_at: 2026-05-13T11:05:00
---

# Proposal: CLI 子代理强制 + currentChange 自动探测

## 动机

SillySpec 的 CLI 控制流存在 3 个关键 bug，导致 plan 阶段蓝图无法生成、主代理上下文溢出：

1. **currentChange 不自动设置** — 动态蓝图插入依赖 `progress.currentChange`，但该字段从不被自动设置（只有 `--change` flag 才设），导致蓝图步骤永远不被插入。
2. **子代理标记为"可选"** — SKILL.md 中的子代理指令被标记为可选，CLI step prompt 完全不提子代理，主代理串行执行所有步骤导致上下文爆掉。
3. **execute 不强制子代理** — Wave prompt 把所有 task-N.md 内联给主代理，主代理执行 6 个 Wave 上下文溢出。

此外，brainstorm 阶段缺少可视化确认能力，用户只能凭文字描述判断设计方向。

## 变更范围

- `src/run.js` — 自动探测 + 简化动态插入
- `src/stages/plan.js` — 单步协调器
- `src/stages/execute.js` — 强制子代理指令
- `src/stages/brainstorm.js` — HTML 原型可选步骤

## 不在范围内

- SKILL.md 文件的修改（非代码文件，可后续处理）
- auto / verify / 其他阶段的改动
- 子代理 prompt 模板的精细调优

## 成功标准

1. `sillyspec run plan` 能自动探测 change 目录并正确插入蓝图协调器步骤
2. 协调器步骤 prompt 包含强制子代理指令
3. Execute Wave prompt 包含子代理执行模板
4. Brainstorm 有 HTML 原型可选步骤
5. 现有流程不受影响（向后兼容）
