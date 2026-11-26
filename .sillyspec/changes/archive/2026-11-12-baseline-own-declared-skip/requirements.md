---
author: qinyi
created_at: 2026-11-12T00:20:00.000Z
---
# 需求规格（Requirements）— 2026-11-12-baseline-own-declared-skip

## 功能需求

### FR-01: overlay 返回本变更声明命中集，声明文件不进 baseline checkpoint

- `_overlayBaseline` 必须返回 ownDeclaredFiles（本变更声明集 ∩ overlay 文件）；`_createBaselineCheckpoint` 必须用 pathspec 排除这些文件，checkpoint 后它们保持未提交态。

#### 场景：主路径

Given 主仓有未提交的 demo.js（被本变更 task 卡 allowed_paths 声明）与 other.js（未声明）
When 创建 worktree（overlay + checkpoint）
Then ownDeclaredFiles = [demo.js]；checkpoint 提交含 other.js 不含 demo.js；demo.js 在 worktree 仍为 untracked

### FR-02: 无声明命中时行为与现状一致

- 声明集为空或未命中时，checkpoint 必须与改动前完全一致（全部 overlay 文件入 checkpoint）。

#### 场景：主路径

Given 主仓未提交文件均不被当前变更声明
When 创建 worktree
Then ownDeclaredFiles 为空数组；checkpoint 含全部 overlay 文件（旧行为）

### FR-03: 归档交付面口径维持原样（撤销该修复）

- 归档前置检查必须维持 `git diff baselineCommit`（工作区）+ untracked 口径；禁止改为「只算提交面」——原口径本已排除 baseline checkpoint 内容，改后会漏检「本变更未提交交付」并破坏既有归档阻断语义（change-ownership-guards ⑦a/⑦a2 实证）。

#### 场景：主路径

Given worktree 有未提交交付改动（modified 或 untracked）
When 归档前置检查
Then 交付面非空 → 阻断归档（与原行为一致）

### FR-04: 新增回归测试覆盖三条语义

- 新增测试必须覆盖：声明命中排除、未声明旧行为、checkpoint 后文件仍 untracked。

#### 场景：主路径

Given test/baseline-own-declared-skip.test.mjs
When node --test 执行
Then 8 项断言全部通过；既有 baseline-overlay-isolation / cross-repo-baseline-anchor / archive-baseline-entry 零回归

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/baseline-own-declared-skip.test.mjs「ownDeclaredFiles 含声明命中的 demo.js」「demo.js 未进 checkpoint」「checkpoint 后 demo.js 仍为 untracked」
FR-02: test/baseline-own-declared-skip.test.mjs「无声明命中 → ownDeclaredFiles 为空（旧行为）」；test/baseline-overlay-isolation.test.mjs 零回归
FR-03: test/change-ownership-guards.test.mjs「⑦a worktree 有未 apply 交付面 → 归档阻断」「⑦a2 --skip-apply 留痕」（原口径回归锁定）
FR-04: test/baseline-own-declared-skip.test.mjs（8/8 通过）；test/archive-baseline-entry.test.mjs、test/cross-repo-baseline-anchor.test.mjs 零回归
