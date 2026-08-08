---
id: task-08
title: progress/ 子模块（step-store/change-registry/stage-machine/consistency-doctor/shared）同步化去 await
title_zh: progress/ 五子模块同步化去 await（随 PM facade 同步化）
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P0
depends_on: [task-07]
blocks: [task-12, task-13]
requirement_ids: [FR-04]
decision_ids: [D-01@v1]
allowed_paths:
  - src/progress/step-store.js
  - src/progress/change-registry.js
  - src/progress/stage-machine.js
  - src/progress/consistency-doctor.js
  - src/progress/shared.js
goal: >
  将 src/progress/ 五个子模块随 task-07 的 PM facade 同步化：全部方法去 async，
  去掉 await this.pm._ensureDB/read/_write/listChanges/readGlobal/_validateStageArtifacts/
  _appendAuditLog 等 db 调用，动态 import 改文件顶部静态 import；方法名与返回结构不变
implementation:
  - step-store.js：setStage/addStep/updateStep/updateBatchProgress/readBatchProgress 去 async 并去 await pm 调用
  - change-registry.js：listChanges/registerChange/updateChangeIsolation/readChangeIsolation/_updatePlatformLastSync/_updateApprovalStatus/renameChange/unregisterChange 去 async
  - stage-machine.js：_validateStageArtifacts/completeStage/show/_showChange/status/validate/reopenStage/reset 去 async；await import(../stage-contract.js) 改顶部静态 import
  - consistency-doctor.js：checkConsistency/repairConsistency 去 async；await import(../task-review.js) 改顶部静态 import；_appendAuditLog 已是同步不动
  - shared.js：无 async/await，仅确认 lint 不回归，不改内容
  - db.transaction 回调内 sql.js 风格 exec/run 调用形态随 task-03 DB wrapper 契约（getDb 与 transaction 入参）适配，不改变 SQL 语义
acceptance:
  - 五文件所有方法签名由 async 改同步，方法名与返回结构不变
  - src/progress/ 下无 await this.pm / await pm / await import 残留
  - npm run lint 通过
verify:
  - npm run lint
constraints:
  - 不新增 detectLostUpdateSignals（归 task-12）；不改 PM facade 本体（归 task-07）与调用方（归 task-09）
  - 不改变对外方法名与返回结构（仅 async→sync，FR-04）；事务回调 SQL 形态适配不改变 SQL 语义
  - 兼容 Windows/Linux/macOS，不引入路径与换行假设
---
