---
author: zcode-quick-asset-tail
created_at: 2026-09-20 19:52:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 薄通道 agent | 走 brainstorm→linked quick 的会话，收尾时资产自动入账 |
| 纯 quick agent | 零写作义务，机械件自动留痕 |
| 下游变更 | brainstorm 时看到 needs_review 标注的 FR 与蒸馏入账的决策 |

## 功能需求

### FR-01: 薄通道蒸馏尾与 lite 归档
Given quick --done 且 test+lint 门禁 action ≠ fail 且 linkedChanges 含真变更（非 quick-<hex>）
When 收尾段执行
Then requirements.md 有 FR 块 → fr-index 入账（幂等）；decisions.md 有条目 → decision-distill 入账；随后 lite 归档（所有权 assert → rename 到 changes/archive/ → unregisterChange；目录已在 archive/ 时走自愈 unregister 不留永久 skipped）；两文件均缺失时零打扰跳过；全链 fail-open（异常 warn 不拦 quick 完成）

### FR-02: FR needs_review 标记与清除
Given 纯 quick 或薄通道 quick 触达某域且该域有 active FR
When 钩子#1 命中
When（清除侧）后续变更 requirements 承接该 FR 触发翻链
Then 条目写「待复核：<ql/变更 ref>」行（幂等：同 ref 跳过）；readActiveFrDigest 透传 needsReview；brainstorm 注入行 ⚠️ 标注；翻链就地补丁 filter 显式清理待复核行（superseded 状态本就不注入，清理为一致性收尾）

### FR-03: 纯 quick 机械件
Given 纯 quick --done（无 linked 真变更）
When 收尾段执行
Then changedFiles×module-map 命中模块且边车存在 → changelog 追加一行 `- ql-id | 摘要`；--cause 原文 × INDEX 关键词命中 → 打一行确切 classify 命令；needs_review 同 FR-02；三样零 agent 写作义务、fail-open

## 非功能需求
- 兼容性：既有钩子#1 遥测保留；边车不存在静默跳过；--cause 缺省无提示
- 可测性：distillLinkedChangeAssets/liteArchiveChange/markFrNeedsReview 全导出可直测

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 单一入口内联 |
| D-002@v1 | FR-01 | 门禁后蒸馏 |
| D-003@v1 | FR-02 | 信号非门禁 |
| D-004@v1 | FR-01 | lite 轻实现+自愈 |
| D-005@v1 | FR-03 | 零写作义务 |
