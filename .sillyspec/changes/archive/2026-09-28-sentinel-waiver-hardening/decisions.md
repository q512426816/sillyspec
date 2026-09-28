---
author: flow-machine-draft
created_at: 2026-09-28T15:45:26.931Z
---
# 决策记录（Decisions）— 2026-09-28-sentinel-waiver-hardening

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：①过渡期变更（镜像豁免变更与本变更之间 start 的）无锚定——信任基线（窗口一天内的少量变更，接受）；②agent 篡改 flow-state 里的 baseline_sha256 本身（change 目录内文件）——flow-state 属机器记账面，篡改它等于篡改 substeps/review_force 等全部收口依据，攻击面超出本哨兵职责（审计件 change.patch sha256 锚定兜底）。watcher R1 为 advisory 人判面，容忍无锚基线（消费侧未哈希校验——硬门在 flow done，纵深以锚定为准）；死路=把基线挪进 git 追踪（.runtime 惯例是本地观测面不进 git，为豁免破例不值）。退役判据=零提交从严误伤真实场景（如纯评审类变更无交付提交但有合法勾选）出现投诉。
