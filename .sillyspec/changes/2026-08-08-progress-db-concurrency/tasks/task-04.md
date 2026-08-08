---
id: task-04
title: "`.bak` 损坏回退改 better-sqlite3 API（打开失败 try `.bak`，逐级回退语义对齐原 `_loadDatabase`）"
title_zh: "`.bak` 损坏回退适配 better-sqlite3 打开失败语义"
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P1
depends_on: [task-03]
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-01@v1]
allowed_paths:
  - src/db.js
goal: >
  把 .bak 损坏回退从 sql.js 语义改到 better-sqlite3 打开失败语义，主库 → .bak →
  空库/报错 逐级回退行为与原 _loadDatabase 三态语义一致。
implementation:
  - 用 existsSync + statSync 判定主库/.bak 文件三态（不存在/0 字节/有内容），对齐原 readValid
  - 打开候选库改同步 new Database(path) 包 try/catch；打开成功后再做一次 prepare SELECT count(*) FROM sqlite_master 探测，防「打开成功但内容非 SQLite」静默空库（对齐原 tryOpen 双保险）
  - 主库可用即用；不可用（打开失败/0 字节/不存在）则尝试 .bak，成功时 console.warn 原三态原因（为空/不存在/损坏）后使用
  - 主库与 .bak 都不可用：主库不存在 → new Database 建全新空库；主库曾存在（损坏/空）→ 抛原 fail-loud 错误，不静默建空库
  - 在同步 init() 内调用；删除原 _loadDatabase 的 SQL.Database 实例创建与 exec 探测，改 db.prepare(...).get()
acceptance:
  - 损坏态：主库写垃圾字节且 .bak 为有效库 → init 不抛错且读到的内容是 .bak 的
  - 空库态：主库 0 字节且 .bak 为有效库 → warn「为空」后从 .bak 恢复
  - 全新态：主库与 .bak 均不存在 → init 正常创建全新空库并可用
  - 兜底态：主库损坏或 0 字节且无 .bak → 抛 fail-loud 错误，不静默建空库吞进度
verify:
  - npm run lint
  - node --input-type=module -e 'import {DB} from "./src/db.js"; import {mkdtempSync,writeFileSync,existsSync} from "fs"; import {tmpdir} from "os"; import {join} from "path"; import Database from "better-sqlite3"; const t=mkdtempSync(join(tmpdir(),"fb-")); const p=n=>join(t,n); const check=(c,m)=>{if(!c){console.error("FAIL "+m);process.exit(1)}console.log("PASS "+m)}; const a=new DB(p("a.db")); a.init(); a.close(); check(existsSync(p("a.db")),"fresh-create"); new Database(p("b.db.bak")).close(); writeFileSync(p("b.db"),"garbage"); const b=new DB(p("b.db")); b.init(); b.close(); check(true,"corrupt-fallback"); writeFileSync(p("c.db"),""); const c=new DB(p("c.db")); let threw=false; try{c.init()}catch{threw=true}; check(threw,"empty-no-bak-fail-loud");'
constraints:
  - 只允许改 src/db.js，不新增测试文件（三态用例仅在 verify 内联构造，测试重写归 task-14）
  - better-sqlite3 打开 0 字节文件不抛错，必须显式 statSync 判空才走回退，否则「空库」态误判为可用库
  - warn 文案与 fail-loud 抛错文案保持与原 _loadDatabase 一致；init 保持同步不 reintroduce async
related_tests:
  - path: test/db-atomic-write.test.mjs
    reason: 断言 sql.js 整库 export + _loadDatabase .bak 回退语义，引擎替换后失效，由 task-14 承接重写
---
