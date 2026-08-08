---
id: task-09
title: 调用方同步化（grep 实证 15 文件中的主流程部分）：run/command.js、run/stage.js、run/gates.js、run/complete.js、run/complete-handlers.js、run/quick-audit.js、sync.js、index.js、init.js、machine-interface.js 全部去 `await pm.*`/`await this.pm.*`/`await this._ensureDB`
title_zh: 主流程调用方同步化——10 文件去 await pm 调用
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P0
depends_on: [task-07]
blocks: []
requirement_ids: [FR-04, FR-08]
decision_ids: [D-01]
allowed_paths:
  - src/run/command.js
  - src/run/stage.js
  - src/run/gates.js
  - src/run/complete.js
  - src/run/complete-handlers.js
  - src/run/quick-audit.js
  - src/sync.js
  - src/index.js
  - src/init.js
  - src/machine-interface.js
goal: >
  将 10 个主流程调用方文件中的 await pm.* / await this.pm.* / await this._ensureDB 全部去 await，
  适配 task-07 已同步化的 ProgressManager（better-sqlite3 同步 API），保持调用行为一致。
implementation:
  - 逐文件仅去 await 前缀（read/_write/initChange/registerChange/reopenStage/completeStage/listChanges/unregisterChange/checkConsistency/repairConsistency/validate/updateStep/readBatchProgress/updateBatchProgress/alignExecuteToPlan/updateChangeIsolation/renameChange/pm.init/_updatePlatformLastSync/_updateApprovalStatus），不改函数语义与返回结构；所在函数去后已无其它 await 的按 lint 提示去 async
  - run/command.js 20 处（:580/:586/:601/:608/:628/:663/:700/:701/:705/:723/:771/:773/:929/:979/:981/:987/:990/:1082/:1146/:1148）；run/stage.js 9 处（:111/:125/:147/:163/:198/:199/:291/:344/:354）；run/complete.js 8 处（:236/:258/:265/:338/:580/:683/:722/:803）；run/gates.js 2 处（:167/:612）；run/complete-handlers.js 5 处（:138/:191/:720/:913/:930）
  - sync.js 4 处（:224 read、:249 _updatePlatformLastSync、:350/:480 _updateApprovalStatus——WAL 单条 UPDATE 原子落盘免额外锁，FR-08）；index.js 11 处（:256/:270/:274/:302/:308/:313/:332/:532/:655/:663/:1190）；init.js :315 pm.init；machine-interface.js :133/:370 pm.read；quick-audit.js :57 pm.listChanges
acceptance:
  - 本 task 10 个文件内 grep 归零：await (pm.|this.pm.|this._ensureDB|progressManager.) 计数为 0
  - src/ 全量 grep 计数归零（与 task-07/08 联合达成的全局验收，R-02 审计口径 109/15）
  - npm run lint 绿；同步化后单进程串行行为与现状一致（FR-08）
verify:
  - grep -nE 'await (pm\.|this\.pm\.|this\._ensureDB|progressManager\.)' src/run/command.js src/run/stage.js src/run/gates.js src/run/complete.js src/run/complete-handlers.js src/run/quick-audit.js src/sync.js src/index.js src/init.js src/machine-interface.js  # 期望无输出
  - grep -rEn 'await (pm\.|this\.pm\.|this\._ensureDB|progressManager\.)' src/ | wc -l  # 期望 0（全局联合验收）
constraints:
  - 只允许修改 allowed_paths 内 10 个文件；progress.js（task-07）、progress/ 子模块（task-08）不在本 task 范围
  - 不删 _updateGateStatus（归 task-10），不涉及 gate-status.json
  - 顺序依赖 task-07——PM 必须已同步化，去 await 才不会把 Promise 当值用
  - 不改测试（测试重写归 task-14）；lint 报 no-misused-promises 说明 PM 仍有 async 泄漏，先核对 task-07 依赖
---
