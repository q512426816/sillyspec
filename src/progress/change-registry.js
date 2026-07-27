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
  async listChanges(cwd) {
    const db = await this.pm._ensureDB(cwd);
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
    const db = await this.pm._ensureDB(cwd);
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
    const db = await this.pm._ensureDB(cwd);
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
    const db = await this.pm._ensureDB(cwd);
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
    const db = await this.pm._ensureDB(cwd);
    db.transaction((sqlDb) => {
      sqlDb.run(
        'UPDATE changes SET platform_last_sync = ?, platform_sync_enabled = 1 WHERE name = ?',
        [new Date().toISOString(), changeName]
      );
    });
  }

  async _updateApprovalStatus(cwd, changeName, status, reason = null) {
    if (!changeName || !status) return;
    const db = await this.pm._ensureDB(cwd);
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
    const db = await this.pm._ensureDB(cwd);
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
    // 先更新 DB，再重命名目录；FS 失败则回滚 DB，避免"目录已改名但 DB 旧名"的孤儿
    // （旧实现 FS-first 无补偿：renameSync 成功后 DB transaction 抛 EPERM/EBUSY 会让
    //  目录已是 newName、DB 仍是 oldName，read(两名) 都失联且无自动恢复）。
    const oldDir = this.pm._changePath(cwd, oldName);
    const newDir = this.pm._changePath(cwd, newName);
    const now = new Date().toISOString();
    try {
      db.transaction((sqlDb) => {
        sqlDb.run(`UPDATE changes SET name = ?, last_active = ? WHERE name = ?`, [newName, now, oldName]);
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
          db.transaction((sqlDb) => {
            sqlDb.run(`UPDATE changes SET name = ?, last_active = ? WHERE name = ?`, [oldName, now, newName]);
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
  async unregisterChange(cwd, changeName) {
    if (!changeName) {
      console.warn('⚠️  unregisterChange: changeName 为空，跳过');
      return;
    }
    const db = await this.pm._ensureDB(cwd);
    db.transaction((sqlDb) => {
      const now = new Date().toISOString();
      sqlDb.run(
        `UPDATE changes SET status = 'archived', last_active = ? WHERE name = ?`,
        [now, changeName]
      );
    });
  }
}

