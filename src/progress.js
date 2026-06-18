/**
 * SillySpec ProgressManager — 进度恢复管理
 *
 * 纯 Node.js，无外部依赖。支持多变更并行。
 *
 * 存储结构：
 *   .sillyspec/.runtime/sillyspec.db          — SQLite 数据库（权威状态源）
 *   .sillyspec/.runtime/global.json           — 全局状态缓存（项目名、活跃变更列表）
 *   .sillyspec/.runtime/gate-status.json      — worktree-guard 门禁状态缓存
 *
 * 历史迁移：v1/v2 使用 progress.json 文件，v3 已全部迁移至 SQLite。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { join, basename, dirname, resolve } from 'path';
import { DB } from './db.js';

// 默认规范目录名（相对于 cwd）
const SPEC_DIR_NAME = '.sillyspec';
const RUNTIME_SUBDIR = '.runtime';

/**
 * 向上查找含 .sillyspec 目录的祖先目录，类似 git 找 .git 的逻辑。
 * 找到则返回 <祖先>/.sillyspec，否则 fallback 到 <cwd>/.sillyspec。
 */
export function resolveSpecDir(startDir) {
  let dir = resolve(startDir);
  while (true) {
    const candidate = join(dir, SPEC_DIR_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break; // 到达根目录
    dir = parent;
  }
  return join(resolve(startDir), SPEC_DIR_NAME);
}
const CHANGES_SUBDIR = 'changes';
const GLOBAL_FILE = 'global.json';
const CURRENT_VERSION = 3;
const VALID_STAGES = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive', 'quick', 'explore'];
const VALID_STATUSES = ['pending', 'in-progress', 'completed', 'failed', 'blocked', 'waiting', 'stale'];

// Stage statuses (superset of step statuses)
const VALID_STAGE_STATUSES = ['pending', 'in-progress', 'completed', 'failed', 'blocked', 'revising', 'stale'];

// Main flow stage order (for downstream cascade)
// 完整主流程顺序（含 scan），用于下游 cascade
const STAGE_ORDER = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive'];
// 主流程阶段（不含 scan/quick/explore 等辅助阶段）
const MAIN_FLOW_ORDER = STAGE_ORDER;

const STAGE_LABELS = {
  brainstorm: '🧠 需求探索',
  plan: '📐 实现计划',
  execute: '⚡ 波次执行',
  verify: '🔍 验证确认',
  scan: '🔍 代码扫描',
  quick: '⚡ 快速任务',
  explore: '🧭 自由探索',
  archive: '📦 归档变更',
};

function emptyStage() {
  return { status: 'pending', steps: [], startedAt: null, completedAt: null };
}

function makeInitialProgress(project) {
  const stages = {};
  for (const s of VALID_STAGES) stages[s] = emptyStage();
  return { _version: CURRENT_VERSION, project: project || '', currentStage: '', currentChange: null, stages, lastActive: null };
}

function makeInitialGlobal(project) {
  return { _version: CURRENT_VERSION, project: project || '', activeChanges: [] };
}

// ── ProgressManager ──

export class ProgressManager {
  /**
   * @param {object} [opts]
   * @param {string} [opts.specDir] - 规范目录绝对路径（默认 cwd/.sillyspec）
   */
  constructor(opts = {}) {
    this._customSpecDir = opts.specDir || null;
  }

  // ── 路径工具 ──

  /** 获取 specDir（优先自定义，否则向上查找含 .sillyspec 的目录，fallback 到 cwd/.sillyspec） */
  _getSpecDir(cwd) {
    if (this._customSpecDir) return this._customSpecDir;
    return resolveSpecDir(cwd);
  }

  _runtimePath(cwd, ...parts) {
    return join(this._getSpecDir(cwd), RUNTIME_SUBDIR, ...parts);
  }

  _changePath(cwd, changeName, ...parts) {
    return join(this._getSpecDir(cwd), CHANGES_SUBDIR, changeName, ...parts);
  }

  _ensureRuntimeDir(cwd) {
    const runtimeDir = this._runtimePath(cwd);
    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
      for (const d of ['artifacts', 'history', 'logs', 'templates']) {
        mkdirSync(join(runtimeDir, d), { recursive: true });
      }
    }
  }

  /** 懒初始化 DB 连接，缓存在实例上 */
  async _ensureDB(cwd) {
    if (!this._db) {
      this._db = new DB(this._runtimePath(cwd, 'sillyspec.db'));
      await this._db.init();
    }
    return this._db;
  }

  _ensureChangeDir(cwd, changeName) {
    const dir = this._changePath(cwd, changeName);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ── 全局状态 ──

  async readGlobal(cwd) {
    // SQL: SELECT FROM project + changes
    const db = await this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // 读取 project 行（id=1）
    const rows = sqlDb.exec('SELECT name, schema_version FROM project WHERE id = 1');
    if (!rows || rows.length === 0 || rows[0].values.length === 0) return null;
    const [name, schemaVersion] = rows[0].values[0];

    // 读取 active 变更列表
    const changeRows = sqlDb.exec("SELECT name FROM changes WHERE status = 'active' ORDER BY name");
    const activeChanges = changeRows && changeRows.length > 0
      ? changeRows[0].values.map(r => r[0])
      : [];

    return {
      _version: schemaVersion,
      project: name,
      activeChanges,
    };
  }

  async writeGlobal(cwd, data) {
    // SQL: UPDATE project + UPSERT changes status
    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const now = new Date().toISOString();

      // UPSERT project 行
      sqlDb.run(`
        INSERT INTO project (id, name, schema_version, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          schema_version = excluded.schema_version,
          updated_at = excluded.updated_at
      `, [data.project || '', data._version || CURRENT_VERSION, now, now]);

      // 同步 changes 表：确保 activeChanges 列表中的变更存在且为 active，
      // 不在列表中的设为 archived
      const activeChanges = data.activeChanges || [];
      for (const cn of activeChanges) {
        sqlDb.run(`
          INSERT INTO changes (name, status, created_at, last_active)
          VALUES (?, 'active', ?, ?)
          ON CONFLICT(name) DO UPDATE SET status = 'active', last_active = excluded.last_active
        `, [cn, now, now]);
      }
      if (activeChanges.length > 0) {
        sqlDb.run(`
          UPDATE changes SET status = 'archived'
          WHERE status = 'active' AND name NOT IN (${activeChanges.map(() => '?').join(',')})
        `, activeChanges);
      } else {
        // 没有活跃变更，将所有 active 归档
        sqlDb.run("UPDATE changes SET status = 'archived' WHERE status = 'active'");
      }
    });
  }

  // ── 变更级别状态 ──

  /**
   * 读取指定变更的 progress（SQL 版）
   * @param {string} cwd
   * @param {string|null} changeName - 变更名，null 时尝试自动检测
   * @returns {Promise<object|null>} 与 SQLite 查询结果一致的 JS 对象
   */
  async read(cwd, changeName = null) {
    // 自动检测变更名
    if (!changeName) {
      const changes = await this.listChanges(cwd);
      if (changes.length === 1) {
        changeName = changes[0];
      } else {
        // 多个或零个活跃变更，无法确定
        return null;
      }
    }

    const db = await this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // 1. 从 changes 表获取基本信息
    const changeRows = sqlDb.exec('SELECT id, name, current_stage, no_worktree, last_active FROM changes WHERE name = ?', [changeName]);
    if (!changeRows || changeRows.length === 0 || changeRows[0].values.length === 0) return null;
    const [changeId, cName, currentStage, noWorktree, lastActive] = changeRows[0].values[0];

    // 2. 从 stages 表获取所有阶段（含 revision 列）
    const stageRows = sqlDb.exec('SELECT id, stage, status, started_at, completed_at, revision, reopened_from_step, reopened_at, stale_reason FROM stages WHERE change_id = ? ORDER BY id', [changeId]);
    const stageMap = {};
    const stageIds = [];
    if (stageRows && stageRows.length > 0) {
      for (const [sId, stage, status, startedAt, completedAt, revision, reopenedFromStep, reopenedAt, staleReason] of stageRows[0].values) {
        stageMap[stage] = { _dbId: sId, status, startedAt, completedAt,
          ...(revision ? { revision } : {}),
          ...(reopenedFromStep ? { reopenedFromStep } : {}),
          ...(reopenedAt ? { reopenedAt } : {}),
          ...(staleReason ? { staleReason } : {}),
        };
        stageIds.push(sId);
      }
    }

    // 3. 从 steps 表获取所有步骤
    let stepRows = null;
    if (stageIds.length > 0) {
      const placeholders = stageIds.map(() => '?').join(',');
      stepRows = sqlDb.exec(
        `SELECT stage_id, name, status, output, completed_at, ordering, wait_reason, wait_options, wait_answer, waited_at, wait_answers, wait_round, max_wait_rounds FROM steps WHERE stage_id IN (${placeholders}) ORDER BY stage_id, ordering`,
        stageIds
      );
    }
    // 按阶段分组步骤
    const stepsByStage = {};
    if (stepRows && stepRows.length > 0) {
      for (const row of stepRows[0].values) {
        const [stageId, name, status, output, completedAt, ordering, waitReason, waitOptions, waitAnswer, waitedAt, waitAnswersJson, waitRound, maxWaitRounds] = row;
        if (!stepsByStage[stageId]) stepsByStage[stageId] = [];
        let waitAnswers = null;
        if (waitAnswersJson) {
          try { waitAnswers = JSON.parse(waitAnswersJson); } catch {}
        }
        stepsByStage[stageId].push({
          name, status, output, completedAt,
          ...(waitReason ? { waitReason } : {}),
          ...(waitOptions ? { waitOptions } : {}),
          ...(waitAnswer ? { waitAnswer } : {}),
          ...(waitedAt ? { waitedAt } : {}),
          ...(waitAnswers ? { waitAnswers } : {}),
          ...(waitRound != null ? { waitRound } : {}),
          ...(maxWaitRounds != null ? { maxWaitRounds } : {}),
        });
      }
    }

    // 4. 从 batch_progress 表获取批量进度
    const batchRows = sqlDb.exec('SELECT total, completed, failed, skipped FROM batch_progress WHERE change_id = ?', [changeId]);
    let batchProgress = undefined;
    if (batchRows && batchRows.length > 0 && batchRows[0].values.length > 0) {
      const [total, completed, failed, skipped] = batchRows[0].values[0];
      batchProgress = { total, completed, failed, skipped };
    }

    // 5. 获取项目名
    const projectRows = sqlDb.exec('SELECT name FROM project WHERE id = 1');
    const projectName = (projectRows && projectRows.length > 0 && projectRows[0].values.length > 0)
      ? projectRows[0].values[0][0]
      : '';

    // 6. 组装为兼容对象
    const stages = {};
    // 先填充所有 VALID_STAGES
    for (const s of VALID_STAGES) {
      stages[s] = emptyStage();
    }
    // 用 DB 数据覆盖
    for (const [stage, info] of Object.entries(stageMap)) {
      const steps = (stepsByStage[info._dbId] || []).map(s => ({
        name: s.name,
        status: s.status,
        output: s.output,
        completedAt: s.completedAt,
        ...(s.waitReason ? { waitReason: s.waitReason } : {}),
        ...(s.waitOptions ? { waitOptions: s.waitOptions } : {}),
        ...(s.waitAnswer ? { waitAnswer: s.waitAnswer } : {}),
        ...(s.waitedAt ? { waitedAt: s.waitedAt } : {}),
        ...(s.waitAnswers ? { waitAnswers: s.waitAnswers } : {}),
        ...(s.waitRound != null ? { waitRound: s.waitRound } : {}),
        ...(s.maxWaitRounds != null ? { maxWaitRounds: s.maxWaitRounds } : {}),
      }));
      stages[stage] = {
        status: info.status,
        steps,
        startedAt: info.startedAt,
        completedAt: info.completedAt,
        // Revision v1 fields
        ...(info.revision ? { revision: info.revision } : {}),
        ...(info.reopenedFromStep ? { reopenedFromStep: info.reopenedFromStep } : {}),
        ...(info.reopenedAt ? { reopenedAt: info.reopenedAt } : {}),
        ...(info.staleReason ? { staleReason: info.staleReason } : {}),
      };
    }

    const result = {
      _version: 3,
      project: projectName,
      currentChange: cName,
      currentStage: currentStage || '',
      lastActive: lastActive || null,
      stages,
    };

    // noWorktree
    if (noWorktree) result.noWorktree = true;

    // batchProgress（仅在 DB 中有记录时才包含）
    if (batchProgress) result.batchProgress = batchProgress;

    return result;
  }

  /**
   * 写入指定变更的 progress
   * @param {string} cwd
   * @param {object} data
   * @param {string|null} changeName - 从 data.currentChange 推导，或显式传入
   */
  async _write(cwd, data, changeName = null) {
    const cn = changeName || data.currentChange;
    if (!cn) {
      console.warn('⚠️  _write: 无变更名，跳过写入');
      return;
    }

    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      // 1. 更新 changes 表
      const now = new Date().toISOString();
      const noWorktree = data.noWorktree ? 1 : 0;
      sqlDb.run(
        'UPDATE changes SET current_stage = ?, last_active = ?, no_worktree = ? WHERE name = ?',
        [data.currentStage || '', now, noWorktree, cn]
      );

      // 2. 获取 change_id
      const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [cn]);
      if (!changeRow || changeRow.length === 0 || changeRow[0].values.length === 0) return;
      const changeId = changeRow[0].values[0][0];

      // 3. 遍历 stages，UPSERT stages 表和 steps 表
      if (data.stages && typeof data.stages === 'object') {
        for (const [stageName, stageData] of Object.entries(data.stages)) {
          // UPSERT stages 行（含 revision 列）
          sqlDb.run(
            `INSERT INTO stages (change_id, stage, status, started_at, completed_at, revision, reopened_from_step, reopened_at, stale_reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(change_id, stage) DO UPDATE SET
               status = excluded.status,
               started_at = excluded.started_at,
               completed_at = excluded.completed_at,
               revision = COALESCE(excluded.revision, stages.revision),
               reopened_from_step = excluded.reopened_from_step,
               reopened_at = excluded.reopened_at,
               stale_reason = excluded.stale_reason`,
            [changeId, stageName, stageData.status || 'pending', stageData.startedAt || null, stageData.completedAt || null,
             stageData.revision || 0, stageData.reopenedFromStep || null, stageData.reopenedAt || null, stageData.staleReason || null]
          );

          // 获取 stage_id
          const stageRow = sqlDb.exec('SELECT id FROM stages WHERE change_id = ? AND stage = ?', [changeId, stageName]);
          if (!stageRow || stageRow.length === 0 || stageRow[0].values.length === 0) continue;
          const stageId = stageRow[0].values[0][0];

          // 收集 data 中的步骤名
          const stepNames = new Set();
          if (Array.isArray(stageData.steps)) {
            for (let i = 0; i < stageData.steps.length; i++) {
              const step = stageData.steps[i];
              stepNames.add(step.name);
              // UPSERT 步骤（先删再插，steps 表无 UNIQUE 约束）
              sqlDb.run('DELETE FROM steps WHERE stage_id = ? AND name = ?', [stageId, step.name]);
              sqlDb.run(
                'INSERT INTO steps (stage_id, name, status, output, completed_at, ordering, wait_reason, wait_options, wait_answer, waited_at, wait_answers, wait_round, max_wait_rounds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [stageId, step.name, step.status || 'pending', step.output || null, step.completedAt || null, i,
                  step.waitReason ?? null, step.waitOptions ?? null, step.waitAnswer ?? null, step.waitedAt ?? null,
                  Array.isArray(step.waitAnswers) ? JSON.stringify(step.waitAnswers) : null,
                  step.waitRound ?? null, step.maxWaitRounds ?? null]
              );
            }
          }

          // 删除 data 中不存在的多余步骤
          if (stepNames.size > 0) {
            const namePlaceholders = [...stepNames].map(() => '?').join(',');
            sqlDb.run(
              `DELETE FROM steps WHERE stage_id = ? AND name NOT IN (${namePlaceholders})`,
              [stageId, ...stepNames]
            );
          } else {
            // data 中没有步骤，清空该阶段所有步骤
            sqlDb.run('DELETE FROM steps WHERE stage_id = ?', [stageId]);
          }
        }
      }

      // 4. UPSERT batch_progress
      if (data.batchProgress && typeof data.batchProgress === 'object') {
        sqlDb.run(
          `INSERT INTO batch_progress (change_id, total, completed, failed, skipped)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(change_id) DO UPDATE SET
             total = excluded.total,
             completed = excluded.completed,
             failed = excluded.failed,
             skipped = excluded.skipped`,
          [changeId, data.batchProgress.total || 0, data.batchProgress.completed || 0, data.batchProgress.failed || 0, data.batchProgress.skipped || 0]
        );
      }
    });

    await this._updateGateStatus(cwd);
  }

  // ── 变更管理 ──

  /**
   * 列出所有活跃变更名
   * SQL: SELECT name FROM changes WHERE status = 'active'
   */
  async listChanges(cwd) {
    const db = await this._ensureDB(cwd);
    const sqlDb = db.getDb();
    const rows = sqlDb.exec("SELECT name FROM changes WHERE status = 'active' ORDER BY name");
    if (!rows || rows.length === 0) return [];
    return rows[0].values.map(r => r[0]);
  }

  /**
   * 注册变更到活跃列表
   * SQL: INSERT OR IGNORE → 若已 archived 则 UPDATE status='active'
   */
  async registerChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  registerChange: changeName 为空，跳过');
      return;
    }
    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const now = new Date().toISOString();
      // 尝试插入新行
      sqlDb.run(
        `INSERT OR IGNORE INTO changes (name, created_at, last_active)
         VALUES (?, ?, ?)`,
        [changeName, now, now]
      );
      // 注意：不复活已归档的变更——归档是不可逆操作
      // 如果变更已存在且为 archived，保持 archived 状态不变
    });
  }

  /**
   * 更新变更的隔离状态
   * @param {string} cwd - 项目根目录
   * @param {string} changeName - 变更名
   * @param {{ status: string, mode?: string, reason?: string }} isolation
   */
  async updateChangeIsolation(cwd, changeName, isolation) {
    const db = await this._ensureDB(cwd);
    const sqlDb = db.getDb();
    try {
      sqlDb.run(
        `UPDATE changes SET isolation_status = ?, isolation_mode = ?, isolation_reason = ?, last_active = ? WHERE name = ?`,
        [isolation.status, isolation.mode || null, isolation.reason || null, new Date().toISOString(), changeName]
      );
      db._save();
    } catch (err) {
      console.warn('⚠️  更新 isolation 状态失败:', err.message);
    }
  }

  /**
   * 读取变更的隔离状态
   * @param {string} cwd - 项目根目录
   * @param {string} changeName - 变更名
   * @returns {{ status: string|null, mode: string|null, reason: string|null }|null}
   */
  async readChangeIsolation(cwd, changeName) {
    const db = await this._ensureDB(cwd);
    const sqlDb = db.getDb();
    try {
      const rows = sqlDb.exec(
        `SELECT isolation_status, isolation_mode, isolation_reason FROM changes WHERE name = ?`,
        [changeName]
      );
      if (!rows || rows.length === 0 || rows[0].values.length === 0) return null;
      const [status, mode, reason] = rows[0].values[0];
      return { status: status || null, mode: mode || null, reason: reason || null };
    } catch {
      return null;
    }
  }

  async _updatePlatformLastSync(cwd, changeName) {
    if (!changeName) return;
    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      sqlDb.run(
        'UPDATE changes SET platform_last_sync = ?, platform_sync_enabled = 1 WHERE name = ?',
        [new Date().toISOString(), changeName]
      );
    });
  }

  async _updateApprovalStatus(cwd, changeName, status, reason = null) {
    if (!changeName || !status) return;
    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const rows = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [changeName]);
      if (!rows || rows.length === 0 || rows[0].values.length === 0) return;
      const changeId = rows[0].values[0][0];
      const now = new Date().toISOString();
      sqlDb.run(
        `INSERT INTO approvals (change_id, status, requested_at, approved_at, rejection_reason)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(change_id) DO UPDATE SET
           status = excluded.status,
           approved_at = excluded.approved_at,
           rejection_reason = excluded.rejection_reason`,
        [
          changeId,
          status,
          now,
          status === 'approved' ? now : null,
          status === 'rejected' ? reason : null,
        ]
      );
    });
  }

  /**
   * 重命名变更：同步更新 DB + 目录
   * @param {string} cwd - 项目根目录
   * @param {string} oldName - 旧变更名
   * @param {string} newName - 新变更名
   */
  async renameChange(cwd, oldName, newName) {
    if (!oldName || !newName) {
      console.warn('⚠️  renameChange: 旧名或新名为空，跳过');
      return;
    }
    if (oldName === newName) {
      console.warn('⚠️  renameChange: 新旧名称相同，跳过');
      return;
    }
    const db = await this._ensureDB(cwd);
    // 检查旧名是否存在
    const existing = db.transaction((sqlDb) => {
      const row = sqlDb.exec(`SELECT name, status FROM changes WHERE name = ?`, [oldName]);
      if (!row || !row[0] || row[0].values.length === 0) return null;
      return { name: row[0].values[0][0], status: row[0].values[0][1] };
    });
    if (!existing) {
      console.error(`❌ 变更 ${oldName} 不存在`);
      return;
    }
    // 检查新名是否已存在
    const conflict = db.transaction((sqlDb) => {
      const row = sqlDb.exec(`SELECT name FROM changes WHERE name = ?`, [newName]);
      return row && row[0] && row[0].values.length > 0;
    });
    if (conflict) {
      console.error(`❌ 变更 ${newName} 已存在`);
      return;
    }
    // 重命名目录
    const oldDir = this._changePath(cwd, oldName);
    const newDir = this._changePath(cwd, newName);
    if (existsSync(oldDir)) {
      renameSync(oldDir, newDir);
    } else {
      mkdirSync(newDir, { recursive: true });
    }
    // 更新 DB
    const now = new Date().toISOString();
    db.transaction((sqlDb) => {
      sqlDb.run(`UPDATE changes SET name = ?, last_active = ? WHERE name = ?`, [newName, now, oldName]);
    });
    console.log(`✅ 变更已重命名：${oldName} → ${newName}`);
  }

  /**
   * 从活跃列表移除变更（归档时调用，不物理删除）
   * SQL: UPDATE changes SET status = 'archived'
   */
  async unregisterChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  unregisterChange: changeName 为空，跳过');
      return;
    }
    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const now = new Date().toISOString();
      sqlDb.run(
        `UPDATE changes SET status = 'archived', last_active = ? WHERE name = ?`,
        [now, changeName]
      );
    });
  }

  // ── CLI 命令 ──

  async init(cwd) {
    this._ensureRuntimeDir(cwd);

    // 初始化 DB（如不存在则创建文件 + 建表）
    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const now = new Date().toISOString();
      const projectName = basename(cwd) || 'project';

      // 检查 project id=1 是否已存在
      const existing = sqlDb.exec('SELECT id FROM project WHERE id = 1');
      if (!existing || existing.length === 0 || existing[0].values.length === 0) {
        sqlDb.run(
          `INSERT INTO project (id, name, schema_version, created_at, updated_at)
           VALUES (1, ?, ?, ?, ?)`,
          [projectName, CURRENT_VERSION, now, now]
        );
        console.log(`✅ 已创建全局状态文件（SQLite）`);
      } else {
        console.log(`ℹ️  全局状态文件已存在，跳过`);
      }
    });

    // 创建 user-inputs.md
    const inputsPath = this._runtimePath(cwd, 'user-inputs.md');
    if (!existsSync(inputsPath)) {
      writeFileSync(inputsPath, '# 用户输入记录\n\n> 每步完成时由 AI 自动追加，记录用户所有原话。\n\n');
    }

    this._ensureGitignore(cwd);
    return await this.readGlobal(cwd);
  }

  /**
   * 初始化指定变更的 progress
   * SQL: INSERT changes + 批量 INSERT stages
   */
  async initChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  initChange: changeName 为空，跳过');
      return null;
    }
    this._ensureChangeDir(cwd, changeName);

    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const now = new Date().toISOString();

      // 检查变更是否已存在
      const existing = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [changeName]);
      if (!existing || existing.length === 0 || existing[0].values.length === 0) {
        // 插入 changes 行
        sqlDb.run(
          `INSERT INTO changes (name, current_stage, status, created_at, last_active)
           VALUES (?, 'scan', 'active', ?, ?)`,
          [changeName, now, now]
        );
      }

      // 获取 change_id
      const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [changeName]);
      const changeId = changeRow[0].values[0][0];

      // 批量插入 9 个阶段（INSERT OR IGNORE 跳过已存在的）
      const allStages = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive', 'quick', 'explore'];
      for (const stage of allStages) {
        sqlDb.run(
          `INSERT OR IGNORE INTO stages (change_id, stage, status)
           VALUES (?, ?, 'pending')`,
          [changeId, stage]
        );
      }
    });

    // 不再需要写文件：read() 已改为 SQL
    return await this.read(cwd, changeName);
  }

  async setStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return;
    }

    const db = await this._ensureDB(cwd);
    const now = new Date().toISOString();

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.listChanges(cwd);
      if (changes.length === 1) cn = changes[0];
      if (!cn) { console.log('❌ 无法确定当前变更，请指定 --change <name>'); return; }
    }

    db.transaction((sqlDb) => {
      // 确保 change 存在
      const changeRow = sqlDb.exec('SELECT id, current_stage FROM changes WHERE name = ?', [cn]);
      if (!changeRow || changeRow.length === 0 || changeRow[0].values.length === 0) return;

      const changeId = changeRow[0].values[0][0];

      // UPDATE changes.current_stage + last_active
      sqlDb.run('UPDATE changes SET current_stage = ?, last_active = ? WHERE name = ?', [stage, now, cn]);

      // 确保 stages 行存在（INSERT OR IGNORE）
      sqlDb.run(
        'INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, "pending")',
        [changeId, stage]
      );

      // UPDATE stages.status 为 in-progress（仅当仍为 pending 时）
      sqlDb.run(
        "UPDATE stages SET status = 'in-progress', started_at = ? WHERE change_id = ? AND stage = ? AND status = 'pending'",
        [now, changeId, stage]
      );
    });

    // read() 已改为 SQL，直接通过 SQL 查询即可，无需 _write
    console.log(`✅ 当前阶段已设为: ${STAGE_LABELS[stage] || stage}`);
  }

  async addStep(cwd, stage, stepName, changeName = null) {
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }

    const db = await this._ensureDB(cwd);

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.listChanges(cwd);
      if (changes.length === 1) cn = changes[0];
      if (!cn) { console.log('❌ 无法确定当前变更，请指定 --change <name>'); return; }
    }

    // 查找 stage_id
    const sqlDb = db.getDb();
    const stageRow = sqlDb.exec(
      'SELECT s.id FROM stages s JOIN changes c ON s.change_id = c.id WHERE c.name = ? AND s.stage = ?',
      [cn, stage]
    );
    if (!stageRow || stageRow.length === 0 || stageRow[0].values.length === 0) {
      // stages 行不存在，静默跳过
      console.log(`ℹ️  阶段 ${stage} 不存在`);
      return;
    }
    const stageId = stageRow[0].values[0][0];

    // 重复步骤名检查
    const dupRow = sqlDb.exec('SELECT id FROM steps WHERE stage_id = ? AND name = ?', [stageId, stepName]);
    if (dupRow && dupRow.length > 0 && dupRow[0].values.length > 0) {
      console.log(`ℹ️  步骤 "${stepName}" 已存在于 ${stage}`);
      return;
    }

    // INSERT INTO steps（ordering 递增）
    db.transaction((tDb) => {
      tDb.run(
        `INSERT INTO steps (stage_id, name, ordering, status)
         VALUES (?, ?, (SELECT COALESCE(MAX(ordering), 0) + 1 FROM steps WHERE stage_id = ?), 'pending')`,
        [stageId, stepName, stageId]
      );
      tDb.run('UPDATE changes SET last_active = ? WHERE name = ?', [new Date().toISOString(), cn]);
    });

    console.log(`✅ 已添加步骤: ${stage}/${stepName}`);
  }

  async updateStep(cwd, stage, stepName, options = {}, changeName = null) {
    const { status, output } = options;
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }

    const db = await this._ensureDB(cwd);

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.listChanges(cwd);
      if (changes.length === 1) cn = changes[0];
      if (!cn) { console.log('❌ 无法确定当前变更，请指定 --change <name>'); return; }
    }

    // 状态校验
    if (status && !VALID_STATUSES.includes(status)) {
      console.log(`❌ 无效状态: ${status}，可选: ${VALID_STATUSES.join(', ')}`);
      return;
    }

    // 查找 step_id：通过 changes → stages → steps JOIN 查询
    const sqlDb = db.getDb();
    const stepRow = sqlDb.exec(
      `SELECT st.id, st.status FROM steps st
       JOIN stages sg ON st.stage_id = sg.id
       JOIN changes c ON sg.change_id = c.id
       WHERE c.name = ? AND sg.stage = ? AND st.name = ?`,
      [cn, stage, stepName]
    );
    if (!stepRow || stepRow.length === 0 || stepRow[0].values.length === 0) {
      console.log(`❌ 步骤不存在: ${stage}/${stepName}`);
      return;
    }
    const stepId = stepRow[0].values[0][0];

    // UPDATE steps
    db.transaction((tDb) => {
      const now = new Date().toISOString();
      if (status) {
        tDb.run('UPDATE steps SET status = ?, completed_at = ? WHERE id = ? AND name = ?', [status, now, stepId, stepName]);
      }
      if (output !== undefined) {
        tDb.run('UPDATE steps SET output = ? WHERE id = ? AND name = ?', [output, stepId, stepName]);
      }

      // 自动完成检测：同 stage_id 下所有 steps 都 completed 时，标记 stage completed
      if (status === 'completed') {
        // 获取 stage_id
        const stRow = tDb.exec('SELECT stage_id FROM steps WHERE id = ?', [stepId]);
        if (stRow && stRow.length > 0 && stRow[0].values.length > 0) {
          const stId = stRow[0].values[0][0];
          const pendingRows = tDb.exec('SELECT COUNT(*) FROM steps WHERE stage_id = ? AND status != "completed"', [stId]);
          if (pendingRows && pendingRows.length > 0 && pendingRows[0].values[0][0] === 0) {
            tDb.run('UPDATE stages SET status = "completed", completed_at = ? WHERE id = ?', [now, stId]);
            console.log(`✅ 阶段 ${stage} 所有步骤已完成，阶段已标记为 completed`);
          }
        }
      }

      tDb.run('UPDATE changes SET last_active = ? WHERE name = ?', [now, cn]);
    });

    console.log(`✅ 步骤已更新: ${stage}/${stepName} → ${status || '（仅更新 output）'}`);
  }

  async completeStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}`);
      return;
    }

    const db = await this._ensureDB(cwd);
    const now = new Date().toISOString();

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.listChanges(cwd);
      if (changes.length === 1) cn = changes[0];
      if (!cn) { console.log('❌ 无法确定当前变更，请指定 --change <name>'); return; }
    }

    db.transaction((sqlDb) => {
      const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [cn]);
      if (!changeRow || changeRow.length === 0 || changeRow[0].values.length === 0) return;
      const changeId = changeRow[0].values[0][0];

      // 确保 stages 行存在（阶段不存在时自动创建）
      sqlDb.run(
        'INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, "pending")',
        [changeId, stage]
      );

      // UPDATE stages.status=completed + completed_at
      sqlDb.run(
        'UPDATE stages SET status = "completed", completed_at = ? WHERE change_id = ? AND stage = ?',
        [now, changeId, stage]
      );

      // 将该阶段所有 pending 步骤标记为 completed
      const stageRow = sqlDb.exec('SELECT id FROM stages WHERE change_id = ? AND stage = ?', [changeId, stage]);
      if (stageRow && stageRow.length > 0 && stageRow[0].values.length > 0) {
        const stageId = stageRow[0].values[0][0];
        sqlDb.run(
          'UPDATE steps SET status = "completed", completed_at = ? WHERE stage_id = ? AND status = "pending"',
          [now, stageId]
        );
      }

      // UPDATE changes.last_active
      sqlDb.run('UPDATE changes SET last_active = ? WHERE name = ?', [now, cn]);
    });

    // 写 history 文件（保持文件系统，不变）
    const data = await this.read(cwd, cn);
    if (data && data.stages && data.stages[stage]) {
      const historyDir = this._runtimePath(cwd, 'history');
      mkdirSync(historyDir, { recursive: true });
      const ts = now.replace(/[:.TZ-]/g, '');
      const stageData = data.stages[stage];
      writeFileSync(
        join(historyDir, `${cn}-${stage}-${ts}.json`),
        JSON.stringify({ change: cn, stage, data: stageData, completedAt: now }, null, 2) + '\n'
      );
    }

    console.log(`✅ 阶段 ${stage} 已标记为完成（不自动推进，下一步由你决定）`);
  }

  async show(cwd, changeName = null) {
    // 如果指定了变更名，只显示该变更
    if (changeName) {
      return await this._showChange(cwd, changeName);
    }

    // 否则显示所有变更
    const changes = await this.listChanges(cwd);
    if (changes.length === 0) {
      console.log('ℹ️  没有活跃的变更');
      return;
    }

    if (changes.length === 1) {
      return await this._showChange(cwd, changes[0]);
    }

    // 多个变更：汇总显示
    const global = await this.readGlobal(cwd);
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  项目: ${(global?.project) || basename(cwd) || '(未命名)'}`);
    console.log(`  活跃变更: ${changes.length} 个`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    for (const cn of changes) {
      const data = await this.read(cwd, cn);
      if (!data) {
        console.log(`  📂 ${cn} — (无法读取)`);
        continue;
      }
      const currentStage = data.currentStage || '(无)';
      const stageLabel = STAGE_LABELS[data.currentStage] || currentStage;
      const lastActive = data.lastActive ? this._timeAgo(data.lastActive) : '未知';

      console.log(`  📂 ${cn}`);
      console.log(`     当前阶段: ${stageLabel}  最近活跃: ${lastActive}`);
      console.log('');
    }

    console.log(`  💡 查看详情：sillyspec progress show --change <name>`);
    console.log('');
  }

  async _showChange(cwd, changeName) {
    const data = await this.read(cwd, changeName);
    if (!data) {
      console.log(`❌ 未找到变更 ${changeName}`);
      return;
    }

    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  变更:     ${changeName}`);
    console.log(`  项目:     ${data.project || '(未命名)'}`);
    console.log(`  当前阶段: ${STAGE_LABELS[data.currentStage] || data.currentStage || '(无)'}`);
    console.log(`  最近活跃: ${data.lastActive ? this._timeAgo(data.lastActive) : '未知'}`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    const statusIcons = { pending: '⬜', 'in-progress': '🔵', completed: '✅', failed: '❌', blocked: '🚫', waiting: '⏸️', revising: '🔧', stale: '⚠️' };

    for (const stage of VALID_STAGES) {
      const stageData = data.stages[stage] || emptyStage();
      const label = STAGE_LABELS[stage] || stage;
      const icon = statusIcons[stageData.status] || '⬜';
      const isCurrent = data.currentStage === stage ? ' ◀' : '';

      console.log(`  ${icon} ${label}${isCurrent}`);

      // Show revision info
      if (stageData.revision && stageData.revision > 0) {
        console.log(`    📋 revision: ${stageData.revision}${stageData.reopenedFromStep ? `, from step: ${stageData.reopenedFromStep}` : ''}`);
      }
      if (stageData.staleReason) {
        console.log(`    ⚠️ stale: ${stageData.staleReason}`);
        if (stage === 'archive') {
          console.log(`    📁 已有归档文件仍保留在磁盘上，但不再可信。`);
        }
      }

      if (stageData.steps && stageData.steps.length > 0) {
        for (const step of stageData.steps) {
          const si = statusIcons[step.status] || '○';
          const out = step.output ? ` — ${step.output.slice(0, 60)}` : '';
          const waitingTag = step.status === 'waiting' ? ' [WAITING]' : ''
          console.log(`    ${si} ${step.name}${out}${waitingTag}`);
          if (step.status === 'waiting') {
            if (step.waitReason) console.log(`       原因：${step.waitReason}`);
            if (step.waitOptions) console.log(`       选项：${(() => { try { const p = JSON.parse(step.waitOptions); return Array.isArray(p) ? p.join(', ') : step.waitOptions; } catch { return step.waitOptions; }})()}`);
            if (step.waitedAt) console.log(`       等待时间：${step.waitedAt}`);
          }
        }
      }

      if (stageData.startedAt) {
        console.log(`    开始: ${new Date(stageData.startedAt).toLocaleString('zh-CN')}`);
      }
      if (stageData.completedAt) {
        console.log(`    完成: ${new Date(stageData.completedAt).toLocaleString('zh-CN')}`);
      }
    }

    // 批量进度
    if (data.batchProgress) {
      const batchLine = this._renderBatchProgress(data.batchProgress);
      if (batchLine) {
        console.log('');
        console.log(`  ${batchLine}`);
      }
    }

    // ── Next 建议 ──
    const suggestion = this._getNextSuggestion(data);
    if (suggestion) {
      console.log('');
      console.log(`  💡 ${suggestion.text}`);
      if (suggestion.command) console.log(`     ${suggestion.command}`);
    }

    console.log('');
  }

  /**
   * 根据当前状态给出下一步建议
   * @param {object} data - progress data
   * @returns {{ text: string, command?: string }|null}
   */
  _getNextSuggestion(data) {
    // 找到第一个 revising 阶段
    const revisingStage = STAGE_ORDER.find(s => data.stages[s]?.status === 'revising');
    if (revisingStage) {
      const sd = data.stages[revisingStage];
      return {
        text: `${STAGE_LABELS[revisingStage] || revisingStage} 正在修订中（revision ${sd.revision || 1}），请继续完成修订。`,
        command: `sillyspec run ${revisingStage}`,
      };
    }

    // 找到第一个 stale 阶段（上游已修，下游需要重建）
    const staleStage = STAGE_ORDER.find(s => data.stages[s]?.status === 'stale');
    if (staleStage) {
      const sd = data.stages[staleStage];
      return {
        text: `${STAGE_LABELS[staleStage] || staleStage} 已失效（${sd.staleReason || '上游修订'}），需要从第一步重建。`,
        command: `sillyspec run ${staleStage} --reopen --from-step 1`,
      };
    }

    // 找到第一个有 pending/waiting/failed 步骤的 in-progress 阶段
    for (const s of STAGE_ORDER) {
      const sd = data.stages[s];
      if (!sd) continue;
      if (sd.status === 'in-progress' && sd.steps) {
        const hasPending = sd.steps.some(st => ['pending', 'waiting', 'failed'].includes(st.status));
        if (hasPending) {
          return {
            text: `${STAGE_LABELS[s] || s} 进行中，继续执行下一步。`,
            command: `sillyspec run ${s}`,
          };
        }
      }
    }

    // 找到第一个 pending 主流程阶段
    for (const s of STAGE_ORDER) {
      const sd = data.stages[s];
      if (sd && sd.status === 'pending' && sd.steps && sd.steps.length > 0) {
        // 检查上游是否都 completed
        const idx = STAGE_ORDER.indexOf(s);
        const upstream = STAGE_ORDER.slice(0, idx);
        const upstreamOk = upstream.every(us =>
          data.stages[us]?.status === 'completed' || !data.stages[us] || data.stages[us].status === 'pending'
        );
        if (upstreamOk) {
          return {
            text: `可以开始 ${STAGE_LABELS[s] || s}。`,
            command: `sillyspec run ${s}`,
          };
        }
      }
    }

    return null;
  }

  async status(cwd, changeName = null) {
    await this.show(cwd, changeName);
  }

  /**
   * Revision v1 状态一致性检查
   * 只报告，不自动修复。
   * @param {string} cwd
   * @param {string|null} changeName
   * @returns {{ ok: boolean, issues: string[], warnings: string[] }}
   */
  async checkConsistency(cwd, changeName = null) {
    const data = await this.read(cwd, changeName);
    if (!data) {
      return { ok: false, issues: ['无法读取进度数据'], warnings: [] };
    }

    const issues = [];
    const warnings = [];

    for (const stageName of STAGE_ORDER) {
      const sd = data.stages[stageName];
      if (!sd) continue;

      // a. completed stage 不能有 pending/stale steps
      if (sd.status === 'completed' && sd.steps) {
        const badSteps = sd.steps.filter(s => ['pending', 'stale', 'in-progress'].includes(s.status));
        for (const step of badSteps) {
          issues.push(`${stageName}/${step.name}: step 状态为 ${step.status}，但 stage 状态为 completed`);
        }
      }

      // b. revising stage 应有 revision > 0 或 reopenedFromStep
      if (sd.status === 'revising') {
        if (!sd.revision || sd.revision < 1) {
          issues.push(`${stageName}: 状态为 revising 但 revision 缺失或为 0`);
        }
        if (!sd.reopenedFromStep) {
          warnings.push(`${stageName}: 状态为 revising 但未记录 reopenedFromStep`);
        }
      }

      // c. stale stage 应有 staleReason
      if (sd.status === 'stale') {
        if (!sd.staleReason) {
          warnings.push(`${stageName}: 状态为 stale 但缺少 staleReason`);
        }
      }

      // d. 下游 completed 不能出现在上游 stale/revising 之后
      const stageIdx = STAGE_ORDER.indexOf(stageName);
      for (let i = 0; i < stageIdx; i++) {
        const upstream = STAGE_ORDER[i];
        const upData = data.stages[upstream];
        if (upData && (upData.status === 'stale' || upData.status === 'revising')) {
          if (sd.status === 'completed') {
            issues.push(`${stageName}: 状态为 completed，但上游 ${upstream} 状态为 ${upData.status}（下游不应在上游修订/失效时保持 completed）`);
          }
        }
      }

      // e. step stale 时 stage 不应是 completed
      if (sd.status === 'completed' && sd.steps) {
        const staleSteps = sd.steps.filter(s => s.status === 'stale');
        for (const step of staleSteps) {
          issues.push(`${stageName}/${step.name}: step 状态为 stale，但 stage 状态为 completed`);
        }
      }
    }

    // 输出报告
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log('  状态一致性检查');
    console.log('  ═══════════════════════════════════════');

    if (issues.length === 0 && warnings.length === 0) {
      console.log('  ✅ 未发现一致性问题');
    } else {
      if (issues.length > 0) {
        console.log(`\n  ❌ 问题 (${issues.length}):`);
        for (const issue of issues) console.log(`     - ${issue}`);
      }
      if (warnings.length > 0) {
        console.log(`\n  ⚠️ 警告 (${warnings.length}):`);
        for (const w of warnings) console.log(`     - ${w}`);
      }
    }
    console.log('');

    return { ok: issues.length === 0, issues, warnings };
  }

  /**
   * Revision v1.2 状态修复
   * 默认 dry-run，--apply 才真正修改 DB。
   * 只修安全项，不碰产物文件、不 reset/reopen stage。
   *
   * @param {string} cwd
   * @param {object} opts
   * @param {boolean} [opts.apply=false]
   * @param {string|null} [opts.changeName]
   * @returns {{ fixable: object[], manual: string[], applied: object[] }}
   */
  async repairConsistency(cwd, opts = {}) {
    const { apply = false, changeName = null } = opts;

    const data = await this.read(cwd, changeName);
    if (!data) {
      console.log('❌ 无法读取进度数据');
      return { fixable: [], manual: ['无法读取进度数据'], applied: [] };
    }

    const fixable = []; // { stage, action, description, apply: (data) => void }
    const manual = [];  // string

    const now = new Date().toLocaleString('zh-CN', { hour12: false });

    for (const stageName of STAGE_ORDER) {
      const sd = data.stages[stageName];
      if (!sd) continue;

      // Fix a: stale stage 缺 staleReason → 补默认原因
      if (sd.status === 'stale' && !sd.staleReason) {
        const reason = stageName === 'archive'
          ? 'upstream stage revised; existing archive artifacts are preserved but no longer trusted'
          : 'unknown upstream revision';
        fixable.push({
          stage: stageName,
          action: 'set_stale_reason',
          description: `${stageName}: stale 缺 staleReason → 补 "${reason}"`,
          apply: (d) => { d.stages[stageName].staleReason = reason; },
        });
      }

      // Fix b: 上游 stale/revising，下游仍 completed → cascade stale
      const stageIdx = STAGE_ORDER.indexOf(stageName);
      for (let i = 0; i < stageIdx; i++) {
        const upstream = STAGE_ORDER[i];
        const upData = data.stages[upstream];
        if (upData && (upData.status === 'stale' || upData.status === 'revising')) {
          if (sd.status === 'completed') {
            const upStatus = upData.status;
            const reason = `upstream ${upstream} is ${upStatus}`;
            fixable.push({
              stage: stageName,
              action: 'cascade_stale',
              description: `${stageName}: completed → stale（上游 ${upstream} 为 ${upStatus}）`,
              apply: (d) => {
                d.stages[stageName].status = 'stale';
                d.stages[stageName].staleReason = reason;
                d.stages[stageName].completedAt = null;
              },
            });
          }
        }
      }

      // Fix c: archive stale 缺 staleReason（专用文案）
      if (stageName === 'archive' && sd.status === 'stale' && !sd.staleReason) {
        // 已在 Fix a 中处理，这里不重复
      }

      // Fix d: revising stage 缺 reopenedAt → 补当前时间
      if (sd.status === 'revising' && !sd.reopenedAt) {
        fixable.push({
          stage: stageName,
          action: 'set_reopened_at',
          description: `${stageName}: revising 缺 reopenedAt → 补当前时间`,
          apply: (d) => { d.stages[stageName].reopenedAt = now; },
        });
      }

      // Manual a: completed stage 里有 pending/stale/in-progress steps
      if (sd.status === 'completed' && sd.steps) {
        const badSteps = sd.steps.filter(s => ['pending', 'stale', 'in-progress'].includes(s.status));
        for (const step of badSteps) {
          manual.push(`${stageName}/${step.name}: step 状态为 ${step.status}，但 stage 状态为 completed（需手动确认）`);
        }
      }

      // Manual b: revising stage 缺 reopenedFromStep
      if (sd.status === 'revising' && !sd.reopenedFromStep) {
        manual.push(`${stageName}: revising 缺 reopenedFromStep（需手动确认修订起始步骤）`);
      }

      // Manual c: steps 为空但 stage completed
      if (sd.status === 'completed' && (!sd.steps || sd.steps.length === 0)) {
        manual.push(`${stageName}: completed 但 steps 为空（需手动确认）`);
      }
    }

    // 输出报告
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  状态修复 ${apply ? '（--apply 模式）' : '（dry-run 模式）'}`);
    console.log('  ═══════════════════════════════════════');

    if (fixable.length === 0 && manual.length === 0) {
      console.log('  ✅ 未发现问题，无需修复');
      console.log('');
      return { fixable: [], manual: [], applied: [] };
    }

    const applied = [];

    if (fixable.length > 0) {
      console.log(`\n  🔧 可自动修复 (${fixable.length}):`);
      for (const item of fixable) {
        console.log(`     - ${item.description}`);
        if (apply) {
          item.apply(data);
          applied.push({ stage: item.stage, action: item.action });
        }
      }
      if (!apply) {
        console.log('\n  💡 使用 --apply 执行修复');
      }
    }

    if (manual.length > 0) {
      console.log(`\n  👆 需手动处理 (${manual.length}):`);
      for (const m of manual) console.log(`     - ${m}`);
    }

    if (apply && applied.length > 0) {
      data.lastActive = now;
      await this._write(cwd, data, changeName);
      console.log(`\n  ✅ 已修复 ${applied.length} 项`);
    }

    console.log('');

    return { fixable, manual, applied };
  }

  async validate(cwd, changeName = null) {
    const data = await this.read(cwd, changeName);
    if (!data) { console.log('❌ 无法读取进度数据'); return false; }

    const errors = [];
    if (!data._version || !Number.isInteger(data._version) || data._version < 1) {
      errors.push(`_version 缺失或无效（期望正整数，实际为 ${JSON.stringify(data._version)}）`);
    }
    if (!data.stages || typeof data.stages !== 'object') errors.push('缺少 stages');
    if (!VALID_STAGES.every(s => data.stages[s])) errors.push('缺少阶段定义');

    if (errors.length === 0) { console.log('✅ 进度数据格式正确'); return true; }

    console.log(`⚠️  发现问题，尝试修复...`);
    let fixed = { ...data, stages: { ...data.stages } };
    let changed = false;
    if (!fixed.project) {
      fixed.project = basename(cwd);
      changed = true;
    }
    if (!fixed._version || !Number.isInteger(fixed._version) || fixed._version < 1) {
      fixed._version = CURRENT_VERSION;
      changed = true;
    }
    for (const s of VALID_STAGES) {
      if (!fixed.stages[s]) { fixed.stages[s] = emptyStage(); changed = true; }
    }
    if (changed) {
      await this._write(cwd, fixed);
      console.log('✅ 已修复');
    }

    return true;
  }

  /**
   * 重新打开已完成的阶段进入修订模式
   * - 不带 fromStep：只允许存在 pending/stale/waiting/failed 步骤时继续
   * - 带 fromStep：从该步骤起，当前及后续步骤标记 stale/pending
   * - 自动级联标记下游阶段为 stale
   *
   * @param {string} cwd
   * @param {string} stage - 要重开的阶段
   * @param {object} opts
   * @param {string|number} [opts.fromStep] - 步骤名或序号（1-based）
   * @param {string} [opts.changeName]
   * @returns {{ ok: boolean, error?: string }}
   */
  async reopenStage(cwd, stage, opts = {}) {
    const { fromStep, changeName = null } = opts;

    const data = await this.read(cwd, changeName);
    if (!data) return { ok: false, error: '无法读取进度数据' };

    const stageData = data.stages[stage];
    if (!stageData) return { ok: false, error: `未知阶段: ${stage}` };

    const steps = stageData.steps || [];

    // 确定 fromStep 对应的 index
    let fromIdx = null;
    if (fromStep != null) {
      if (typeof fromStep === 'number' || /^\d+$/.test(String(fromStep))) {
        fromIdx = parseInt(String(fromStep), 10) - 1; // 1-based → 0-based
        if (fromIdx < 0 || fromIdx >= steps.length) {
          return { ok: false, error: `步骤序号超出范围: ${fromStep}（共 ${steps.length} 步）` };
        }
      } else {
        // 按名称匹配
        fromIdx = steps.findIndex(s => s.name === fromStep);
        if (fromIdx === -1) {
          return { ok: false, error: `步骤不存在: ${fromStep}` };
        }
      }
    }

    // 如果不带 fromStep，检查是否存在中断步骤
    if (fromIdx === null) {
      const hasInterrupted = steps.some(s =>
        ['pending', 'stale', 'waiting', 'failed'].includes(s.status)
      );
      if (!hasInterrupted) {
        return { ok: false, error: `阶段 ${stage} 所有步骤均已完成，请使用 --from-step 指定从哪一步开始修订` };
      }
      // 找到第一个中断步骤
      fromIdx = steps.findIndex(s =>
        ['pending', 'stale', 'waiting', 'failed'].includes(s.status)
      );
    }

    // 执行重开操作
    const newRevision = (stageData.revision || 0) + 1;
    const fromStepName = steps[fromIdx].name;
    const now = new Date().toLocaleString('zh-CN', { hour12: false });

    // 更新步骤状态：fromStep 之前的保持 completed，fromStep 变 pending，之后的变 stale
    for (let i = 0; i < steps.length; i++) {
      if (i === fromIdx) {
        steps[i].status = 'pending';
        steps[i].completedAt = null;
        steps[i].output = null;
      } else if (i > fromIdx) {
        steps[i].status = 'stale';
        steps[i].completedAt = null;
      }
      // i < fromIdx: 保持原状（completed）
    }

    stageData.status = 'revising';
    stageData.completedAt = null;
    stageData.revision = newRevision;
    stageData.reopenedFromStep = `${fromIdx + 1}: ${fromStepName}`; // 存 "index: name" 格式
    stageData.reopenedAt = now;
    stageData.steps = steps;

    data.lastActive = now;
    data.currentStage = stage;

    await this._write(cwd, data, changeName);

    // 级联标记下游阶段为 stale
    const downstreamStages = this._getDownstreamStages(stage);
    if (downstreamStages.length > 0) {
      const data2 = await this.read(cwd, changeName); // 重新读取以获取最新状态
      if (data2) {
        for (const ds of downstreamStages) {
          if (data2.stages[ds] && data2.stages[ds].status === 'completed') {
            data2.stages[ds].status = 'stale';
            data2.stages[ds].staleReason = `上游阶段 ${stage} 已修订 (revision ${newRevision})`;
            data2.stages[ds].completedAt = null;
          }
        }
        await this._write(cwd, data2, changeName);
      }
    }

    return { ok: true, revision: newRevision, fromStep: fromStepName };
  }

  /**
   * 获取指定阶段的下游主流程阶段列表
   * @param {string} stage
   * @returns {string[]}
   */
  _getDownstreamStages(stage) {
    const idx = MAIN_FLOW_ORDER.indexOf(stage);
    if (idx === -1) return [];
    return MAIN_FLOW_ORDER.slice(idx + 1);
  }

  async reset(cwd, stage, changeName = null) {
    if (stage) {
      const data = await this.read(cwd, changeName);
      if (!data) { console.log('❌ 无法读取进度数据'); return; }
      if (!data.stages[stage]) { console.log(`❌ 未知阶段: ${stage}`); return; }
      data.stages[stage] = emptyStage();
      data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
      await this._write(cwd, data);
      console.log(`✅ 已重置阶段: ${stage}`);
    } else {
      // 重置所有变更或指定变更
      if (changeName) {
        // SQL: 删除该变更的所有 stages 和 steps 数据
        const db = await this._ensureDB(cwd);
        db.transaction((sqlDb) => {
          const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [changeName]);
          if (changeRow && changeRow.length > 0 && changeRow[0].values.length > 0) {
            const changeId = changeRow[0].values[0][0];
            sqlDb.run('DELETE FROM steps WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?)', [changeId]);
            sqlDb.run('DELETE FROM stages WHERE change_id = ?', [changeId]);
            sqlDb.run('UPDATE stages SET status = "pending", started_at = NULL, completed_at = NULL WHERE change_id = ?', [changeId]);
            // 重新插入所有阶段
            for (const s of VALID_STAGES) {
              sqlDb.run('INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, "pending")', [changeId, s]);
            }
          }
        });
        console.log(`✅ 已重置变更 ${changeName} 的进度`);
      } else {
        const changes = await this.listChanges(cwd);
        const db = await this._ensureDB(cwd);
        db.transaction((sqlDb) => {
          for (const cn of changes) {
            const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [cn]);
            if (changeRow && changeRow.length > 0 && changeRow[0].values.length > 0) {
              const changeId = changeRow[0].values[0][0];
              sqlDb.run('DELETE FROM steps WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?)', [changeId]);
              sqlDb.run('UPDATE stages SET status = "pending", started_at = NULL, completed_at = NULL WHERE change_id = ?', [changeId]);
            }
          }
        });
        console.log('✅ 已重置所有变更的进度');
      }
    }
  }

  // ── 内部辅助 ──

  async _readOrInit(cwd, changeName = null) {
    let data = await this.read(cwd, changeName);
    if (!data) {
      // 尝试自动检测变更名
      if (!changeName) {
        const changes = await this.listChanges(cwd);
        if (changes.length === 1) changeName = changes[0];
      }
      if (changeName) {
        // 确保变更在 DB 中已初始化
        const db = await this._ensureDB(cwd);
        db.transaction((sqlDb) => {
          const now = new Date().toISOString();
          sqlDb.run(
            'INSERT OR IGNORE INTO changes (name, current_stage, status, created_at, last_active) VALUES (?, "scan", "active", ?, ?)',
            [changeName, now, now]
          );
          const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [changeName]);
          if (changeRow && changeRow.length > 0 && changeRow[0].values.length > 0) {
            const changeId = changeRow[0].values[0][0];
            for (const s of VALID_STAGES) {
              sqlDb.run('INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, "pending")', [changeId, s]);
            }
          }
        });
        await this.registerChange(cwd, changeName);
      }
      if (!data) {
        data = await this.read(cwd, changeName);
      }
      if (!data) {
        console.log('❌ 无法确定当前变更，请指定 --change <name>');
        return null;
      }
    }
    return data;
  }

  async _requireStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return null;
    }
    const data = await this._readOrInit(cwd, changeName);
    if (!data) return null;
    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    return data;
  }

  _timeAgo(dateStr) {
    if (!dateStr) return '未知';
    let ts = Date.parse(dateStr);
    if (isNaN(ts)) {
      const m = dateStr.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (m) ts = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)).getTime();
    }
    if (isNaN(ts)) return dateStr;
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }

  // ── 批量进度 ──

  async updateBatchProgress(cwd, batchData, changeName = null) {
    const cn = changeName || null;

    const db = await this._ensureDB(cwd);
    db.transaction((sqlDb) => {
      // 获取 change_id
      let changeId = null;
      if (cn) {
        const row = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [cn]);
        if (row && row.length > 0 && row[0].values.length > 0) changeId = row[0].values[0][0];
      }
      if (!changeId) {
        // 尝试从唯一活跃变更获取
        const rows = sqlDb.exec("SELECT id FROM changes WHERE status = 'active'");
        if (rows && rows.length > 0 && rows[0].values.length === 1) changeId = rows[0].values[0][0];
      }
      if (!changeId) return;

      sqlDb.run(
        `INSERT INTO batch_progress (change_id, total, completed, failed, skipped)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(change_id) DO UPDATE SET
           total = excluded.total,
           completed = excluded.completed,
           failed = excluded.failed,
           skipped = excluded.skipped`,
        [changeId, batchData.total || 0, batchData.completed || 0, batchData.failed || 0, batchData.skipped || 0]
      );
    });
  }

  async readBatchProgress(cwd, changeName = null) {
    const data = await this.read(cwd, changeName);
    return data?.batchProgress || null;
  }

  _renderBatchProgress(batchProgress) {
    if (!batchProgress || !batchProgress.total) return null;
    const { total, completed = 0, failed = 0, skipped = 0 } = batchProgress;
    const barLen = 20;
    const filled = Math.round((completed / total) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    const parts = [];
    if (failed > 0) parts.push(`${failed} 失败`);
    if (skipped > 0) parts.push(`${skipped} 跳过`);
    const suffix = parts.length ? ` (${parts.join(', ')})` : '';
    return `📊 批量进度: ${bar} ${completed}/${total}${suffix}`;
  }

  /**
   * 更新 gate-status.json，供 worktree-guard hook 读取
   * 从 SQLite 查询所有处于 execute/quick 阶段的活跃变更，生成或删除 gate-status.json
   */
  async _updateGateStatus(cwd) {
    const db = await this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // SQL 查询：所有处于 execute/quick 阶段的活跃变更
    const rows = sqlDb.exec(
      `SELECT name, current_stage, no_worktree FROM changes
       WHERE status = 'active' AND current_stage IN ('execute', 'quick')`
    );

    const gatePath = this._runtimePath(cwd, 'gate-status.json');

    if (!rows || rows.length === 0 || rows[0].values.length === 0) {
      // 无 execute/quick 阶段的活跃变更，删除 gate-status
      if (existsSync(gatePath)) {
        try { unlinkSync(gatePath); } catch {}
      }
      return;
    }

    let gateStage = null;
    let hasNoWorktree = false;
    const activeChanges = [];

    for (const [name, stage, noWorktree] of rows[0].values) {
      if (!stage) continue;
      // 优先取 execute，其次 quick
      if (gateStage !== 'execute' || stage === 'execute') {
        gateStage = stage;
      }
      activeChanges.push(name);
      if (noWorktree === 1) hasNoWorktree = true;
    }

    if (!gateStage) {
      // current_stage 为 NULL 的边界情况，等同于无 execute/quick
      if (existsSync(gatePath)) {
        try { unlinkSync(gatePath); } catch {}
      }
      return;
    }

    try {
      this._ensureRuntimeDir(cwd);
      const gateData = {
        stage: gateStage,
        changes: activeChanges,
        updatedAt: new Date().toISOString(),
        ...(hasNoWorktree ? { noWorktree: true } : {}),
      };
      const tmpPath = gatePath + '.tmp';
      writeFileSync(tmpPath, JSON.stringify(gateData, null, 2) + '\n');
      renameSync(tmpPath, gatePath);
    } catch (err) {
      console.warn('⚠️  写入 gate-status.json 失败:', err.message);
    }
  }

  _ensureGitignore(cwd) {
    // 外部 specDir 不需要修改项目 .gitignore
    if (this._customSpecDir) return;
    const gitignorePath = join(cwd, '.gitignore');
    const rule = '.sillyspec/.runtime/';
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      if (content.includes(rule)) return;
      writeFileSync(gitignorePath, content.trimEnd() + '\n' + rule + '\n');
    } else {
      writeFileSync(gitignorePath, rule + '\n');
    }
  }
}
