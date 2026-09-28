---
author: flow-machine-draft
created_at: 2026-09-28T06:04:22.714Z
---
# 决策记录（Decisions）— 2026-09-28-guidance-principles

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：brainstorm 语料在 proposal 尚未生成的早期步骤可能只有变更名——变更名含 UI 词（如 apple-style 不含）则漏注入；对冲：方案对比步执行时 proposal 通常已落盘，且 flow start 注入兜底另一入口。放弃方案：①静态红线扫源码（用户指出误伤探测代码、示教 example 与历史注释，改为输出断言）；②local.yaml commands.prototype 配置位（用户指出多前端项目多生态仓不成立，仓自身 modules.*.test 退役史为证——改为就近发现原则文案）。
