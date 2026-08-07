---
id: task-11
title: dispatch and sillyhub-mcp module docs
title_zh: dispatch 与 sillyhub-mcp 模块文档
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P1
depends_on: [task-07]
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/dispatch.md
  - .sillyspec/docs/sillyspec/modules/sillyhub-mcp.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
goal: >
  新建 docs/sillyspec/modules/dispatch.md 与 sillyhub-mcp.md 描述两模块接口约定与数据流，
  供后续 execute 子代理按需读取
implementation:
  - 新建 docs/sillyspec/modules 目录不存在则创建
  - dispatch.md 写 probe strategy 与两 backend 模块职责与数据流
  - sillyhub-mcp.md 写 client 方法契约与配置键
  - 标注 entrypoints 与 main_symbols 便于源码定位
acceptance:
  - 两模块文档含接口约定与字段数据流标注
  - 文档描述与 src 落地代码一致
verify:
  - npm test
constraints:
  - 纯文档改动不触及 src 与 test
  - 不抄 prompt 原文只写模块语义与数据流
---
