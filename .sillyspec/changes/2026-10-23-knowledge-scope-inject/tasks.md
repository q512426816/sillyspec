---
author: flow-machine-draft
created_at: 2026-10-23T07:20:40.660Z
---
# 任务注册表（Tasks）— 2026-10-23-knowledge-scope-inject

- [x] task-01: 知识文件 section 支持作用域标记（scope: always / scope: repo / scope: module:域[,域]，HTML 注释形态；标记置于 heading 后、本节内有效；无标记=关键词现状不注入）；collectScopedKnowledge(knowledgeRoot) 解析 top-level knowledge/*.md（INDEX.md 除外）产出 always/repo/modules{域:[条目]}，条目含 file#heading 标识与首行摘要（≤80 字）
- [x] task-02: flowKnowledgeDigest 注入：always+repo 每次调用恒注入（≤5 条+溢出计数行，块头之后 FR 段之前）；module 作用域条目仅当 domains（resolveTouchedDomains 同源）命中该域时注入；关键词/否决决策/FR 段零改动；解析读取 fail-soft 空态零输出（缺省零回归）
- [x] task-03: 工具内置中立性行每变更恒注入（规约 00：不枚举开放世界/不锁死语言框架——CLI 自有分类（批类别/路径集合），新增语言只加探测适配）——消费仓无需任何配置即获得
- [x] task-04: 测试：collectScopedKnowledge 三态（always/repo/module 解析、无标记不产出、坏文件 fail-soft）＋flowKnowledgeDigest 集成（恒注入条目+内置行在场；无 scoped 条目输出与改动前逐字一致）＋既有 knowledge 族套件回归绿
