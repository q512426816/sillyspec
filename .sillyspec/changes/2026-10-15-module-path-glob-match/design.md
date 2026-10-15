---
author: flow-machine-draft
created_at: 2026-10-15T07:37:41.218Z
---
# 设计记录（Design Record）— 2026-10-15-module-path-glob-match

## 做法概述

用户实测发现（平台仓）：FR 沉淀持续落 auto-* 伪域（7 域 92 条全为近两天新变更）、决策持续落 decisions/unmapped.md（444 条中 10 月增量 242）——**路由正在失效，不是设计如此**。根因坐实：sillyspec-scan 生成的 module-map 大量 glob 形态 paths（`app/modules/daemon/**`、`frontend/src/components/daemon/*.tsx`、双星与文件通配组合、括号路径等，平台仓实测 146 条），而全部路径归属判定点只做朴素 `file === p || startsWith(p + '/')`——glob 条目恒不命中，恰只有精确文件路径能命中（`frontend/src/app/page.tsx` → app-pages 实测佐证）。后果链：交付文件匹配不上模块 → 域三级兜底全灭 → FR 按路径段投票铸伪域、决策 impacts 匹配失败落 unmapped。本仓 module-map 无 glob 故未暴露——消费仓（扫描卡）全面中招。

修法：change-list.js 已有完备 globMatch（双星跨零或多段/单星段内/单问号/特殊字符含括号 escape，`NEW:` 剥离等既有测试面）——在 modules.js（模块图底座）封统一入口 modulePathMatches(filePath, rawPattern)：目录尾 `/` startsWith、其余相等或 `p/` 前缀、glob 追加 globMatch、反斜杠两侧归一、空输入 false；无 glob 输入行为与旧各消费点逐字等价（本仓零回归）。9 个消费点全接入：fr-index.matchedModuleIds（FR 域路由）、decision-distill.matchImpactsToModules（决策 impacts，保留其裸名兜底分支）、module-impact.classifyFile、docs-debt.matchFilesToModules（一级归属，原第三条件冗余并掉——行为等价）、design-facts.deriveActualModules、ceremony-tier.matchModuleForFile、flow-parity 两处（命中行 + 未登记目录检测）、knowledge-graph.moduleOf（注释声称 glob 语义实则未实现——第三处同款）。依赖方向核过：change-list.js 仅依赖 fs 无环。

## 接口契约

- src/modules.js 新增导出 modulePathMatches(filePath, rawPattern) → boolean（纯函数；语义见上）。
- 9 消费点内部匹配式替换为统一入口调用（各自签名/返回形状零变化）。
- 行为变化（显式）：glob 形态 paths 从「恒不命中」变为「命中」（本变更目的）；反斜杠形态 paths 从「两侧都不归一故失配」变为「归一命中」（scan-diff 既有测试「模块原始路径失配 → unmapped」随语义更新为「两侧归一命中 → 归 core」并留痕——拼错路径仍失配，暴露通道不堵）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——纯函数匹配，无时序面。
2. 并发写：零写盘；各消费点只读 module-map。
3. 切换/生命周期：无状态纯函数；匹配面变化随代码发布生效，存量知识数据（已灌伪域/unmapped 的条目）不回溯迁移——见风险。
4. 作用域：module-map 本仓自治；消费仓经各自 CLI 版本消费——旧 CLI（未含本修复）仍失配，修复随版本分发到达。

## 风险与死路

最大风险：命中面变宽可能把「脏卡/过宽 pattern」的路径吸进模块归属（如 `**` 过宽 pattern 吞全仓）——评估：pattern 质量是卡作者责任，历史精确条目语义逐字未变；过宽 pattern 在旧世界也会命中（前缀语义同样宽）。次风险：存量数据（平台仓 92 条伪域 + 444 条 unmapped 决策）不随本修复自动迁移——本变更止增量；存量清偿属消费仓数据治理（伪域可 tests --redomain 迁；unmapped 决策因 id 寻址含 file 键迁移需专门工具，与本仓 C5 同裁决缓办）。第三风险：head 注释再踩 `*/` 序列坑（模块注释曾因 `**/*.tsx`/`**/` 字面量提前闭合——两次实测）——已改措辞，留训于设计。放弃方案：①把 globMatch 复制进 modules.js（重复实现，违反单一源）；②改 sillyspec-scan 生成非 glob 卡（卡形态已散落消费仓存量 + scan 重扫成本，匹配器宽容化收益全局）；③只在 fr-index 单点修（decision/module-impact/docs-debt 等仍失效，治标不治本）。
