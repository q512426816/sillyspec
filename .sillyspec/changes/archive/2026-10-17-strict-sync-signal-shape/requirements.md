---
author: flow-machine-draft
created_at: 2026-10-17T06:34:32.358Z
---
# 需求规格（Requirements）— 2026-10-17-strict-sync-signal-shape

## 功能需求

### FR-01: 默认同步路径（无 syncImpl 注入）回归单测绿：连接态 + 平台不可达时告警详情不含 AbortSignal 套娃 TypeError

- triggerSyncTerminalStrict 默认同步路径（不注入 syncImpl）**必须**把 raceWithAbort 传入的 `{signal}` 形状对象原样透传给 `SyncManager.sync`（禁止二次包装），连接态 + 平台不可达时告警详情**禁止**出现 AbortSignal 套娃 TypeError。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: test/terminal-sync-strict.test.mjs 全绿（10 用例）

- triggerSyncTerminalStrict 默认同步路径（不注入 syncImpl）**必须**把 raceWithAbort 传入的 `{signal}` 形状对象原样透传给 `SyncManager.sync`（禁止二次包装），连接态 + 平台不可达时告警详情**禁止**出现 AbortSignal 套娃 TypeError。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: dogfood 本变更 flow done 收尾强校验静默 confirmed（无 🚨 行、退出码干净）——修复后真实 E2E

- triggerSyncTerminalStrict 默认同步路径（不注入 syncImpl）**必须**把 raceWithAbort 传入的 `{signal}` 形状对象原样透传给 `SyncManager.sync`（禁止二次包装），连接态 + 平台不可达时告警详情**禁止**出现 AbortSignal 套娃 TypeError。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/terminal-sync-strict.test.mjs「终态默认同步路径（无 syncImpl 注入）→ raceWithAbort 的 {signal} 形状对象原样透传（套娃 TypeError 回归钉）」
FR-02: test/terminal-sync-strict.test.mjs（全文件 10 用例 0 失败）
FR-03: 不适用：dogfood 收口为命令级实测（本变更 flow done 自身），无单测面
