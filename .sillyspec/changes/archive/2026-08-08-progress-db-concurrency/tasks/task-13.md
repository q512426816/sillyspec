---
id: task-13
title: doctor repairConsistency 确认经原生 transaction（WAL 并发安全）
title_zh: doctor 修复写路径确认经原生 transaction，WAL 并发安全
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P1
depends_on: [task-08]
blocks: []
requirement_ids: [FR-02, NFR-01]
decision_ids: [D-01]
allowed_paths:
  - src/progress/consistency-doctor.js
  - src/db.js
goal: >
  验证 repairConsistency 的 --apply 写路径经 better-sqlite3 原生 db.transaction 落盘，
  在 WAL 模式下与其它写者并发安全（无整库覆盖、无 stale 快照读取）。
implementation:
  - 确认 consistency-doctor.js 的 repairConsistency 已随 task-08 同步化（去 async/await），--apply 写路径仅经 this.pm._write 落盘
  - 确认 this.pm._write 内部 db.transaction(fn) 为 task-03 引入的 better-sqlite3 原生事务（自动 BEGIN/COMMIT/ROLLBACK + 嵌套 savepoint），无整库 export/_save 残留
  - 确认 repairConsistency 读路径 pm.read 不再经实例快照缓存，每次查询读最新 WAL 文件状态
  - 实测 doctor repair dry-run 与 --apply，核对报告输出与 DB 落盘结果一致
acceptance:
  - repairConsistency --apply 写路径单次经 db.transaction 原子落盘，src/db.js 无 _save/export 整库写出
  - consistency-doctor.js 内无 await this.pm.read / await this.pm._write 残留
  - dry-run 不写库；--apply 仅修改 fixable 对应行，progress show 可核对
  - 并发语义确认：repair 与其它写者（execute --done）经 WAL 单写串行、读不阻塞写，不互相覆盖无关变更
  - 全量 npm test + npm run lint 绿（完整多进程并发压测归 task-15）
verify:
  - node bin/sillyspec.js progress repair --change <name>（dry-run 观察 fixable 报告）
  - node bin/sillyspec.js progress repair --change <name> --apply（apply 后 progress show 核对修复项）
  - grep -nE 'await this\.pm\.(_write|read)' src/progress/consistency-doctor.js（应无输出）
  - grep -nE '_save|export\(' src/db.js（应无输出，整库导出已删）
constraints:
  - 本 task 为验证型任务（plan 完成标准=验证），不新增业务逻辑；验证发现异常时改动仅限 allowed_paths 内文件
  - 验证前须确保 task-08 已合入（repairConsistency 已同步化）且 task-03 原生 transaction 已落地
  - 发现逻辑缺陷时修逻辑，禁止改测试掩盖（CLAUDE.md 规则 11）
  - 命令一律在主仓库根执行，不 cd worktree（CLAUDE.md 规则 14）
---
