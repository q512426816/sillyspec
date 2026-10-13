---
author: flow-machine-draft
created_at: 2026-10-13T09:15:39.251Z
---
# 任务注册表（Tasks）— 2026-10-13-extract-head-guard
- [x] task-01: 测试先行——test/draft-continuation.test.mjs 追加守卫用例（动机未闭合左括号+成功标准：节标题不被吞、验收标准 等价、0 条→正常提取），先跑红
- [x] task-02: 实现——extractSuccessCriteria 合并循环加当前行节标题守卫（SECTION_HEAD_RE 命中无条件独立成行）；新用例全绿 + 既有 4 锚零改动全绿
- [x] task-03: 回归——flow-draft 相关测试 + lint + 全量 npm test
