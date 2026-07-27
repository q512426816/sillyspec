// W6 Step9c: 阶段/步骤/批量进度管理（stages + steps + batch_progress 表）。
// 从 src/progress.js 单体 ProgressManager 抽出。持有 pm 引用（构造注入），调 pm._ensureDB /
// pm.listChanges / pm._validateStageArtifacts / pm._appendAuditLog / pm.read（persistence-core
// + 其他组 delegate 留 facade）。纯 SQL + 常量，无 fs/path 依赖。
import { VALID_STAGES, STAGE_LABELS } from './shared.js';

// step 状态白名单（仅 updateStep 用，本地化）
const VALID_STATUSES = ['pending', 'in-progress', 'completed', 'failed', 'blocked', 'waiting', 'stale'];

export class StepStore {
  constructor(pm) {
    this.pm = pm;
  }

  async setStage(cwd, stage, changeName = null) {
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}，可选: ${VALID_STAGES.join(', ')}`);
      return;
    }

    const db = await this.pm._ensureDB(cwd);
    const now = new Date().toISOString();

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.pm.listChanges(cwd);
      if (changes.length === 1) cn = changes[0];
      if (!cn) { console.log('❌ 无法确定当前变更，请指定 --change <name>'); return; }
    }

    let changeFound = false;
    db.transaction((sqlDb) => {
      // 确保 change 存在
      const changeRow = sqlDb.exec('SELECT id, current_stage FROM changes WHERE name = ?', [cn]);
      if (!changeRow || changeRow.length === 0 || changeRow[0].values.length === 0) return;

      changeFound = true;
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

    if (!changeFound) {
      // 历史教训：变更名打错/cwd 漂移命中错误 spec 时，事务内静默 return，
      // 但旧代码此处仍无条件打「✅ 已设为」→ 假成功（agent 以为生效，实际什么都没做）。
      console.log(`❌ 变更「${cn}」不存在，未设置阶段。检查变更名拼写，或 sillyspec status 查看活跃变更；cwd 漂移时回项目根或加 --spec-dir。`);
      return;
    }

    // read() 已改为 SQL，直接通过 SQL 查询即可，无需 _write
    console.log(`✅ 当前阶段已设为: ${STAGE_LABELS[stage] || stage}（变更 ${cn}）`);
  }

  async addStep(cwd, stage, stepName, changeName = null) {
    if (!stepName) { console.log('❌ 请指定步骤名称'); return; }

    const db = await this.pm._ensureDB(cwd);

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.pm.listChanges(cwd);
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

    const db = await this.pm._ensureDB(cwd);

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = await this.pm.listChanges(cwd);
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
    let stageCompletionCandidateId = null;
    db.transaction((tDb) => {
      const now = new Date().toISOString();
      if (status) {
        tDb.run('UPDATE steps SET status = ?, completed_at = ? WHERE id = ? AND name = ?', [status, now, stepId, stepName]);
      }
      if (output !== undefined) {
        tDb.run('UPDATE steps SET output = ? WHERE id = ? AND name = ?', [output, stepId, stepName]);
      }

      // 自动完成检测：同 stage_id 下所有 steps 都 completed 时，候选标记 stage completed
      // （实际标记延后到事务外，先过产物校验门，防止 update-step 成为绕过 validator 的后门）
      if (status === 'completed') {
        // 获取 stage_id
        const stRow = tDb.exec('SELECT stage_id FROM steps WHERE id = ?', [stepId]);
        if (stRow && stRow.length > 0 && stRow[0].values.length > 0) {
          const stId = stRow[0].values[0][0];
          const pendingRows = tDb.exec('SELECT COUNT(*) FROM steps WHERE stage_id = ? AND status != "completed"', [stId]);
          if (pendingRows && pendingRows.length > 0 && pendingRows[0].values[0][0] === 0) {
            stageCompletionCandidateId = stId;
          }
        }
      }

      tDb.run('UPDATE changes SET last_active = ? WHERE name = ?', [now, cn]);
    });

    if (stageCompletionCandidateId !== null) {
      const { force = false } = options;
      const validation = await this.pm._validateStageArtifacts(cwd, stage, cn);
      if (!validation.ok && !force) {
        console.error(`⚠️  阶段 ${stage} 所有步骤已完成，但产物校验未通过，阶段不标记为 completed：`);
        for (const err of validation.errors) console.error(`   - ${err}`);
        // 出路提示常放在 warnings（如「写明不改理由即可豁免」），阻断时必须一并打出，
        // 否则 agent 只看到症状看不到怎么过（驾驭问题根因：hint 在 warning、出口只打 error）。
        for (const warn of (validation.warnings || [])) console.error(`   · ${warn}`);
        console.error(`   请修复产物后走正常流程 sillyspec run ${stage} --done，或使用 --force（将记录审计日志）。`);
      } else {
        if (!validation.ok && force) {
          console.warn(`⚠️  --force 强制标记阶段 ${stage} completed（校验未通过，已记录审计日志）`);
          this.pm._appendAuditLog(cwd, {
            action: 'update-step --force (stage auto-complete)',
            stage,
            change: cn,
            validationErrors: validation.errors,
          });
        }
        db.transaction((tDb) => {
          tDb.run('UPDATE stages SET status = "completed", completed_at = ? WHERE id = ?', [new Date().toISOString(), stageCompletionCandidateId]);
        });
        console.log(`✅ 阶段 ${stage} 所有步骤已完成，阶段已标记为 completed`);
      }
    }

    console.log(`✅ 步骤已更新: ${stage}/${stepName} → ${status || '（仅更新 output）'}`);
  }

  async updateBatchProgress(cwd, batchData, changeName = null) {
    const cn = changeName || null;

    const db = await this.pm._ensureDB(cwd);
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
    const data = await this.pm.read(cwd, changeName);
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
}

