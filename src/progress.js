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

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, appendFileSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { writeAtomicSync } from './fs-atomic.js';
import { DB } from './db.js';
import { checkExecuteCodeEvidence } from './stage-contract.js';
import { ConsistencyDoctor } from './progress/consistency-doctor.js';
import { ChangeRegistry } from './progress/change-registry.js';
import { StepStore } from './progress/step-store.js';
import { StageMachine } from './progress/stage-machine.js';
import { stageRegistry } from './stages/index.js';
import { STAGE_ORDER, MAIN_FLOW_ORDER, VALID_STAGES, STAGE_LABELS, SPEC_DIR_NAME, CURRENT_VERSION, emptyStage } from './progress/shared.js';
// resolveSpecDir 单一真相源在 src/run/shared.js（含 home 拒绝守卫，坑 cwd-correction-home-collision
// 根治：home 下 .sillyspec 恒不命中，防 smoke/临时目录污染自我延续）。此处 re-export 保持
// 既有 import 路径兼容；run/shared.js 对 progress.js 只有动态 import，无静态循环。
import { resolveSpecDir } from './run/shared.js';
import { checkPlatformManaged, PLATFORM_MANAGED_FILENAME } from './run/shared.js';
export { resolveSpecDir };

// 默认规范目录名（相对于 cwd）
// SPEC_DIR_NAME → ./progress/shared.js（W6 Step9d）
const RUNTIME_SUBDIR = '.runtime';

/**
 * 向上查找含 .sillyspec 目录的祖先目录——实现已收敛至 src/run/shared.js（单一真相源，
 * 含 home 拒绝守卫），此处 re-export。见顶部 import 说明。
 */

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
 * 平台接管声明生效错误（指针缺失但声明存在）。fail-closed 入口一：
 * 防指针被 cleanup/STALE 清理或项目挪动后裸调静默建本地进度库（状态分裂根因）。
 *
 * ⚠️ 不覆写 this.name（保持父类的 'PointerUnreachableError'）——CLI 顶层 catch 按
 * err?.name === 'PointerUnreachableError' 严格字符串匹配（index.js），子类改名会
 * 落通用错误分支打 stack noise。靠 message 首行"平台接管声明生效"区分场景。
 */
export class PlatformManagedError extends PointerUnreachableError {
  constructor({ declarationPath, specRoot }) {
    super({
      pointerPath: declarationPath,
      specRoot,
      reason: `平台接管声明生效——本项目已由平台托管，但恢复指针缺失（可能被 platform pointer --cleanup 清理或项目目录被移动），拒绝静默回退本地模式`,
      hint: `① 重跑平台 scan/init（带 --spec-root）重建指针；② 确认不再使用平台：sillyspec platform disconnect（删除接管声明）；③ 显式 --spec-dir <路径> 临时指定目录`,
    });
    this.declarationPath = declarationPath;
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
    // 指针缺失：查平台接管声明（fail-closed 入口一）。声明存在 = 项目进过平台模式，
    // 指针丢失不该静默当纯本地项目处理（会建本地进度库 → 状态分裂）。
    const decl = checkPlatformManaged(cwd);
    if (decl) {
      throw new PlatformManagedError({
        declarationPath: join(resolve(cwd), PLATFORM_MANAGED_FILENAME),
        specRoot: decl.specRoot,
      });
    }
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


// ── ProgressManager ──

export class ProgressManager {
  /** 模块级 DB 连接池：Map<dbPath, DB>（SEC-09/PERF-10，见 _ensureDB 注释） */
  static _dbPool = new Map();

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

  /**
   * 懒初始化 DB 连接，缓存在实例上（better-sqlite3 同步 API，init 无 async）。
   *
   * SEC-09/PERF-10（2026-08-20 体检）：连接额外进模块级 Map<dbPath, DB> 单例——
   * 一条平台命令此前会 new 多个 ProgressManager（triggerPull / sync / import 各建），
   * 同一 sillyspec.db 被 open 3-5 次，每次重跑 PRAGMA + schema 探测，且多连接
   * 提升 SQLITE_BUSY 概率、Windows 残留句柄影响文件替换。CLI 短进程生命周期内
   * dbPath 不变，进程退出由 OS 回收句柄（node:sqlite 无显式泄漏）；进程内共享
   * 单连接后 WAL 写竞争面反而缩小。
   */
  _ensureDB(cwd) {
    if (!this._db) {
      const dbPath = this._runtimePath(cwd, 'sillyspec.db');
      let db = ProgressManager._dbPool.get(dbPath);
      if (!db) {
        db = new DB(dbPath);
        db.init();
        ProgressManager._dbPool.set(dbPath, db);
      }
      this._db = db;
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
        ...(revision != null ? { revision } : {}),
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
          try { waitAnswers = JSON.parse(waitAnswersJson); } catch (e) { console.warn(`[progress] waitAnswers JSON 损坏，已跳过: ${e.message}`); }
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
      _version: 5,
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
   * 同步专用六表完整序列化（design §8/B1，task-02 / D-005@v2 / FR-07）。
   * 与 read()（聚合视图，不读 approvals 且 changes 只投影五列）不同，本方法输出真正六表投影，
   * 作为同步载体（ProgressManager.import() 的逆运算，task-03）。
   *
   * 输出契约（字段名 = DB 列名 snake_case，import 直接对列写回，round-trip 无映射损耗）：
   *   project        { name, schema_version }                                        —— 全局单行稳定字段（id/created_at/updated_at 本地元数据不同步）
   *   changes        [{ name, current_stage, status, last_active,
   *                      last_synced_platform_ts, last_local_modified_ts }]           —— 只投影流程进度列；
   *                     排除 isolation_* 系列 与 platform_* 系列（platform_change_id/workspace_id/last_sync/sync_enabled）
   *                     以及 created_at（本地强相关，不同步，B2）
   *   stages         [{ change_name, stage, status, started_at, completed_at,
   *                      revision, reopened_from_step, reopened_at, stale_reason }]   —— 用 change_name+stage 替代 id 外键
   *   steps          [{ change_name, stage, name, status, output, completed_at, ordering,
   *                      wait_reason, wait_options, wait_answer, waited_at, wait_answers,
   *                      wait_round, max_wait_rounds }]                               —— wait_options/wait_answers 透传 DB JSON 字符串
   *   batch_progress [{ change_name, total, completed, failed, skipped }]
   *   approvals      [{ change_name, status, requested_at, approved_by, approved_at, rejection_reason }]
   * 可空列归一为 null（非 undefined，保证 JSON 往返键稳定）；不含 user/base_ts/pushed_at（D-015，sync.js 放 HTTP header）。
   *
   * @param {string} cwd
   * @param {string|null} [changeName] - 空时单活跃变更自动推导（对齐 read()）；多/零活跃返回 null
   * @returns {object|null} 六键同步 JSON；change 不存在或无法推导返回 null
   */
  serializeForSync(cwd, changeName = null) {
    // 自动检测变更名（与 read() 同口径）：单活跃变更推导，多/零无法确定返回 null
    if (!changeName) {
      const changes = this.listChanges(cwd);
      if (changes.length === 1) {
        changeName = changes[0];
      } else {
        return null;
      }
    }

    const db = this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // 1. changes 行（投影流程进度列 + name 标识）
    const changeRow = sqlDb.prepare(
      `SELECT id, name, current_stage, status, last_active, last_synced_platform_ts, last_local_modified_ts
       FROM changes WHERE name = ?`
    ).get(changeName);
    if (changeRow === undefined) return null;
    const changeId = changeRow.id;
    const changeProj = {
      name: changeRow.name,
      current_stage: changeRow.current_stage,
      status: changeRow.status,
      last_active: changeRow.last_active,
      last_synced_platform_ts: changeRow.last_synced_platform_ts ?? null,
      last_local_modified_ts: changeRow.last_local_modified_ts ?? null,
    };

    // 2. project 全局单行（只投影稳定字段 name/schema_version；created_at/updated_at 是本地库元数据，
    //    同步无意义且破坏 round-trip 跨库等值——与 changes 排除 created_at 同理，B2）
    const projectRow = sqlDb.prepare(
      'SELECT name, schema_version FROM project WHERE id = 1'
    ).get();

    // 3. stages（该 change 下，用 change_name+stage 表达外键）
    const stageRows = sqlDb.prepare(
      `SELECT id, stage, status, started_at, completed_at, revision, reopened_from_step, reopened_at, stale_reason
       FROM stages WHERE change_id = ? ORDER BY id`
    ).all(changeId);
    const stageJson = stageRows.map(r => ({
      change_name: changeRow.name,
      stage: r.stage,
      status: r.status,
      started_at: r.started_at ?? null,
      completed_at: r.completed_at ?? null,
      revision: r.revision ?? null,
      reopened_from_step: r.reopened_from_step ?? null,
      reopened_at: r.reopened_at ?? null,
      stale_reason: r.stale_reason ?? null,
    }));

    // 4. steps（stage_id IN；用 change_name+stage 关联回 stage）
    const stageIds = stageRows.map(r => r.id);
    const stageIdToName = new Map(stageRows.map(r => [r.id, r.stage]));
    let stepJson = [];
    if (stageIds.length > 0) {
      const placeholders = stageIds.map(() => '?').join(',');
      const stepRows = sqlDb.prepare(
        `SELECT stage_id, name, status, output, completed_at, ordering, wait_reason, wait_options,
                wait_answer, waited_at, wait_answers, wait_round, max_wait_rounds
         FROM steps WHERE stage_id IN (${placeholders}) ORDER BY stage_id, ordering`
      ).all(...stageIds);
      stepJson = stepRows.map(r => ({
        change_name: changeRow.name,
        stage: stageIdToName.get(r.stage_id),
        name: r.name,
        status: r.status,
        output: r.output ?? null,
        completed_at: r.completed_at ?? null,
        ordering: r.ordering ?? null,
        wait_reason: r.wait_reason ?? null,
        wait_options: r.wait_options ?? null,
        wait_answer: r.wait_answer ?? null,
        waited_at: r.waited_at ?? null,
        wait_answers: r.wait_answers ?? null,
        wait_round: r.wait_round ?? null,
        max_wait_rounds: r.max_wait_rounds ?? null,
      }));
    }

    // 5. batch_progress（无行则空数组，import 侧幂等）
    const batchRow = sqlDb.prepare(
      'SELECT total, completed, failed, skipped FROM batch_progress WHERE change_id = ?'
    ).get(changeId);
    const batchJson = batchRow !== undefined ? [{
      change_name: changeRow.name,
      total: batchRow.total,
      completed: batchRow.completed,
      failed: batchRow.failed,
      skipped: batchRow.skipped,
    }] : [];

    // 6. approvals（read() 不读此表，serializeForSync 补齐；无行则空数组）
    const approvalRow = sqlDb.prepare(
      'SELECT status, requested_at, approved_by, approved_at, rejection_reason FROM approvals WHERE change_id = ?'
    ).get(changeId);
    const approvalJson = approvalRow !== undefined ? [{
      change_name: changeRow.name,
      status: approvalRow.status,
      requested_at: approvalRow.requested_at ?? null,
      approved_by: approvalRow.approved_by ?? null,
      approved_at: approvalRow.approved_at ?? null,
      rejection_reason: approvalRow.rejection_reason ?? null,
    }] : [];

    return {
      project: projectRow || null,
      changes: [changeProj],
      stages: stageJson,
      steps: stepJson,
      batch_progress: batchJson,
      approvals: approvalJson,
    };
  }

  /**
   * serializeForSync 的逆运算：把平台权威 JSON 原子写回本地 DB 的该 change 行（design §8/B1，task-03 / D-005@v2 / D-011 / FR-07）。
   * ⚠️ 必须保护真实资产：import 前对 DB 做【独立】snapshot `.runtime/sillyspec.db.pre-import-<ts>.bak`，
   *   不抢 _openWithFallback 的 `${dbPath}.bak`（gap5/R-08）；任何失败本地进度库不损坏。
   *
   * 语义：
   * - 单个 DB.transaction() 包裹，原子重建 stages/steps/batch_progress/approvals 四表（任一失败整体回滚）
   * - changes 行用 UPDATE 选择投影列（current_stage/status/last_active/last_synced_platform_ts/last_local_modified_ts），
   *   保留 isolation_* / platform_* / created_at（本地强相关状态不被覆盖，B2；change 不存在时 INSERT 兜底平台新增）
   * - import 后 last_synced_platform_ts 与 last_local_modified_ts 均置为 progressObj.pushed_at（D-013 例外：
   *   不更新 now()——否则 now()>base_ts 下次 pull 误判冲突；pushed_at 由 sync.js pull() 从响应 header attach）
   * - 本地确定性操作，失败 throw 中文（非 sync 类 Best Effort，CONVENTIONS #4）
   *
   * @param {string} cwd
   * @param {object} progressObj - serializeForSync 输出 + sync.js 附加的 pushed_at
   * @param {string|null} [changeName] - 空则从 progressObj.changes[0].name 推导
   * @returns {ImportResult} { ok:true, imported:changeName, reason?, bakPath }
   */
  import(cwd, progressObj, changeName = null) {
    if (!progressObj || typeof progressObj !== 'object') {
      throw new Error('import 参数无效：progressObj 必须是 serializeForSync() 输出的六表 JSON 对象');
    }

    const cn = changeName || (progressObj.changes && progressObj.changes[0] && progressObj.changes[0].name);
    if (!cn) {
      throw new Error('import 缺少 changeName：无法定位目标 change（progressObj.changes[0].name 为空）');
    }

    // ⚠️ 必须保护真实资产：独立 .bak snapshot（前缀 pre-import- 区分于主 .bak 备份机制）
    const dbPath = this._runtimePath(cwd, 'sillyspec.db');
    if (!existsSync(dbPath)) {
      throw new Error(`本地进度库不存在，无法 import：${dbPath}`);
    }
    const bakTs = new Date().toISOString().replace(/[:.]/g, '-');
    const bakPath = this._runtimePath(cwd, `sillyspec.db.pre-import-${bakTs}.bak`);
    // 体检 BUG-18：WAL 模式下最近已提交事务可能仍在 -wal 侧车，直接 copy 主库文件会拿到
    // 缺尾部提交的快照（恢复时静默回退进度）。先尽力 checkpoint(TRUNCATE) 把 WAL 合并回主库；
    // 他进程持连接致 checkpoint 不完全时，把 -wal 侧车一并备份，恢复侧才有完整提交
    try {
      this._ensureDB(cwd).getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch { /* best-effort：失败退化为连 -wal 一起备份 */ }
    copyFileSync(dbPath, bakPath);
    const walSidecar = `${dbPath}-wal`;
    if (existsSync(walSidecar)) {
      try { copyFileSync(walSidecar, `${bakPath}-wal`); } catch { /* 侧车消失=已 checkpoint，无碍 */ }
    }

    const pushedAt = progressObj.pushed_at ?? null;
    const now = new Date().toISOString();

    try {
      const db = this._ensureDB(cwd);
      db.transaction(() => {
        const sqlDb = db.getDb();

        // 1. changes 行：INSERT OR IGNORE 兜底平台新增 change；UPDATE 只覆盖投影列（保留本地隔离/平台/created_at 列）
        sqlDb.prepare(
          `INSERT OR IGNORE INTO changes (name, current_stage, status, created_at, last_active)
           VALUES (?, '', 'active', ?, ?)`
        ).run(cn, now, now);
        const ch = progressObj.changes && progressObj.changes[0];
        sqlDb.prepare(
          `UPDATE changes SET
             current_stage = ?, status = ?, last_active = ?,
             last_synced_platform_ts = ?, last_local_modified_ts = ?
           WHERE name = ?`
        ).run(
          ch && ch.current_stage != null ? ch.current_stage : '',
          ch && ch.status != null ? ch.status : 'active',
          ch && ch.last_active != null ? ch.last_active : now,
          pushedAt, pushedAt, cn
        );
        const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(cn);
        const changeId = changeRow.id;

        // 2. project 行：幂等确保存在（不覆盖已有全局行，round-trip 等值不受影响；仅补缺失）
        const projExists = sqlDb.prepare('SELECT id FROM project WHERE id = 1').get();
        if (projExists === undefined) {
          const pj = progressObj.project || {};
          sqlDb.prepare(
            `INSERT INTO project (id, name, schema_version, created_at, updated_at)
             VALUES (1, ?, ?, ?, ?)`
          ).run(pj.name != null ? pj.name : 'project', pj.schema_version != null ? pj.schema_version : CURRENT_VERSION, now, now);
        }

        // 3. 重建 stages + steps：DELETE stages（ON DELETE CASCADE 级联删 steps），按 JSON 重建
        sqlDb.prepare('DELETE FROM stages WHERE change_id = ?').run(changeId);
        const stageToId = new Map();
        for (const s of (progressObj.stages || [])) {
          if (!s || !s.stage) continue;
          sqlDb.prepare(
            `INSERT INTO stages (change_id, stage, status, started_at, completed_at, revision, reopened_from_step, reopened_at, stale_reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(changeId, s.stage, s.status != null ? s.status : 'pending', s.started_at ?? null, s.completed_at ?? null,
            s.revision != null ? s.revision : 0, s.reopened_from_step ?? null, s.reopened_at ?? null, s.stale_reason ?? null);
          const row = sqlDb.prepare('SELECT id FROM stages WHERE change_id = ? AND stage = ?').get(changeId, s.stage);
          stageToId.set(s.stage, row.id);
        }
        for (const st of (progressObj.steps || [])) {
          if (!st || !st.name) continue;
          const stageId = stageToId.get(st.stage);
          if (stageId === undefined) continue; // 孤儿 step（stage 不在 JSON）跳过，不破坏完整性
          sqlDb.prepare(
            `INSERT INTO steps (stage_id, name, status, output, completed_at, ordering, wait_reason, wait_options, wait_answer, waited_at, wait_answers, wait_round, max_wait_rounds)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(stageId, st.name, st.status != null ? st.status : 'pending', st.output ?? null, st.completed_at ?? null,
            st.ordering != null ? st.ordering : 0, st.wait_reason ?? null, st.wait_options ?? null, st.wait_answer ?? null,
            st.waited_at ?? null, st.wait_answers ?? null, st.wait_round ?? null, st.max_wait_rounds ?? null);
        }

        // 4. 重建 batch_progress（DELETE 再插，无行则清空）
        sqlDb.prepare('DELETE FROM batch_progress WHERE change_id = ?').run(changeId);
        const bp = progressObj.batch_progress && progressObj.batch_progress[0];
        if (bp) {
          sqlDb.prepare(
            `INSERT INTO batch_progress (change_id, total, completed, failed, skipped)
             VALUES (?, ?, ?, ?, ?)`
          ).run(changeId, bp.total != null ? bp.total : 0, bp.completed != null ? bp.completed : 0,
            bp.failed != null ? bp.failed : 0, bp.skipped != null ? bp.skipped : 0);
        }

        // 5. 重建 approvals（DELETE 再插，无行则清空）
        sqlDb.prepare('DELETE FROM approvals WHERE change_id = ?').run(changeId);
        const ap = progressObj.approvals && progressObj.approvals[0];
        if (ap) {
          sqlDb.prepare(
            `INSERT INTO approvals (change_id, status, requested_at, approved_by, approved_at, rejection_reason)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(changeId, ap.status != null ? ap.status : 'not_required', ap.requested_at ?? null, ap.approved_by ?? null,
            ap.approved_at ?? null, ap.rejection_reason ?? null);
        }
      });
    } catch (e) {
      // 事务失败自动回滚（DB 未变），.bak 保留可恢复；fail-loud 中文
      throw new Error(`import 失败，本地进度库已回滚（snapshot: ${bakPath}）：${e.message}`);
    }

    return { ok: true, imported: cn, reason: undefined, bakPath };
  }

  /**
   * 本地脏度标记（D-013 / task-04）：写入路径末尾更新 changes.last_local_modified_ts。
   * 在写方法的事务内调用则属于该事务（原子，失败整体回滚）；import 是例外不调本方法
   * （import 自己把 last_local_modified_ts 置为 pushed_at，表示本地=平台干净）。
   * @param {string} cwd
   * @param {string} changeName
   * @param {string} [ts] - 复用调用方事务内的时间戳，保证与本次写入同时刻
   */
  _touchLocalModified(cwd, changeName, ts = null) {
    if (!changeName) return;
    const db = this._ensureDB(cwd);
    const stamp = ts || new Date().toISOString();
    db.getDb().prepare('UPDATE changes SET last_local_modified_ts = ? WHERE name = ?').run(stamp, changeName);
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
      // 1. 更新 changes 表（last_local_modified_ts 脏度：D-013 / task-04）
      const now = new Date().toISOString();
      const noWorktree = data.noWorktree ? 1 : 0;
      sqlDb.prepare(
        'UPDATE changes SET current_stage = ?, last_active = ?, no_worktree = ?, last_local_modified_ts = ? WHERE name = ?'
      ).run(data.currentStage || '', now, noWorktree, now, cn);

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

  // 单变更阶段查询（quick 轻量归档阶段闸）：无行 null，读失败抛（调用方 fail-closed）
  getChangeStage(cwd, changeName) { return this._changeRegistry.getChangeStage(cwd, changeName); }

  registerChange(cwd, changeName) { return this._changeRegistry.registerChange(cwd, changeName); }

  updateChangeIsolation(cwd, changeName, isolation) { return this._changeRegistry.updateChangeIsolation(cwd, changeName, isolation); }

  readChangeIsolation(cwd, changeName) { return this._changeRegistry.readChangeIsolation(cwd, changeName); }

  // syncedTs 透传（ql-20260818-008）：push 成功推进 base_ts，facade 曾丢参致列永不写入
  _updatePlatformLastSync(cwd, changeName, syncedTs = null) { return this._changeRegistry._updatePlatformLastSync(cwd, changeName, syncedTs); }

  _updateApprovalStatus(cwd, changeName, status, reason = null) { return this._changeRegistry._updateApprovalStatus(cwd, changeName, status, reason); }

  renameChange(cwd, oldName, newName) { return this._changeRegistry.renameChange(cwd, oldName, newName); }

  // opts.archiveStepNames 给定时做归档终态一致化收尾（见 change-registry.unregisterChange 注释，
  // 坑 manual-archive-desync-status-only）；archiveStepNamesForArchive() 取 stageRegistry 单一真相
  //（stages/* 不反向依赖 progress.js，静态 import 无环）。
  unregisterChange(cwd, changeName, opts) { return this._changeRegistry.unregisterChange(cwd, changeName, opts); }

  archiveStepNamesForArchive() {
    if (!this._archiveStepNamesCache) {
      const defs = stageRegistry?.archive?.steps
      this._archiveStepNamesCache = Array.isArray(defs) ? defs.map(s => s.name) : []
    }
    return this._archiveStepNamesCache
  }

  updateChangeMeta(cwd, changeName, meta) { return this._changeRegistry.updateChangeMeta(cwd, changeName, meta); }

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
  initChange(cwd, changeName, meta = {}) {
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
          `INSERT INTO changes (name, current_stage, status, created_at, last_active, title, quicklog_id)
           VALUES (?, 'scan', 'active', ?, ?, ?, ?)`
        ).run(changeName, now, now, meta.title || null, meta.quicklogId || null);
      }

      // 获取 change_id
      const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
      const changeId = changeRow.id;

      // 批量插入所有合法阶段（INSERT OR IGNORE 跳过已存在的）；沿用顶部 import 的 VALID_STAGES 单一源
      for (const stage of VALID_STAGES) {
        sqlDb.prepare(
          `INSERT OR IGNORE INTO stages (change_id, stage, status)
           VALUES (?, ?, 'pending')`
        ).run(changeId, stage);
      }
      // 本地脏度（D-013 / task-04）：新建 change 视为有未同步数据
      this._touchLocalModified(cwd, changeName, now);
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
          const ins = sqlDb.prepare(
            `INSERT OR IGNORE INTO changes (name, current_stage, status, created_at, last_active) VALUES (?, 'scan', 'active', ?, ?)`
          ).run(changeName, now, now);
          const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
          if (changeRow !== undefined) {
            const changeId = changeRow.id;
            for (const s of VALID_STAGES) {
              sqlDb.prepare(`INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, 'pending')`).run(changeId, s);
            }
          }
          // 只在真正创建 change 时标脏（D-013/task-04）；读路径（change 已存在）不标，避免 pull 误判本地有未同步改动
          if (ins.changes > 0) this._touchLocalModified(cwd, changeName, now);
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
      // 按既有 EOL 追加（2026-08-21 审查 BUG-9）：CRLF 检出的文件混入 LF 行产生全文件
      // diff 噪声/autocrlf 折腾；写走原子 rename 防并发 init 双跑交错
      const eol = content.includes('\r\n') ? '\r\n' : '\n';
      writeAtomicSync(gitignorePath, content.trimEnd() + eol + rule + eol);
    } else {
      writeAtomicSync(gitignorePath, rule + '\n');
    }
  }

  // ── plan.md 对齐（doctor --align-execute-progress 入口）──

  /**
   * 解析 changeDir/tasks.md（任务注册表唯一真相）的 task checkbox 统计。
   * 2026-08-20-task-truth-unify：源从「plan.md 优先回退 tasks.md」改为 tasks.md 唯一源——
   * 旧顺序下新契约 plan.md（纯 ID 引用行）恒 total=0，doctor --align-execute-progress 会静默失效。
   * tasks.md 缺失时回退 plan.md（旧归档变更兼容读侧，不写侧迁移）。
   * 仅匹配 `- [ ] task-NN` / `- [x] task-NN` 形态的行（task- 前缀锚定，避免误捞非任务项）。
   * @param {string} changeDir - 变更目录绝对路径（含 tasks.md/plan.md）
   * @returns {{ total: number, checked: number }}
   */
  readPlanCheckboxStatus(changeDir) {
    if (!changeDir || typeof changeDir !== 'string') {
      throw new Error('changeDir 不能为空');
    }
    const tasksPath = join(changeDir, 'tasks.md');
    const planPath = join(changeDir, 'plan.md');
    let content = null;
    if (existsSync(tasksPath)) {
      content = readFileSync(tasksPath, 'utf8');
    } else if (existsSync(planPath)) {
      content = readFileSync(planPath, 'utf8');
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

  // ── 只读 dump（task-01/02/03：daemon 进度读取）──

  /**
   * dump 输出的时间戳规范化：DB 内部两类形态（步骤推进时 JS Date 变量序列化
   * 的 ISO 形态、部分历史路径写入的 `YYYY/M/D H:mm:ss` 斜杠形态）统一转 ISO。
   * backend pydantic datetime 只吃 ISO（斜杠形态校验失败），斜杠 → new Date
   * 可解析；解析失败原样返回（backend 侧按无效丢弃）。
   */
  _dumpIso(ts) {
    if (!ts) return ts;
    if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts)) return ts;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toISOString();
  }

  /**
   * 只读导出进度数据，供 daemon 通过 `sillyspec progress dump --json` 消费。
   *
   * 纯读路径：打开 DB 只读、读 user-inputs.md、列 artifacts 目录，不写任何状态。
   * 无活跃变更或 DB 不存在时返回 null（不抛异常，daemon 按 null 处理空数据）。
   *
   * 输出字段 snake_case + ISO 时间戳（2026-08-19-runtime-live-daemon-read
   * acceptance review P0 修复）：契约消费端 backend RuntimeProgress pydantic
   * 是 snake_case（current_stage/last_active/started_at/size_bytes），
   * dump 早期误用内部 camelCase；跨端字段名断裂会让 pydantic 静默忽略
   * 未知字段导致前端核心字段全空。
   *
   * @param {string} cwd - specDir（`.sillyspec` 目录），由 CLI 层 --spec-dir 传入
   * @returns {object|null} 结构化进度数据，格式见 design.md §6.2
   */
  dump(cwd) {
    const specRoot = this._getSpecDir(cwd);
    const dbPath = this._runtimePath(cwd, 'sillyspec.db');

    // DB 不存在 → 返回 null（项目未初始化进度）
    if (!existsSync(dbPath)) return null;

    const db = this._ensureDB(cwd);
    const sqlDb = db.getDb();

    // 1. project 行
    const projectRow = sqlDb.prepare('SELECT name FROM project WHERE id = 1').get();
    if (projectRow === undefined) return null;
    const projectName = projectRow.name;

    // 2. 活跃变更（取 last_active 最新的一个）
    // ql-20260821-003：多活跃仓（变更隔离是常态，单仓可同时存在 N 个 active）下
    // 原 ORDER BY name 恒取字典序最前（通常是最老的变更），「当前变更/最后活动」
    // 停留在历史数据。dump 语义是「当前工作流状态」→ 取最近活跃的那个。
    const changeRows = sqlDb.prepare("SELECT id, name, current_stage, last_active FROM changes WHERE status = 'active' ORDER BY last_active DESC").all();
    if (changeRows.length === 0) {
      // 无活跃变更 → 返回仅含 project 的骨架
      return {
        project: projectName,
        current_stage: null,
        current_change: null,
        last_active: null,
        stages: {},
        user_inputs: this._readUserInputs(cwd),
        artifacts: this._listArtifacts(cwd),
      };
    }

    const change = changeRows[0];
    const { id: changeId, name: changeName, current_stage: currentStage, last_active: lastActive } = change;

    // 3. stages
    const stageRows = sqlDb.prepare(
      'SELECT id, stage, status, started_at, completed_at, revision FROM stages WHERE change_id = ? ORDER BY id'
    ).all(changeId);

    const stages = {};
    for (const s of VALID_STAGES) {
      stages[s] = { status: 'pending', steps: [] };
    }
    // PERF-06：一次 IN (...) 批量取全部 steps 再按 stage_id 分组（原逐 stage 查询是 N+1，
    // dump 是 daemon 轮询接口；与 read() :283-287 的批量读法对齐）
    const stepsByStage = new Map();
    if (stageRows.length > 0) {
      const placeholders = stageRows.map(() => '?').join(', ');
      const allStepRows = sqlDb.prepare(
        `SELECT stage_id, name, status, output, completed_at FROM steps WHERE stage_id IN (${placeholders}) ORDER BY stage_id, ordering`
      ).all(...stageRows.map(r => r.id));
      for (const sr of allStepRows) {
        if (!stepsByStage.has(sr.stage_id)) stepsByStage.set(sr.stage_id, []);
        stepsByStage.get(sr.stage_id).push(sr);
      }
    }
    for (const row of stageRows) {
      const stepRows = stepsByStage.get(row.id) || [];
      stages[row.stage] = {
        status: row.status,
        started_at: this._dumpIso(row.started_at) || undefined,
        completed_at: this._dumpIso(row.completed_at) || undefined,
        ...(row.revision ? { revision: row.revision } : {}),
        steps: stepRows.map(sr => ({
          name: sr.name,
          status: sr.status,
          ...(sr.output ? { output: sr.output } : {}),
          ...(sr.completed_at ? { completed_at: this._dumpIso(sr.completed_at) } : {}),
        })),
      };
    }

    return {
      project: projectName,
      current_stage: currentStage || null,
      current_change: changeName,
      last_active: this._dumpIso(lastActive) || null,
      stages,
      user_inputs: this._readUserInputs(cwd),
      artifacts: this._listArtifacts(cwd),
    };
  }

  /** 只读 user-inputs.md 内容（不存在返回 null） */
  _readUserInputs(cwd) {
    const p = this._runtimePath(cwd, 'user-inputs.md');
    if (!existsSync(p)) return null;
    return readFileSync(p, 'utf8');
  }

  /** 列 artifacts 目录（不存在返回空数组） */
  _listArtifacts(cwd) {
    const dir = this._runtimePath(cwd, 'artifacts');
    if (!existsSync(dir)) return [];
    try {
      return readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isFile())
        .map(e => {
          const fullPath = join(dir, e.name);
          const st = statSync(fullPath);
          return {
            filename: e.name,
            size_bytes: st.size,
            last_modified: st.mtime.toISOString(),
          };
        });
    } catch {
      return [];
    }
  }
}
