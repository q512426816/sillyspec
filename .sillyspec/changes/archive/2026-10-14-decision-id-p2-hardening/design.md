---
author: flow-machine-draft
created_at: 2026-10-14T13:59:04.188Z
---
# 设计记录（Design Record）— 2026-10-14-decision-id-p2-hardening

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

决策 ID 体系 P2 收尾（四路审计清单，四组静默面一次清偿）：①「来源：」legacy 兼容读——2026-08-24 首修形态的 20 行残留（后被「变更：」取代）不被任何解析器读取，这些条目 change='' 在去重键/图谱节点/touch 层机器不可见；三解析器（knowledge-match/decision-distill/docs-check）统一加来源兜底（变更优先、来源仅补缺），distill 侧带来源的 legacy 段从此参与同变更匹配（重蒸馏在位更新收敛）。②折叠修复——knowledge-match 去重对无任何限定行的同号 legacy 互折叠（实测 2 条 implemented 永久隐身），改为路由行先按文件去重单解析、legacy 条目不再互折叠。③豁免键域限定——docs-check decisions.<id> 裸键一条可豁免全库同号（D-001@v1 ×296 潜伏），新增 decisions.<域>/<id>[.<kind>] 域限定键、裸键保留兼容。④已回应判据收紧——complete.js 防复潮「已回应」从文件级 id+域词共现收紧为行级共现（自身同号+常见词不再静默吞他变更命中）。⑤引用契约——两处防复潮段头补跨变更引用形态指引（变更名#D-xxx@vN）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/knowledge-match.js：parseDecisionFile 增「来源：」标签读入（DECISION_ORIGIN_RE，仅 change 为空时填充）；parseDecisionEntries 路由行按文件去重单解析 + 无 change 条目不再折叠（带 change 条目沿用 file+id+change 键）。
- src/decision-distill.js：splitKnowledgeSections 段归属读「变更：」缺失时回退「来源：」行——带来源的 legacy 段参与同变更同号匹配/版本替换/跨文件清理（纯无行 legacy 仍不互认）。
- src/docs-check.js：parseDecisionEntries 增「来源：」兜底；isDecisionExempt 增 domain 参与域限定键（decisions.<域>/<id>.<kind> / decisions.<域>/<id>），裸键兼容保留；runDecisionRules emit 传 domain；isDecisionExempt 导出（测试面，anchorFilePath 先例）。
- src/run/complete.js：「已回应」判定改行级共现（id ∨ 域名/变更名同行）。
- src/run/prompt.js + src/flow.js：防复潮段头补引用形态指引一句。
- CLI/命令/文件格式：无变化（known_failures 键新增可选形态，属加法）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 答：条目内「变更：/来源：」行序不保证——变更行无条件覆盖、来源行仅补缺，任意行序下变更优先成立；纯解析无时序假设。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 答：全部改动为只读解析 + 判定纯函数，无新增写面；知识库写入仍走 decision-distill 既有单写者。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 答：legacy 段参与匹配后，重蒸馏中断（半态）与既有形态一致（段级替换原子性沿用 joinKnowledgeFile 整文件写）；纯无行 legacy 不互认语义不变（既有测试锁定）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 答：域限定豁免键按 decisions.<域>/ 前缀匹配本域条目，域为文件名派生（仓内唯一）；他域同号不命中——正是本修复目的。无跨仓串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：legacy 条目不再折叠 + 来源兜底使历史条目在注入/图/touch 面新增可见量（20 条来源条目 + 2 条隐身复现）——防复潮注入按 score/死路过滤，新增可见的是既存事实非噪声；回放断言（tests）锁定增量面。
- 死路（放弃）：把 20 行「来源：」数据一次性改写为「变更：」（数据迁移）——归档/知识文件是审计面，本单以读侧兼容达成同等可见性，零数据改写；后续重蒸馏自然收敛。
- 死路（放弃）：豁免键直接改语义砍掉裸键——消费仓既有配置静默失效（advisory 噪声复活），保留兼容 + 新形态并存。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-match.js | 来源兜底读入 + 路由单解析 + legacy 不折叠 |
| 修改 | src/decision-distill.js | splitKnowledgeSections 来源回退（legacy 参与同变更匹配） |
| 修改 | src/docs-check.js | 来源兜底 + isDecisionExempt 域限定键（导出）+ emit 传域 |
| 修改 | src/run/complete.js | 已回应判定行级共现 |
| 修改 | src/run/prompt.js | {DECISION_HITS} 段头引用契约一句 |
| 修改 | src/flow.js | 轻量道防复潮段头引用契约一句 |
| 新增 | test/decision-id-p2-hardening.test.mjs | ①②③⑤ 用例族 |
| 修改 | test/knowledge-gate-denoise.test.mjs | ④ 行级收紧两态 |
| 修改 | .sillyspec/docs/sillyspec/modules/{sync,docs-consistency,runtime,cli-entry}.changelog.md | 模块卡索引增量（按归属实配） |
