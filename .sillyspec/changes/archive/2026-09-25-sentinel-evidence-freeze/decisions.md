---
author: flow-machine-draft
created_at: 2026-09-25T10:41:11.855Z
---
# 决策记录（Decisions）— 2026-09-25-sentinel-evidence-freeze

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=提交面不过 foreign 切分后，共享分支的并行会话提交会进冻结面——但薄变更的 baseline..HEAD 就是本变更工作窗口的实际提交，把窗口内提交全量入冻结件是正确语义（审计完整性>归属精确性，归属精确性由实测面 attributedChangedFiles 保持）。
