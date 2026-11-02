---
author: flow-machine-draft
created_at: 2026-11-02T15:50:03.790Z
---
# 提案书（Proposal）— 2026-11-02-series-final-cleanup

## 动机

任务原话转写：全系列终审修复：底稿资格门+存量红+决策补录

用户终审发现：两个存量红（AGENTS.md 规则4与模板漂移、git ls-files 超 maxBuffer）；P2 停车场回涨（4C/5/6 归档蒸馏又产出 4 条底稿模板 D-485~488，4D 前置条件成自指死锁——只要 harvestSlot4Decision 还在产「设计期风险与放弃方案（底稿）」且 deathPath 判定把它们标为死路，停车场就持续回涨）；小项（4D 推迟无决策条目、parseFlowArchiveEntries 缺替代注记）。存量红已在工作区修好（AGENTS.md 同步模板 metrics/metrics_routes 句、brainstorm-auto-retire maxBuffer 8MB）。

成功标准：
- 底稿资格门：knowledge-match.js 的 deathPath 判定跳过模板标题条目（设计期风险与放弃方案/风险与死路/底稿特征词——它们是 process 级流程取舍非真否决，标 deathPath 会占防复潮席位且使 4D 模板清零条件永不可满足）；测试锁「模板标题不获 deathPath，真否决仍正常获得」
- 存量红修复入库：AGENTS.md 规则4 与模板逐字一致 + brainstorm-auto-retire maxBuffer 8MB
- 4D 推迟决策补录：decisions add D-001 记「unmapped 降权参与推迟——模板底稿不清零不解禁；复潮条件：底稿资格门落地且停车场真实残量 ≤5/条」
- parseFlowArchiveEntries 注记：文件头注记「归档检索源已由 scope 两跳（knowledge-graph）替代——本函数仅缓存测试消费，非活检索面接线点」
- 验收：全量 npm test 零红（含两个存量红修复）+ eval 六探针 GREEN + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 底稿资格门：knowledge-match.js 的 deathPath 判定跳过模板标题条目（设计期风险与放弃方案/风险与死路/底稿特征词——它们是 process 级流程取舍非真否决，标 deathPath 会占防复潮席位且使 4D 模板清零条件永不可满足）；测试锁「模板标题不获 deathPath，真否决仍正常获得」
2. 存量红修复入库：AGENTS.md 规则4 与模板逐字一致 + brainstorm-auto-retire maxBuffer 8MB
3. 4D 推迟决策补录：decisions add D-001 记「unmapped 降权参与推迟——模板底稿不清零不解禁；复潮条件：底稿资格门落地且停车场真实残量 ≤5/条」
4. parseFlowArchiveEntries 注记：文件头注记「归档检索源已由 scope 两跳（knowledge-graph）替代——本函数仅缓存测试消费，非活检索面接线点」
5. 验收：全量 npm test 零红（含两个存量红修复）+ eval 六探针 GREEN + lint 绿

## 成功标准（可验证）

1. 底稿资格门：knowledge-match.js 的 deathPath 判定跳过模板标题条目（设计期风险与放弃方案/风险与死路/底稿特征词——它们是 process 级流程取舍非真否决，标 deathPath 会占防复潮席位且使 4D 模板清零条件永不可满足）；测试锁「模板标题不获 deathPath，真否决仍正常获得」
2. 存量红修复入库：AGENTS.md 规则4 与模板逐字一致 + brainstorm-auto-retire maxBuffer 8MB
3. 4D 推迟决策补录：decisions add D-001 记「unmapped 降权参与推迟——模板底稿不清零不解禁；复潮条件：底稿资格门落地且停车场真实残量 ≤5/条」
4. parseFlowArchiveEntries 注记：文件头注记「归档检索源已由 scope 两跳（knowledge-graph）替代——本函数仅缓存测试消费，非活检索面接线点」
5. 验收：全量 npm test 零红（含两个存量红修复）+ eval 六探针 GREEN + lint 绿
