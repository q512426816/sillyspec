---
author: qinyi
created_at: 2026-09-18 07:10:00
generated_by: agent
change: 2026-09-18-fr-index-l1
plan_level: full
---

# 实现计划（Plan）

> 任务真相源：tasks.md（checkbox 状态以 tasks.md 为准——task-truth-unify 契约；本文件为 Wave 编排与执行指引）。

## Wave 1：底座参数化

- task-01

**执行指引**：decision-distill.js 四函数参数化（splitKnowledgeSections 接节头正则参数（decisions 缺省 `^## (D-\d+)@v(\d+)`，fr 传 `^## (FR-[a-z0-9-]+)-(\d+)`）；syncIndexRoutingLines 接 INDEX 节名/子目录/链接前缀参数（decisions 缺省不变）；joinKnowledgeFile/discoverModuleIndex 导出）。铁律：decisions 侧调用点与行为零变更，既有 decision-distill 相关测试全绿即回归证明。

## Wave 2：索引核心

- task-02

**执行指引**：新建 src/fr-index.js 按 design 接口定义四导出 + FR_INDEX_EPOCH；域解析=design.md 文件变更清单表行（剥 NEW: 前缀）× _module-map paths 前缀匹配（moduleIndex 复用）；幂等=「来源变更」字段变更名命中即 no-op；承接 id 校验（索引全域扫描）不存在→warnings；unreferenced=触达域 active 数−承接引用数按域计数。

## Wave 3：三消费面挂载（并行无共享文件）

- task-03
- task-04
- task-05

**执行指引**：task-03 archive-distill 追加调用+fr-supersede/fr-unreferenced 遥测（best-effort 不变）。task-04 stages/brainstorm.js step8 模板插 {FR_INDEX_DIGEST} token+承接指引；run/prompt.js 替换实现+fr-inject 遥测；complete.js step8 --done 软门+fr-duplicate-warning 遥测。task-05 doctor D14 第四检查（epoch 日期前缀比较；quick-<8hex>/无 requirements 豁免；违者 offenders reason「FR 索引缺失」/「取代未标」；既有豁免账本机制复用）。

## Wave 4：测试

- task-06

**执行指引**：两测试文件——NEW:test/fr-index.test.mjs fixture 全态（发号/幂等重放/承接翻链/域兜底/digest 藏 superseded/overlap 阈值/坏承接 warn/unreferenced）+ test/doctor-archive-integrity.test.mjs 第四检查四态（epoch 前 skip/epoch 后缺索引红/承接未标红/豁免复用）。

## Wave 5：全量验收

- task-07

**执行指引**：（fr-index.test.mjs fixture 全态：发号/幂等重放/翻链/域兜底/digest 藏 superseded/overlap 阈值/坏承接/unreferenced；doctor 测试 +第四检查四态）。task-07 全量 npm test + 四遥测事件 fixture 落盘读回 + 自举演练（临时 fixture 变更走 indexRequirements→doctor 复扫零 offender）。

## 风险与回退

- R-03（格式漂移）由复用同一底座+fr/ 头注释钉契约兜底；R-05（自举被抓）是活证不是事故。
- 回退：摘除 archive-distill 追加调用即回现状；fr/ 目录与事件流纯增量可整体退役。
