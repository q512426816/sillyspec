import initSqlJs from 'sql.js';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';

// DB schema 版本（与 project.schema_version DEFAULT 对齐）。_createSchema 改动（加表/列/migration）时 bump，
// 触发 .schema-version 戳失效 → 下次 init 重跑 _createSchema + _save（W4-H：高频读路径 gate/derive/status
// 每次 new ProgressManager 都过 init，原无条件 _createSchema+_save 致每次整库 export+三段原子写）。
const DB_SCHEMA_VERSION = 3;

export class DB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async init() {
    // 1. 确保父目录存在
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // 2. 初始化 sql.js
    const SQL = await initSqlJs();

    // 3. 加载已有数据库（含损坏检测 + .bak 回滚）或创建新库
    this.db = this._loadDatabase(SQL);

    // 4. 设置 PRAGMA
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA busy_timeout = 5000');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA synchronous = NORMAL');

    // 5. 创建表结构（仅当 schema 版本戳不匹配时——W4-H）：
    //    schema 已最新则只 load 不写，省掉 _createSchema + _save 的整库 export + 三段原子写。
    //    戳在但 db 缺表属"手动改 db"边角（SillySpec 不支持），_loadDatabase 的损坏检测兜底正常路径。
    const versionPath = `${this.dbPath}.schema-version`;
    let schemaCurrent = false;
    try {
      schemaCurrent = existsSync(versionPath)
        && readFileSync(versionPath, 'utf8').trim() === String(DB_SCHEMA_VERSION);
    } catch { /* 戳读取失败保守重跑 schema */ }

    if (!schemaCurrent) {
      this._createSchema();
      this._save();
      try { writeFileSync(versionPath, String(DB_SCHEMA_VERSION)); } catch { /* 戳写入失败不阻断，下次重跑 */ }
    }
  }

  close() {
    if (this.db) {
      this._save();
      this.db.close();
      this.db = null;
    }
  }

  transaction(fn) {
    if (!this.db) throw new Error('DB not initialized');
    this.db.run('BEGIN');
    let result;
    try {
      result = fn(this.db);
      this.db.run('COMMIT');
    } catch (err) {
      // fn 抛错或 COMMIT 失败：事务级回滚（此时事务确实活跃，ROLLBACK 有效）
      try { this.db.run('ROLLBACK'); } catch { /* 事务可能已被 fn 内的错自动回滚 */ }
      throw err;
    }
    // COMMIT 成功后才持久化。_save 失败时抛原生错（磁盘满/EPERM），不再被 catch 里
    // 无效的 ROLLBACK 二级异常（"no transaction active"）掩盖——内存库已 commit，
    // 下次 _save / close() 会落盘，调用方拿到的是准确的持久化错误而非被替换的误报。
    this._save();
    return result;
  }

  /** 获取底层 db 对象（供 progress.js 直接使用） */
  getDb() {
    return this.db;
  }

  /**
   * 将内存中的数据库持久化到磁盘（原子写 + 保留上一版 .bak 备份）。
   * 任何时刻磁盘上的主库要么是完整的上一版、要么是完整的新版，
   * 不会出现写入中途崩溃导致的截断态。sql.js 是纯内存库，
   * PRAGMA journal_mode=WAL 对它无意义——真正的持久化原子性在这里保证。
   */
  _save() {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    this._atomicWriteSync(this.dbPath, buffer);
    // sql.js 的 export() 会重置 PRAGMA 状态，需要重新设置
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA busy_timeout = 5000');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA synchronous = NORMAL');
  }

  /**
   * 原子落盘：同目录 tmp 写入 → 旧主库改名 .bak → tmp 改名为主库。
   * 三步保证主库永不处于半写状态；.bak 始终保留上一完整版本。
   * Windows 上 rename 偶发 EPERM/EBUSY（杀毒/索引扫描占文件），带短退避重试。
   */
  _atomicWriteSync(filePath, buffer) {
    const dir = dirname(filePath);
    // tmp 名含 pid（对齐 fs-atomic.js writeAtomicSync）：多进程并发 _save 时各自 tmp 不互覆盖，
    // 消除「一进程把他者 tmp 当自己内容落盘」的静默错存 / rename 撞 ENOENT。注：仅防 tmp 碰撞，
    // DB 整体 last-writer-wins 进度丢失仍存（治本需套 withFileLock 或换引擎，登记 review-2026-08-08.md）
    const tmpPath = join(dir, `.${basename(filePath)}.${process.pid}.tmp`);
    const bakPath = `${filePath}.bak`;
    // 1. 完整内容先落 tmp（同目录，保证 rename 不跨卷）
    writeFileSync(tmpPath, buffer);
    // 2. 旧主库 → .bak（保留上一版；不存在则跳过；失败不阻断主流程）
    if (existsSync(filePath)) {
      try { this._renameSyncRetry(filePath, bakPath); }
      catch { /* 备份失败最坏只是少一个 .bak，主库仍会被新内容替换 */ }
    }
    // 3. tmp → 主库（成功后主库即新版完整态）
    this._renameSyncRetry(tmpPath, filePath);
  }

  /** rename 带退避重试，覆盖 Windows 偶发的 EPERM/EBUSY/EACCES/ENOTEMPTY。 */
  _renameSyncRetry(from, to, retries = 5) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        renameSync(from, to);
        return;
      } catch (err) {
        lastErr = err;
        const code = err && err.code;
        if (!code || !['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(code)) throw err;
        if (attempt < retries) this._sleepSync(15 * (attempt + 1));
      }
    }
    throw lastErr;
  }

  /** 同步退避：优先 Atomics.wait，不可用时退化为忙等（仅在 rename 冲突的极端情况触发）。 */
  _sleepSync(ms) {
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch {
      const end = Date.now() + ms;
      while (Date.now() < end) { /* busy wait */ }
    }
  }

  /**
   * 加载数据库：主库 → .bak → 报错/空库，逐级回退。
   *  - 主库可正常打开：直接用。
   *  - 主库缺失/为空/损坏：尝试 .bak；成功则 warn 后用 .bak。
   *  - 主库与 .bak 都不可用：
   *      · 全新项目（两者都不存在）：创建空库；
   *      · 主库曾存在却无法恢复（截断/损坏且无可用备份）：fail-loud 抛错，
   *        不静默建空库——那会无声吞掉用户所有进度。
   */
  _loadDatabase(SQL) {
    const bakPath = `${this.dbPath}.bak`;
    // readValid: null=文件不存在；'empty'=存在但 0 字节；Buffer=有内容
    const readValid = (p) => {
      if (!existsSync(p)) return null;
      const b = readFileSync(p);
      return (b && b.length > 0) ? b : 'empty';
    };
    const tryOpen = (raw) => {
      if (!raw || raw === 'empty') return null;
      let instance;
      try { instance = new SQL.Database(raw); }
      catch { return null; }
      // 双保险：损坏 buffer 偶尔被 sql.js 静默打开为空库，用一次查询确认它真能用
      try { instance.exec('SELECT count(*) FROM sqlite_master'); return instance; }
      catch { try { instance.close(); } catch {} return null; }
    };

    const primaryRaw = readValid(this.dbPath);
    const primaryDb = tryOpen(primaryRaw);
    if (primaryDb) return primaryDb;

    const bakDb = tryOpen(readValid(bakPath));
    if (bakDb) {
      const reason = primaryRaw === 'empty'
        ? 'sillyspec.db 为空（可能被截断）'
        : primaryRaw === null
          ? 'sillyspec.db 不存在'
          : 'sillyspec.db 损坏';
      console.warn(`⚠️  ${reason}，已从 .bak 备份恢复。`);
      return bakDb;
    }

    if (primaryRaw === null) {
      // 主库与备份都不存在 → 全新项目
      return new SQL.Database();
    }
    // 主库曾存在（空/损坏）但无法恢复 → 数据丢失，必须 fail-loud
    throw new Error('sillyspec.db 损坏且 .bak 备份不可用，无法恢复。请从版本控制或其他备份恢复 .sillyspec/.runtime/ 后重试。');
  }

  _createSchema() {
    // project 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT NOT NULL,
        schema_version INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // changes 表
    this.db.run(`
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
    this.db.run(`
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
    this.db.run(`
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
    this.db.run(`
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
    this.db.run(`
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
    this.db.run('CREATE INDEX IF NOT EXISTS idx_changes_current_stage ON changes(current_stage)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_stages_change ON stages(change_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_steps_stage ON steps(stage_id)');

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
   * 幂等地给表添加列（列已存在则跳过）
   * @private
   */
  _migrateAddColumn(table, column, type) {
    try {
      this.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch {
      // 列已存在，静默跳过
    }
  }
}
