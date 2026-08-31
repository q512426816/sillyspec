---
author: qinyi
created_at: 2026-07-11T22:10:00+08:00
change: 2026-07-11-execute-worktree-platform-gaps
---

# 模块影响分析（Module Impact）— execute-worktree 平台模式三坑修复

> 真实变更来源：`git diff --name-only HEAD`（主仓库 apply 后 working tree，未 commit）。三重交叉验证：声明范围（design §7）= 任务范围（plan/tasks）= 真实变更（git diff），一致。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|--------------|
| worktree | 逻辑变更 + 接口变更 + 新增 | `src/worktree-apply.js` | `applyWorktree` 加 `merge` 选项（:76）；步骤 4.5 baseline 漂移分支加 merge 降级入口（:174-182）；新增 `applyByMerge`（`git merge --no-ff sillyspec/<change>`，成功 cleanup / 冲突 `git merge --abort`+报冲突文件） | false |
| stages | 配置变更（prompt 文本） | `src/stages/execute.js` | `:623` review.json + `:644` endpoints.json 路径占位符化 `.sillyspec/.runtime/` → `{SPEC_ROOT}/.runtime/`（复用 run.js 平台路径重写） | false |
| runtime | 接口变更 + 调用关系变更 | `src/task-review.js`, `src/run.js` | task-review `:182` 阻断文案拼期望路径 `reviewPath`+`executeRunId`；`printReviewResult` 加 `context` 参数（:450），`:461` 提示按 context 拼路径模板；`run.js:3324` 调用传 `{runtimeRoot,executeRunId}`、`:3332` 补充提示加 runId | false |
| cli-entry | 调用关系变更 | `src/index.js` | `case 'apply'`（:633-640）注册 `--merge` flag + 传入 + 用法提示；merged 输出分支；`case 'assess'`（:709-713）blocked 加降级指引 | false |

## 模块文档同步（本次已同步）

| 文件 | 同步内容 |
|------|----------|
| `.sillyspec/docs/sillyspec/modules/worktree.md` | 接口表 applyWorktree 加 `merge` 参数；设计决策表 :85「补丁而非 merge」补 D-002 注（默认 patch，漂移时 `--merge` opt-in） |
| `.sillyspec/docs/sillyspec/modules/stages.md` | 「execute prompt 路径约定」注（{SPEC_ROOT}/.runtime/ 占位符，run.js 重写消费）+ updated_at |
| `docs/sillyspec/file-lifecycle.md` | updated_at（--merge 不新增/删除运行时文件类型） |

## 未匹配文件（unmapped）

| 文件 | 说明 |
|------|------|
| `test/execute-prompt-spec-root-placeholder.test.mjs` | 新增测试（FR-3 占位符 grep 断言），无模块映射 |
| `test/review-gate-block-message.test.mjs` | 新增测试（FR-4 阻断文案断言），无模块映射 |
| `test/worktree-apply-merge-fallback.test.mjs` | 新增测试（FR-1/2/5 行为矩阵 A/B/C），无模块映射 |
| `.sillyspec/knowledge/uncategorized.md` | 知识库 +1 条（ql-20260711-001 `_resolveMainRepoRoot` 相对路径坑），待归类 |

## 结论

影响 4 个源码模块（worktree/stages/runtime/cli-entry），均为本次变更预期范围（与 design §7 文件清单一致）。模块文档 worktree.md/stages.md 已同步。无遗漏模块，无意外扩散。needs_review 全 false（影响明确）。
