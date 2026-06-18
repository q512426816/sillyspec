import initSqlJs from 'sql.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

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

    // 3. 加载已有数据库或创建新库
    if (existsSync(this.dbPath)) {
      const buf = readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }

    // 4. 设置 PRAGMA
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA busy_timeout = 5000');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA synchronous = NORMAL');

    // 5. 创建表结构
    this._createSchema();

    // 6. 保存到磁盘
    this._save();
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
    try {
      const result = fn(this.db);
      this.db.run('COMMIT');
      this._save();
      return result;
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    }
  }

  /** 获取底层 db 对象（供 progress.js 直接使用） */
  getDb() {
    return this.db;
  }

  /** 将内存中的数据库持久化到磁盘 */
  _save() {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    writeFileSync(this.dbPath, buffer);
    // sql.js 的 export() 会重置 PRAGMA 状态，需要重新设置
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA busy_timeout = 5000');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA synchronous = NORMAL');
  }

  _createSchema() {
    // project 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT NOT NULL,
        schema_version INTEGER DEFAULT 4,
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
