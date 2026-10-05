---
author: flow-machine-draft
created_at: 2026-10-05T11:44:08.178Z
---
# 需求规格（Requirements）— 2026-10-05-branch-ref-anchor-scope

## 功能需求

### FR-01: review.json 引用的 hash 是主仓 HEAD 可达（历史 commit）时不再计入引用——不打 tag、不打印审计锚定信息

- _branchReviewReferences 必须在「hash 是分支祖先或自身」之上追加主仓可达性排除：hash 同时是主仓 HEAD 祖先或自身（探针对象为 _resolveMainRepoRoot() 显式主仓根）时不计入引用清单——主仓可达的历史 commit 删分支 ref 后仍可达，不构成悬空审计链。

#### 场景：主路径

- Given: 主仓历史 commit（在 sillyspec/<change> 分支与主仓 HEAD 共同祖先线上）被某 execute-runs review.json 的 base/head 引用
- When: cleanup 走分支删除判定（_branchReviewReferences）
- Then: 该引用不计入清单——不打 sillyspec-audit tag、不打印审计锚定信息、分支直接删除

### FR-02: 引用的 hash 是分支独有 commit（如 baseline checkpoint/task commit）时锚定行为不变（打 tag 保可达）

- hash 在分支上且不在主仓 HEAD 可达集（分支独有 commit，如 baseline checkpoint/task commit）时必须维持既有锚定行为：计入引用清单 → 打 sillyspec-audit/<branch> tag 保 commit 可达后删分支 ref。

#### 场景：主路径

- Given: review.json 引用的 hash 是 sillyspec/<change> 分支独有 commit（不在主仓任何常驻 ref 上）
- When: cleanup 走分支删除判定
- Then: 计入引用清单 → 打 tag 锚定 tip、打印审计锚定信息、删分支 ref（与既有行为逐字一致）

### FR-03: 引用 hash 未知/畸形时维持 fail-closed（按需锚定，宁可误锚不误删）

- 可达性判定失败时必须倒向锚定侧（fail-closed 宁误锚不误删）：新增的主仓可达探针（探针二）返回 null（查询失败）时按「不在主仓可达」处理即计入引用清单维持锚定；既有探针一（分支可达）语义不变——未知/畸形 hash 返回 null 走既有跳过分支（非真实对象、无可悬空审计链，「误删」面不存在，跳过即安全），判定整体异常仍归入外层「有引用」保守分支。

#### 场景：主路径

- Given: review.json 引用未知/畸形 hash（git merge-base 报错非零）
- When: cleanup 走分支删除判定
- Then: 既有探针一语义保持（跳过——非真实对象无可悬空链）；探针二失败路径按不可达计入（fail-closed 不产生新误删面）；判定整体异常归入保守分支不裸删

### FR-04: 单测覆盖：历史 commit 引用不锚定、分支独有 commit 引用锚定两形态

- 必须有单测锁定三形态：历史 commit 引用不计入（无锚定）、分支独有 commit 引用计入（锚定）、畸形 hash 既有跳过语义保持（非真实对象无可悬空链，与 FR-03 口径一致）。

#### 场景：主路径

- Given: git fixture 仓（主仓历史 + sillyspec/* 分支独有 commit + execute-runs review.json）
- When: _branchReviewReferences 判定
- Then: 三形态断言各自成立

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/branch-ref-anchor-scope.test.mjs「历史 commit（主仓 HEAD 可达）引用不计入——不锚定」
FR-02: test/branch-ref-anchor-scope.test.mjs「分支独有 commit（checkpoint/task）引用计入——锚定保可达」
FR-03: test/branch-ref-anchor-scope.test.mjs「畸形/未知 hash 既有跳过语义保持（非真实对象无可悬空链，不产生新误删面）」
FR-04: test/branch-ref-anchor-scope.test.mjs「三形态断言齐备（fixture 快照）」
