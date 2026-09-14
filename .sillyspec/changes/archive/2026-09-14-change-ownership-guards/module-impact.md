# 模块影响分析（Module Impact）— change-ownership-guards 四护栏

> 影响类型与 review 标记以 git diff 为准；路径仓根全口径。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| progress | src/db.js、src/progress/shared.js、src/progress.js、src/progress/change-registry.js、.sillyspec/docs/sillyspec/modules/progress.md | 数据结构变更（v6 owner_session 列+迁移）；接口变更（getChangeOwner/claimChangeOwner/setChangeOwner/assertChangeOwnership/resolveSessionIdentity 导出；serializeForSync 投影扩列） | 是（task-01/02 review pass+QA） |
| worktree | src/worktree-apply.js、.sillyspec/docs/sillyspec/modules/worktree.md | 逻辑变更（reviewAdmittedFiles 相交过滤两路径+reviewOverdeclaredFiles；归档门复用 checkOnly 关联） | 是 |
| runtime | src/run/complete-handlers.js、src/run/command.js、src/run/complete.js、.sillyspec/docs/sillyspec/modules/runtime.md | 逻辑变更（归档双门+quick 链所有权+flag 透传链+启动 claim；--skip-apply record 留痕） | 是 |
| cli-entry | src/index.js、.sillyspec/docs/sillyspec/modules/cli-entry.md | 逻辑变更（apply/cleanup/assess 三接线锁内+--takeover/--session 解析+usage） | 是 |
| core-engine | src/task-review.js、.sillyspec/docs/sillyspec/modules/core-engine.md | 逻辑变更（readChangeIsolationMode+resolveAttributionDiffFiles 四路归因分流） | 是 |
| setup | src/config-schema.js、.sillyspec/local.yaml.example、.sillyspec/docs/sillyspec/modules/setup.md、AGENTS.md | 配置变更（heartbeat_minutes 键+example 段；AGENTS.md 第 19 条会话标识铁律） | 否 |
| sync | src/sync.js | 逻辑变更（IGNORE_KEYS 补 owner_session 一行，last_pusher 先例） | 否 |
| 测试 | test/change-ownership-guards.test.mjs（新）、test/platform-sync-schema.test.mjs、test/platform-sync-serialization.test.mjs、test/worktree-apply-review-allowlist.test.mjs | 新增/连带断言更新 | 是（15/15+翻转用例） |

## 未匹配文件

- `meta.json`：worktree CLI 自管供给态，非交付。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 本变更未改（无新增源文件；六卡按既有模块更新） | done |
| `modules/progress.md` | task-04：change 所有权节（列+五 API+三级标识+投影） | done |
| `modules/worktree.md` | task-04：reviewOverdeclaredFiles 行+归档门关联 | done |
| `modules/runtime.md` | task-04：v6 口径+所有权接线/归档双门/quick 链 | done |
| `modules/cli-entry.md` | task-04：三 flag 注意事项+索引 | done |
| `modules/core-engine.md` | task-04：task-review 归因分流节 | done |
| `modules/setup.md` | task-04：heartbeat_minutes 键段+索引 | done |
