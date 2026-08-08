/**
 * SillySpec ProgressManager — 进度恢复管理
 *
 * 纯 Node.js，无外部依赖。支持多变更并行。
 *
 * 存储结构：
 *   .sillyspec/.runtime/sillyspec.db          — SQLite 数据库（权威状态源，含全局状态/项目名/活跃变更）
 *
 * 历史迁移：v1/v2 使用 progress.json 文件，v3 已全部迁移至 SQLite。
 * worktree-guard hook 直读 sillyspec.db，不再有 gate-status.json 缓存双源（task-10 废除）。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, appendFileSync } from 'fs';
import { join, basename, dirname, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { DB } from './db.js';
import { checkExecuteCodeEvidence } from './stage-contract.js';
import { ConsistencyDoctor } from './progress/consistency-doctor.js';
import { ChangeRegistry } from './progress/change-registry.js';
import { StepStore } from './progress/step-store.js';
import { StageMachine } from './progress/stage-machine.js';
import { STAGE_ORDER, MAIN_FLOW_ORDER, VALID_STAGES, STAGE_LABELS, SPEC_DIR_NAME, CURRENT_VERSION, emptyStage } from './progress/shared.js';

// 默认规范目录名（相对于 cwd）
// SPEC_DIR_NAME → ./progress/shared.js（W6 Step9d）
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

/**
 * 平台指针不可达错误。pointer 存在但失效时抛出，阻止静默回退到本地孤儿 db。
 * 逃生口：显式 --spec-dir 绕过 pointer 校验。
 */
export class PointerUnreachableError extends Error {
  constructor({ pointerPath, specRoot, reason, hint }) {
    super(
      `平台指针不可用：${reason}\n` +
      `  pointer: ${pointerPath}\n` +
      `  specRoot: ${specRoot || '(缺失)'}\n` +
      `修复：${hint}`
    );
    this.name = 'PointerUnreachableError';
    this.pointerPath = pointerPath;
    this.specRoot = specRoot || null;
  }
}

/**
 * 平台感知的 specDir 解析（fail-closed，所有 CLI 子命令统一入口）。
 *
 * 优先级：显式 --spec-dir > pointer.specRoot（可达）> resolveSpecDir(cwd)。
 *
 * fail-closed 语义（修复"状态穿越"定时炸弹）：
 *   一旦项目进入过平台模式（pointer 文件存在），pointer 失效（specRoot 不可达 /
 *   损坏 / 缺字段）不再静默回退到本地——否则会读到切平台前的过期本地 db。
 *   此时抛 PointerUnreachableError，由 CLI 顶层捕获并打印修复引导。
 *
 *   无 pointer = 纯本地项目（从未平台 scan），正常走本地解析，不受影响。
 */
export function resolvePlatformSpecDir(cwd, explicitSpecDir = null) {
  if (explicitSpecDir) return resolve(explicitSpecDir);
  const pointerPath = join(resolve(cwd), '.sillyspec-platform.json');
  if (!existsSync(pointerPath)) {
    return resolveSpecDir(cwd);
  }
  // pointer 存在 = 进过平台模式，严格校验，不静默回退
  let ptr;
  try {
    ptr = JSON.parse(readFileSync(pointerPath, 'utf8'));
  } catch (e) {
    throw new PointerUnreachableError({
      pointerPath,
      specRoot: null,
      reason: `pointer 文件损坏（${e.message}）`,
      hint: `sillyspec platform pointer --cleanup 删除后重跑平台 scan`,
    });
  }
  if (!ptr.specRoot) {
    throw new PointerUnreachableError({
      pointerPath,
      specRoot: null,
      reason: 'pointer 缺少 specRoot 字段',
      hint: `sillyspec platform pointer --cleanup 删除后重跑平台 scan`,
    });
  }
  if (!existsSync(ptr.specRoot)) {
    throw new PointerUnreachableError({
      pointerPath,
      specRoot: ptr.specRoot,
      reason: 'pointer.specRoot 路径不存在（daemon 未起？已迁移？）',
      hint: `启动 SillyHub daemon；或 sillyspec doctor --json 诊断；或显式 --spec-dir <本地路径> 临时走本地`,
    });
  }
  // 驾驭：pointer 指向 OS temp 目录几乎肯定是陈旧测试/CI 残留（合法项目不会把 specRoot 放 temp）。
  // 历史：npm test 等会写 pointer 到 Temp/spec-dir-test-*，不清理则污染真实环境，所有命令静默落错库。
  // 非阻断警告：让 agent 知道当前解析到的 specDir 可疑，而非静默写到死库。
  const resolvedTmp = resolve(tmpdir());
  if (resolve(ptr.specRoot) === resolvedTmp || resolve(ptr.specRoot).startsWith(resolvedTmp + sep)) {
    console.warn(
      `⚠️  平台 pointer 的 specRoot 指向系统 temp 目录：${ptr.specRoot}\n` +
      `   这通常是陈旧的测试/CI 残留，命令会写进这个可疑库而非你当前项目。\n` +
      `   修复：sillyspec platform pointer --cleanup（删除 ${pointerPath}），或删除该 pointer 文件后回到项目目录重跑。`
    );
  }
  return ptr.specRoot;
}

const CHANGES_SUBDIR = 'changes';
// CURRENT_VERSION → ./progress/shared.js（W6 Step9d）
// VALID_STAGES → ./progress/shared.js（W6 Step9c）
// VALID_STATUSES → ./progress/step-store.js（updateStep 专用，本地化）

// Stage statuses (superset of step statuses)
const VALID_STAGE_STATUSES = ['pending', 'in-progress', 'completed', 'failed', 'blocked', 'revising', 'stale'];

// STAGE_ORDER / MAIN_FLOW_ORDER → ./progress/shared.js（W6 Step9a：facade + 子模块共用）

// STAGE_LABELS → ./progress/shared.js（W6 Step9c）

// emptyStage → ./progress/shared.js（W6 Step9d）

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
    this._consistency = new ConsistencyDoctor(this);
    this._changeRegistry = new ChangeRegistry(this);
    this._stepStore = new StepStore(this);
    this._stageMachine = new StageMachine(this);
  }

  // ── 路径工具 ──

  /** 获取 specDir（优先自定义，否则向上查找含 .sillyspec 的目录，fallback 到 cwd/.sillyspec） */
  _getSpecDir(cwd) {
    if (this._customSpecDir) return this._customSpecDir;
    // specDir 对给定 cwd 在进程生命周期内不变（.sillyspec 目录不会被移动），
    // 按 cwd 缓存，避免每次路径解析都向上 existsSync 遍历目录树（热路径）。
    if (!this._specDirCache) this._specDirCache = new Map();
    const cached = this._specDirCache.get(cwd);
    if (cached) return cached;
    const resolved = resolveSpecDir(cwd);
    this._specDirCache.set(cwd, resolved);
    return resolved;
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

  /** 懒初始化 DB 连接，缓存在实例上（better-sqlite3 同步 API，init 无 async） */
  _ensureDB(cwd) {
    if (!this._db) {
      this._db = new DB(this._runtimePath(cwd, 'sillyspec.db'));
      this._db.init();
    }
    return this._db;
  }

  _ensureChangeDir(cwd, changeName) {
    const dir = this._changePath(cwd, changeName);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ── 全局状态 ──

  readGlobal(cwd) {
    // SQL: SELECT FROM project + changes
    const db = this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // 读取 project 行（id=1）
    const row = sqlDb.prepare('SELECT name, schema_version FROM project WHERE id = 1').get();
    if (row === undefined) return null;
    const { name, schema_version: schemaVersion } = row;

    // 读取 active 变更列表
    const changeRows = sqlDb.prepare("SELECT name FROM changes WHERE status = 'active' ORDER BY name").all();
    const activeChanges = changeRows.map(r => r.name);

    return {
      _version: schemaVersion,
      project: name,
      activeChanges,
    };
  }

  // ── 变更级别状态 ──

  /**
   * 读取指定变更的 progress（SQL 版）
   * @param {string} cwd
   * @param {string|null} changeName - 变更名，null 时尝试自动检测
   * @returns {object|null} 与 SQLite 查询结果一致的 JS 对象
   */
  read(cwd, changeName = null) {
    // 自动检测变更名（listChanges 已在 task-08 同步化，此处直接拿到活跃变更数组）
    if (!changeName) {
      const changes = this.listChanges(cwd);
      if (changes.length === 1) {
        changeName = changes[0];
      } else {
        // 多个或零个活跃变更，无法确定
        return null;
      }
    }

    const db = this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // 1. 从 changes 表获取基本信息
    const changeRow = sqlDb.prepare('SELECT id, name, current_stage, no_worktree, last_active FROM changes WHERE name = ?').get(changeName);
    if (changeRow === undefined) return null;
    const { id: changeId, name: cName, current_stage: currentStage, no_worktree: noWorktree, last_active: lastActive } = changeRow;

    // 2. 从 stages 表获取所有阶段（含 revision 列）
    const stageRows = sqlDb.prepare('SELECT id, stage, status, started_at, completed_at, revision, reopened_from_step, reopened_at, stale_reason FROM stages WHERE change_id = ? ORDER BY id').all(changeId);
    const stageMap = {};
    const stageIds = [];
    for (const row of stageRows) {
      const { id: sId, stage, status, started_at: startedAt, completed_at: completedAt, revision, reopened_from_step: reopenedFromStep, reopened_at: reopenedAt, stale_reason: staleReason } = row;
      stageMap[stage] = { _dbId: sId, status, startedAt, completedAt,
        ...(revision ? { revision } : {}),
        ...(reopenedFromStep ? { reopenedFromStep } : {}),
        ...(reopenedAt ? { reopenedAt } : {}),
        ...(staleReason ? { staleReason } : {}),
      };
      stageIds.push(sId);
    }

    // 3. 从 steps 表获取所有步骤
    const stepsByStage = {};
    if (stageIds.length > 0) {
      const placeholders = stageIds.map(() => '?').join(',');
      const stepRows = sqlDb.prepare(
        `SELECT stage_id, name, status, output, completed_at, ordering, wait_reason, wait_options, wait_answer, waited_at, wait_answers, wait_round, max_wait_rounds FROM steps WHERE stage_id IN (${placeholders}) ORDER BY stage_id, ordering`
      ).all(...stageIds);
      // 按阶段分组步骤
      for (const row of stepRows) {
        const { stage_id: stageId, name, status, output, completed_at: completedAt, wait_reason: waitReason, wait_options: waitOptions, wait_answer: waitAnswer, waited_at: waitedAt, wait_answers: waitAnswersJson, wait_round: waitRound, max_wait_rounds: maxWaitRounds } = row;
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
    const batchRow = sqlDb.prepare('SELECT total, completed, failed, skipped FROM batch_progress WHERE change_id = ?').get(changeId);
    let batchProgress = undefined;
    if (batchRow !== undefined) {
      const { total, completed, failed, skipped } = batchRow;
      batchProgress = { total, completed, failed, skipped };
    }

    // 5. 获取项目名
    const projectRow = sqlDb.prepare('SELECT name FROM project WHERE id = 1').get();
    const projectName = projectRow !== undefined ? projectRow.name : '';

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
   *
   * 持锁窗口评估（task-05 / R-08）：本方法采用全量 UPSERT——无条件 UPDATE changes 行 +
   * 遍历所有 stages（每 stage UPSERT stages 行 + 每 step 先 DELETE 再 INSERT 全量 + 末尾
   * DELETE data 中不存在的多余 step）。评估过改"只写 diff（仅写变更过的 change/stage/step 行）"
   * 以缩小事务持锁窗口、降低 BUSY 概率，结论：保持现状（全量 UPSERT）。
   * 理由：
   *   1. steps 表无 UNIQUE 约束（见循环内 DELETE-then-INSERT 注释），diff 写需先读现状再逐条
   *      比较，复杂度高易错，易引入孤儿/缺失步骤破坏 FK 级联语义（design §3/§8）；
   *   2. busy_timeout=5000 + DB 层 SQLITE_BUSY 应用层有限重试（见 db.js transaction）已兜底
   *      并发冲突，全量 UPSERT 的持锁窗口在此兜底下不是瓶颈；
   *   3. 单进程内调用串行（design §9），事务窗口短（毫秒级），全量写正确性远高于 diff 的边际收益。
   * 结论：全量 UPSERT 的简单正确性 > 持锁窗口优化的边际收益，不强行改 diff。
   */
  _write(cwd, data, changeName = null) {
    const cn = changeName || data.currentChange;
    if (!cn) {
      console.warn('⚠️  _write: 无变更名，跳过写入');
      return;
    }

    const db = this._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      // 1. 更新 changes 表
      const now = new Date().toISOString();
      const noWorktree = data.noWorktree ? 1 : 0;
      sqlDb.prepare(
        'UPDATE changes SET current_stage = ?, last_active = ?, no_worktree = ? WHERE name = ?'
      ).run(data.currentStage || '', now, noWorktree, cn);

      // 2. 获取 change_id
      const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(cn);
      if (changeRow === undefined) return;
      const changeId = changeRow.id;

      // 3. 遍历 stages，UPSERT stages 表和 steps 表
      if (data.stages && typeof data.stages === 'object') {
        for (const [stageName, stageData] of Object.entries(data.stages)) {
          // UPSERT stages 行（含 revision 列）
          sqlDb.prepare(
            `INSERT INTO stages (change_id, stage, status, started_at, completed_at, revision, reopened_from_step, reopened_at, stale_reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(change_id, stage) DO UPDATE SET
               status = excluded.status,
               started_at = excluded.started_at,
               completed_at = excluded.completed_at,
               revision = COALESCE(excluded.revision, stages.revision),
               reopened_from_step = excluded.reopened_from_step,
               reopened_at = excluded.reopened_at,
               stale_reason = excluded.stale_reason`
          ).run(changeId, stageName, stageData.status || 'pending', stageData.startedAt || null, stageData.completedAt || null,
             stageData.revision || 0, stageData.reopenedFromStep || null, stageData.reopenedAt || null, stageData.staleReason || null);

          // 获取 stage_id
          const stageRow = sqlDb.prepare('SELECT id FROM stages WHERE change_id = ? AND stage = ?').get(changeId, stageName);
          if (stageRow === undefined) continue;
          const stageId = stageRow.id;

          // 收集 data 中的步骤名
          const stepNames = new Set();
          if (Array.isArray(stageData.steps)) {
            for (let i = 0; i < stageData.steps.length; i++) {
              const step = stageData.steps[i];
              stepNames.add(step.name);
              // UPSERT 步骤（先删再插，steps 表无 UNIQUE 约束）
              sqlDb.prepare('DELETE FROM steps WHERE stage_id = ? AND name = ?').run(stageId, step.name);
              sqlDb.prepare(
                'INSERT INTO steps (stage_id, name, status, output, completed_at, ordering, wait_reason, wait_options, wait_answer, waited_at, wait_answers, wait_round, max_wait_rounds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).run(stageId, step.name, step.status || 'pending', step.output || null, step.completedAt || null, i,
                  step.waitReason ?? null, Array.isArray(step.waitOptions) ? JSON.stringify(step.waitOptions) : (step.waitOptions ?? null), step.waitAnswer ?? null, step.waitedAt ?? null,
                  Array.isArray(step.waitAnswers) ? JSON.stringify(step.waitAnswers) : null,
                  step.waitRound ?? null, step.maxWaitRounds ?? null);
            }
          }

          // 删除 data 中不存在的多余步骤
          if (stepNames.size > 0) {
            const namePlaceholders = [...stepNames].map(() => '?').join(',');
            sqlDb.prepare(
              `DELETE FROM steps WHERE stage_id = ? AND name NOT IN (${namePlaceholders})`
            ).run(stageId, ...stepNames);
          } else {
            // data 中没有步骤，清空该阶段所有步骤
            sqlDb.prepare('DELETE FROM steps WHERE stage_id = ?').run(stageId);
          }
        }
      }

      // 4. UPSERT batch_progress
      if (data.batchProgress && typeof data.batchProgress === 'object') {
        sqlDb.prepare(
          `INSERT INTO batch_progress (change_id, total, completed, failed, skipped)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(change_id) DO UPDATE SET
             total = excluded.total,
             completed = excluded.completed,
             failed = excluded.failed,
             skipped = excluded.skipped`
        ).run(changeId, data.batchProgress.total || 0, data.batchProgress.completed || 0, data.batchProgress.failed || 0, data.batchProgress.skipped || 0);
      }
    });
  }

  // ── 变更管理 ──

  listChanges(cwd) { return this._changeRegistry.listChanges(cwd); }

  registerChange(cwd, changeName) { return this._changeRegistry.registerChange(cwd, changeName); }

  updateChangeIsolation(cwd, changeName, isolation) { return this._changeRegistry.updateChangeIsolation(cwd, changeName, isolation); }

  readChangeIsolation(cwd, changeName) { return this._changeRegistry.readChangeIsolation(cwd, changeName); }

  _updatePlatformLastSync(cwd, changeName) { return this._changeRegistry._updatePlatformLastSync(cwd, changeName); }

  _updateApprovalStatus(cwd, changeName, status, reason = null) { return this._changeRegistry._updateApprovalStatus(cwd, changeName, status, reason); }

  renameChange(cwd, oldName, newName) { return this._changeRegistry.renameChange(cwd, oldName, newName); }

  unregisterChange(cwd, changeName) { return this._changeRegistry.unregisterChange(cwd, changeName); }

  // ── CLI 命令 ──

  init(cwd) {
    this._ensureRuntimeDir(cwd);

    // 初始化 DB（如不存在则创建文件 + 建表）
    const db = this._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();
      const projectName = basename(cwd) || 'project';

      // 检查 project id=1 是否已存在
      const existing = sqlDb.prepare('SELECT id FROM project WHERE id = 1').get();
      if (existing === undefined) {
        sqlDb.prepare(
          `INSERT INTO project (id, name, schema_version, created_at, updated_at)
           VALUES (1, ?, ?, ?, ?)`
        ).run(projectName, CURRENT_VERSION, now, now);
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
    return this.readGlobal(cwd);
  }

  /**
   * 初始化指定变更的 progress
   * SQL: INSERT changes + 批量 INSERT stages
   */
  initChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  initChange: changeName 为空，跳过');
      return null;
    }
    // quick 会话 id（quick-<uuid8>，见 run.js QUICK_SID_RE）只作 progress 的跨进程 session key，
    // 进度存 SQL 不需要实体 change 目录——跳过避免 changes/quick-<uuid>/ 空目录残留。
    if (!/^quick-[0-9a-f]{8}$/.test(changeName)) {
      this._ensureChangeDir(cwd, changeName);
    }

    const db = this._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();

      // 检查变更是否已存在
      const existing = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
      if (existing === undefined) {
        // 插入 changes 行
        sqlDb.prepare(
          `INSERT INTO changes (name, current_stage, status, created_at, last_active)
           VALUES (?, 'scan', 'active', ?, ?)`
        ).run(changeName, now, now);
      }

      // 获取 change_id
      const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
      const changeId = changeRow.id;

      // 批量插入 9 个阶段（INSERT OR IGNORE 跳过已存在的）
      const allStages = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'archive', 'quick', 'explore'];
      for (const stage of allStages) {
        sqlDb.prepare(
          `INSERT OR IGNORE INTO stages (change_id, stage, status)
           VALUES (?, ?, 'pending')`
        ).run(changeId, stage);
      }
    });

    // 不再需要写文件：read() 已改为 SQL
    return this.read(cwd, changeName);
  }

  setStage(cwd, stage, changeName = null) { return this._stepStore.setStage(cwd, stage, changeName); }

  addStep(cwd, stage, stepName, changeName = null) { return this._stepStore.addStep(cwd, stage, stepName, changeName); }

  updateStep(cwd, stage, stepName, options = {}, changeName = null) { return this._stepStore.updateStep(cwd, stage, stepName, options, changeName); }

  _appendAuditLog(cwd, entry) { return this._consistency._appendAuditLog(cwd, entry); }

  _validateStageArtifacts(cwd, stage, changeName) { return this._stageMachine._validateStageArtifacts(cwd, stage, changeName); }

  completeStage(cwd, stage, changeName = null, opts = {}) { return this._stageMachine.completeStage(cwd, stage, changeName, opts); }

  show(cwd, changeName = null) { return this._stageMachine.show(cwd, changeName); }

  _showChange(cwd, changeName) { return this._stageMachine._showChange(cwd, changeName); }

  _getNextSuggestion(data) { return this._stageMachine._getNextSuggestion(data); }

  status(cwd, changeName = null) { return this._stageMachine.status(cwd, changeName); }

  checkConsistency(cwd, changeName = null) { return this._consistency.checkConsistency(cwd, changeName); }

  repairConsistency(cwd, opts = {}) { return this._consistency.repairConsistency(cwd, opts); }

  validate(cwd, changeName = null) { return this._stageMachine.validate(cwd, changeName); }

  reopenStage(cwd, stage, opts = {}) { return this._stageMachine.reopenStage(cwd, stage, opts); }

  _getDownstreamStages(stage) { return this._stageMachine._getDownstreamStages(stage); }

  reset(cwd, stage, changeName = null) { return this._stageMachine.reset(cwd, stage, changeName); }

  // ── 内部辅助 ──

  _readOrInit(cwd, changeName = null) {
    let data = this.read(cwd, changeName);
    if (!data) {
      // 尝试自动检测变更名
      if (!changeName) {
        const changes = this.listChanges(cwd);
        if (changes.length === 1) changeName = changes[0];
      }
      if (changeName) {
        // 确保变更在 DB 中已初始化
        const db = this._ensureDB(cwd);
        db.transaction(() => {
          const sqlDb = db.getDb();
          const now = new Date().toISOString();
          sqlDb.prepare(
            `INSERT OR IGNORE INTO changes (name, current_stage, status, created_at, last_active) VALUES (?, 'scan', 'active', ?, ?)`
          ).run(changeName, now, now);
          const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
          if (changeRow !== undefined) {
            const changeId = changeRow.id;
            for (const s of VALID_STAGES) {
              sqlDb.prepare(`INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, 'pending')`).run(changeId, s);
            }
          }
        });
        this.registerChange(cwd, changeName);
      }
      if (!data) {
        data = this.read(cwd, changeName);
      }
      if (!data) {
        console.log('❌ 无法确定当前变更，请指定 --change <name>');
        return null;
      }
    }
    return data;
  }

  _requireStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return null;
    }
    const data = this._readOrInit(cwd, changeName);
    if (!data) return null;
    if (!data.stages[stage]) data.stages[stage] = emptyStage();
    return data;
  }

  _timeAgo(dateStr) { return this._stageMachine._timeAgo(dateStr); }

  // ── 批量进度 ──

  updateBatchProgress(cwd, batchData, changeName = null) { return this._stepStore.updateBatchProgress(cwd, batchData, changeName); }

  readBatchProgress(cwd, changeName = null) { return this._stepStore.readBatchProgress(cwd, changeName); }

  _renderBatchProgress(batchProgress) { return this._stepStore._renderBatchProgress(batchProgress); }

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

  // ── plan.md 对齐（doctor --align-execute-progress 入口）──

  /**
   * 解析 changeDir/plan.md（回退 tasks.md）的 task checkbox 统计。
   * 仅匹配 `- [ ] task-NN` / `- [x] task-NN` 形态的行（task- 前缀锚定，避免误捞非任务项）。
   * @param {string} changeDir - 变更目录绝对路径（含 plan.md/tasks.md）
   * @returns {{ total: number, checked: number }}
   */
  readPlanCheckboxStatus(changeDir) {
    if (!changeDir || typeof changeDir !== 'string') {
      throw new Error('changeDir 不能为空');
    }
    const planPath = join(changeDir, 'plan.md');
    const tasksPath = join(changeDir, 'tasks.md');
    let content = null;
    if (existsSync(planPath)) {
      content = readFileSync(planPath, 'utf8');
    } else if (existsSync(tasksPath)) {
      content = readFileSync(tasksPath, 'utf8');
    } else {
      return { total: 0, checked: 0 };
    }
    // 匹配 `- [ ] task-NN` / `- [x] task-NN`（允许 [x] 大小写、空格弹性、task- 前缀）
    const re = /^\s*[-*]\s+\[([ xX])\]\s+task-\d+/gm;
    let total = 0;
    let checked = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      total++;
      if (m[1] === 'x' || m[1] === 'X') checked++;
    }
    return { total, checked };
  }

  /**
   * 按 plan.md 声明对齐 execute 阶段派生进度戳。
   * 仅当 plan.md 所有 task checkbox 全勾时，把 execute 阶段所有非 completed step 标 completed，
   * 并显式置 execute stageData.status='completed' + completedAt（绕过 completeStep 推导，D-003@v2）。
   * 不复核代码，信任 plan.md 声明（与 archive 同源，verify 阶段兜底，D-002/D-004）。
   *
   * @param {string} cwd
   * @param {string} changeName
   * @param {string} specBase - platformOpts.specRoot || join(cwd, '.sillyspec')，用于定位 changes 目录
   * @param {object} [opts]
   * @param {boolean} [opts.confirm=false] - 默认 dry-run，仅当 confirm=true 才落盘
   * @returns {{ ok: boolean, aligned: number, skipped: number, planTotal: number, planChecked: number, reason?: string, dryRun?: boolean }}
   */
  alignExecuteToPlan(cwd, changeName, specBase, opts = {}) {
    if (!changeName) throw new Error('changeName 不能为空');
    const { confirm = false } = opts;

    // 1. 读 progress；无 progress / 无 execute 阶段 → 拒绝
    const progress = this.read(cwd, changeName);
    if (!progress || !progress.stages || !progress.stages.execute) {
      return { ok: false, aligned: 0, skipped: 0, planTotal: 0, planChecked: 0, reason: 'execute 阶段无进度数据' };
    }
    const executeStage = progress.stages.execute;
    const steps = Array.isArray(executeStage.steps) ? executeStage.steps : [];
    if (steps.length === 0) {
      return { ok: false, aligned: 0, skipped: 0, planTotal: 0, planChecked: 0, reason: 'execute 阶段无进度数据' };
    }

    // 2. 读 plan.md checkbox；未全勾 → 拒绝（D-002）
    const specRoot = specBase || this._getSpecDir(cwd);
    const changeDir = join(specRoot, CHANGES_SUBDIR, changeName);
    const { total: planTotal, checked: planChecked } = this.readPlanCheckboxStatus(changeDir);
    if (planTotal === 0) {
      return { ok: false, aligned: 0, skipped: 0, planTotal, planChecked, reason: 'plan.md 无 task checkbox（无法判定完成度）' };
    }
    if (planChecked < planTotal) {
      return {
        ok: false,
        aligned: 0,
        skipped: 0,
        planTotal,
        planChecked,
        reason: `plan.md 有未勾选 task（${planChecked}/${planTotal}），拒绝对齐`,
      };
    }

    // 2.5 最低事实核验：plan.md checkbox 可被手动勾选伪造，
    // 对齐前用 git 客观核验是否存在真实代码变更（能确证零变更时才拒绝，
    // unknown 不阻断——worktree 已清理且变更已提交的正常场景无法对账）。
    try {
      const evidence = checkExecuteCodeEvidence(cwd, changeName);
      if (evidence.status === 'unchanged') {
        return {
          ok: false,
          aligned: 0,
          skipped: 0,
          planTotal,
          planChecked,
          reason: `plan.md 全勾但代码零变更（${evidence.detail}），拒绝对齐 — 请先运行 sillyspec doctor --json 诊断`,
        };
      }
    } catch (e) {
      console.warn(`⚠️  代码变更核验异常（不阻断对齐）: ${e.message}`);
    }

    // 3. 全勾：计算将补哪些 step
    const now = new Date().toISOString();
    let aligned = 0;
    let skipped = 0;
    for (const step of steps) {
      if (step.status === 'completed') {
        skipped++;
        continue;
      }
      aligned++;
      if (confirm) {
        step.status = 'completed';
        step.completedAt = now;
      }
    }

    // dry-run：只报告，不落盘
    if (!confirm) {
      return { ok: true, aligned, skipped, planTotal, planChecked, dryRun: true };
    }

    // 4. confirm：显式置 execute stageData.status='completed' + completedAt（D-003@v2，复刻 run.js:2303-2304）
    executeStage.status = 'completed';
    executeStage.completedAt = now;
    progress.currentStage = progress.currentStage || 'execute';
    progress.lastActive = now;
    this._write(cwd, progress, changeName);

    return { ok: true, aligned, skipped, planTotal, planChecked };
  }
}
