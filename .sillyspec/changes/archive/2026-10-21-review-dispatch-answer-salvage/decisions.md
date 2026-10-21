---
author: flow-machine-draft
created_at: 2026-10-21T08:07:29.335Z
---
# 决策记录（Decisions）— 2026-10-21-review-dispatch-answer-salvage

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：**平台 get_worker_result 的 answer 字段形态未拿到 schema 实证**（dsh 会话只证明「平台 UI 可见回答正文」与「artifacts 回收不到」）。缓解：answer/result 双字段兜底 + 任务书 ```json 块指引让原文落在可扫描形态 + salvage 把 artifacts 原文也序列化兜底——三重兜底下最坏退化仍是现状（completed-no-artifact + ②降级），不会更差。 放弃案： - **仅在 --salvage 时写 worker-answer.md**（正常回收不写）——放弃。终态原文是审计证据面（dsh 事故里人工只能靠平台 UI 贴回原文），回收成功也应留原文；且「写了但没提示」无成本（一个 markdown 文件随 .runtime 生命周期回收）。 - **completed-no-artifact 时 CLI 自动降级写 self review**——放弃。降级是人工决策（②里显式确认「平台确无结果」），CLI 自动降级正是本事故要修的「静默把独立评审降成自审」。 - **--from 直接指向 worker-answer.md**——放弃。register-stage-review --from 对文件做 JSON.parse+schema 校验，原文 markdown（含 ```json 围栏与说明文字）必然解析失败；--from 指向「人工修整出的纯 review.json 文件」，worker-answer.md 是修整素材。 - **client.js 里直接做 JSON 提取**——放弃。传输层保持纯度（task-02 既有约束），语义解析归消费方 extractReviewFromArtifacts，本次只透传原文。
