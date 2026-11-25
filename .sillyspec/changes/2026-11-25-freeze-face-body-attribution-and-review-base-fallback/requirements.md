---
author: flow-machine-draft
created_at: 2026-11-25T08:44:29.189Z
---
# 需求规格（Requirements）— 2026-11-25-freeze-face-body-attribution-and-review-base-fallback

## 功能需求

### FR-01: 提交正文中的变更名与 task token 参与归属解析：标题无名、正文含 (<变更名> task-NN) 的提交，其文件经 filterCommittedFace 保留进冻结面

提交归属解析必须同时读取提交标题与正文；标题未提变更名时，正文 footer 中的 `(<变更名> task-NN)` 必须参与变更名与 task token 判定，禁止仅因标题无名就把该提交的文件判为他侧。

#### 场景：正文 footer 归属

- Given 提交标题为 `fix(x): ...`、正文含 `(2026-01-01-my-change task-01)`
- When 对该提交触及的文件跑 filterCommittedFace
- Then 文件保留在冻结面（isForeignByCommit 判 own）

#### 场景：正文无名字仍保守

- Given 提交正文既不提变更名也无 task token
- When 判定其文件归属
- Then 维持既有纯裸提交规则（判 foreign）

### FR-02: 新增先红后绿复现测试：同一提交旧实现判 foreign / 新实现判 own（parseCommitLog 带回 body）

测试必须先红后绿证明缺陷：parseCommitLog 必须解析并返回提交正文（body），归属解析消费该字段；复现用例在旧实现下判 foreign、修复后判 own。

#### 场景：先红后绿

- Given 真实 git 仓中一笔「标题无名、正文带 footer」的提交
- When 运行新增复现用例
- Then 修复前断言 own 失败（红），修复后通过（绿）

### FR-03: writeTaskReview 无 worktree meta 时回退 flow-state.yaml 的 baseline_commit 作 base、HEAD 作 head，并按 base..HEAD 自动算 changedFiles

worktree meta 缺失（已清理）时，writeTaskReview 必须回退读取变更目录 `flow-state.yaml` 的 `baseline_commit` 作为 base、当前 HEAD 作为 head，并按 base..HEAD 自动推导 changedFiles；禁止直接报「无法确定 base/head」。

#### 场景：worktree 已清理

- Given 变更目录有 flow-state.yaml（baseline_commit=c1），无 worktree meta，实现已提交
- When 运行 `review write` 不带 --base/--head
- Then 写入成功，base=c1、head=当前 HEAD、changedFiles 含该 task 的交付文件

### FR-04: 仅给 --changed-files 时不再强制 base/head（两者缺省回退 HEAD 并给出警告）

调用方仅显式提供 `--changed-files` 时，base/head 必须允许缺省回退到 HEAD（附 warning），禁止再以「无法确定 base/head」拒绝。

#### 场景：仅 changed-files

- Given 无 worktree meta、无 flow-state baseline
- When 运行 `review write --changed-files a.js`
- Then 写入成功，base=head=HEAD，并给出回退警告

### FR-05: 变更测试面绿、lint 通过

交付时变更测试面必须跑绿，lint 必须通过（仓内已配置 lint 命令时）。

#### 场景：收口实测

- Given 本变更代码已落盘
- When 运行变更测试面与 lint
- Then 全绿、零错误

## 测试绑定

FR-01: test/commit-attribution-split.test.mjs「正文 footer 的变更名/task token 参与归属（真实 git 仓 + filterCommittedFace）」
FR-02: test/commit-attribution-split.test.mjs「先红后绿：标题无名正文带 footer 的提交判 own（parseCommitLog 返回 body）」
FR-03: test/review-write.test.mjs「无 meta 回退 flow-state baseline：base/head/changedFiles 自动代算」
FR-04: test/review-write.test.mjs「仅 --changed-files：base/head 回退 HEAD 并警告」
FR-05: test/commit-attribution-split.test.mjs、test/review-write.test.mjs「全量」；lint 走 `.sillyspec/local.yaml` commands.lint
