---
author: qinyi
created_at: 2026-09-18 07:05:00
generated_by: agent
change: 2026-09-18-fr-index-l1
---

# 任务清单（Tasks）

- [x] task-01: decision-distill 四底座函数参数化重构（splitKnowledgeSections 节头正则经参/syncIndexRoutingLines 的 INDEX 节名与子目录经参/joinKnowledgeFile/discoverModuleIndex 导出）——decisions 侧行为零回归由既有测试钉死 (depends_on: )
- [x] task-02: 新建 src/fr-index.js 索引核心——FR_INDEX_EPOCH 常量 + parseChangeRequirements（FR 块/承接行/场景名）+ indexRequirements（域解析剥 NEW: 前缀/发号/翻链/unreferenced/幂等/warn 不阻断）+ readActiveFrDigest（superseded 藏）+ frTitleOverlap（bigram） (depends_on: task-01)
- [x] task-03: archive 挂载——run/archive-distill.js 追加 indexRequirements 调用 + fr-supersede/fr-unreferenced 遥测（best-effort 降级语义不变；unreferenced 输出带「不算 L3 门禁」标注） (depends_on: task-02)
- [x] task-04: 注入与软门——stages/brainstorm.js step8 模板插 {FR_INDEX_DIGEST} token + 承接行指引与写作纪律；run/prompt.js 替换实现（active-only，fr-inject 遥测）；complete.js step8 --done advisory 重复检测（fr-duplicate-warning 遥测，不阻断） (depends_on: task-02)
- [x] task-05: D14 第四检查——doctor-diagnostics.js archive_integrity 加 epoch 分界检查（索引在场+取代完整，并入 offenders；豁免走既有账本；quick/scale:small 豁免面） (depends_on: task-02)
- [x] task-06: 测试——NEW:test/fr-index.test.mjs（发号/幂等重放/承接翻链/域兜底/digest/overlap 纯函数/坏承接 warn/unreferenced）+ test/doctor-archive-integrity.test.mjs +第四检查组（epoch 前 skip/缺索引红/取代未标红/豁免复用） (depends_on: task-02, task-05)
- [x] task-07: 全量验收——npm test 全绿 + 四类遥测事件 fixture 实测落盘读回 + 本变更自举路径演练（索引写入→D14 复扫零 offender） (depends_on: task-03, task-04, task-05, task-06)
