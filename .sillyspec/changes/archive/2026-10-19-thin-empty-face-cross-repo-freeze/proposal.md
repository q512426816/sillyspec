---
author: flow-machine-draft
created_at: 2026-10-19T06:57:21.405Z
---
# 提案书（Proposal）— 2026-10-19-thin-empty-face-cross-repo-freeze

## 动机

任务原话转写：薄变更空面跨仓冻结补留档

动机与背景：生产实证（消防工作区 4e9eb05b）thin 变更代码全在跨仓、主仓冻结面为空时，flow done 空面分支直接跳过 patch 留档，归档缺 change.patch/change-patch.json，平台审计断档。跨仓冻结现仅挂在非空主仓面分支；纯跨仓规范标注与无清单形态仍无冻结物。

成功标准：
- 主仓冻结面为空且 design 清单含规范跨仓标注时，跑跨仓对账并落 change-patch.json（scopeAudit.repos[] 含 patch 正文与 patchSha256），不写 change.patch；各仓均无交付时仍按空面跳过
- 冻结件存在性复查把「change-patch.json 内 repos 有 patch」视为完整，重入不误报「冻结件缺失」
- verify-result 回执对跨仓冻结构给出明确表述，不再写「无冻结件」
- 既有 thin-empty-face-crosscheck / cross-repo-baseline-anchor / close-trace-freeze-integrity 测试全绿，并新增空面跨仓冻结用例

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 主仓冻结面为空且 design 清单含规范跨仓标注时，跑跨仓对账并落 change-patch.json（scopeAudit.repos[] 含 patch 正文与 patchSha256），不写 change.patch；各仓均无交付时仍按空面跳过
2. 冻结件存在性复查把「change-patch.json 内 repos 有 patch」视为完整，重入不误报「冻结件缺失」
3. verify-result 回执对跨仓冻结构给出明确表述，不再写「无冻结件」
4. 既有 thin-empty-face-crosscheck / cross-repo-baseline-anchor / close-trace-freeze-integrity 测试全绿，并新增空面跨仓冻结用例

## 成功标准（可验证）

1. 主仓冻结面为空且 design 清单含规范跨仓标注时，跑跨仓对账并落 change-patch.json（scopeAudit.repos[] 含 patch 正文与 patchSha256），不写 change.patch；各仓均无交付时仍按空面跳过
2. 冻结件存在性复查把「change-patch.json 内 repos 有 patch」视为完整，重入不误报「冻结件缺失」
3. verify-result 回执对跨仓冻结构给出明确表述，不再写「无冻结件」
4. 既有 thin-empty-face-crosscheck / cross-repo-baseline-anchor / close-trace-freeze-integrity 测试全绿，并新增空面跨仓冻结用例
