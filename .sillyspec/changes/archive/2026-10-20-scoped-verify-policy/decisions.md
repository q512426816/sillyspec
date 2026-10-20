---
author: flow-machine-draft
created_at: 2026-10-20T15:50:38.025Z
---
# 决策记录（Decisions）— 2026-10-20-scoped-verify-policy

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险1：--failed 全绿自清后用户以为无失败——自清即「失败面已清零」的正确语义，汇总区打印复跑指引与清零提示；可接受。 - 风险2：清单陈旧（测试改名/删除）——filterToFailedFace 对缺失项显式 warn，不静默；可接受。 - 死路：考虑过把失败清单嵌 verify-runs 的 test-result.json 复用——放弃：该文件是收口账本产物（每 runId 一份，不覆盖），复用需读最新 runId 引入耦合；独立清单文件一目了然，写入点就在汇总区。
