---
author: qinyi
created_at: 2026-09-24 14:10:00
---
# 需求规范（Requirements）— 2026-09-24-fr-test-readside

## 角色
- **verify 实测门**（src/verify-postcheck.js runVerifyTestCheck / src/run/gates.js）：
  消费方与执行点。
- **trace 台账**（changes/<名>/test-trace.json，写侧产物）：残差来源。
- **`sillyspec tests` 修理工**（前笔）：悬空修复通道。
- **test-ledger**：缓存面（trace 非空变更停复用）。

## 功能需求

### FR-01: 锚点集与残差计算
verify 门解析本变更锚点集 = ⋃(changes/<名>/tasks/*.md frontmatter
requirement_ids 局部号)；取 test-trace.json 中 anchor∈锚点集 且 state=active
且 status≠superseded 的行（orphan/candidate 不进）→ 残差文件集=行 tests 并集。

### FR-02: 保守差集
可证覆盖集仅 = 现选测动作 deps-auto-subset 的文件集；full / module-subset /
module-zero-hit-skip / skip 一律无可证集 → 残差=全部 trace 文件。禁止解析
命令字符串推断覆盖面。

### FR-03: 执行矩阵（现选测逐字保留 + 残差加法）
- trace 空 → 完全沿用现选测（含 skip）——行为与前置提交逐字节一致。
- skip / module-zero-hit-skip 且 trace 非空 → 跑集=trace 文件（现选测 skip
  语义自身不动——结果 mode 标 trace 残差执行）。
- full / module-subset / deps-auto-subset → 主跑照旧 + 补残差段。
- 任一段失败 → 整体 failed（reason 透传残差段失败明细）。

### FR-04: runner 解析（复用既有推断面）
残差文件按 buildDepsBatches 同口径组卷：`.py` → pytest 前缀（自模块命令推断），
其余 → `node --test <files>`；语言无法判定/文件缺失 → 硬错不猜测；绑定行禁存
shell command（写侧已守）。

### FR-05: 悬空硬错
锚点集内 active 行的 tests 路径（相对 cwd）任一缺失 → verify 门硬拦
（status=failed、reason 含缺失清单与修复指引 `sillyspec tests --unbind`），
不进入测试执行——悬空行让表成谎言，比没表更糟。

### FR-06: 披露
每次 verify 门落 `changes/<名>/verify-trace-disclosure.json`：锚点集、行映射
（anchor→row_id→tests）、可证覆盖来源（deps 文件集/命令型不可枚举声明）、
残差清单；console 一行摘要（人读）。真源=sidecar，console 仅提示。

### FR-07: 账本停复用护栏
trace 非空变更的 verify 门跳过 test-ledger consult/record（run plan 含残差
静态不可预测——fail-closed）；trace 空/缺失 → 照用 v2 键（行为不变）。

## 验收口径
残差并入跑集且失败透传、悬空硬拦可修复、trace 空零行为漂移、披露 sidecar
机械可算、账本护栏生效——不看理想秒数（方案 §4）。

## 决策引用（decisions.md 全量）
- FR-01/FR-02 ← D-001（锚点集与保守差集）
- FR-03 ← D-002（执行矩阵与 skip 语义）
- FR-04 ← D-003（runner 复用）
- FR-05 ← D-004（悬空硬错时机=门入口 fail-fast）
- FR-06 ← D-005（sidecar 真源+console 提示）
- FR-07 ← D-006（账本停复用 fail-closed）
- 无剩余风险标注：D-001..D-006 全被上文 FR 覆盖。
