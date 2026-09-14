---
author: qinyi
created_at: 2026-09-15 01:05:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| CLI（distill/gates/收尾链/doctor） | 字段解析携带、软警告、台账滚动、税面渲染 |
| brainstorm agent | 按模板示例自然写故障面/退役判据 |
| 人/doctor 读者 | 台账聚合与阈值提示消费 |

## 功能需求

### FR-01: 决策字段链
覆盖决策：D-001@v1
Given brainstorm.js 三处模板示例含可选行、distill 双触点解析（applyField case + FIELD_LABEL_RE 白名单）
When architecture+accepted 条目带故障面/退役判据 且归档蒸馏
Then knowledge/decisions 条目渲染「故障面：/退役判据：」行（仅非空渲染，docs-check 增量安全）；缺字段 → brainstorm/plan gate warnings 软警告（stage-contract warnings 通道，非 fail-soft，不阻断）

### FR-02: 摩擦台账
覆盖决策：D-001@v2
Given verify 收尾 consumeFrictionHint 返回 counts（complete.js 两处 :679/:1548）
When 变更摩擦非零
Then merge-by-change 进 friction-ledger.json（JSON 数组 ≤200 掐头，withFileLock+writeAtomicSync）；prune 兜底 merge 残余并落 archivedAt；同 change 重跑合并不双计；写失败 fail-soft

### FR-03: doctor 税面
覆盖决策：D-001@v1
Given doctor 运行
When 台账存在（缺失渲染「无台账数据」不告警）
Then self_maintenance_tax 维度：活跃非零 tally 列示 + 近 90 天 top5 + 累计总量（pass:true 纯信息）+ 单变更 total≥3 记 WARNING（刻意）；读写两侧 runtimeRoot 同源解析

## 非功能需求
- 兼容性：存量条目无字段解析不受影响（additive）；存量归档无台账不告警；坏 tally/坏台账 fail-soft
- 隐私：台账只落 .runtime 永不落 changes/（同 tally 红线）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02, FR-03 | 软警告+台账双轨（v2 修订格式与滚动点） |
| D-001@v2 | FR-02 | JSON 数组+锁+merge-by-change |
