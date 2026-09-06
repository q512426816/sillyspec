# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-001@v1 : 本变更范围 = IR 提案 P3a，不含 P3b/c/d
状态：implemented
变更：2026-09-06-ir-stage-p3a
锚点：未记录
最近确认：11aa319
理由：仅 P3a（种子稿第 6 节）：plan 侧 task 卡 target_files 声明 + execute 侧机器对账（scope creep 检出）。P3b（verify 结论表）、P3c（design facts）、P3d（archive delta 回灌）各自独立变更立项。

## D-001@v1 : P3b 范围 = verify 结论表机器半边 + 探针一致性抽查 + claims 三层标注
状态：implemented
变更：2026-09-07-ir-stage-p3b
锚点：未记录
最近确认：6d72aca
理由：种子稿 §4 三点全部落地：①验证结论表的机器半边（CLI 全权生成 verify-facts.json：探针命令行+首跑关键指标快照）②探针复跑抽查（verify gate 重跑对比防篡改）③claims 三层分级标注（确定性检查/可复跑探针/人工判断）。不做 verify.facts.yaml 的 agent 半边（agent 手写 IR 是已知前科风险，判断层保持 verify-result.md 散文）。
