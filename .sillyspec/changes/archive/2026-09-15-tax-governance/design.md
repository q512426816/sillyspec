---
author: qinyi
created_at: 2026-09-15 00:40:00
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-15-tax-governance

## 背景
自维护税不可见：①摩擦数据设计为归档即清理（pruneArchivedChangeRuntime :183-186），17 批摩擦修复史无结构化幸存记录，「哪个机制群税重」永远靠回忆；②decisions.md 条目无故障面/退役判据字段——新机制落地时没人被迫写「它引入什么失败模式、什么信号出现就该简化它」（acceptance-test-matrix D-001 已狗粮写入但 distill 未携带，静默丢弃实证）。

## 设计目标
1. 新 architecture 类决策自然携带故障面/退役判据，蒸馏进 knowledge/decisions 长期可读。
2. 摩擦历史归档时滚动进幸存台账，doctor 可见聚合与阈值提示。
3. 存量零迁移、软警告不阻断。

## 非目标
- 不做模块级摩擦归因（变更粒度够用，变更名即语义锚）。
- 不做 QUICKLOG 文本挖掘（结构化源优先）。
- 不做字段硬必填（一个观测周期后再评估棘轮升级——D-001 退役判据）。
- 不动 friction-tally 既有埋点与隐私红线。

## 拆分判断
两子机制共享「税可见化」主题、各自独立（字段链/台账），单变更两 task 不拆。

## 总体方案
**A. 决策字段链**：①src/stages/brainstorm.js **三处**模板（:165-176 基础字段格式、:425-437 版本规则示例、:570-596 生成规范文件步可选字段段——Grill X-12）追加可选行「- 故障面: <本决策引入的新失败模式>」与「- 退役判据: <出现什么信号时简化/删除本机制>」（提示性示例非强制）；②src/decision-distill.js **双触点**（Grill X-02）：applyField 加 case '故障面'/'退役判据' + FIELD_LABEL_RE 白名单扩两标签（缺白名单字段永远留 raw）；renderBlockLines（实名，:293-308）implemented 条目有值时追加「故障面：/退役判据：」行（仅非空渲染先例 :298-299；docs-check parseDecisionEntries 白名单精确匹配未知行忽略——X-04 增量安全实证）；③gate 软警告：brainstorm 与 plan 阶段 artifacts 校验中，解析 decisions.md 的 type: architecture 且 status: accepted 条目，缺任一字段 → warnings.push（文案含条目 ID 与修复指引，不阻断）。

**B. 摩擦台账（Grill P1-1 修订：滚动挂 consume 侧——tally 在 verify 收尾即被 consumeFrictionHint 删除（complete.js 两处），归档时 prune 只见残余，挂 prune 台账系统性空载）**：①主滚动点=src/run/complete.js 两处 verify 收尾（约 :679/:1548）：consumeFrictionHint 返回 counts 后 merge 进 <runtimeRoot>/friction-ledger.json——**merge-by-change**（同 change 已有条目按类型累加合并非双计——verify 可 --reopen 重跑；archivedAt 此时不落，prune 侧落定）；②兜底滚动=pruneArchivedChangeRuntime：删 tally 前读残余 events[type].count（Grill X-10：tally 结构是 events:{type:{count,lastAt}} 无 counts 字段）merge 同条目并落 archivedAt，返回值 additive 加 ledgerAppend；台账 JSON 数组 ≤200 条掐头留最新（**withFileLock + writeAtomicSync 读改写**——friction-tally.js :180-193 锁先例；坏文件按空数组起全量重启为容忍立场）；写失败 fail-soft 不阻断任何收尾；②新模块 src/friction-ledger.js 承载台账纯函数（readFrictionLedger/mergeFrictionEntry/rollLedger ≤200 掐头——runtimeRoot 同源单点 + ledger 测试免走重型 harness；**quick 会话第三 consume 点 complete-handlers.js:1677 不入台账**——tally 在 quick-sessions 树 session 目录随即删除，语义属会话内摩擦非变更级，plan-review gap）；③src/doctor-diagnostics.js 新维度「自维护税面」（self_maintenance_tax，dimensions :1080 additive push）：**severity 语义（Grill X-07）**——聚合展示与活跃 tally 列示走 pass:true 纯信息（不拉低 overall_status），仅单变更 total≥3 记 WARNING 并明示刻意（税重提示本就该拉状态）；台账/读写两侧 runtimeRoot 同源解析（resolveRuntimeRoot 平台模式防分裂——X-08）；台账缺失渲染「无台账数据」不告警。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | 三处模板（:165-176/:425-437/:570-596）追加故障面/退役判据可选行 |
| 修改 | src/decision-distill.js | 解析器 +2 case；renderEntry implemented 携带两字段行 |
| 修改 | src/stage-contract.js | validateBrainstormOutputs/validatePlanOutputs warnings 加字段软警告（:341-357/:393-399 已有 decisions 解析先例；经 gates :620-625 打印非 fail-soft——P1-3 教训天然避开；gates.js 预计零改动） |
| 新增 | NEW:src/friction-ledger.js | 台账纯函数载体（read/merge/roll；同源单点） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 补录 friction-ledger.js（runtime 模块 paths，lint 覆盖门禁——协调者收尾欠账，W1 实证） |
| 修改 | src/run/complete.js | 两处 verify 收尾 consume 后主滚动（空 counts 跳过写防干净收尾落空文件） |
| 修改 | src/run/complete-handlers.js | pruneArchivedChangeRuntime 兜底滚动（残余 merge + archivedAt 落定 + ledgerAppend 返回） |
| 修改 | src/doctor-diagnostics.js | 新维度 self_maintenance_tax（活跃 tally+台账聚合+阈值提示） |
| 新增 | NEW:test/tax-governance-fields.test.mjs | distill 双 case 解析+携带渲染+缺字段容错+gate 软警告（缺字段 warning 不 error/非 architecture 不警告） |
| 新增 | NEW:test/tax-governance-ledger.test.mjs | 台账滚动（删前 append/上限掐头/坏文件容错/fail-soft）+doctor 维度渲染（活跃+聚合+阈值/无台账不告警） |

## 接口定义
```js
// pruneArchivedChangeRuntime 返回值扩展（additive）
// → { ok: true, removed: number, ledgerAppend: boolean }
// friction-ledger.json 条目：{ change: string, archivedAt: string, counts: { gate_rollback: number, verify_run_failed: number, review_rejected: number }, total: number }
```

## 生命周期契约
本变更不涉及生命周期契约（lifecycle contract）——台账 append-only 无消费者契约；无 session/lease/daemon/heartbeat 新增。

## 数据模型
friction-ledger.json：**JSON 数组**（D-001@v2 定案——非 JSONL；withFileLock+writeAtomicSync 读改写，坏文件=空数组重启全量历史的容忍立场），≤200 条掐头，条目 {change, archivedAt?, counts:{gate_rollback,verify_run_failed,review_rejected}, total}；merge-by-change 累加；.runtime 树内（隐私红线同 tally——永不落 changes/）。

## 兼容策略（brownfield 必填）
- 存量 decisions 条目无两字段：解析不受影响（additive case），渲染跳过该行，gate 软警告仅对新增条目生效面（无法区分新旧——按「全部」扫描但只 warning 不阻断，存量噪音由观测期评估）。
- 存量归档变更：无台账数据（首次归档后滚动生成），doctor 渲染提示不告警。
- tally 文件不存在/损坏：摘要跳过（total=0 不入台账），归档照常。
- gates 软警告挂 brainstorm/plan 既有 artifacts 校验点（先读现状定锚，avoid fail-soft 块）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 软警告长期被无视（字段覆盖率不涨） | P2 | D-001 退役判据锚定：一个观测周期后按棘轮评估升级；doctor 可加覆盖率显示（本期不做） |
| R-02 | 台账 append 并发交错（双会话同时归档） | P3 | 归档本身经平台同步串行化；残行/坏 JSON 容忍按空数组起；写失败 fail-soft |
| R-03 | gate 警告扫描面误伤（非本变更产生的存量条目噪音） | P3 | warning 不阻断；文案标注「存量可忽略，新决策建议补齐」 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01（字段链）/FR-02（台账+doctor）/FR-03（软警告+零迁移）；总体方案 A/B | 已覆盖 |
| D-001@v2 | FR-02；数据模型（JSON 数组+锁+merge-by-change） | 已覆盖 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 入决策追踪表）
- [x] 生命周期关键词核对：不涉及，豁免短语紧邻「生命周期契约（lifecycle contract）」
- [x] UI 原型分级核对：纯 CLI/模板/诊断输出无界面，跳过（step 5 已声明）
- [x] Grill P1-1/P1-2 + 5 项 P2 已修订：台账滚动挂 consume 侧 merge-by-change（prune 兜底+archivedAt）/格式定案 JSON 数组+锁（D-001@v2）/软警告落 stage-contract warnings（非 fail-soft）/distill 双触点/三处模板/doctor severity 语义/runtimeRoot 同源/events 结构对齐
