---
author: flow-machine-draft
created_at: 2026-10-05T11:44:08.177Z
---
# 提案书（Proposal）— 2026-10-05-branch-ref-anchor-scope

## 动机

任务原话转写：worktree cleanup 的分支审计锚定（_branchReviewReferences，src/worktree.js:1305）只用 merge-base --is-ancestor hash branch 单探针判「review.json 引用了分支 commit」——worktree 分支自带全部主仓历史，任何旧 review.json 引用历史主仓 commit（base/head 锚常见形态）都误中（本会话实证：apply 自动 cleanup 打印「被 56 个 task review.json 引用」，实为无关历史件引用），误打 sillyspec-audit tag + 误导性输出。锚定语义应只护「分支独有 commit」（baseline checkpoint/task commit）——删分支 ref 后真正会悬空的只有它们；主仓 HEAD 可达的历史 commit 永不悬空。
成功标准：
- review.json 引用的 hash 是主仓 HEAD 可达（历史 commit）时不再计入引用——不打 tag、不打印审计锚定信息
- 引用的 hash 是分支独有 commit（如 baseline checkpoint/task commit）时锚定行为不变（打 tag 保可达）
- 引用 hash 未知/畸形时维持 fail-closed（按需锚定，宁可误锚不误删）
- 单测覆盖：历史 commit 引用不锚定、分支独有 commit 引用锚定两形态

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. review.json 引用的 hash 是主仓 HEAD 可达（历史 commit）时不再计入引用——不打 tag、不打印审计锚定信息
2. 引用的 hash 是分支独有 commit（如 baseline checkpoint/task commit）时锚定行为不变（打 tag 保可达）
3. 引用 hash 未知/畸形时维持 fail-closed（按需锚定，宁可误锚不误删）
4. 单测覆盖：历史 commit 引用不锚定、分支独有 commit 引用锚定两形态

## 成功标准（可验证）

1. review.json 引用的 hash 是主仓 HEAD 可达（历史 commit）时不再计入引用——不打 tag、不打印审计锚定信息
2. 引用的 hash 是分支独有 commit（如 baseline checkpoint/task commit）时锚定行为不变（打 tag 保可达）
3. 引用 hash 未知/畸形时维持 fail-closed（按需锚定，宁可误锚不误删）
4. 单测覆盖：历史 commit 引用不锚定、分支独有 commit 引用锚定两形态
