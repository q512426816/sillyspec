---
author: flow-machine-draft
created_at: 2026-10-09T14:58:30.468Z
---
# 决策记录（Decisions）— 2026-10-09-verify-papercuts

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：②的段携载把 stale 人工面带进新骨架——沿 refreshProbeSections 既定安全方向（宁可少刷新不误删），stale 行追加段尾留 agent 裁决，gate 一致性抽查独立把关。放弃的方案：①按空白截断（script 名合法字符外还有大量 Unicode，白名单比黑名单稳定）；③无锚 blanket 20 提交全入窗（他变更文件污染窗口，必须消息锚定）；②只备份不携载（现状——找回回填来回比携载贵，当日实证）。
