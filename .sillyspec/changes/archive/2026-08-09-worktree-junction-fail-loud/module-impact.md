---
author: qinyi
created_at: 2026-08-09T22:45:00+08:00
---

# 模块影响（Module Impact）— worktree junction 解链 fail-loud（review-2026-08-09 #4）

## 三重交叉验证
- **声明范围**（design.md 文件变更清单）：src/worktree.js（修改）+ test/worktree-junction-fail-loud.test.mjs（新增）
- **任务范围**（plan.md tasks）：task-01/02 allowed_paths=src/worktree.js，task-03 allowed_paths=test/worktree-junction-fail-loud.test.mjs
- **真实变更**（git diff）：src/worktree.js + test/worktree-junction-fail-loud.test.mjs
- **三者一致**，以 git diff 为准。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| worktree | 逻辑变更（容错策略） | src/worktree.js | cleanup:738-757 + _doctorReprovision:866-881 两处 junction 解链 try{}catch{} 静默 → fail-loud throw（lstat EPERM + 解链失败），保护主仓 node_modules；废弃 _doctorReprovision:878 best-effort（解链失败不调 provisionDeps，D-002@v1） | false |

## 未匹配文件

| 文件 | 说明 |
|---|---|
| test/worktree-junction-fail-loud.test.mjs | 新增测试（test/ 不在 _module-map.yaml 模块 paths，按惯例 unmapped；逻辑属 worktree 模块测试覆盖，7 用例/18 断言锁定 fail-loud 行为） |

## 模块文档同步

- worktree.md:22 + :82 已补「_doctorReprovision 解链失败 fail-loud 不 provisionDeps（D-002@v1）」——本次 commit 含此同步。
- file-lifecycle.md 不涉及（#4 改容错策略，非 stage/step 状态机，design 声明 lifecycle 豁免）。
