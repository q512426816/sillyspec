# Worktree Isolation Hardening — Verification

**Commit:** `e03ed52` fix(worktree): add submodule guard and enforce gitignore check before worktree creation

## 验证结果

### Case 1: Normal repo
```
detectIsolation: { inWorktree: false, inSubmodule: false, gitDir: ".git", gitCommonDir: ".git" }
```
✅ 正确识别为普通主仓库

### Case 2: Linked git worktree
```
detectIsolation(path="/path/to/.sillyspec/.runtime/worktrees/2026-05-31-sqlite-migration"):
  { inWorktree: true, inSubmodule: false, gitDir: ".git/worktrees/...", gitCommonDir: ".git" }
```
✅ 正确识别为 linked worktree

### Case 3: Git submodule (逻辑验证)
`--show-superproject-working-tree` 返回非空 → `inSubmodule=true, inWorktree=false`
✅ 不会被误判为 linked worktree，create() 会抛错阻断

### Case 4: .sillyspec/.runtime/worktrees 已被 gitignore
```
checkWorktreeDirIgnored: { ignored: true, path: ".sillyspec/.runtime/worktrees" }
```
✅ 通过，worktree 创建不受阻断

### Case 5: .sillyspec/.runtime/worktrees 未被 gitignore (逻辑验证)
`checkWorktreeDirIgnored` 返回 `{ ignored: false }` → create() 抛错：
```
worktree 存储目录 .sillyspec/.runtime/worktrees 未被 .gitignore 忽略
创建 worktree 可能导致内容被误提交。
请先在 .gitignore 中添加: .sillyspec/.runtime/worktrees/
或运行 sillyspec doctor 检查修复。
```
✅ 阻断生效，提示清晰

## Doctor 新增检查项
- submodule 检测
- linked worktree 检测
- .gitignore 状态检测
