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

  _updatePlatformLastSync(cwd, changeName) {
    if (!changeName) return;
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      sqlDb.prepare(
        'UPDATE changes SET platform_last_sync = ?, platform_sync_enabled = 1 WHERE name = ?'
      ).run(new Date().toISOString(), changeName);
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
   * 从活跃列表移除变更（归档时调用，不物理删除）
   * SQL: UPDATE changes SET status = 'archived'
   */
  unregisterChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  unregisterChange: changeName 为空，跳过');
      return;
    }
    const db = this.pm._ensureDB(cwd);
    db.transaction(() => {
      const sqlDb = db.getDb();
      const now = new Date().toISOString();
      sqlDb.prepare(
        `UPDATE changes SET status = 'archived', last_active = ? WHERE name = ?`
      ).run(now, changeName);
      // 本地脏度（D-013 / task-04）：归档也是本地状态推进
      this.pm._touchLocalModified(cwd, changeName, now);
    });
  }
}

