---
author: qinyi
created_at: 2026-09-24 12:40:00
---
# 需求规范（Requirements）— 2026-09-24-fr-test-bindings

## 角色
- **探针 7**（src/verify-probes.js）：候选供给（机械归属，主写点）。
- **verify --done 矩阵门**：确认面（判定列=agent 复核结果）。
- **fr-index 归档链**（src/fr-index.js）：全局锚铸造与提升挂点。
- **quick --done 门**：ql 行机械落点。
- **`sillyspec tests` CLI**：视图与唯一合法修理工。
- **agent / 人类**：复核与修复的裁量人。

## 功能需求

### FR-01: 探针 7 机械落 candidate 行
构建探针 7 时，把矩阵归属行机械落 `changes/<名>/test-trace.json`：
anchor=局部 `FR-NN`（requirement_ids join）；无锚行落 `anchor:null`+`row_id`
（含 acceptance 原文短指纹，禁易漂移纯序号作长期主键）；`discovery:machine`、
`state:candidate`、`confirmed_by:null`。归属空（uncovered/non-testable 预填）不落行。

### FR-02: 晋升规则（candidate→active）
verify --done 矩阵门通过后按判定列更新 trace：`covered/covered-service`→
`state:active`+`confirmed_by:agent`+`confirmed_at:<HEAD>`；`partial`→保持
candidate；`uncovered/non-testable`→不产生 active 绑定。CLI 预填不得直接当 active。

### FR-03: 归档提升（局部锚→全局锚）
归档 indexRequirements 时消费本变更 test-trace.json：局部 FR-NN 铸全局
`FR-<域>-NNN` 后，绑定行写入活库条目「测试绑定:」机器子块；幂等=同源重放对
绑定行内容不变时 no-op；FR 被 supersede 时由提升模块同步置绑定行 `status:superseded`
（禁死锚）。

### FR-04: 字段级所有权（四硬约束）
①蒸馏重放不得覆盖已确认绑定字段；②同源重放不得冲掉 agent 修复（机器晋升按
`source_change+row_id` upsert，内容不变 no-op）；③`--bind/--unbind` 走原子写
（writeAtomicSync）；④supersede 同步见 FR-03。机器字段块头部声明「勿手改」。

### FR-05: quick --done 落 ql 绑定
quick --done 对提交窗口测试文件（isTestPath 口径）机械落 ql-… candidate 行至
quicklog 侧机器面（`.sillyspec/quicklog/test-bindings.json`），`discovery:machine`、
`confirmed_by:null`——诚实记录，确认走 FR-06 修理工。

### FR-06: `sillyspec tests` CLI（视图+修理工）
`--anchor <锚> | --change <名>` 只读视图；`--bind/--unbind` 唯一合法修理工：
锚必须可解析（FR 活库 active 条目 / QUICKLOG 在册 ql-id）、tests 路径必须存在，
违者硬错（修理工不得制造悬空）；写入 `confirmed_by:agent`+`confirmed_at:<HEAD>`
留痕，原子更新。

### FR-07: 锚空间与解析纪律
anchor 枚举 = `{FR-<域>-NNN | ql-<id> | null}`（禁 CAP/第四空间）；两处真源
（FR 条目子块 / quicklog 机器面）由 **src/test-bindings.js 单模块**解析读写；
不创建 knowledge/test-trace/ 目录（视图直接读真源）；reason 枚举
`spec|capability|regression`。

## 验收口径
机械落盘率、discovery/confirmed_by 分布、candidate 与 active 可区分、幂等重放
零漂移、--bind 留痕可审计——不看理想秒数（方案 §4）。

## 决策引用（decisions.md 全量）
- FR-01/FR-07 ← D-001（变更期载体）、D-003（晋升时机）、D-005（orphan 指纹身份）
- FR-02 ← D-003
- FR-03/FR-04/FR-06/FR-07 ← D-002（两真源+单点解析）
- FR-05 ← D-004（quick 行恒 candidate）
- 无剩余风险标注：D-001..D-005 全部被上文 FR 覆盖。
