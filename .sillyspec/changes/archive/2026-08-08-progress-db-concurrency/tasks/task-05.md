---
id: task-05
title: SQLITE_BUSY 应用层有限重试+退避（R-08）；评估 _write 事务缩小持锁窗口（只写变更 change 行）
title_zh: SQLITE_BUSY 有限重试+退避 + 评估 _write 事务缩小持锁窗口
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P1
depends_on: [task-03]
blocks: [task-15]
requirement_ids: [NFR-03]
decision_ids: [D-01]
allowed_paths:
  - src/db.js
  - src/progress.js
goal: >
  DB 层 transaction 封装对 SQLITE_BUSY 加有限重试+递增退避（含上限与注释），并评估 _write 事务缩小持锁窗口，缓解 WAL 单写者并发冲突（R-08/NFR-03）。
implementation:
  - src/db.js transaction(fn)：原生 db.transaction(fn)() 抛 SQLITE_BUSY（err.code==='SQLITE_BUSY'）时有限重试+递增退避（如 3 次、50/100/200ms），仅 BUSY 重试、其它异常直接上抛；上限常量 MAX_BUSY_RETRIES，注释说明防死循环，达上限 fail-loud；评估 busy_timeout 是否需增大（现状 5000，design §7）结论记注释
  - src/progress.js _write（:382-476）：评估无条件 UPSERT 全部 stages + 每 stage 先 DELETE 再 INSERT 全量 steps 的持锁窗口 → 只写变更 change 行（changes + 变化 stage/step diff）的收益与成本
  - 评估结论落地：收益明确则实现 diff 写入；否则注释/提交说明记录理由（steps 无 UNIQUE、diff 复杂度），不强行改动
  - 在 task-03（db.js 已改原生 transaction）后执行，仅改 db.js/progress.js
acceptance:
  - BUSY 重试含硬上限，达上限抛错不静默吞（防死循环）；仅 SQLITE_BUSY 触发重试
  - 退避递增且有注释说明上限与语义
  - _write 持锁窗口评估有结论：落地 diff 写入，或注释说明保持现状的理由
  - npm run lint 通过
verify:
  - npm run lint && npm test（db/progress 相关测试由 task-14 重写承接）
  - grep -nE 'SQLITE_BUSY|MAX_BUSY' src/db.js
constraints:
  - 重试有限次防死循环，达上限 fail-loud 不静默吞错
  - 不改变 DB schema（design §3/§8）；仅改 src/db.js 与 src/progress.js
  - BUSY 重试收敛在 DB 层 transaction 封装，所有写者统一受益，不散落调用点
  - _write 缩小持锁窗口须保持「删除多余步骤」语义与 FK 级联一致，不产生孤儿/缺失步骤；单进程串行行为不变（design §9）
related_tests:
  - path: test/db-atomic-write.test.mjs
    reason: 直测 src/db.js 原子写+.bak 回退且 import sql.js，引擎替换+重试改行为，task-14 承接重写
  - path: test/progress-complete-stage.test.mjs
    reason: completeStage 经 db.transaction 写路径，事务封装重试+_write 形态评估影响其行为，task-14 承接
---
