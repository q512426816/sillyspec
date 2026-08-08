---
id: task-07
title: progress.js `_ensureDB`/`read`/`_write`/`readGlobal` 去 async；不再缓存快照（better-sqlite3 每次读最新）。完成标准：lint 过。
title_zh: ProgressManager 核心方法同步化去 async，去除整库快照缓存
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P0
depends_on: [task-03]
blocks: [task-08, task-09, task-10]
requirement_ids: [FR-04]
decision_ids: [D-01@v1]
allowed_paths:
  - src/progress.js
goal: >
  把 progress.js 的 `_ensureDB`/`read`/`_write`/`readGlobal` 四方法从 async 改为同步，
  SQL 层适配 better-sqlite3（prepare/all），移除 sql.js 整库内存快照语义，使每次读取都命中文件最新状态。
implementation:
  - Edit 前重读 src/progress.js 与 db.js 最新态，确认 task-03 已落盘（getDb 返回 better-sqlite3 Database）
  - _ensureDB 去 async：懒初始化连接缓存 this._db 保留，new DB + 同步 init，返回 this._db；连接不再代表整库内存快照
  - read/readGlobal 去 async，sql.js 的 sqlDb.exec(sql, params)[0].values 改 better-sqlite3 sqlDb.prepare(sql).all(...params) 行对象取值，返回对象结构与现状逐字段一致
  - read 内 await this.listChanges(cwd) 去 await（listChanges 同步化在 task-08 完成，同 Wave 2）
  - _write 去 async：transaction 回调适配 task-03 原生 db.transaction(fn)（回调不再收 sqlDb 参数，改用 db.getDb() 直用），run 改 db.prepare(...).run(...)
  - _write 末尾 await this._updateGateStatus(cwd) 改无 await 调用（fire-and-forget best-effort），不删除该方法
  - 最小适配 _updateGateStatus 内部 SQL 到 better-sqlite3，避免 _write 触发未处理 rejection 致 Wave 2 运行期崩溃；删除动作归 task-10
  - 四方法内不引入任何数据快照缓存层，better-sqlite3 每次查询读最新文件状态
acceptance:
  - 四方法均无 async 关键字，调用方可直接同步取返回值
  - read/readGlobal 返回对象结构与现状逐字段一致（design §9 兼容策略）
  - 同一 PM 实例连续两次 read 间隔中他进程落盘的变更可见（无快照缓存）
  - npm run lint 通过
verify:
  - npm run lint
constraints:
  - 只改 src/progress.js 一个文件（allowed_paths）
  - 方法名与返回结构不变，仅 async→sync（design §9）
  - 不删 _updateGateStatus，删除归 task-10；_write 末尾调用保留为 best-effort fire-and-forget
  - 不顺手转换 progress.js 其余 facade 方法（init/initChange/_readOrInit 等归 task-08 同步化，调用方去 await 归 task-09）
  - this._db 懒初始化连接缓存保留（连接非快照），不新增数据缓存
related_tests:
  - path: test/progress-complete-stage.test.mjs
    reason: 经 pm.read 验证 stage 推进，SQL 层 exec→prepare/all 切换后需复跑确认返回结构不变（正式重写归 task-14）
  - path: test/autoreset-preserves-progress.test.mjs
    reason: 直接调 pm._write 落盘，async→sync 语义变化需复跑
  - path: test/archive-cli-git-add.test.mjs
    reason: pm.read 加 pm._write 往返路径受影响需复跑
---
