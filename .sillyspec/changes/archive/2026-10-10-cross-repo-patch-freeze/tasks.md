---
author: t
created_at: 2026-10-10T19:15:00.000Z
---
# 任务注册表（Tasks）— 2026-10-10-cross-repo-patch-freeze

> 工作分解（design.md 文件清单 × decisions D-001/002/003）；每行=可独立完成并当场验证的一步。
> 边干边勾：实现到位 + 相关测试跑绿当场翻格（勿攒一把勾）。

- [x] task-01: scope-audit.js 抽导出 reconcileCrossRepoPlan（现 computeFullFlowAudit 内联跨仓段 1216-1310 原样搬移，rows/repos/notes 三产物等价并回）+ repos[] 条目增 patch/patchSha256 采集（A/B' 锚 hash 为 baseRef；B 档字面 HEAD~1、C 档字面 HEAD 工作树口径；buildFrozenPatch 失败/空窗 → null）——验证：既有 cross-repo-* / scope-audit 测试绿（行为等价回归钉）
- [x] task-02: flow-parity.js buildThinSnapshotRows 增第 4 可选参 crossRepoRows（带 repo 声明条目经 pathMatches+crossRepo 覆盖判定，命中不落 ⊘ 补行；缺省 undefined 现行为逐字节不变）——验证：close-trace-unified.test.mjs 既有断言绿（缺省零回归）
- [x] task-03: flow.js done 路径接线——planEntries 含 repo 条目时动态 import reconcileCrossRepoPlan（runtimeRoot 走 resolveRuntimeRoot(platformOpts, specBase)）try/catch fail-soft，snapObj 增 repos 键 + console 跨仓冻结摘要一行（仅有跨仓时）——验证：node --check 语法 + 单测 thin 通道断言
- [x] task-04: 新增 test/cross-repo-patch-freeze.test.mjs（真实 git fixture：主仓+注册跨仓，已提交窗口 patch 冻结/sha256 锚/未提交窗口 HEAD 基点/降级仓 null+reason/thin 覆盖判定/无跨仓零行为）；跑本变更测试面（新文件 ∪ close-trace-unified ∪ cross-repo-* ∪ worktree-isolation ∪ multi-repo-context）全绿——验证：npm test 目标文件 0 fail
