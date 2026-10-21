---
author: flow-machine-draft
created_at: 2026-10-21T14:12:39.701Z
---
# 任务注册表（Tasks）— 2026-10-21-cli-manifest-since-cache

- [x] task-01: spec-sync.js 加缓存 helper（read/write/clear/对账阈值）+ 拉取段缓存感知改造（since 增量合并/全量落缓存/旧平台回退/倒退对账）——单测锚定 URL 与合并行为
- [x] task-02: test/spec-sync-manifest-cache.test.mjs e2e 用例（增量合并/墓碑/首拉全量/对账轮/强制全量/旧平台/倒退对账/失败 fail-closed）——node test 全绿
- [x] task-03: 稳态 <1s e2e 实证（mock 回环无差异轮计时 + 零 POST 断言）+ 既有 spec-sync 测试面回归零红
