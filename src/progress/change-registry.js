// W6 Step9b: 变更注册表（changes 表生命周期）—— 注册/注销/重命名/隔离状态/平台同步戳/审批状态。
// 从 src/progress.js 单体 ProgressManager 抽出。持有 pm 引用（构造注入），调 pm._ensureDB /
// pm._changePath（persistence-core 留 facade 本体）。无共享常量依赖。
import { existsSync, mkdirSync, renameSync } from 'fs';

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
   * 查询单个变更的流程阶段与状态（quick 轻量归档阶段闸用）。
   * 与 readChangeIsolation 不同（展示读，catch → null 宽容）：本方法服务权限判定，读失败
   * 直接抛给调用方 catch → skip（fail-closed），不静默降级为"无记录"放行。
   * @param {string} cwd - 项目根目录
   * @param {string} changeName - 变更名
   * @returns {{ current_stage: string, status: string }|null} 无该行返回 null（未注册目录桩）
   */
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
   */
  registerChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  registerChange: changeName 为空，跳过');
      return;
    }
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();
      // 尝试插入新行
      const ins = sqlDb.prepare(
        `INSERT OR IGNORE INTO changes (name, created_at, last_active)
         VALUES (?, ?, ?)`
      ).run(changeName, now, now);
      // 只在真正创建 change 时标脏（D-013/task-04）；已存在行不标（读路径/重复调用不误判脏）
      if (ins.changes > 0) this.pm._touchLocalModified(cwd, changeName, now);
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
      sqlDb.prepare(
        'UPDATE changes SET platform_last_sync = ?, platform_sync_enabled = 1, last_synced_platform_ts = COALESCE(?, last_synced_platform_ts) WHERE name = ?'
      ).run(new Date().toISOString(), syncedTs, changeName);
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
    const db = this.pm._ensureDB(cwd);
    // 检查旧名是否存在
    const existing = db.transaction(() => {
      const sqlDb = db.getDb();
      const row = sqlDb.prepare(`SELECT name, status FROM changes WHERE name = ?`).get(oldName);
      if (row === undefined) return null;
      return { name: row.name, status: row.status };
    });
    if (!existing) {
      console.error(`❌ 变更 ${oldName} 不存在`);
      return;
    }
    // 检查新名是否已存在
    const conflict = db.transaction(() => {
      const sqlDb = db.getDb();
      const row = sqlDb.prepare(`SELECT name FROM changes WHERE name = ?`).get(newName);
      return row !== undefined;
    });
    if (conflict) {
      console.error(`❌ 变更 ${newName} 已存在`);
      return;
    }
    // 先更新 DB，再重命名目录；FS 失败则回滚 DB，避免"目录已改名但 DB 旧名"的孤儿
    // （旧实现 FS-first 无补偿：renameSync 成功后 DB transaction 抛 EPERM/EBUSY 会让
    //  目录已是 newName、DB 仍是 oldName，read(两名) 都失联且无自动恢复）。
    const oldDir = this.pm._changePath(cwd, oldName);
    const newDir = this.pm._changePath(cwd, newName);
    const now = new Date().toISOString();
    try {
      db.transaction(() => {
        const sqlDb = db.getDb();
        sqlDb.prepare(`UPDATE changes SET name = ?, last_active = ? WHERE name = ?`).run(newName, now, oldName);
        // 本地脏度（D-013 / task-04）：重命名也是本地推进（标新名）
        this.pm._touchLocalModified(cwd, newName, now);
      });
    } catch (e) {
      console.error(`❌ 重命名失败：更新数据库时出错（${e.message}）`);
      return;
    }
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

