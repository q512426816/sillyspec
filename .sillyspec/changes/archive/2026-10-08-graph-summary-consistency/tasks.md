---
author: flow-machine-draft
created_at: 2026-10-08T16:09:40.486Z
---
# 任务注册表（Tasks）— 2026-10-08-graph-summary-consistency

- [x] task-01: 判定逻辑抽共享 helper（graphModuleDocGaps/graphChangelogDanglings 落 knowledge-graph.js 单一源），doctor 六检查消费 helper（删内联副本），summary 四计数消费 helper——「一处定义两处消费」注释成真
- [x] task-02: summary 增 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（不动 dangling_refs 既有语义——平台消费面兼容）
- [x] task-03: 测试补齐：module_doc_gaps 正值断言（mini-fixture 无卡模块）、changelog_danglings 双 existsFn 态断言、doctor↔summary 四计数交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值相等）
- [x] task-04: 既有图测试 9 组 + doctor 回归全绿，lint 零告警
