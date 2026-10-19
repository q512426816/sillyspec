---
author: flow-machine-draft
created_at: 2026-10-19T06:57:21.405Z
---
# 需求规格（Requirements）— 2026-10-19-thin-empty-face-cross-repo-freeze

## 功能需求

### FR-01: 主仓冻结面为空且 design 清单含规范跨仓标注时，跑跨仓对账并落 change-patch.json（scopeAudit.repos[] 含 patch 正文与 patchSha256），不写 change.patch；各仓均无交付时仍按空面跳过

- 系统 MUST 在主仓冻结面为空且 design 清单含规范跨仓标注时执行跨仓对账；任一仓有非 untouched 对账行或 patch 正文时 MUST 落 change-patch.json（`scopeAudit.repos[]` 承载 patch 与 patchSha256，`patchStatus: ok`）且 MUST NOT 写 change.patch；各仓均无交付时 MUST 维持空面跳过。

#### 场景：空面跨仓有交付

- Given 主仓窗口内只有治理件、design 清单按 `### <key>` 标注跨仓、注册仓窗口内有提交与工作树改动
- When `flow done` 走 patch 子步
- Then change-patch.json 的 `scopeAudit.repos[]` 含跨仓 patch 正文与 patchSha256，change.patch 不存在，`patchStatus` 为 `ok`

#### 场景：跨仓无交付

- Given 同样标注但跨仓窗口内零改动
- When `flow done` 走 patch 子步
- Then 维持空面跳过（不落 JSON-only 留档），输出「跨仓窗口内没有可归属交付」提示

### FR-02: 冻结件存在性复查把「change-patch.json 内 repos 有 patch」视为完整，重入不误报「冻结件缺失」

- 冻结件存在性复查 MUST 把「change-patch.json 在场且 `scopeAudit.repos[]` 内有非空 patch 正文」判为完整冻结；MUST 仅在 two 件全缺、repos 无正文、或 JSON 损坏时判缺件并触发重冻结。

#### 场景：JSON-only 留档重入

- Given patch 子步已 done 且目录里只有含 repos patch 的 change-patch.json
- When 重入 `flow done`
- Then 不再打印「冻结件缺失」，不触发重冻结

#### 场景：两缺/坏 JSON

- Given 两件全缺或 change-patch.json 损坏
- When 重入 `flow done`
- Then 按缺件触发重冻结（既有行为不变）

### FR-03: verify-result 回执对跨仓冻结构给出明确表述，不再写「无冻结件」

- verify-result 回执 MUST 在无主仓 patchSha256 但存在跨仓 patch 正文时写「跨仓 N 仓（diff 见 change-patch.json scopeAudit.repos[]；主仓面为空）」；MUST NOT 写「（无冻结件）」。

#### 场景：跨仓冻结回执

- Given 空面跨仓冻结成功
- When 合成 verify-result.md
- Then 「交付冻结」行报跨仓仓数与 diff 位置

### FR-04: 既有 thin-empty-face-crosscheck / cross-repo-baseline-anchor / close-trace-freeze-integrity 测试全绿，并新增空面跨仓冻结用例

- 变更交付面 MUST 保持既有空面门/跨仓对账/冻结完整性测试零回归，并 MUST 新增空面跨仓冻结与存在性探针用例。

#### 场景：回归面

- Given 变更实现完成
- When 运行 test/thin-empty-face-crosscheck、test/cross-repo-baseline-anchor、test/cross-repo-patch-freeze、test/flowdone-disposition-drift、test/scope-audit-cross-repo、test/close-trace-freeze-integrity
- Then 全部通过，且新增用例覆盖 FR-01/FR-02/FR-03

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」
FR-02: test/close-trace-freeze-integrity.test.mjs「inspectFreezeArtifacts：JSON-only 跨仓冻结判完整，两缺/坏 JSON 判缺件」
FR-03: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」
FR-04: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」；test/cross-repo-baseline-anchor.test.mjs 全文件；test/cross-repo-patch-freeze.test.mjs 全文件
