---
author: flow-machine-draft
created_at: 2026-10-13T16:01:02.371Z
---
# 需求规格（Requirements）— 2026-10-13-autocreate-atomic-claim

## 功能需求

### FR-01: initChangeIfNoActive（progress.js）：INSERT..SELECT 带 NOT EXISTS(status='active') 与 NOT EXISTS(name=?) 双守卫，单语句原子抢占；抢到→建行+种 stages+建目录，返回 created:true；已有活跃→created:false 附 activeChanges 清单；同名行已存在（任意 status）→created:false

- ProgressManager **必须**新增 `initChangeIfNoActive(cwd, changeName, meta)`：以单条 `INSERT INTO changes ... SELECT ... WHERE NOT EXISTS(活跃行) AND NOT EXISTS(同名行)` 原子抢占——抢占成功**必须**在同一事务内完成 stages 种行与本地脏度戳，随后建变更目录并返回 `{created: true, progress}`（progress 形态与 initChange 返回一致）；存在任一 status='active' 行时**必须**返回 `{created: false, reason: 'active_exists', activeChanges}`；同名行已存在（任意 status）时**必须**返回 `{created: false, reason: 'name_exists'}`。

#### 场景：零活跃抢占成功

- Given：全新临时项目（changes 表无 active 行、无同名行）
- When：调用 initChangeIfNoActive(cwd, '2026-10-13-a')
- Then：created:true，DB 有该行（status='active'、current_stage='brainstorm'）、stages 已种、changes/2026-10-13-a/ 目录存在

#### 场景：已有活跃拒绝

- Given：DB 已有一行 status='active'（名 X）
- When：调用 initChangeIfNoActive(cwd, '2026-10-13-b')
- Then：created:false、reason:'active_exists'、activeChanges 含 X；DB 不新增行

#### 场景：同名行已存在拒绝

- Given：DB 有同名行且 status='archived'
- When：调用 initChangeIfNoActive(cwd, 同名)
- Then：created:false、reason:'name_exists'；行状态不被改写

### FR-02: run/command.js 两处自动建名调用点（brainstorm 无 --change / run auto）改用原子抢占，抢占失败走既有 exit 2 多活跃引导文案

- run/command.js 的 brainstorm 自动建名（无 --change 零活跃分支）与 run auto 零活跃建变更分支**必须**改调 initChangeIfNoActive；返回 created:false 时**必须**复用既有「已存在 N 个活跃变更…请用 --change 指定」exit 2 引导输出（含活跃变更清单）；禁止保留两步检查（listChanges 后 initChange）形态。

#### 场景：有活跃时裸 run brainstorm

- Given：DB 已有一行 status='active'
- When：执行 `run brainstorm --input <合法输入>`（无 --change）
- Then：exit 2，stderr 列出既有活跃变更名，不产生新变更

### FR-03: 抢占失败的进程不得留下 changes/<自动名>/ 空目录或 DB 行（败者零残留）

- 抢占失败路径**禁止**先建目录后抢占（initChange 现顺序）；目录创建**必须**发生在抢占成功之后。失败返回后**必须**保证：无同名 DB 行、无同名变更目录。

#### 场景：败者零残留

- Given：DB 已有 active 行 X
- When：调用 initChangeIfNoActive(cwd, '2026-10-13-c')
- Then：返回后 changes/2026-10-13-c/ 目录不存在，DB 无该名行

### FR-04: 显式 --change 路径（initChange）语义不变，既有测试全绿

- initChange（显式 --change 调用路径）**必须**保持既有行为与签名不变（含重名跳过插入、目录先建等既有语义）；既有全量测试**必须**通过（flow done 实测门）。

#### 场景：显式路径回归

- Given：任意既有测试 fixture
- When：跑全量 npm test
- Then：零失败（flow done 实测对账）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/init-change-if-no-active.test.mjs「零活跃抢占/已有活跃拒绝/同名拒绝」
FR-02: test/init-change-if-no-active.test.mjs「run brainstorm 裸跑 exit 2 引导」
FR-03: test/init-change-if-no-active.test.mjs「败者零残留（目录与 DB 行）」
FR-04: test/init-change-if-no-active.test.mjs「initChange 显式路径语义不变（重名跳过/目录先建）」
