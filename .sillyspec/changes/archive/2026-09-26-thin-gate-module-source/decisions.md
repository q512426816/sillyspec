---
author: flow-machine-draft
created_at: 2026-09-26T00:36:54.494Z
---
# 决策记录（Decisions）— 2026-09-26-thin-gate-module-source

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险＝回退清单过宽或过窄导致实测面失真：过宽（restrictFiles 含非本会话文件）——清单上游就是会话归属面（快照 overlay 同源），且仅在 git 源为空时兜底，非空时仍以 git diff 为准；过窄（flow 归属面漏文件）——与快照 overlay 完全同源，漏则同漏，不引入新偏差。次风险＝日志噪音：回退打一行 ℹ️，每次门跑至多一条。放弃方案：①flow 把 baseline_commit 作 diffBase 穿进 runVerifyTestCheck——接线三层（flow.js→quick-audit→verify-postcheck）、签名扩散，且不覆盖 quick 会话全提交同形；②0 命中时无条件回退全量——正是既有 module-zero-hit-skip 分支刻意避免的（防超时/预存失败），不动。
