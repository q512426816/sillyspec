---
author: flow-machine-draft
created_at: 2026-10-15T07:37:41.218Z
---
# 提案书（Proposal）— 2026-10-15-module-path-glob-match

## 动机

任务原话转写：用户实测发现（平台仓）：FR 沉淀持续落 auto-* 伪域（7 个域 92 条全是近两天新变更）、决策持续落 decisions/unmapped.md（444 条中 10 月增量 242）。根因坐实：sillyspec-scan 生成的 module-map 大量使用 glob 形态 paths（app/modules/daemon/**、frontend/src/components/daemon/*.tsx、**/*.tsx 组合、括号路径等 146 条），而全部路径归属判定点只做朴素 filePath === p || startsWith(p + '/') —— glob 条目恒不命中，恰好只有精确文件路径（无 * 的 paths）能命中（frontend/src/app/page.tsx→app-pages 实测）。后果链：交付文件匹配不上任何模块 → 域三级兜底全灭 → FR 按路径段投票铸伪域（auto-backend 等）、决策 impacts 匹配失败落 unmapped。本仓 module-map 无 glob 故未暴露——消费仓（扫描卡）全面中招。修法：change-list.js 已有完备 globMatch（**/→(?:.*/)?、*→[^/]*、?、括号 escape）——在 modules.js 封 modulePathMatches(filePath, rawPattern) 统一入口（无 glob=原语义逐字不变、目录尾/、glob 补充），9 个消费点全接入：fr-index.matchedModuleIds/decision-distill.matchImpactsToModules/module-impact.classifyFile/docs-debt 一级归属/design-facts.deriveActualModules/ceremony-tier.matchModuleForFile/flow-parity 两处/knowledge-graph moduleOf（注释声称 glob 语义实则未实现——第三处同款）。

成功标准：
- modulePathMatches 全形态单测：无 glob 旧语义逐字（===/前缀/目录尾/）、**、/**、*、?、**/*.tsx 组合、括号路径
- 平台仓实测转正：resolveTouchedDomains('backend/app/modules/daemon/router.py') → daemon 真域（修前 auto-backend）；frontend 组件路径命真域
- 9 消费点接入且既有测试面零回归（fr-index/docs-debt/ceremony-tier/flow-parity/module-impact/design-facts 各面）
- 新增端到端测试：glob 形态 map + resolveTouchedDomains 不投伪域、decision impacts 命真域

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. modulePathMatches 全形态单测：无 glob 旧语义逐字（===/前缀/目录尾/）、**、/**、*、?、**/*.tsx 组合、括号路径
2. 平台仓实测转正：resolveTouchedDomains('backend/app/modules/daemon/router.py') → daemon 真域（修前 auto-backend）；frontend 组件路径命真域
3. 9 消费点接入且既有测试面零回归（fr-index/docs-debt/ceremony-tier/flow-parity/module-impact/design-facts 各面）
4. 新增端到端测试：glob 形态 map + resolveTouchedDomains 不投伪域、decision impacts 命真域

## 成功标准（可验证）

1. modulePathMatches 全形态单测：无 glob 旧语义逐字（===/前缀/目录尾/）、**、/**、*、?、**/*.tsx 组合、括号路径
2. 平台仓实测转正：resolveTouchedDomains('backend/app/modules/daemon/router.py') → daemon 真域（修前 auto-backend）；frontend 组件路径命真域
3. 9 消费点接入且既有测试面零回归（fr-index/docs-debt/ceremony-tier/flow-parity/module-impact/design-facts 各面）
4. 新增端到端测试：glob 形态 map + resolveTouchedDomains 不投伪域、decision impacts 命真域
