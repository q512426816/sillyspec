// W6 Step9b: 变更注册表（changes 表生命周期）—— 注册/注销/重命名/隔离状态/平台同步戳/审批状态。
// 从 src/progress.js 单体 ProgressManager 抽出。持有 pm 引用（构造注入），调 pm._ensureDB /
// pm._changePath（persistence-core 留 facade 本体）。无共享常量依赖。
import { existsSync, mkdirSync, readFileSync, renameSync } from 'fs';
import { join } from 'path';

// 所有权活跃心跳窗缺省（2026-09-14-change-ownership-guards task-02 / FR-01）：owner 非本会话
// 且 now-last_active < 窗口 → 拒绝接管；窗口外 → 自动接管。local.yaml change-ownership.
// heartbeat_minutes 可调（resolveHeartbeatMs），缺省 15 分钟（config-schema 已登记 live 读者=本文件）。
const DEFAULT_HEARTBEAT_MINUTES = 15;

/**
 * 读 local.yaml 的 change-ownership.heartbeat_minutes → 毫秒窗（2026-09-14-change-ownership-guards
 * task-02）。路径口径与 sync.js readLocalYaml / worktree-cross.js 一致：cwd/.sillyspec/local.yaml。
 * 定向行扫描（只找 change-ownership: 顶层段下的 heartbeat_minutes），不引 YAML 解析依赖、
 * 字节级容错（CRLF 去 \r、注释行天然不匹配）。缺文件/缺段/缺键/值非正整数（含 0——误配把
 * 活跃窗清零会让护栏形同虚设）→ 缺省 15 分钟。纯读不抛。模块私有（唯一消费者=
 * assertChangeOwnership 心跳窗缺省解析；config-schema 登记的读者即本文件）。
 * @param {string} cwd - 项目根目录
 * @returns {number} 心跳窗口毫秒
 */
function resolveHeartbeatMs(cwd) {
  try {
    const p = join(cwd || process.cwd(), '.sillyspec', 'local.yaml');
    if (!existsSync(p)) return DEFAULT_HEARTBEAT_MINUTES * 60 * 1000;
    let inSection = false;
    for (const rawLine of readFileSync(p, 'utf8').split('\n')) {
      const line = rawLine.replace(/\r$/, ''); // CRLF 兼容（CLAUDE.md #13）
      if (/^\S/.test(line)) { // 顶层 key 行：进/出 change-ownership 段
        inSection = line.startsWith('change-ownership:');
        continue;
      }
      if (!inSection) continue;
      const m = line.match(/^\s*heartbeat_minutes\s*:\s*(\d+)\s*$/);
      if (m) {
        const minutes = parseInt(m[1], 10);
        return (Number.isFinite(minutes) && minutes >= 1) ? minutes * 60 * 1000 : DEFAULT_HEARTBEAT_MINUTES * 60 * 1000;
      }
    }
  } catch { /* 读失败 → 缺省（缺省是安全下界，不是语义分支） */ }
  return DEFAULT_HEARTBEAT_MINUTES * 60 * 1000;
}

export class ChangeRegistry {
  constructor(pm) {
    this.pm = pm;
  }

  /**
   * 列出所有活跃变更名
   * SQL: SELECT name FROM changes WHERE status = 'active'
   */
  listChanges(cwd) {
    const db = this.pm._ensureDB(cwd);
    const sqlDb = db.getDb();
    const rows = sqlDb.prepare("SELECT name FROM changes WHERE status = 'active' ORDER BY name").all();
    return rows.map(r => r.name);
  }

  /**
   * 读变更创建时间（IR 严格模式闸门判别源，change: 2026-09-07-ir-hardening D-001@v1）。
   * 只读不抛（与 listChanges 同款 DB 访问）：变更不存在 / db 异常 → null——调用方
   * （isStrictChange）按 fail-open 落存量豁免，不误伤。
   * @param {string} cwd
   * @param {string} changeName
   * @returns {string|null} ISO 时间字符串或 null
   */
  getChangeCreatedAt(cwd, changeName) {
    if (!changeName || typeof changeName !== 'string') return null;
    try {
      const db = this.pm._ensureDB(cwd);
      const row = db.getDb().prepare('SELECT created_at FROM changes WHERE name = ?').get(changeName);
      return row && typeof row.created_at === 'string' ? row.created_at : null;
    } catch {
      return null;
    }
  }

  /**
   * 查询单个变更的流程阶段与状态（quick 轻量归档阶段闸用）。
   * 与 readChangeIsolation 不同（展示读，catch → null 宽容）：本方法服务权限判定，读失败
   * 直接抛给调用方 catch → skip（fail-closed），不静默降级为"无记录"放行。
   * @param {string} cwd - 项目根目录
   * @param {string} changeName - 变更名
   * @returns {{ current_stage: string, status: string }|null} 无该行返回 null（未注册目录桩）
   */
  /**
   * 读某变更某阶段的 completed_at（2026-09-08-ir-verify-facts FR-02：verifyStartAt 基准——
   * evidence 分类核验的 mtime 窗口下界，取 execute 行 completed_at）。只读不抛：无行/读失败
   * 返回 null（调用方走 R-05 fallback，与 getChangeCreatedAt 同容错风格）。
   */
  getStageCompletedAt(cwd, changeName, stage) {
    try {
      const db = this.pm._ensureDB(cwd);
      const row = db.getDb().prepare(
        `SELECT s.completed_at FROM stages s JOIN changes c ON s.change_id = c.id
         WHERE c.name = ? AND s.stage = ? ORDER BY s.completed_at DESC LIMIT 1`
      ).get(changeName, stage);
      return row && row.completed_at ? row.completed_at : null;
    } catch { return null; }
  }

  /**
   * 读某变更最近一次进度活动时刻（quick-done-autoarchive-misfire 缺陷②，D-002@v1 复潮
   * 2026-09-11 实证：stage 阶段态区分不了「活跃在途」与「启动后弃单」——brainstorm
   * in_progress + tasks.md 仅含他者 quick 行时「全勾」是空洞真值）。取该变更全部
   * stages/steps completed_at 的最大值：活跃会话分钟级在推进（最近活动必新）；僵尸的
   * 最后一步完成时刻必然陈旧。只读不抛：无变更/无完成行/读失败返回 null（调用方按
   * 无近期活动放行，僵尸逃生通道语义不变——与 getStageCompletedAt 同族容错）。
   */
  getLatestActivityAt(cwd, changeName) {
    try {
      const db = this.pm._ensureDB(cwd);
      const sqlDb = db.getDb();
      const ch = sqlDb.prepare(`SELECT id FROM changes WHERE name = ?`).get(changeName);
      if (!ch) return null;
      const rows = sqlDb.prepare(
        `SELECT completed_at AS ts FROM stages WHERE change_id = ? AND completed_at IS NOT NULL
         UNION ALL
         SELECT st.completed_at AS ts FROM steps st
           JOIN stages s ON st.stage_id = s.id WHERE s.change_id = ? AND st.completed_at IS NOT NULL`
      ).all(ch.id, ch.id);
      // JS 侧按解析后的时间取最新（归一 ISO 返回）：SQL 字符串 MAX 在 zh-CN（'/'）与 ISO（'-'）
      // 混存时恒取 zh-CN（'/'0x2F>'-'0x2D）——存量 zh-CN 陈旧值会盖过新 ISO 致时近性闸取错
      // 时间戳（活跃变更被误归档方向，2026-09-11 审查）。不可解析串跳过。
      let latestMs = -Infinity;
      for (const r of rows) {
        const ms = new Date(r.ts).getTime();
        if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
      }
      return latestMs === -Infinity ? null : new Date(latestMs).toISOString();
    } catch { return null; }
  }

  /**
   * 读某变更某阶段的 started_at（2026-09-10 用户反馈②：evidence mtime 窗口锚点从
   * execute completed_at 放宽到 started_at——证据合法产自 execute 或 verify 两窗口，
   * 锚「完成时刻」会把 execute 期间产的证据判旧，逼出「先提交则 diff 空、不提交则
   * mtime 旧」的时序两难）。只读不抛：无行/列空/读失败返回 null（调用方退
   * getStageCompletedAt → R-05 fallback，与 getStageCompletedAt 同族容错）。
   */
  getStageStartedAt(cwd, changeName, stage) {
    try {
      const db = this.pm._ensureDB(cwd);
      const row = db.getDb().prepare(
        `SELECT s.started_at FROM stages s JOIN changes c ON s.change_id = c.id
         WHERE c.name = ? AND s.stage = ? ORDER BY s.started_at DESC LIMIT 1`
      ).get(changeName, stage);
      return row && row.started_at ? row.started_at : null;
    } catch { return null; }
  }

  getChangeStage(cwd, changeName) {
    const db = this.pm._ensureDB(cwd);
    const sqlDb = db.getDb();
    // ql-20260819-010：LEFT JOIN stages 带 current_stage 对应阶段行的 status（stage_status）。
    // quick 轻量归档闸除了「停在哪个阶段」还需要「该阶段是否已完成」——brainstorm 完成
    // 到 plan 开始之间存在 current_stage 仍读 brainstorm 的空窗，只看阶段名会把即将进
    // plan 的变更误判为僵尸（2026-08-19 quick-done-autoarchive-misfire 缺陷①）。
    // 无阶段行（未 initChange 的目录桩 / brownfield）→ stage_status=null，调用方按
    // 未完成放行（维持旧行为）。
    const row = sqlDb.prepare(
      `SELECT c.current_stage, c.status, s.status AS stage_status
       FROM changes c
       LEFT JOIN stages s ON s.change_id = c.id AND s.stage = c.current_stage
       WHERE c.name = ?`
    ).get(changeName);
    if (row === undefined) return null;
    return {
      current_stage: row.current_stage || '',
      status: row.status || '',
      stage_status: row.stage_status || null,
    };
  }

  /**
   * 注册变更到活跃列表
   * SQL: INSERT OR IGNORE → 若已 archived 则 UPDATE status='active'
   * @param {string} cwd
   * @param {string} changeName
   * @param {{ ownerSession?: string|null }} [opts] - owner_session（2026-09-14-change-ownership-guards
   *   task-01：首建者获得所有权；INSERT OR IGNORE 语义天然「已有行不覆盖」——已存在行（含他人
   *   活跃 change）owner 不动。会话标识三级方案的接线在 task-02，缺省 undefined=不写（列默认 NULL=无主））
   */
  registerChange(cwd, changeName, opts = {}) {
    if (!changeName) {
      console.warn('⚠️  registerChange: changeName 为空，跳过');
      return;
    }
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();
      // 尝试插入新行（带 owner_session——首次创建者获得所有权，已有值不覆盖）
      const ins = sqlDb.prepare(
        `INSERT OR IGNORE INTO changes (name, created_at, last_active, owner_session)
         VALUES (?, ?, ?, ?)`
      ).run(changeName, now, now, opts.ownerSession || null);
      // 只在真正创建 change 时标脏（D-013/task-04）；已存在行不标（读路径/重复调用不误判脏）
      if (ins.changes > 0) this.pm._touchLocalModified(cwd, changeName, now);
      // 注意：不复活已归档的变更——归档是不可逆操作
      // 如果变更已存在且为 archived，保持 archived 状态不变
    });
  }

  /**
   * 读变更所有者会话标识（2026-09-14-change-ownership-guards task-01 数据载体，D-001/D-005@v1）。
   * 只读不抛（与 getQuicklogId 同族容错）：行缺失/未登记/读取失败 → null。
   * NULL=无主（存量行 v6 迁移后即此态，任何会话可接管——判定/接管语义在 assertChangeOwnership，task-02）。
   * @param {string} cwd
   * @param {string} changeName
   * @returns {string|null} owner 会话标识，无主/无行/读失败返回 null
   */
  getChangeOwner(cwd, changeName) {
    if (!changeName) return null;
    try {
      const db = this.pm._ensureDB(cwd);
      const row = db.getDb().prepare('SELECT owner_session FROM changes WHERE name = ?').get(changeName);
      return (row && typeof row.owner_session === 'string' && row.owner_session) || null;
    } catch {
      return null;
    }
  }

  /**
   * 认领变更所有权（2026-09-14-change-ownership-guards task-01 数据载体）：
   * - 行不存在 → 创建并写 owner=session（首建者获得）；
   * - 行存在且 owner 非空 → 不覆盖，返回既有 owner（调用方对比可知认领未成功）；
   * - 行存在且 owner 为 NULL（存量无主行）→ 认领写入。
   * 单事务内「INSERT OR IGNORE + 守卫 UPDATE + 读回」，并发两个会话同时首认领时靠
   * SQLite 单写者串行化——后者命中守卫（owner 已非 NULL）不覆盖，返回先到者。
   * 实际变更（首建/认领）标本地脏度（owner 随同步 payload 上行，D-013 同族）。
   * @param {string} cwd
   * @param {string} changeName
   * @param {string|null} session - 本会话标识（空值视为无主认领，只建行不写 owner）
   * @returns {string|null} 实际 owner（首建/认领成功=session；他人已持有=其值；行刚建未写=null）
   */
  claimChangeOwner(cwd, changeName, session) {
    if (!changeName) return null;
    const db = this.pm._ensureDB(cwd);
    const now = new Date().toISOString();
    return db.transaction(() => {
      const sqlDb = db.getDb();
      // 1) 首建：INSERT OR IGNORE 写 own（行已存在则零行、既有 owner 不动）
      const ins = sqlDb.prepare(
        `INSERT OR IGNORE INTO changes (name, created_at, last_active, owner_session)
         VALUES (?, ?, ?, ?)`
      ).run(changeName, now, now, session || null);
      // 2) 存量无主行（owner NULL/空串）补认领；WHERE 守卫保证已有值（他人）绝不覆盖
      let claimed = 0;
      if (session) {
        claimed = sqlDb.prepare(
          `UPDATE changes SET owner_session = ? WHERE name = ? AND (owner_session IS NULL OR owner_session = '')`
        ).run(session, changeName).changes;
      }
      // 3) 实际变更（首建/认领命中）才标脏；纯读回（他人持有）不扰动同步脏度
      if (ins.changes > 0 || claimed > 0) this.pm._touchLocalModified(cwd, changeName, now);
      // 4) 读回实际 owner
      const row = sqlDb.prepare('SELECT owner_session FROM changes WHERE name = ?').get(changeName);
      return (row && row.owner_session) || null;
    });
  }

  /**
   * 所有权判定（2026-09-14-change-ownership-guards task-02，FR-01 / D-001@v1）：
   * **读 changes 行不写库**——接管写库归调用方（setChangeOwner / claimChangeOwner），
   * 判定与写分离让接线点可在锁内先判后写（判定-执行无 TOCTOU 由调用方锁保证）。
   * 分支（self 判定 = 精确字符串等值）：
   *   - opts.forced（--takeover）            → takeover-forced       放行（无条件接管，调用方重写 owner 留痕）
   *   - owner 为空（无行/NULL）               → no-owner              放行（存量无主行，任何会话可接管）
   *   - owner === selfSession                 → self                  放行（本会话自有 change 零路径变化）
   *   - owner 他人 且 now-last_active ≥ 窗口  → takeover-stale        放行（窗口外自动接管重写）
   *   - owner 他人 且活跃窗内                 → blocked-active-owner  拒绝（allowed:false，调用方打结构化错误）
   * last_active 缺失/不可解析按陈旧处理：无法证明新鲜即不拦——护栏拦「可证活跃」，不因时间戳
   * 损坏把 change 锁死到无人能接管（逃生通道优先，与 getLatestActivityAt 族 fail-open 同哲学）。
   * 心跳即 last_active：每次 CLI 写操作既有刷新（updateChangeIsolation/registerChange 等族）。
   * @param {string} cwd
   * @param {string} changeName
   * @param {{ selfSession?: string|null, nowMs?: number, heartbeatMs?: number, forced?: boolean }} [opts]
   * @returns {{allowed: boolean, action: 'self'|'takeover-stale'|'takeover-forced'|'no-owner'|'blocked-active-owner', owner: string|null, lastActive: string|null, heartbeatMs: number}}
   */
  assertChangeOwnership(cwd, changeName, opts = {}) {
    const heartbeatMs = (Number.isFinite(opts.heartbeatMs) && opts.heartbeatMs > 0)
      ? opts.heartbeatMs
      : resolveHeartbeatMs(cwd);
    const deny = (action, owner, lastActive) => ({ allowed: false, action, owner, lastActive, heartbeatMs });
    if (!changeName) return { allowed: true, action: 'no-owner', owner: null, lastActive: null, heartbeatMs };
    const row = this.pm._ensureDB(cwd).getDb()
      .prepare('SELECT owner_session, last_active FROM changes WHERE name = ?').get(changeName);
    const owner = (row && typeof row.owner_session === 'string' && row.owner_session) || null;
    const lastActive = (row && typeof row.last_active === 'string' && row.last_active) || null;
    if (opts.forced) return { allowed: true, action: 'takeover-forced', owner, lastActive, heartbeatMs };
    if (owner === null) return { allowed: true, action: 'no-owner', owner: null, lastActive, heartbeatMs };
    if (owner === opts.selfSession) return { allowed: true, action: 'self', owner, lastActive, heartbeatMs };
    // owner 他人：新鲜度决定拒绝 / 自动接管
    const lastMs = lastActive ? new Date(lastActive).getTime() : NaN;
    const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
    const stale = !Number.isFinite(lastMs) || (nowMs - lastMs) >= heartbeatMs;
    return stale
      ? { allowed: true, action: 'takeover-stale', owner, lastActive, heartbeatMs }
      : deny('blocked-active-owner', owner, lastActive);
  }

  /**
   * 强制重写所有者（task-02 接管写库侧；claimChangeOwner 的对照——那把守卫「已有值不覆盖」，
   * 本方法无条件写）：assertChangeOwnership 放行 no-owner/takeover-stale/takeover-forced 后由
   * 接线调用。同事务刷新 last_active——新 owner 的心跳从接管时刻起算，否则下次校验仍读到
   * 旧 owner 的陈旧时间戳，接管形同没发生（立刻又可被他人 takeover-stale 抢走）。行缺失先建
   * （INSERT OR IGNORE）。实际变更标本地脏度（owner_session 随同步 payload 上行，D-013 同族）。
   * @param {string} cwd
   * @param {string} changeName
   * @param {string|null} session - 接管者的会话标识
   */
  setChangeOwner(cwd, changeName, session) {
    if (!changeName) return;
    const db = this.pm._ensureDB(cwd);
    const now = new Date().toISOString();
    db.transaction(() => {
      const sqlDb = db.getDb();
      const ins = sqlDb.prepare(
        `INSERT OR IGNORE INTO changes (name, created_at, last_active, owner_session)
         VALUES (?, ?, ?, ?)`
      ).run(changeName, now, now, session || null);
      const upd = sqlDb.prepare(
        'UPDATE changes SET owner_session = ?, last_active = ? WHERE name = ?'
      ).run(session || null, now, changeName);
      if (ins.changes > 0 || upd.changes > 0) this.pm._touchLocalModified(cwd, changeName, now);
    });
  }

  /**
   * 更新变更的隔离状态
   * @param {string} cwd - 项目根目录
   * @param {string} changeName - 变更名
   * @param {{ status: string, mode?: string, reason?: string }} isolation
   */
  updateChangeIsolation(cwd, changeName, isolation) {
    const db = this.pm._ensureDB(cwd);
    try {
      db.transaction(() => {
        const sqlDb = db.getDb();
        const now = new Date().toISOString();
        sqlDb.prepare(
          `UPDATE changes SET isolation_status = ?, isolation_mode = ?, isolation_reason = ?, last_active = ? WHERE name = ?`
        ).run(isolation.status, isolation.mode || null, isolation.reason || null, now, changeName);
        // 本地脏度（D-013 / task-04）：隔离状态变更也是本地推进
        this.pm._touchLocalModified(cwd, changeName, now);
      });
    } catch (err) {
      console.warn('⚠️  更新 isolation 状态失败:', err.message);
    }
  }

  /**
   * 更新变更的人类可读元信息（title / quicklog_id），让 quick-<hex> 行可读、DB↔QUICKLOG 可对账。
   * quick 启动时回填（title 从任务描述、quicklog_id 用分配的 qlId）；--done 时从 step3「需求：」刷新 title。
   * 部分更新（只传 title 不动 quicklog_id，反之亦然）。不调 _touchLocalModified：title/quicklog_id 是
   * 本地展示用元信息，纳入脏度会扰动平台同步（平台 changes 表无此列）。
   * @param {string} cwd
   * @param {string} changeName
   * @param {{ title?: string, quicklogId?: string }} meta
   */
  updateChangeMeta(cwd, changeName, meta) {
    if (!changeName || !meta) return;
    const db = this.pm._ensureDB(cwd);
    try {
      db.transaction(() => {
        const sqlDb = db.getDb();
        const sets = [];
        const params = [];
        if (meta.title !== undefined) { sets.push('title = ?'); params.push(meta.title); }
        if (meta.quicklogId !== undefined) { sets.push('quicklog_id = ?'); params.push(meta.quicklogId); }
        if (sets.length === 0) return;
        params.push(changeName);
        sqlDb.prepare(`UPDATE changes SET ${sets.join(', ')} WHERE name = ?`).run(...params);
      });
    } catch (err) {
      console.warn('⚠️  更新 change 元信息失败:', err.message);
    }
  }

  /**
   * 读取变更回填的 quicklog_id（quick 启动时 stage.js 写入的分配 ql-ID）。
   * quick --done 兜底路径复用启动 ql-ID 用（坑 platform-takeover-phantom-progress-db
   * 同日变体：guard 缺失时补分配新号制造引用劈叉——落码注释/模块文档的 ql-ID 是启动
   * 时就给出的，兜底换号必然劈叉；启动 ID 进度库里可查）。
   * @param {string} cwd
   * @param {string} changeName
   * @returns {string|null} 行缺失/未回填/读取失败返回 null
   */
  getQuicklogId(cwd, changeName) {
    if (!changeName) return null;
    try {
      const db = this.pm._ensureDB(cwd);
      const row = db.getDb().prepare('SELECT quicklog_id FROM changes WHERE name = ?').get(changeName);
      return (row && typeof row.quicklog_id === 'string' && row.quicklog_id) || null;
    } catch {
      return null;
    }
  }

  /**
   * 读取变更的隔离状态
   * @param {string} cwd - 项目根目录
   * @param {string} changeName - 变更名
   * @returns {{ status: string|null, mode: string|null, reason: string|null }|null}
   */
  readChangeIsolation(cwd, changeName) {
    const db = this.pm._ensureDB(cwd);
    const sqlDb = db.getDb();
    try {
      const row = sqlDb.prepare(
        `SELECT isolation_status, isolation_mode, isolation_reason FROM changes WHERE name = ?`
      ).get(changeName);
      if (row === undefined) return null;
      const { isolation_status: status, isolation_mode: mode, isolation_reason: reason } = row;
      return { status: status || null, mode: mode || null, reason: reason || null };
    } catch {
      return null;
    }
  }

  _updatePlatformLastSync(cwd, changeName, syncedTs = null) {
    if (!changeName) return;
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      // ql-20260818-008：push 成功后同时推进 base_ts（last_synced_platform_ts）。原实现只写
      // 展示列 platform_last_sync，而 sync() 取 base_ts（sync.js）与 pull 脏度检测读的是
      // last_synced_platform_ts——写 A 读 B 致 CLI 直跑场景该列恒 NULL：X-SillySpec-Base-Ts
      // 永不携带（乐观锁失效）、本地脏度恒 false、platform status behind 恒跳过。值优先
      // 平台回执 last_pushed_at，缺省回退本次 X-SillySpec-Pushed-At（后端 _apply 存的就是
      // 该 header 原值，回写与服务器精确一致）。COALESCE 保旧值：无 syncedTs 只推进展示列。
      // ql-20260914-001：COALESCE 直写改 MAX 单调推进（坑 sync-base-ts-out-of-order-backfill）——
      // 同机多进程（CLI 会话 ×N + 步进链）并发推送时，A(t1)/B(t2) 乱序回填会让迟到的旧回执
      // 覆盖已推进的 base（multi-agent-platform 实证：6 个假冲突的 base 全部停在上一轮值），
      // 回声窗重开 → 下次 push 409/pull 假冲突。MAX 只升不降：base ≥ 回执恒安全（平台 409
      // 判据是 stored > base，base 偏高只会让推送被接受，绝不产生假 409）；仅当回执比现存
      // base 旧（乱序/平台侧回退）时改变行为——正是要防的覆写。与 resolve/自愈路径的
      // MAX 写法（sync.js 四处）对齐，消除本仓最后一个直写点。
      sqlDb.prepare(
        'UPDATE changes SET platform_last_sync = ?, platform_sync_enabled = 1, last_synced_platform_ts = MAX(COALESCE(?, last_synced_platform_ts), COALESCE(last_synced_platform_ts, ?)) WHERE name = ?'
      ).run(new Date().toISOString(), syncedTs, syncedTs, changeName);
    });
  }

  _updateApprovalStatus(cwd, changeName, status, reason = null) {
    if (!changeName || !status) return;
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const row = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
      if (row === undefined) return;
      const changeId = row.id;
      const now = new Date().toISOString();
      sqlDb.prepare(
        `INSERT INTO approvals (change_id, status, requested_at, approved_at, rejection_reason)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(change_id) DO UPDATE SET
           status = excluded.status,
           approved_at = excluded.approved_at,
           rejection_reason = excluded.rejection_reason`
      ).run(
        changeId,
        status,
        now,
        status === 'approved' ? now : null,
        status === 'rejected' ? reason : null,
      );
      // 本地脏度（D-013 / task-04）：审批状态变更也是本地推进
      this.pm._touchLocalModified(cwd, changeName, now);
    });
  }

  /**
   * 重命名变更：同步更新 DB + 目录
   * @param {string} cwd - 项目根目录
   * @param {string} oldName - 旧变更名
   * @param {string} newName - 新变更名
   */
  renameChange(cwd, oldName, newName) {
    if (!oldName || !newName) {
      console.warn('⚠️  renameChange: 旧名或新名为空，跳过');
      return;
    }
    if (oldName === newName) {
      console.warn('⚠️  renameChange: 新旧名称相同，跳过');
      return;
    }
    // 注：新名日期前缀门禁只在 CLI 边界强制（index.js change-rename 入口）——renameChange 是
    // 库函数，测试/平台工具合法用任意名（2026-09-11 决策）。
    const db = this.pm._ensureDB(cwd);
    // 存在性/冲突检查与 UPDATE 收进同一事务 + 校验影响行数（坑 rename-concurrent-split，
    // 2026-09-12 审查批 C-①）：旧三段独立事务是 check-then-act——并发重命名 X→Y 与 X→Z 时，
    // 后者的 UPDATE 命中 0 行不报错，继续搬目录造成 DB/目录分裂（空目录假成功）。
    const oldDir = this.pm._changePath(cwd, oldName);
    const newDir = this.pm._changePath(cwd, newName);
    const now = new Date().toISOString();
    let outcome;
    try {
      outcome = db.transaction(() => {
        const sqlDb = db.getDb();
        const row = sqlDb.prepare(`SELECT name FROM changes WHERE name = ?`).get(oldName);
        if (row === undefined) return 'missing';
        if (sqlDb.prepare(`SELECT 1 FROM changes WHERE name = ?`).get(newName) !== undefined) return 'conflict';
        const r = sqlDb.prepare(`UPDATE changes SET name = ?, last_active = ? WHERE name = ?`).run(newName, now, oldName);
        if (r.changes !== 1) return 'stolen'; // 并发窗口：检查后他进程已把 oldName 改走
        // 本地脏度（D-013 / task-04）：重命名也是本地推进（标新名）
        this.pm._touchLocalModified(cwd, newName, now);
        return 'ok';
      });
    } catch (e) {
      console.error(`❌ 重命名失败：更新数据库时出错（${e.message}）`);
      return;
    }
    if (outcome === 'missing') {
      console.error(`❌ 变更 ${oldName} 不存在`);
      return;
    }
    if (outcome === 'conflict') {
      console.error(`❌ 变更 ${newName} 已存在`);
      return;
    }
    if (outcome === 'stolen') {
      console.error(`❌ 变更 ${oldName} 刚被并发操作重命名/删除（0 行更新），本次跳过——请重查后重试`);
      return;
    }
    // 先更新 DB，再重命名目录；FS 失败则回滚 DB，避免"目录已改名但 DB 旧名"的孤儿
    // （旧实现 FS-first 无补偿：renameSync 成功后 DB transaction 抛 EPERM/EBUSY 会让
    //  目录已是 newName、DB 仍是 oldName，read(两名) 都失联且无自动恢复）。
    let renamed = true;
    if (existsSync(oldDir)) {
      try {
        renameSync(oldDir, newDir);
      } catch (e) {
        renamed = false;
        // FS 重命名失败：回滚 DB 恢复 oldName，保持 DB 与目录一致
        try {
          db.transaction(() => {
            const sqlDb = db.getDb();
            sqlDb.prepare(`UPDATE changes SET name = ?, last_active = ? WHERE name = ?`).run(oldName, now, newName);
            // 回滚也是写（恢复 oldName），对称标脏旧名
            this.pm._touchLocalModified(cwd, oldName, now);
          });
          console.error(`❌ 重命名失败：移动目录出错（${e.message}），已回滚数据库`);
        } catch (rollbackErr) {
          // 回滚本身也失败：DB 是 newName、目录是 oldName，两端分裂且无自动恢复。
          // 不能再撒谎"已回滚"——必须显式报错让用户跑 doctor 修复。
          console.error(`❌ 重命名失败且数据库回滚也失败（状态分裂，需手动修复）：原错=${e.message} 回滚错=${rollbackErr.message}。请跑 sillyspec doctor --json`);
        }
      }
    } else {
      mkdirSync(newDir, { recursive: true });
    }
    if (renamed) console.log(`✅ 变更已重命名：${oldName} → ${newName}`);
  }

  /**
   * 删除变更（change-delete 命令的 DB 侧，2026-08-30 用户反馈①）
   * SQL: UPDATE changes SET status = 'deleted'
   *
   * 语义区分：此前删除靠 git rm + 借道 doctor 幽灵清理，而幽灵清理把删除行写成
   * archived——DB 无法区分「流程正常收尾的归档」与「中途废弃的删除」，事后审计只能
   * 回溯 git。现在两种终态在 DB 里显式分离：
   *   - archived = archive 阶段 --confirm / quick 轻量归档（流程收尾）
   *   - deleted  = change-delete 显式废弃（行保留供审计，status 即语义载体）
   * 与 unregisterChange 不同：不做 archive 终态一致化——删除不是「完成」，给删除行收尾
   * archive 阶段属伪造终态（对齐 cleanupGhostChanges 对「目录真丢失」幽灵保持 status-only
   * 的可逆语义）；stages/steps 行不动，保留原审计价值。
   */
  deleteChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  deleteChange: changeName 为空，跳过');
      return;
    }
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();
      sqlDb.prepare(`UPDATE changes SET status = 'deleted', last_active = ? WHERE name = ?`).run(now, changeName);
      // 本地脏度（D-013 / task-04）：删除也是本地状态推进（triggerSync 据此推终态/墓碑上行）
      this.pm._touchLocalModified(cwd, changeName, now);
    });
  }

  /**
   * 从活跃列表移除变更（归档时调用，不物理删除）
   * SQL: UPDATE changes SET status = 'archived'
   *
   * 归档终态一致化（坑 manual-archive-desync-status-only，2026-08-21 实证）：手动搬目录绕过
   * `run archive --done --confirm` 后，自愈/幽灵清理路径只改 status 一个字段，留下「已归档 +
   * current_stage 停在 execute + 归档 0/5 步」的自相矛盾终态，推送平台后渲染成「进度丢失」。
   * opts.archiveStepNames（调用方取自 stageRegistry 单一真相）给定时同事务收尾：
   * current_stage='archive' + stages.archive=completed + 其步骤行全 completed
   * （缺行按定义补种——平台按步骤数展示完成度，零行会显示 0/5）。
   */
  unregisterChange(cwd, changeName, opts = {}) {
    if (!changeName) {
      console.warn('⚠️  unregisterChange: changeName 为空，跳过');
      return;
    }
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();
      let sql = `UPDATE changes SET status = 'archived', last_active = ?`;
      const params = [now];
      if (Array.isArray(opts.archiveStepNames)) sql += `, current_stage = 'archive'`;
      sql += ` WHERE name = ?`;
      params.push(changeName);
      sqlDb.prepare(sql).run(...params);
      if (Array.isArray(opts.archiveStepNames)) {
        const row = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
        if (row) {
          sqlDb.prepare(
            `INSERT INTO stages (change_id, stage, status, started_at, completed_at)
             VALUES (?, 'archive', 'completed', ?, ?)
             ON CONFLICT(change_id, stage) DO UPDATE SET status = 'completed', completed_at = excluded.completed_at`
          ).run(row.id, now, now);
          const stageRow = sqlDb.prepare(
            'SELECT id FROM stages WHERE change_id = ? AND stage = ?'
          ).get(row.id, 'archive');
          if (stageRow) {
            // 现有步骤行（含 pending/waiting）全收尾；定义里有而行里没有的（阶段从未初始化）按定义补种
            sqlDb.prepare(
              `UPDATE steps SET status = 'completed', completed_at = ? WHERE stage_id = ?`
            ).run(now, stageRow.id);
            const existing = new Set(
              sqlDb.prepare('SELECT name FROM steps WHERE stage_id = ?').all(stageRow.id).map(r => r.name)
            );
            let order = existing.size;
            const ins = sqlDb.prepare(
              `INSERT INTO steps (stage_id, name, status, completed_at, ordering) VALUES (?, ?, 'completed', ?, ?)`
            );
            for (const name of opts.archiveStepNames) {
              if (!existing.has(name)) { ins.run(stageRow.id, name, now, order++) }
            }
          }
        }
      }
      // 本地脏度（D-013 / task-04）：归档也是本地状态推进
      this.pm._touchLocalModified(cwd, changeName, now);
    });
  }
}

