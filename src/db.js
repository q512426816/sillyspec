import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname } from 'path';

// DB schema 版本（与 project.schema_version DEFAULT 对齐）。_createSchema 改动（加表/列/migration）时 bump，
// 触发 .schema-version 戳失效 → 下次 init 重跑 _createSchema（W4-H：高频读路径 gate/derive/status
// 每次 new ProgressManager 都过 init，靠版本戳跳过建表省开销）。
// better-sqlite3 是原生 SQLite 引擎，打开即持久化（不像 sql.js 纯内存需整库 export 落盘），
// _createSchema 内 DDL 直接落盘，无需额外 _save。
const DB_SCHEMA_VERSION = 3;

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
 * 同步阻塞 sleep（better-sqlite3 同步 API，BUSY 退避不能用 await）。
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
   * 同步初始化（better-sqlite3 是同步 API，无 async/await，与 sql.js 的 initSqlJs() 异步加载不同）：
   *  - new Database(path) 同步打开/创建库文件（better-sqlite3 原生绑定，非 WASM）
   *  - PRAGMA：journal_mode=WAL 真生效（better-sqlite3 直连原生 SQLite，WAL 落地；
   *    sql.js 是纯内存库，WAL 对它无意义），busy_timeout=5000 让写锁竞争时自动等待，
   *    foreign_keys=ON 启用外键级联，synchronous=NORMAL 在 WAL 下兼顾安全与性能
   *  - schema 戳检查：内容匹配 DB_SCHEMA_VERSION 则跳过 _createSchema，省建表开销
   *  - better-sqlite3 打开即持久化，DDL/事务提交直接落盘，不需要 sql.js 时代的 _save()
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

    // 3. 设置 PRAGMA（better-sqlite3 走真 SQLite，journal_mode=WAL 真生效）
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');

    // 4. 创建表结构（仅当 schema 版本戳不匹配时——W4-H）：
    //    schema 已最新则跳过建表，省 DDL 开销。better-sqlite3 打开即持久化，
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
   * 语义对齐原 sql.js 的 _loadDatabase，但 better-sqlite3 绑定文件路径无 _save，
   * .bak 回退时 copyFileSync 把 .bak 内容恢复到主库路径，统一用 dbPath。
   *  - 主库存在且有内容且可打开：直接用。
   *  - 主库缺失/为空/损坏：尝试 .bak；成功则 warn 原因后 copy 回主库使用。
   *  - 都不可用：主库不存在→建全新空库；主库曾存在(空/损坏)→fail-loud 抛错(不静默建空库吞进度)。
   * better-sqlite3 打开 0 字节文件不抛错：主库须 statSync 显式判空（截断信号→走回退，防静默吞进度）；
   * .bak 作为恢复源只要存在且能打开即用（含 0 字节空库——better-sqlite3 视其为合法空库，
   * 生产环境 .bak 由原子写改名上一完整主库得来，永不为 0 字节，0 字节态仅出现在测试构造）。
   */
  _openWithFallback() {
    const bakPath = `${this.dbPath}.bak`;
    // readValid: null=文件不存在；'empty'=存在但 0 字节；'ok'=有内容
    const readValid = (p) => {
      if (!existsSync(p)) return null;
      return statSync(p).size === 0 ? 'empty' : 'ok';
    };
    // tryOpen: new Database(path) + prepare 探测双保险（防打开成功但内容非 SQLite）
    const tryOpen = (p) => {
      let db;
      try { db = new Database(p); }
      catch { return null; }
      try { db.prepare('SELECT count(*) FROM sqlite_master').get(); return db; }
      catch { try { db.close(); } catch { /* 关闭失败忽略 */ } return null; }
    };

    // 1. 主库（0 字节=截断信号，必须走回退，故门禁要求 'ok' 有内容）
    if (readValid(this.dbPath) === 'ok') {
      const primaryDb = tryOpen(this.dbPath);
      if (primaryDb) return primaryDb;
    }

    // 2. .bak 回退（.bak 是恢复源：存在且能打开即用，含 0 字节空库；门禁只挡"不存在"，
    //    避免 tryOpen 对不存在的路径触发 new Database 的副作用——会凭空创建文件）
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
        // better-sqlite3 绑定路径，无 _save：把 .bak 内容 copy 回主库，统一用 dbPath
        copyFileSync(bakPath, this.dbPath);
        return new Database(this.dbPath);
      }
    }

    // 3. 都不可用
    if (readValid(this.dbPath) === null) {
      // 主库与备份都不存在 → 全新项目，建空库
      return new Database(this.dbPath);
    }
    // 主库曾存在（空/损坏）但无法恢复 → 数据丢失，必须 fail-loud（不静默建空库吞进度）
    throw new Error('sillyspec.db 损坏且 .bak 备份不可用，无法恢复。请从版本控制或其他备份恢复 .sillyspec/.runtime/ 后重试。');
  }

  /**
   * 关闭数据库。better-sqlite3 的 close() 自动做 WAL checkpoint（把 -wal/-shm 日志合并回主库），
   * 不需要 sql.js 时代的 _save() 整库 export 落盘。
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 原生事务 + SQLITE_BUSY 应用层有限重试（R-08 / NFR-03）。
   *
   * better-sqlite3 的 db.transaction(fn) 返回一个包装函数，调用时自动
   * BEGIN/COMMIT/ROLLBACK（fn 抛错自动 ROLLBACK 且不吞错），嵌套调用自动用 SAVEPOINT。
   * 无需手动 BEGIN/COMMIT/ROLLBACK，也无需 _save（better-sqlite3 提交即持久化）。
   *
   * SQLITE_BUSY 重试：WAL 单写者模型，并发写第二者在 busy_timeout=5000 后抛 BUSY。此处对
   * BUSY 加 MAX_BUSY_RETRIES 次递增退避（BUSY_BACKOFF_MS）；仅 BUSY 重试（其它异常直接上抛），
   * 达上限 fail-loud 抛错不静默吞（防死循环）。BUSY 重试收敛在 DB 层 transaction 封装，
   * 所有写者（progress.js _write / initChange / setStage 等）统一受益，不散落调用点。
   */
  transaction(fn) {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(fn);
    let attempt = 0;
    while (true) {
      try {
        return tx();
      } catch (err) {
        // 仅 SQLITE_BUSY 重试（better-sqlite3 err.code 为 'SQLITE_BUSY'/5，message 含 'database is locked'）
        const isBusy = err && (err.code === 'SQLITE_BUSY' || err.code === 5
          || (typeof err.message === 'string' && /database is locked|SQLITE_BUSY/i.test(err.message)));
        if (!isBusy) throw err;
        if (attempt >= MAX_BUSY_RETRIES) throw err; // 达上限 fail-loud（不静默吞，防死循环）
        _sleepSync(BUSY_BACKOFF_MS[attempt]);
        attempt++;
      }
    }
  }

  /** 获取底层 db 对象（better-sqlite3 Database 实例，供 progress.js 直接使用） */
  getDb() {
    return this.db;
  }

  _createSchema() {
    // better-sqlite3：exec() 执行多条 SQL/DDL（无返回）；prepare().run/get/all 用于 DML。
    // sql.js 的 .run(sql) 在此换为 .exec(sql)。

    // project 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT NOT NULL,
        schema_version INTEGER DEFAULT 3,
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
  }

  /**
   * 幂等地给表添加列（列已存在则跳过）。
   * better-sqlite3：exec() 执行 ALTER TABLE DDL；列已存在抛错被 catch 静默跳过。
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
