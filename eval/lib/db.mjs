// eval 结果库（node:sqlite，独立于 src/db.js 的进度库——评测数据与工具自身状态解耦）。
// 只记录不解释：通过率/flaky/基线对比等统计全部在 report 层算，保持本层无状态可替换。
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DDL = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  arm TEXT NOT NULL,               -- A=裸 agent / B=SillySpec 流程
  adapter TEXT NOT NULL,           -- dryrun | cli
  model_label TEXT,
  config_hash TEXT NOT NULL,       -- 实验分组（配置+任务指纹+版本）
  tool_version TEXT,               -- sillyspec 版本（发版回归对比用）
  started_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  exit_code INTEGER,
  status TEXT NOT NULL,            -- pass | fail | timeout | error
  verify_output TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  agent_log_path TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_group ON runs(config_hash, adapter, arm, task_id);
`;

export class EvalDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  init() {
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec(DDL);
    return this;
  }

  insertRun(row) {
    this.db.prepare(`
      INSERT INTO runs (task_id, arm, adapter, model_label, config_hash, tool_version,
                        started_at, duration_ms, exit_code, status, verify_output,
                        tokens_in, tokens_out, cost_usd, agent_log_path, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.task_id, row.arm, row.adapter, row.model_label ?? null, row.config_hash, row.tool_version ?? null,
      row.started_at, row.duration_ms ?? 0, row.exit_code ?? null, row.status, row.verify_output ?? null,
      row.tokens_in ?? null, row.tokens_out ?? null, row.cost_usd ?? null, row.agent_log_path ?? null, row.notes ?? null,
    );
    return this.db.prepare('SELECT last_insert_rowid() AS id').get().id;
  }

  /** 同 (hash, task, arm) 已有 pass/fail 终态则可跳过重跑（--force 旁路） */
  cachedRun(configHash, taskId, arm) {
    return this.db.prepare(`
      SELECT * FROM runs
      WHERE config_hash = ? AND task_id = ? AND arm = ? AND status IN ('pass','fail')
      ORDER BY id DESC LIMIT 1
    `).get(configHash, taskId, arm) ?? null;
  }

  runsInGroup(configHash, adapter) {
    return this.db.prepare('SELECT * FROM runs WHERE config_hash = ? AND adapter = ? ORDER BY id').all(configHash, adapter);
  }

  groups() {
    return this.db.prepare(`
      SELECT config_hash, adapter, COUNT(*) AS n, MAX(id) AS last_id
      FROM runs GROUP BY config_hash, adapter ORDER BY last_id DESC
    `).all();
  }
}
