---
id: task-08
title: W4/FR-08 wt-commit 跨仓 worktree 识别
title_zh: W4/FR-08 wt-commit 跨仓 worktree 识别
wave: W4
status: draft
depends_on: []
goal: wt-commit 在跨仓 worktree 内正确推断变更名
implementation: index.js wt-commit case 的 cwd 推断：worktree 名段含 --<repoKey> 且后缀命中 repos 注册表时剥除；二级校验全段命中主仓已知变更不剥；未注册不剥并引导显式 --change
verify: node --test test/wt-commit-crossrepo-infer.test.mjs（先复现整段误推断，再验三态：注册剥/未注册不剥/全段命中不剥）
constraints: 注册表校验不猜切分（D-006@v1）；先复现后修
acceptance:
  - 注册 repoKey 后缀剥除推断成功
  - 未注册不剥并报错引导
  - 全段命中已知变更不剥
  - 复现测试先行
target_files:
  - src/index.js
  - src/wt-commit.js
  - test/wt-commit-crossrepo-infer.test.mjs
allowed_paths:
  - src/index.js
  - src/wt-commit.js
  - test/wt-commit-crossrepo-infer.test.mjs
---

