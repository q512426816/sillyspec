---
author: cards-author
created_at: 2026-09-21 11:30:00
plan_level: light
---
# 实现计划（Plan）— 2026-09-21-flow-command-cards

## 目标
sillyspec init 按 --tools 生成流程命令卡（zcode/claude 双落点），薄卡 bootstrap 层 + 尾部锚行三态幂等（Grill 修订版基准：落盘正文 sha）。

## 任务分解（Wave 排布）

### Wave 1
- task-01

### Wave 2
- task-02

Wave 说明：Wave2 串行（task-02 depends_on task-01 注入器导出面——import 面+端到端验收面双重真实，plan 审查核）。

## 验收口径
- 注入器三态四分支：无→写 / 完好且同资产→no-op（mtime 不动）/ 完好且新资产→覆盖 / 手改或外来→warn 跳过（force 覆盖）——单测逐态断言
- run-quick 卡防坑清单对照 954946ae 修复后语义逐条锚定源码（--done 显式 --linked-changes 有效）
- .npmignore 黑名单维持 + 注释锚；npm pack --dry-run 发版断言入档
- init --tools zcode 后 7 卡落 .zcode/commands/sillyspec/（含 AGENTS.md 同获）；claude 同语义
- 全量 npm test + lint 绿
