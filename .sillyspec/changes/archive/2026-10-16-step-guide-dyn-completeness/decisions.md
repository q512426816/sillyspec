---
author: flow-machine-draft
created_at: 2026-10-15T16:45:05.842Z
---
# 决策记录（Decisions）— 2026-10-16-step-guide-dyn-completeness

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险：复入附录体积增长（评审步骤重入时打印 tier/菜单/契约/材料包全文）。评估：这正是 2026-10-15 事故缺失的救命信息，且复入本就为「上下文丢失后恢复」场景；JSON 消费面（jsonHijacked）与 SILLYSPEC_STEP_GUIDE=0 逃生门不受影响。接受。 - 次风险：降级分支（catch 内）也 push 占位值（'self'/异常文案）——无害（附录如实呈现降级态），且帮助事后诊断。 - 死路：只修评审六处而不收编其余 7 站点——同类漏收仍在（WORKTREE_META 等），下次同类事故换一个 token 复现；类级修复才治本。 - 死路：把复入附录做成「读取时惰性重建」——重建需重跑全部注入逻辑（副作用/耗时），与「渲染时收集」的既有单向结构冲突；push 是零成本路径。
