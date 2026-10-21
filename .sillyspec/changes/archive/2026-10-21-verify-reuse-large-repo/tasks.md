---
author: flow-machine-draft
created_at: 2026-10-21T14:37:30.768Z
---
# 任务注册表（Tasks）— 2026-10-21-verify-reuse-large-repo

- [x] task-01: code-face-key.js safeGit 补 maxBuffer=256MB（注释带 dsh 0ff6f1c8 取证）；测试：fixture 仓 ls-tree >1MB 断言 computeCodeTreeKey 非 null + 非 git 目录仍 null
- [x] task-02: complete.js 抽 isVerifyBatchEligible 纯资格判定（detectVerifyBatchFinish 行为等价、理由串保留）+ 批量块资格先行接线（资格不成立不预跑亲测）；测试：资格矩阵 + detectVerifyBatchFinish 等价
- [x] task-03: verify-quality-scan.js 新增 consultFailedScanReuse（TTL 30min + RERUN 旁路）+ gates.js 实测 else 分支与 machine-interface verify-test facet 前置咨询接线；测试：命中/键失配/TTL 过期/RERUN 矩阵 + 合成 failed 结果披露
- [x] task-04: 回归面复跑全绿（code-face-key-doc-commit-survival / verify-artifact-triage / flag-contract / verify-quality-scan / green-cache + 新增文件），module 卡 runtime 补新导出两枚
