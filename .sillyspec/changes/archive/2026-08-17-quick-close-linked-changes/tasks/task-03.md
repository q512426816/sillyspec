---
id: task-03
title: quick.js step3 prompt 增加自动归档说明
title_zh: quick.js step3 prompt 增加自动归档说明
author: qinyi
created_at: 2026-08-17T09:45:00+08:00
priority: P1
depends_on: []
blocks: [task-05]
allowed_paths:
  - src/stages/quick.js
goal: |
  让 agent 知道 quick --done 完成后，CLI 会自动关闭任务已全部完成的关联变更，无需手动 archive。
implementation: |
  在 src/stages/quick.js step3 prompt 的“收尾推荐顺序”或“QUICKLOG 正文核对”附近增加一句说明。
acceptance: |
  - prompt 文本含“关联变更全完成时 CLI 自动归档”语义。
verify: |
  重跑 node docs/prompt/_extract.mjs 后 docs/prompt/quick.md 同步更新。
constraints: |
  - 只改 src/stages/quick.js 的 prompt 字符串。
---
# task-03: quick.js prompt 更新
见 frontmatter。
