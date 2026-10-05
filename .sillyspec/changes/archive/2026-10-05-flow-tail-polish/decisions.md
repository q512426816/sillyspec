---
author: flow-machine-draft
created_at: 2026-10-05T15:36:42.425Z
---
# 决策记录（Decisions）— 2026-10-05-flow-tail-polish

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：exit 0→1 是行为变化，依赖旧语义（用 exit 0 判断"查询完成"）的脚本会翻——接受，脚本按惯例以非零为异态，旧行为无法区分不存在才是隐患；machine-interface.test.mjs:420 的 exit 2 断言属 gate execute 域（用法错）不受影响。归档窄化 add 修复后 knowledge 自动入暂存恢复——既有设计已裁决该权衡（文件级 status 窄化非目录级，追加型共享面整文件提交与惯例一致）；兜底层（narrowed add 失败时）才降级为提示不自动暂存。试过但放弃：knowledge 兜底层也自动补暂存——放弃理由：降级场景下无法确认 narrowed add 失败原因，人核后提交更稳（AGENTS.md 规则 11 同因）；再试过：flow-state 不加字段、纯 proposal 回退——放弃理由：proposal 转写含「（未提供 --input）」占位与人工改写风险，state 直存是更可靠的原始面。
