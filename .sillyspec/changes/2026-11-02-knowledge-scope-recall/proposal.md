---
author: flow-machine-draft
created_at: 2026-11-02T05:17:16.207Z
---
# 提案书（Proposal）— 2026-11-02-knowledge-scope-recall

## 动机

任务原话转写：scope 召回两跳与手工条目可达

变更 1 已让四类探针转绿，scope-manual 仍 RED：手工知识条目只有 route 弱边、scopeRecall 不收集 entry、buildScopeRecallResult 在 decisionHits 空时整层短路。子代理方案审查给出三处硬伤修正：doc-refs 必须 section 级建边（全文档 1356 边/单路径 65 条噪声不可接受）；本仓真实语料 doc-refs 本地信号极少，原 5 条 scope case top3 不会上升（验收必须单列冻结子集）；两跳全量 144 决策 recency 排序前 11 全是模板底稿（只收 rejected/deathPath）。另发现接口面遗漏：scopeRecall 无 query 参数、recency 只能从变更名日期解析、entry 节点缺字段、图缓存不感知手工文档编辑。

成功标准：
- A 段：entry 节点补 category/anchor/display；section 级 doc-refs 建边（extractFilePaths + normalizeAnchorForCompare 前缀容忍，保持 medium 强度不动 graphPath/impact）；scopeRecall 显式收 doc-refs entry 且 entries-only 返回非 null；GRAPH_CACHE_VERSION 1→2 且 fingerprint 含 INDEX 引用的手工文档 stat
- B 段：两跳 file→deliverables 反查 change→from-change 反查决策，只收 rejected/deathPath；排序 rejected/deathPath 优先→direct>two-hop→变更名日期→id；scope hit 设 score（direct=2/two-hop=1）保证渲染面过滤器可见；引擎 decision cap 保持 20
- C 段：平台 decisions 补 8~10 条（27 条非 parking rejected 中选、排除同文件重复 id、query 用「域关键词+标题」配方）；scope 面两侧各补 5~8 条带 scope_files 的 case（平台用 fetch-sse/auth_deps/main.py 三个真实 doc-refs 路径）；validateLabels 扩展 scope_files 存在性与 anchor heading 归一化校验 + scope-unreachable 静态可达性警告
- 探针：scope-manual GREEN（补 entries-only 正例与 section 隔离负例）；其余五类保持/转绿
- 验收口径：原 5 条 scope 冻结子集单列如实报告（预计仍 0.2，不得用新增 case 掩盖）；新增 scope 子集单列 top3（平台 n≥6、本仓 n≥5）；entries/decisions/search/fr 旧 case 逐条 rank 不回归（平台 decisions n 扩大导致 top3 变化属预期）
- 回归：knowledge 面全绿 + lint 绿；baseline 更新 version=1；organic 到每仓 50 推迟为独立数据变更

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. A 段：entry 节点补 category/anchor/display；section 级 doc-refs 建边（extractFilePaths + normalizeAnchorForCompare 前缀容忍，保持 medium 强度不动 graphPath/impact）；scopeRecall 显式收 doc-refs entry 且 entries-only 返回非 null；GRAPH_CACHE_VERSION 1→2 且 fingerprint 含 INDEX 引用的手工文档 stat
2. B 段：两跳 file→deliverables 反查 change→from-change 反查决策，只收 rejected/deathPath；排序 rejected/deathPath 优先→direct>two-hop→变更名日期→id；scope hit 设 score（direct=2/two-hop=1）保证渲染面过滤器可见；引擎 decision cap 保持 20
3. C 段：平台 decisions 补 8~10 条（27 条非 parking rejected 中选、排除同文件重复 id、query 用「域关键词+标题」配方）；scope 面两侧各补 5~8 条带 scope_files 的 case（平台用 fetch-sse/auth_deps/main.py 三个真实 doc-refs 路径）；validateLabels 扩展 scope_files 存在性与 anchor heading 归一化校验 + scope-unreachable 静态可达性警告
4. 探针：scope-manual GREEN（补 entries-only 正例与 section 隔离负例）；其余五类保持/转绿
5. 验收口径：原 5 条 scope 冻结子集单列如实报告（预计仍 0.2，不得用新增 case 掩盖）；新增 scope 子集单列 top3（平台 n≥6、本仓 n≥5）；entries/decisions/search/fr 旧 case 逐条 rank 不回归（平台 decisions n 扩大导致 top3 变化属预期）
6. 回归：knowledge 面全绿 + lint 绿；baseline 更新 version=1；organic 到每仓 50 推迟为独立数据变更

## 成功标准（可验证）

1. A 段：entry 节点补 category/anchor/display；section 级 doc-refs 建边（extractFilePaths + normalizeAnchorForCompare 前缀容忍，保持 medium 强度不动 graphPath/impact）；scopeRecall 显式收 doc-refs entry 且 entries-only 返回非 null；GRAPH_CACHE_VERSION 1→2 且 fingerprint 含 INDEX 引用的手工文档 stat
2. B 段：两跳 file→deliverables 反查 change→from-change 反查决策，只收 rejected/deathPath；排序 rejected/deathPath 优先→direct>two-hop→变更名日期→id；scope hit 设 score（direct=2/two-hop=1）保证渲染面过滤器可见；引擎 decision cap 保持 20
3. C 段：平台 decisions 补 8~10 条（27 条非 parking rejected 中选、排除同文件重复 id、query 用「域关键词+标题」配方）；scope 面两侧各补 5~8 条带 scope_files 的 case（平台用 fetch-sse/auth_deps/main.py 三个真实 doc-refs 路径）；validateLabels 扩展 scope_files 存在性与 anchor heading 归一化校验 + scope-unreachable 静态可达性警告
4. 探针：scope-manual GREEN（补 entries-only 正例与 section 隔离负例）；其余五类保持/转绿
5. 验收口径：原 5 条 scope 冻结子集单列如实报告（预计仍 0.2，不得用新增 case 掩盖）；新增 scope 子集单列 top3（平台 n≥6、本仓 n≥5）；entries/decisions/search/fr 旧 case 逐条 rank 不回归（平台 decisions n 扩大导致 top3 变化属预期）
6. 回归：knowledge 面全绿 + lint 绿；baseline 更新 version=1；organic 到每仓 50 推迟为独立数据变更
