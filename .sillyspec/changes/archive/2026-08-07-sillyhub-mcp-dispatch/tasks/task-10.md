---
id: task-10
title: file-lifecycle.md sync
title_zh: 文件生命周期文档同步
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P1
depends_on: [task-07]
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - docs/sillyspec/file-lifecycle/storage-and-state.md
goal: >
  更新 docs/sillyspec/file-lifecycle.md 新增 dispatch 与 sillyhub-mcp 运行时文件条目，
  遵守规则19 文件生命周期文档同步
implementation:
  - 读取 task-07 落地后的 execute 派发运行时文件实际清单
  - 在 file-lifecycle.md 追加 dispatch hint 产物与配置键条目
  - 同步 updated_at 时间戳
  - 核对文件名引用与 prompt 输出一致
acceptance:
  - dispatch 相关运行时文件在文档中有条目
  - updated_at 更新到本次改动日期
verify:
  - npm test
constraints:
  - 纯文档改动不触及 src 与 test
  - 不改动既有条目仅追加 dispatch 相关
---
