---
author: flow-machine-draft
created_at: 2026-10-15T16:21:49.378Z
---
# 设计记录（Design Record）— 2026-10-16-step-guide-dyn-completeness

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

消费仓会话复盘（2026-10-15-change-detail-redesign）定位的根因级缺陷根治：复入短输出的「动态注入段」附录（prompt.js:2109-2111）只收集 `substitute()`（1037）与 `substituteSplitJoin()`（1043）两个助手压入的 `dynSegments`；全文件另有 9 站点用裸 `.split().join()` 注入——值进 promptText 但不进附录、不落盘，guide 掩码后无任何回读通道。其中最贵的评审六值（tier+菜单/reason/run-id/JSON 契约/前序事实/材料包）缺失，直接催生消费仓会话「读引擎源码逆推档位 → 手建等价材料包 → 手拼 review.json 路径写错一层前缀」整条弯路。

修复三件：①新增 `substituteRaw(token, value)` 助手（push + split/join），9 站点全部收编（评审成功/降级两分支共 12 处 + WORKTREE_META/TASK_COMPLETION_REPORT×2/WORKTREE_BASELINE_INFO/EVIDENCE_AUTO_RECOMMENDATION/ARCHIVE_IMPACT_AUDIT/SCOPE_AUDIT_TABLE/HANDOVER_SUMMARY）；②掩码表补 3 个同类漏登 token（{REVIEW_TIER}/{REVIEW_TIER_REASON}/{REVIEW_JSON_CONTRACT}）；③stage-review 路径警告措辞覆盖双向错法（漏前缀 2026-10-10 / 多前缀 2026-10-15 复发）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/run/prompt.js`：新增模块内 `substituteRaw`（不进导出面）；9 站点替换后 promptText 字节结果不变（split/join 语义逐字保留），**唯一行为变化 = 复入附录多出这些段**（设计意图：动态段每次照常渲染）。首见渲染输出零变化。
- `src/stage-review.js`：仅渲染文案变化（警告句），无逻辑变化。
- 未收编面（显式声明）：`ki.section` 与 `semanticGuardBlock` 两处追加式注入 gated by quickFirstStep（quick 通道 v3.30.0 已退役，仅存量会话收尾）——未收编理由：作用面为退役通道，且追加式注入无占位符 token（收编需另定语义）；如需可后续独立变更。
- 附录体积影响：重入场景附录增长为这些段的值（评审块/进度完成度/worktree meta 等，均为定长或已限额块）——与「动态段永不缓存」的既定契约一致。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/prompt.js | substituteRaw 助手 + 9 站点收编 + 掩码表补 3 token |
| 修改 | src/stage-review.js | 路径警告措辞双向覆盖 |
| 新增 | NEW:test/step-guide-dyn-completeness.test.mjs | 首见真值 / 复入附录含评审六值 / 掩码表覆盖 / 警告措辞 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用（单进程渲染函数内的收集顺序=渲染顺序，既有语义）。
2. 并发写：无新增共享态；dynSegments 为函数内局部数组。
3. 切换/生命周期：指纹面——掩码表新增 3 token 会改变含这些 token 的步骤指纹（step7 类），存量变更下次渲染将全量重印一次（良性，一次性）；state 文件按变更隔离，无跨变更影响。
4. 作用域：纯本地渲染逻辑，无跨仓面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险：复入附录体积增长（评审步骤重入时打印 tier/菜单/契约/材料包全文）。评估：这正是 2026-10-15 事故缺失的救命信息，且复入本就为「上下文丢失后恢复」场景；JSON 消费面（jsonHijacked）与 SILLYSPEC_STEP_GUIDE=0 逃生门不受影响。接受。
- 次风险：降级分支（catch 内）也 push 占位值（'self'/异常文案）——无害（附录如实呈现降级态），且帮助事后诊断。
- 死路：只修评审六处而不收编其余 7 站点——同类漏收仍在（WORKTREE_META 等），下次同类事故换一个 token 复现；类级修复才治本。
- 死路：把复入附录做成「读取时惰性重建」——重建需重跑全部注入逻辑（副作用/耗时），与「渲染时收集」的既有单向结构冲突；push 是零成本路径。
