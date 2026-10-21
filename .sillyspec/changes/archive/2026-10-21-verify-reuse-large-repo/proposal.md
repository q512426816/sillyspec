---
author: flow-machine-draft
created_at: 2026-10-21T14:37:30.768Z
---
# 提案书（Proposal）— 2026-10-21-verify-reuse-large-repo

## 动机

任务原话转写：verify 实测复用大仓全链失效根治

动机（dsh 会话 0ff6f1c8 取证，multi-agent-platform 变更 2026-10-20-session-page-dsh-alignment）：verify 阶段 76 分钟内同一代码树被完整实测 6 次（每次 10~13.5 分钟，全部同签名失败）。根因：src/run/code-face-key.js safeGit 的 execFileSync 未设 maxBuffer（默认 1MB），大仓 git ls-tree -r -z 输出 1.95MB（本仓也有 1.76MB）必抛 ENOBUFS 被吞成 null → 代码指纹/dedupKey/passedKey 全 null → 失败签名去重/passed 幂等/green-cache 复用链整体失效（落盘记录 missReason「no-dedup-key（存量记录 / git 不可用）」为证）。连带两处：① src/run/complete.js verify 中间步 --done 在批量对齐不会触发时也无条件预跑亲测（每步一轮全量实测）；② 收口门与 gate verify CLI 对 failed 记录零复用——同签名失败每轮全量重跑。

成功标准：
- computeCodeTreeKey 在 ls-tree 输出 >1MB 的仓返回非 null（大仓指纹/复用链恢复）；safeGit 显式 maxBuffer（对齐 git-helper GIT_MAX_BUFFER=256MB 口径）
- verify 中间步 --done 在批量对齐不会触发时不再预跑亲测（isVerifyBatchEligible 纯资格判定先行；批量会触发时亲测门照跑不省）
- 收口门（gates.js 实测 else 分支）与 gate verify CLI（machine-interface verify-test facet）对「上次失败且失败签名未变」记录复用阻断不重跑，出路提示与既有 RERUN 逃生阀口径对称
- 新增回归测试（大仓键非空 / 批量资格 / 失败复用命中与回退）+ 既有相关测试面全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. computeCodeTreeKey 在 ls-tree 输出 >1MB 的仓返回非 null（大仓指纹/复用链恢复）；safeGit 显式 maxBuffer（对齐 git-helper GIT_MAX_BUFFER=256MB 口径）
2. verify 中间步 --done 在批量对齐不会触发时不再预跑亲测（isVerifyBatchEligible 纯资格判定先行；批量会触发时亲测门照跑不省）
3. 收口门（gates.js 实测 else 分支）与 gate verify CLI（machine-interface verify-test facet）对「上次失败且失败签名未变」记录复用阻断不重跑，出路提示与既有 RERUN 逃生阀口径对称
4. 新增回归测试（大仓键非空 / 批量资格 / 失败复用命中与回退）+ 既有相关测试面全绿

## 成功标准（可验证）

1. computeCodeTreeKey 在 ls-tree 输出 >1MB 的仓返回非 null（大仓指纹/复用链恢复）；safeGit 显式 maxBuffer（对齐 git-helper GIT_MAX_BUFFER=256MB 口径）
2. verify 中间步 --done 在批量对齐不会触发时不再预跑亲测（isVerifyBatchEligible 纯资格判定先行；批量会触发时亲测门照跑不省）
3. 收口门（gates.js 实测 else 分支）与 gate verify CLI（machine-interface verify-test facet）对「上次失败且失败签名未变」记录复用阻断不重跑，出路提示与既有 RERUN 逃生阀口径对称
4. 新增回归测试（大仓键非空 / 批量资格 / 失败复用命中与回退）+ 既有相关测试面全绿
