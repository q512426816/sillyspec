---
author: flow-machine-draft
created_at: 2026-10-14T15:33:12.787Z
---
# 设计记录（Design Record）— 2026-10-14-decision-legacy-renumber

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

存量决策号一次性迁移（用户裁决，翻「存量不回填」旧案——fr-index D-007 先例是设计取舍非技术禁忌，翻案理由随本变更蒸馏留痕）。新增 src/decision-renumber.js：纯函数 planRenumber（扫描全部域文件 → 迁移计划：legacy 节段发号、fanout 组收敛单一身份、无变更条目独立发号）+ applyRenumberPlan（按计划重写节段：标题换全局号、插原编号行、其余行逐字节保留、节段次序不变，joinKnowledgeFile 复用既有归一落盘形态）；CLI 接线 `sillyspec knowledge renumber --dry-run/--apply`（index.js）。epoch 机制（原编号字段/双形态解析/originId 匹配）已在 2026-10-14-decision-global-id-epoch 就位——迁移产物所有读面零改动即认识。兼容面：docs-check 解析器读原编号 + isDecisionExempt 认原编号（消费仓旧裸键不失效）。平台侧执行回执：迁移提交后 platform sync 全树 0 差异（后台自动 spec-sync 已随迁移提交推送）；向量探针 POST /api/spec/knowledge/vector-search 返回 404——该平台实例未部署向量层，本仓检索一直在本地词面回退路径运行（fail-open 设计），anchor 迁移对平台无中断面（FR-04 降级分支如实注记）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 src/decision-renumber.js：导出 `planRenumber(knowledgeRoot) → { perFile: [{file, ops: [{at, fromId, toId, originId}]}], stats: { legacySections, fanoutGroups, fanoutCopies, mintedNumbers, untouchedEpoch, perDomainStart } }` 与 `applyRenumberPlan(files: Map<file, content>, plan) → Map<file, content>`（纯函数，零 fs）。
- CLI 新增：`sillyspec knowledge renumber --dry-run | --apply`（dry-run 打印计划统计；apply 走 writeAtomicSync 重写 + 回执）。
- src/docs-check.js：parseDecisionEntries 增「原编号：」读入（cur.originId）；isDecisionExempt 增 originId 参（裸键/域限定键均同时匹配 id 与原编号）。
- 知识文件格式：迁移节段新增全局号标题 + 原编号行（epoch 形态，既有读面全兼容）；未迁移面零变化。
- 平台：无新契约（platform sync 既有通道；向量等值匹配既有语义）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 答：计划基于单次扫描快照，apply 同进程内完成（无中间态可乱序）；文件被并发写入时 apply 前重扫校验（内容指纹不符即中止退出码≠0，防覆盖他侧写入）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 答：迁移是运维型单次动作（人工触发），与 distill 并发窗口极小；apply 校验快照指纹 + 原子写收窄窗口；冲突即中止不覆盖。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 答：apply 逐文件原子写——中断时已完成文件为新形态、未完成为旧形态，两者读面均合法（双形态解析），重跑 --apply 幂等收敛（已迁移节段零触碰判定面=原编号在场）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 答：迁移作用于本仓 specBase/knowledge；其他仓各自按需跑同命令；号域=本仓命名空间（与 epoch 发号同构）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：真实库一次性重写 29 文件 701 节段——回退靠 git（迁移前状态已提交）；dry-run 对账先行（计划数=底数实测）；节段其余行逐字节保留 + 次序不变把改写面压到标题行与插入行两处。
- 平台向量索引：旧 anchor（局部号）在平台索引重建前不再命中——等值匹配下这些条目向量召回降级（本地词面检索不受影响），重建随平台 ingest 恢复；探针验证结果如实留档。
- 死路（放弃）：不做迁移只靠「自然收敛」——决策条目无跨变更承接机制，legacy 号永续共存（用户不接受永久双形态，裁决翻案）。
- 死路（放弃）：fanout 副本逐文件各自发号——违背单一身份铁律（FR 侧 R1 裁决同源），组内同号才保豁免键/引用/图节点一致性。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/decision-renumber.js | planRenumber/applyRenumberPlan 纯函数 |
| 修改 | src/index.js | knowledge renumber --dry-run/--apply 接线 |
| 修改 | src/docs-check.js | parseDecisionEntries 读原编号 + isDecisionExempt 认原编号 |
| 新增 | test/decision-legacy-renumber.test.mjs | ①~④ 用例族 |
| 修改 | .sillyspec/knowledge/decisions/*.md | 真实库迁移产物（apply 执行，随变更提交） |
| 修改 | .sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md | 模块卡索引增量 |
