# Baseline Checkpoint 回归测试

| # | Case | 期望 | 结果 |
|---|------|------|------|
| 1 | clean workspace | baselineCommit=null | ✅ YES — baselineCommit=null, baselineHash=null |
| 2 | staged only | checkpoint created, file synced | ✅ YES — baselineCommit=ed4f6cf6, worktree a.txt="staged-change" |
| 3 | unstaged only | checkpoint created, file synced | ✅ YES — baselineCommit=db2b6d6a, worktree a.txt="unstaged-change" |
| 4 | untracked | checkpoint includes untracked | ✅ YES — baselineCommit=dcd27aff, worktree new.txt="untracked-file" |
| 5 | baseline changed during execute | apply blocked | ✅ YES — apply ok=false, error 包含 "baseline 已变化" |
| 5b | task diff = agent only | only b.txt in diff | ✅ YES — diff 仅 b.txt，不包含 baseline 改动 a.txt |
| 6 | baselineFiles list | contains all 3 files | ✅ YES — baselineFiles=[a.txt, b.txt, c.txt] |

结论：**ALL PASS (7/7)**
