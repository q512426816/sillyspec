import { openDatabase, applyPragmas, runTransaction } from './db-engine.js';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname } from 'path';

// DB schema 版本（与 project.schema_version DEFAULT 对齐）。_createSchema 改动（加表/列/migration）时 bump，
// 触发 .schema-version 戳失效 → 下次 init 重跑 _createSchema（W4-H：高频读路径 gate/derive/status
// 每次 new ProgressManager 都过 init，靠版本戳跳过建表省开销）。
// node:sqlite（DatabaseSync）是原生 SQLite 引擎，打开即持久化（不像 sql.js 纯内存需整库 export 落盘），
// _createSchema 内 DDL 直接落盘，无需额外 _save。
const DB_SCHEMA_VERSION = 5;

// SQLITE_BUSY 应用层有限重试（R-08 / NFR-03）：WAL 单写者模型，并发写第二者在
// busy_timeout=5000（init PRAGMA）后抛 SQLITE_BUSY。busy_timeout 已在引擎层处理大部分等待；
// 此处常量给 transaction() 做超时后的应用层兜底重试。
// 仅 SQLITE_BUSY 重试（其它异常直接上抛）；MAX_BUSY_RETRIES 有限次防死循环，达上限 fail-loud
// 不静默吞错。BUSY_BACKOFF_MS 递增退避（50→100→200ms），总等待上限 350ms。
// busy_timeout=5000 保持不变（design §7）：引擎层 5s 等待已覆盖大部分锁竞争，应用层 3 次退避
// 足够消化极端并发超时尖刺，无需抬高 busy_timeout（过长会让单次写阻塞拖慢整体吞吐）。
const MAX_BUSY_RETRIES = 3;
const BUSY_BACKOFF_MS = [50, 100, 200];

/**
 * 同步阻塞 sleep（node:sqlite 同步 API，BUSY 退避不能用 await）。
 * Atomics.wait 阻塞当前线程不占 CPU；SharedArrayBuffer 不可用的环境（受限 CSP / 旧 Node）
 * 退化为 busy-wait（退避时长 50-200ms 短，CPU 占用可接受）。仅在 transaction() 的 BUSY
 * 重试路径调用。
 */
function _sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy-wait fallback */ }
  }
}

export class DB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * 同步初始化（node:sqlite DatabaseSync 是同步 API，无 async/await，与 sql.js 的 initSqlJs() 异步加载不同）：
   *  - openDatabase(path) 同步打开/创建库文件（node:sqlite 原生绑定，非 WASM）
   *  - PRAGMA：journal_mode=WAL 真生效（node:sqlite 直连原生 SQLite，WAL 落地；
   *    sql.js 是纯内存库，WAL 对它无意义），busy_timeout=5000 让写锁竞争时自动等待，
   *    foreign_keys=ON 启用外键级联，synchronous=NORMAL 在 WAL 下兼顾安全与性能
   *  - schema 戳检查：内容匹配 DB_SCHEMA_VERSION 则跳过 _createSchema，省建表开销
   *  - node:sqlite 打开即持久化，DDL/事务提交直接落盘，不需要 sql.js 时代的 _save()
   *
   * .bak 损坏回退由 _openWithFallback() 承担（task-04）：主库 → .bak → 全新/报错 逐级回退，
   * 语义对齐原 sql.js 的 _loadDatabase。
   */
  init() {
    // 1. 确保父目录存在
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // 2. 同步打开/创建数据库（主库 → .bak → 全新/报错 逐级回退，归 task-04）
    this.db = this._openWithFallback();

    // 3. 设置 PRAGMA（node:sqlite 走真 SQLite，journal_mode=WAL 真生效；经 applyPragmas 逐条 exec）
    applyPragmas(this.db, [
      ['journal_mode', 'WAL'],
      ['busy_timeout', '5000'],
      ['foreign_keys', 'ON'],
      ['synchronous', 'NORMAL'],
    ]);

    // 4. 创建表结构（仅当 schema 版本戳不匹配时——W4-H）：
    //    schema 已最新则跳过建表，省 DDL 开销。node:sqlite 打开即持久化，
    //    _createSchema 内 DDL 直接落盘，无需 _save。
    //    戳在但 db 缺表属"手动改 db"边角（SillySpec 不支持），不在本层兜底。
    const versionPath = `${this.dbPath}.schema-version`;
    let schemaCurrent = false;
    try {
      schemaCurrent = existsSync(versionPath)
        && readFileSync(versionPath, 'utf8').trim() === String(DB_SCHEMA_VERSION);
    } catch { /* 戳读取失败保守重跑 schema */ }

    if (!schemaCurrent) {
      this._createSchema();
      try { writeFileSync(versionPath, String(DB_SCHEMA_VERSION)); } catch { /* 戳写入失败不阻断，下次重跑 */ }
    }
  }

  /**
   * 打开数据库（主库 → .bak → 全新/报错 逐级回退）。
   * 语义对齐原 sql.js 的 _loadDatabase，但 node:sqlite 绑定文件路径无 _save，
   * .bak 回退时 copyFileSync 把 .bak 内容恢复到主库路径，统一用 dbPath。
   *  - 主库存在且有内容且可打开：直接用。
   *  - 主库缺失/为空/损坏：尝试 .bak；成功则 warn 原因后 copy 回主库使用。
   *  - 都不可用：主库不存在→建全新空库；主库曾存在(空/损坏)→fail-loud 抛错(不静默建空库吞进度)。
   * node:sqlite 打开 0 字节文件不抛错：主库须 statSync 显式判空（截断信号→走回退，防静默吞进度）；
   * .bak 作为恢复源只要存在且能打开即用（含 0 字节空库——node:sqlite 视其为合法空库）。
   * 注：node:sqlite 提交即持久化，不再写前备份主 .bak（sql.js 时代 _save/_atomicWriteSync 已随
   * 2026-08-11 迁移移除）；此恢复分支是向后兼容兜底，仅对 sql.js 时代遗留的 .bak 生效，
   * 全新 node:sqlite 项目不产生主 .bak）。
   */
  _openWithFallback() {
    const bakPath = `${this.dbPath}.bak`;
    // readValid: null=文件不存在；'empty'=存在但 0 字节；'ok'=有内容
    const readValid = (p) => {
      if (!existsSync(p)) return null;
      return statSync(p).size === 0 ? 'empty' : 'ok';
    };
    // tryOpen: openDatabase(path) + prepare 探测双保险（防打开成功但内容非 SQLite）
    const tryOpen = (p) => {
      let db;
      try { db = openDatabase(p); }
      catch { return null; }
      try { db.prepare('SELECT count(*) FROM sqlite_master').get(); return db; }
      catch { try { db.close(); } catch { /* 关闭失败忽略 */ } return null; }
    };

    // 1. 主库（0 字节=截断信号，必须走回退，故门禁要求 'ok' 有内容）
    if (readValid(this.dbPath) === 'ok') {
      const primaryDb = tryOpen(this.dbPath);
      if (primaryDb) return primaryDb;
      // 并发首开竞争（2026-08-12 db-concurrency flaky 根因实证）：多进程近乎同时
      // new DB().init() 打开同一新建库时，tryOpen 的 prepare(SELECT count(*)) 可能撞上
      // 他者进程的 CHECKPOINT 改写主库 → 瞬时失败返 null。此时主库存在且有内容，
      // 非真损坏——有限重试消化锁竞争（复用 MAX_BUSY_RETRIES 退避，与 transaction 的
      // SQLITE_BUSY 重试同基建）。真损坏重试也不会过，最终仍走 .bak 回退 / fail-loud，
      // 防吞进度语义零回归。
      for (let attempt = 0; attempt < MAX_BUSY_RETRIES; attempt++) {
        _sleepSync(BUSY_BACKOFF_MS[attempt]);
        const retryDb = tryOpen(this.dbPath);
        if (retryDb) return retryDb;
      }
    }

    // 2. .bak 回退（.bak 是恢复源：存在且能打开即用，含 0 字节空库；门禁只挡"不存在"，
    //    避免 tryOpen 对不存在的路径触发 openDatabase 的副作用——会凭空创建文件）
    if (readValid(bakPath) !== null) {
      const bakDb = tryOpen(bakPath);
      if (bakDb) {
        const primaryRaw = readValid(this.dbPath);
        const reason = primaryRaw === 'empty'
          ? 'sillyspec.db 为空（可能被截断）'
          : primaryRaw === null
            ? 'sillyspec.db 不存在'
            : 'sillyspec.db 损坏';
        console.warn(`⚠️  ${reason}，已从 .bak 备份恢复。`);
        bakDb.close();
        // node:sqlite 绑定路径，无 _save：把 .bak 内容 copy 回主库，统一用 dbPath
        copyFileSync(bakPath, this.dbPath);
        return openDatabase(this.dbPath);
      }
    }

    // 3. 都不可用
    if (readValid(this.dbPath) === null) {
      // 主库与备份都不存在 → 全新项目，建空库
      return openDatabase(this.dbPath);
    }
    // 主库曾存在（空/损坏）但无法恢复 → 数据丢失，必须 fail-loud（不静默建空库吞进度）
    throw new Error('sillyspec.db 损坏且 .bak 备份不可用，无法恢复。请从版本控制或其他备份恢复 .sillyspec/.runtime/ 后重试。');
  }

  /**
   * 关闭数据库。node:sqlite 的 close() 自动做 WAL checkpoint（把 -wal/-shm 日志合并回主库），
   * 不需要 sql.js 时代的 _save() 整库 export 落盘。
   */
  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        // close 自身失败（如 WAL checkpoint 磁盘满）：仍置 null 防后续操作已损坏句柄，warn 留痕不吞
        console.warn(`[db] close 失败（句柄已废弃）: ${err && err.message ? err.message : err}`);
      } finally {
        this.db = null;
      }
    }
  }

  /**
   * 原生事务 + SQLITE_BUSY 应用层有限重试（R-08 / NFR-03）。
   *
   * node:sqlite 无 .transaction()，runTransaction(fn)（db-engine）用 SAVEPOINT/RELEASE/
   * ROLLBACK TO 手写事务：fn 抛错自动回滚且不吞错，嵌套调用自动形成 savepoint 栈
   * （对齐旧引擎嵌套自动 SAVEPOINT 的兼容实现）。无需手动 BEGIN/COMMIT/ROLLBACK，
   * 也无需 _save（node:sqlite 提交即持久化）。
   *
   * SQLITE_BUSY 重试：WAL 单写者模型，并发写第二者在 busy_timeout=5000 后抛 BUSY。此处对
   * BUSY 加 MAX_BUSY_RETRIES 次递增退避（BUSY_BACKOFF_MS）；仅 BUSY 重试（其它异常直接上抛），
   * 达上限 fail-loud 抛错不静默吞（防死循环）。BUSY 重试收敛在 DB 层 transaction 封装，
   * 所有写者（progress.js _write / initChange / setStage 等）统一受益，不散落调用点。
   */
  transaction(fn) {
    if (!this.db) throw new Error('DB not initialized');
    let attempt = 0;
    while (true) {
      try {
        return runTransaction(this.db, fn);
      } catch (err) {
        // 仅 SQLITE_BUSY 重试（node:sqlite err.errcode 为 5 / err.code 为 'ERR_SQLITE_ERROR'，message 含 'database is locked'）
        const isBusy = err && (err.code === 'SQLITE_BUSY' || err.code === 5 || err.errcode === 5
          || (typeof err.message === 'string' && /database is locked|SQLITE_BUSY/i.test(err.message)));
        if (!isBusy) throw err;
        if (attempt >= MAX_BUSY_RETRIES) throw err; // 达上限 fail-loud（不静默吞，防死循环）
        _sleepSync(BUSY_BACKOFF_MS[attempt]);
        attempt++;
      }
    }
  }

  /** 获取底层 db 对象（node:sqlite DatabaseSync 实例，供 progress.js 直接使用） */
  getDb() {
    return this.db;
  }

  _createSchema() {
    // node:sqlite：exec() 执行多条 SQL/DDL（无返回）；prepare().run/get/all 用于 DML。
    // sql.js 的 .run(sql) 在此换为 .exec(sql)。

    // project 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT NOT NULL,
        schema_version INTEGER DEFAULT 5,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // changes 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        current_stage TEXT DEFAULT 'scan',
        status TEXT DEFAULT 'active',
        no_worktree INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL,
        platform_change_id INTEGER,
        platform_workspace_id INTEGER,
        platform_last_sync TEXT,
        platform_sync_enabled INTEGER DEFAULT 0
      )
    `);

    // stages 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        UNIQUE(change_id, stage)
      )
    `);

    // steps 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        output TEXT,
        completed_at TEXT,
        ordering INTEGER NOT NULL DEFAULT 0
      )
    `);

    // batch_progress 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS batch_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
        total INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        skipped INTEGER DEFAULT 0,
        UNIQUE(change_id)
      )
    `);

    // approvals 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'not_required',
        requested_at TEXT,
        approved_by TEXT,
        approved_at TEXT,
        rejection_reason TEXT,
        UNIQUE(change_id)
      )
    `);

    // 索引
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_changes_current_stage ON changes(current_stage)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_stages_change ON stages(change_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_steps_stage ON steps(stage_id)');

    // Migration: add isolation columns to changes table (idempotent)
    this._migrateAddColumn('changes', 'isolation_status', 'TEXT');
    this._migrateAddColumn('changes', 'isolation_mode', 'TEXT');
    this._migrateAddColumn('changes', 'isolation_reason', 'TEXT');

    // Migration: add waiting support columns to steps table (idempotent)
    this._migrateAddColumn('steps', 'wait_reason', 'TEXT');
    this._migrateAddColumn('steps', 'wait_options', 'TEXT');
    this._migrateAddColumn('steps', 'wait_answer', 'TEXT');
    this._migrateAddColumn('steps', 'waited_at', 'TEXT');
    // repeatableWait support
    this._migrateAddColumn('steps', 'wait_answers', 'TEXT'); // JSON array
    this._migrateAddColumn('steps', 'wait_round', 'INTEGER');
    this._migrateAddColumn('steps', 'max_wait_rounds', 'INTEGER');

    // Revision v1 support
    this._migrateAddColumn('stages', 'revision', 'INTEGER DEFAULT 0');
    this._migrateAddColumn('stages', 'reopened_from_step', 'TEXT');
    this._migrateAddColumn('stages', 'reopened_at', 'TEXT');
    this._migrateAddColumn('stages', 'stale_reason', 'TEXT');

    // Platform sync support（2026-08-10-platform-progress-sync §8 / D-012）：
    // changes 表加 base_ts（last_synced_platform_ts）与本地脏度（last_local_modified_ts）两列，
    // 为 serializeForSync()/import() 序列化与 base_ts 乐观锁冲突检测提供数据载体。
    // NULL 语义（gap8）：last_local_modified_ts NULL=本地无脏度（pull 不判冲突直接 import）；
    // last_synced_platform_ts NULL=首次同步（base_ts NULL 平台接受首次 push）。
    this._migrateAddColumn('changes', 'last_synced_platform_ts', 'TEXT');
    this._migrateAddColumn('changes', 'last_local_modified_ts', 'TEXT');

    // changes 表加 title（人类可读中文标题）+ quicklog_id（关联 QUICKLOG ql-ID）两列：
    // 让 quick-<hex> 这种机器 hash sessionId 命名的 change 行可读，DB↔QUICKLOG 可对账。
    // quick 启动时回填（stage.js：title 从任务描述提取、quicklog_id 用分配的 qlId），
    // --done 时从 step3「需求：」刷新 title（agent 可改）。完整流程 change 的 name 本身
    // 已语义化，title/quicklog_id 留空。不纳入平台同步脏度（本地展示用元信息）。
    this._migrateAddColumn('changes', 'title', 'TEXT');
    this._migrateAddColumn('changes', 'quicklog_id', 'TEXT');
  }

  /**
   * 幂等地给表添加列（列已存在则跳过）。
   * node:sqlite：exec() 执行 ALTER TABLE DDL；列已存在抛错被 catch 静默跳过。
   * @private
   */
  _migrateAddColumn(table, column, type) {
    try {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch {
      // 列已存在，静默跳过
    }
  }
}
