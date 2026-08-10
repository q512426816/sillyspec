---
id: task-08
title: local.yaml platform 段加 user 字段
title_zh: 平台配置加 user 字段区分多用户
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P1
depends_on: []
blocks: [task-09]
requirement_ids: [FR-08]
decision_ids: [D-004]
allowed_paths:
  - src/sync.js
provides:
  - contract: PlatformUserConfig
    fields: [user]
goal: >
  在 local.yaml 的 platform 段加 user 字段以区分多用户，供 push 时标识推送者。
implementation:
  - sync.js connect 时在 platform 配置写入 user 字段（来自参数或 git 用户名）
  - readLocalYaml 支持 platform 段含 user 字段
  - _getPlatform 返回含 user 的配置对象
acceptance:
  - connect 后 local.yaml platform 段含 user 字段
  - _getPlatform 返回配置含 user
  - 无 user 时回退 git 用户名或留空不报错
verify:
  - npm test
  - npm run lint
constraints:
  - user 字段与 url token 同处 platform 段，零新增配置体系
  - 兼容旧 local.yaml 无 user 字段
  - 本地独立用户无 platform 段不受影响
---
