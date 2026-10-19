---
author: flow-machine-draft
created_at: 2026-10-19T06:57:21.406Z
---
# 任务注册表（Tasks）— 2026-10-19-thin-empty-face-cross-repo-freeze

- [x] task-01: 主仓冻结面为空且 design 清单含规范跨仓标注时，跑跨仓对账并落 change-patch.json（scopeAudit.repos[] 含 patch 正文与 patchSha256），不写 change.patch；各仓均无交付时仍按空面跳过
- [x] task-02: 冻结件存在性复查把「change-patch.json 内 repos 有 patch」视为完整，重入不误报「冻结件缺失」
- [x] task-03: verify-result 回执对跨仓冻结构给出明确表述，不再写「无冻结件」
- [x] task-04: 既有 thin-empty-face-crosscheck / cross-repo-baseline-anchor / close-trace-freeze-integrity 测试全绿，并新增空面跨仓冻结用例
