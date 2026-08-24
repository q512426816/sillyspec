---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — hooks

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-904@v1 hook 零未声明依赖（测试直接 ESM 导入）
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/hooks/worktree-guard.js
最近确认：71a7fe6
理由：src/hooks/ 下 hook 会被测试直接以 ESM 导入——不得引入 package.json 未声明的外部包，简单本地配置解析优先用项目内已有实现或标准库，否则 `npm test` 在导入阶段即失败（ql-20260604-001-7a4c）。
