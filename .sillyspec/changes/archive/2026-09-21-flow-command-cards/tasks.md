---
author: cards-author
created_at: 2026-09-21 10:50:00
---
# 任务注册表（Tasks）— 2026-09-21-flow-command-cards

- [x] task-01: assets/command-cards/ 七张卡（四段契约：何时用/生命周期速查/防坑清单/边界声明）+ src/command-cards.js 注入器（COMMAND_CARD_TARGETS/NAMES、readCardAssets import.meta.url 相对解析、三态幂等（Grill P1-3 基准：锚行记录落盘正文 sha、剥离锚行重算比对检测手改）：无→写/完好且同资产→no-op/完好且新资产→覆盖/手改或外来源→warn 跳过 force 覆盖）+ test/command-cards.test.mjs（注入/no-op/更新/手改跳过/force/外来同名跳过/资产齐全/双落点断言）+ .npmignore 注释锚（Grill P1-2：不新增 files 字段）+ run-quick 卡防坑清单对照 954946ae 修复后语义逐条锚定源码（--done 显式 --linked-changes 有效，complete-handlers.js:1273 起）（Grill P2-5）
- [x] task-02: src/init.js 接线——VALID_TOOLS 增 zcode、AGENTS.md 注入条件扩展（init.js:447 claude||codex 增 zcode，Grill P1-1）、injectCommandCards 挂点 L449 后 noSkills return 前（--no-skills/platformMode 同 skills 门跳过，Grill P2-4）、toolChoices 文案、gitignore advisory（R-02）+ docs/sillyspec/platform-interface-map.md 活文档锚补 init 新导出面 (depends_on: task-01)
