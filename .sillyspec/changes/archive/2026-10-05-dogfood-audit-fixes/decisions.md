---
author: flow-machine-draft
created_at: 2026-10-05T02:44:54.547Z
---
# 决策记录（Decisions）— 2026-10-05-dogfood-audit-fixes

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：行为修复让「原先静默降级为人类可读」的调用方（若依赖旧错误行为的脚本）突然收到 JSON——属暴露既有契约而非破坏；排查过 index.js 全局解析后 filteredArgs 不含 --json，无其他调用方向实现文件传 json 的路径，影响面封闭在三个子命令。 试过放弃：改 stages/knowledge.js 调度层把 opts.json 注入 args（--json 塞回 args 数组）——污染 args 语义（args 反映用户输入而非程序状态），且 digest 已确立 opts.json 直读惯例，放弃。
