---
author: flow-machine-draft
created_at: 2026-11-12T00:16:33.151Z
---
# 提案书（Proposal）— 2026-11-12-baseline-own-declared-skip

## 动机

任务原话转写：baseline 不收编本变更声明文件、归档只算提交面
动机：两个实证口径缺陷——①本变更前置生成的未提交交付文件（原型三件套）被 baseline checkpoint 收编，target_files 对账看不见、verify 误判「声明未做」；②baseline 带入的并行会话未提交脏文件（11 个模块 changelog）被归档前置检查算成本变更未 apply 交付面，只能 --skip-apply 绕过。
成功标准：
- _overlayBaseline 返回 ownDeclaredFiles（本变更声明集 ∩ overlay 文件），文件仍复制进 worktree
- _createBaselineCheckpoint 以 pathspec 排除 ownDeclaredFiles，checkpoint 后这些文件保持未提交态
- 归档前置检查（applyWorktree checkOnly）新增 deliverableFaceCommittedOnly：只算 baselineCommit..HEAD + untracked
- 未声明命中时行为与现状完全一致；apply 主流程不受影响

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. _overlayBaseline 返回 ownDeclaredFiles（本变更声明集 ∩ overlay 文件），文件仍复制进 worktree
2. _createBaselineCheckpoint 以 pathspec 排除 ownDeclaredFiles，checkpoint 后这些文件保持未提交态
3. 归档前置检查（applyWorktree checkOnly）新增 deliverableFaceCommittedOnly：只算 baselineCommit..HEAD + untracked
4. 未声明命中时行为与现状完全一致；apply 主流程不受影响

## 成功标准（可验证）

1. _overlayBaseline 返回 ownDeclaredFiles（本变更声明集 ∩ overlay 文件），文件仍复制进 worktree
2. _createBaselineCheckpoint 以 pathspec 排除 ownDeclaredFiles，checkpoint 后这些文件保持未提交态
3. 归档前置检查（applyWorktree checkOnly）新增 deliverableFaceCommittedOnly：只算 baselineCommit..HEAD + untracked
4. 未声明命中时行为与现状完全一致；apply 主流程不受影响
