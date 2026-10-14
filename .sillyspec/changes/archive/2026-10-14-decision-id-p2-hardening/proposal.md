---
author: flow-machine-draft
created_at: 2026-10-14T13:59:04.188Z
---
# 提案书（Proposal）— 2026-10-14-decision-id-p2-hardening

## 动机

任务原话转写：动机与背景：
决策 ID 体系四路审计的 P2 清单（用户「继续」确认执行）。四组残余静默面：
① legacy「来源：」行不被任何解析器读取（现存 20 行，2026-08-24 首修形态的残留）——这些条目在检索去重键/图谱节点/decision-touch 层 change=''，机器不可见；
② 同文件同号双 legacy（无变更/来源行）在 knowledge-match 去重时互折叠——实测 2 条 implemented 条目（backend.md:158、unmapped.md:584）对检索/注入/图永久隐身；
③ docs-check 豁免键 decisions.<id>[.<kind>] 无域限定——一条裸键可静默豁免全库同号条目（D-001@v1 ×296，潜伏面）；
④ complete.js 防复潮「已回应」判据是文件级 id+域名词共现——本变更自身同号 id + 正文常见词（backend/unmapped）撞车即静默吞掉他变更的历史否决/死路提示；
⑤ 跨变更引用 D 号无契约形态（审计实证 3 处省略被引用变更名）。

成功标准：
- 「来源：」legacy 兼容读：knowledge-match（parseDecisionFile）、decision-distill（splitKnowledgeSections）、docs-check（parseDecisionEntries）三解析器 MUST 支持来源行兜底——「变更：」优先、「来源：」仅在变更行缺失时生效；decision-distill 侧 legacy 段（带来源行）从此参与同变更匹配（重蒸馏收敛为在位更新而非重复追加），无任何限定行的纯 legacy 段仍不互认
- 折叠修复：同文件同号双 legacy（无任何限定行）MUST 不再互折叠（2 条隐身条目复现）；多条路由行指向同一域文件仍不产生重复解析
- docs-check 豁免键域限定：新键形态 decisions.<域>/<id>[.<kind>]（规则级精确/条目级伞形）MUST 生效；裸键形态保留兼容
- 已回应判据收紧：complete.js 防复潮「已回应」判定 MUST 从文件级共现收紧为行级共现（命中 id 与域名词或变更名出现在同一行）——自身同号+常见词不再静默吞他变更命中；真实回应形态（unmapped.md D-001@v1 同行）仍被识别
- 注入文案引用契约：{DECISION_HITS} 与轻量道防复潮段头 MUST 含跨变更引用形态指引（变更名#D-xxx@vN，同号不同变更互不相干）
- 新增/更新测试跑绿；全量测试 + lint 绿

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. 「来源：」legacy 兼容读：knowledge-match（parseDecisionFile）、decision-distill（splitKnowledgeSections）、docs-check（parseDecisionEntries）三解析器 MUST 支持来源行兜底——「变更：」优先、「来源：」仅在变更行缺失时生效；decision-distill 侧 legacy 段（带来源行）从此参与同变更匹配（重蒸馏收敛为在位更新而非重复追加），无任何限定行的纯 legacy 段仍不互认
2. 折叠修复：同文件同号双 legacy（无任何限定行）MUST 不再互折叠（2 条隐身条目复现）；多条路由行指向同一域文件仍不产生重复解析
3. docs-check 豁免键域限定：新键形态 decisions.<域>/<id>[.<kind>]（规则级精确/条目级伞形）MUST 生效；裸键形态保留兼容
4. 已回应判据收紧：complete.js 防复潮「已回应」判定 MUST 从文件级共现收紧为行级共现（命中 id 与域名词或变更名出现在同一行）——自身同号+常见词不再静默吞他变更命中；真实回应形态（unmapped.md D-001@v1 同行）仍被识别
5. 注入文案引用契约：{DECISION_HITS} 与轻量道防复潮段头 MUST 含跨变更引用形态指引（变更名#D-xxx@vN，同号不同变更互不相干）
6. 新增/更新测试跑绿；全量测试 + lint 绿

## 成功标准（可验证）

1. 「来源：」legacy 兼容读：knowledge-match（parseDecisionFile）、decision-distill（splitKnowledgeSections）、docs-check（parseDecisionEntries）三解析器 MUST 支持来源行兜底——「变更：」优先、「来源：」仅在变更行缺失时生效；decision-distill 侧 legacy 段（带来源行）从此参与同变更匹配（重蒸馏收敛为在位更新而非重复追加），无任何限定行的纯 legacy 段仍不互认
2. 折叠修复：同文件同号双 legacy（无任何限定行）MUST 不再互折叠（2 条隐身条目复现）；多条路由行指向同一域文件仍不产生重复解析
3. docs-check 豁免键域限定：新键形态 decisions.<域>/<id>[.<kind>]（规则级精确/条目级伞形）MUST 生效；裸键形态保留兼容
4. 已回应判据收紧：complete.js 防复潮「已回应」判定 MUST 从文件级共现收紧为行级共现（命中 id 与域名词或变更名出现在同一行）——自身同号+常见词不再静默吞他变更命中；真实回应形态（unmapped.md D-001@v1 同行）仍被识别
5. 注入文案引用契约：{DECISION_HITS} 与轻量道防复潮段头 MUST 含跨变更引用形态指引（变更名#D-xxx@vN，同号不同变更互不相干）
6. 新增/更新测试跑绿；全量测试 + lint 绿
