---
author: flow-machine-draft
created_at: 2026-10-09T00:27:19.171Z
---
# 任务注册表（Tasks）— 2026-10-09-graph-docrefs-noise

- [ ] task-01: parseChangelogEntries 尾括号后缀剥除（（P2）类；仅当剥离后匹配日期/ql 形态才接受，防剥坏正常名）——changelog_danglings 归零
- [ ] task-02: graphDangling 文档引用面（doc-refs/scan-refs）口径修正：裸文件名（无 /）不判悬空；跨仓前缀（顶级目录本仓不存在）单独计跨仓引用不计本仓悬空；doctor 文案注记两类构成
- [ ] task-03: extractFilePaths/anchorFilePaths 剥后缀产物为空或纯数字时丢弃
- [ ] task-04: 降噪后真图复跑 + 缺口实查处置：缺口实为「64 全仅缺 changelog 索引（卡全在）」→ 批量建 64 个 <module>.changelog.md 空索引（沿 core-engine.changelog.md 头形态）；建图守卫补齐（glob 路径不建边/tests 剥 #锚后缀/deliverables 剥尾部中文括号注记）——module_doc_gaps 与 changelog_danglings 双归零、本仓强边悬空 41→13（余为真历史欠账 advisory 点名）
- [ ] task-05: 全量测试与 lint 零回归
