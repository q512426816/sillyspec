---
author: flow-machine-draft
created_at: 2026-10-17T06:17:49.417Z
---
# 需求规格（Requirements）— 2026-10-17-archive-terminal-sync-strict

## 功能需求

### FR-01: syncSpecTree 返回携带 ok 契约（成功/合法态 true、通道失败 false、未决冲突无 ok=fail-closed 未确认），单测钉两种可达路径

- syncSpecTree 的返回对象**必须**携带 `ok` 布尔字段表达「文件树通道本轮是否确认收敛」：未连接/无差异/推送成功/冲突自愈四类返回 `ok:true`，清单与推送的 HTTP 失败及异常返回 `ok:false`，未决冲突三路径不携带 ok（消费方按无 ok = 未确认 fail-closed）；历史调用方不消费该字段（向后兼容）。

#### 场景：主路径

Given 无 platform 配置（本地合法态）
When 调用 syncSpecTree
Then 返回 `{synced:0, ok:true}`（单测钉板）

#### 场景：平台不可达

Given platform 指向无服务端口
When 调用 syncSpecTree
Then 走清单异常分支返回 `ok:false`（单测钉板）

### FR-02: triggerSyncTerminalStrict 状态机单测：非终态委托、未连接静默、终态 treeOk 判定、冲突让位、预算熔断按未确认处置、失败告警含自救命令且 exitCode=1，全绿

- 新导出 `triggerSyncTerminalStrict(cwd, changeName, platformOpts, opts)` **必须**状态机驱动：quick SID 或 DB status 非 archived/deleted 时委托既有 triggerSync（零行为变化）；未连接平台静默跳过；终态时内联有界同步（opts.timeoutMs 可注入）并按 `treeOk===true` 判收敛——失败必须打 🚨 告警（含 `sillyspec platform sync --change <名>` 自救命令）并置 process.exitCode=1，未决冲突（result.conflict）必须让位给既有 resolve 横幅（不重复告警不动退出码）。

#### 场景：主路径

Given 注入 changeStatus/syncImpl 的七种状态组合
When 调用 triggerSyncTerminalStrict
Then 九条用例全绿（委托/静默/确认/告警+退出码/冲突让位/熔断/quick 委托/ok 契约两件）

### FR-03: 受影响面既有测试零回归（platform-sync 两件 + archive-chain + change-delete + run-complete-step-archive + flow-done-fail-brief）

- 上述六个既有测试文件在本变更交付后**必须**全部通过（0 失败）——接线点（flow.js 收尾、complete.js 阶段完成尾部、change-delete 第 5 步）的行为对非终态路径必须逐字节等价。

#### 场景：主路径

When node --test 六文件
Then fail=0

### FR-04: 语法门（node test/check-syntax.mjs）通过；dogfood flow done 真实走一遍新强校验路径（平台健康时静默 confirmed）

- 语法门必须通过；本变更自身的 flow done 收尾**必须**真实执行 triggerSyncTerminalStrict（平台健康时静默 confirmed、无告警无退出码污染）。

#### 场景：主路径

When sillyspec flow done --change 2026-10-17-archive-terminal-sync-strict
Then 收尾同步静默完成（无 🚨 行）、命令退出码不受污染

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/terminal-sync-strict.test.mjs「syncSpecTree 未连接平台 → ok:true（本地合法状态，非通道失败）」+「syncSpecTree 平台不可达（清单拉取异常）→ ok:false（fail-closed 可判失败）」
FR-02: test/terminal-sync-strict.test.mjs「终态 + 无 treeOk（未确认）→ 🚨 告警 + 自救命令 + exitCode=1」等七条状态机用例
FR-03: test/platform-sync-serialization.test.mjs + test/platform-sync-schema.test.mjs + test/archive-chain.test.mjs + test/change-delete.test.mjs + test/run-complete-step-archive.test.mjs + test/flow-done-fail-brief.test.mjs（六文件 0 失败）
FR-04: 不适用：语法门与 dogfood 收口为命令级实测（node test/check-syntax.mjs + 本变更 flow done），无单测面
