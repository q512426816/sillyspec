---
schema_version: 1
doc_type: module-changelog
module_id: change-management
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# change-management 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。卡内既有「变更索引」表为迁出前历史，保留不动。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | quicklog 根因块嵌套四子字段（D-004@v1 / task-07）：根因块内 - 现象：/- 根因：/- 护栏：/- 证据： 列表行为合法 postmortem 形态（顶层标签白名单 ^ 行首锚定，「- 」前缀不构成顶层标签、顶层四字段边界不动，旧条目回退不受影响）；buildPushPayloadFromRaw 字段块复位修复（进入 需求/根因/方案/结果 字段块关闭 inFiles/inLinked 续行模式，防嵌套子字段列表行被「文件 bullet」分支劫进 payload.files）；单行四字段切分声明只作用于单行压缩归一路径。新增回归测试 quicklog-postmortem-fields.test.mjs。 |
| 2026-09-10 | ql-20260910-001-7ae6（quick） | quick --done 软归属：matchSameModuleTestFiles（run/shared.js）stem 匹配窗口内未声明同模块测试文件 → review.softTestFiles → flipEntryInContent（quicklog.js）补入文件行 bullet 带「软归属·同模块测试，未声明」括注；complete-handlers 审计行拆 ⚖️（真未知）/🔍（软归属单列，可追溯剔除）。硬归属口径不变（声明即归属，softTestFiles 不进 attributedFiles）。新增 test/quicklog-soft-attribution.test.mjs。 |
- ql-20260912-001-ca16 | 平台推送移出 withFileLock 临界区（allocate/appendWithId/complete 三函数：锁内只留本地写+tasks 挂载，推送+sidecar 锁外 best-effort）——临界区不再可破 30s stale 偷锁阈值，根治双写者并发丢更新复潮面
