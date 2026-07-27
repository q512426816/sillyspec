// W6 Step9d: 阶段状态机 —— completeStage/reopen/reset/validate/show/status + 产物校验 + 下游级联 +
// 显示辅助。从 src/progress.js 单体 ProgressManager 抽出（Step9 最后一步）。持有 pm 引用（构造注入），
// 调 pm.read/_write/_ensureDB/_getSpecDir/readGlobal/_runtimePath/listChanges/_appendAuditLog/
// _renderBatchProgress（persistence-core + 其他组 delegate）。组内方法互调保持 this.X（同 class）。
// completeStage 五层（resolve/validate/force/tx/history/print）整体搬迁，不拆流水线（保行为、最低风险）。
import { mkdirSync } from 'fs';
import { join, resolve, basename } from 'path';
import { writeAtomicSync } from '../fs-atomic.js';
import { VALID_STAGES, STAGE_LABELS, STAGE_ORDER, MAIN_FLOW_ORDER, SPEC_DIR_NAME, CURRENT_VERSION, emptyStage } from './shared.js';

export class StageMachine {
  constructor(pm) {
    this.pm = pm;
  }

  /**
   * 阶段产物校验门：progress complete-stage / update-step 自动完成时复用
   * stage-contract 的 validator，防止零产物阶段被直接标 completed。
   */
  async _validateStageArtifacts(cwd, stage, changeName) {
    const { runValidators } = await import('../stage-contract.js');
    const specDir = this.pm._getSpecDir(cwd);
    const defaultSpec = join(resolve(cwd), SPEC_DIR_NAME);
    const specRoot = resolve(specDir) === defaultSpec ? null : specDir;
    let projectName = null;
    try {
      const g = await this.pm.readGlobal(cwd);
      projectName = g?.project || null;
    } catch {}
    return runValidators(stage, cwd, changeName, {
      projectName: projectName || basename(resolve(cwd)),
      specRoot,
    });
  }

  async completeStage(cwd, stage, changeName = null, opts = {}) {
    const { force = false } = opts;
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}`);
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

    // ── 产物校验门：complete-stage 不再是零校验后门 ──
    // 与 run.js completeStep 的 validator 同源；--force 为显式逃生口（留审计）。
    const validation = await this._validateStageArtifacts(cwd, stage, cn);
    if (!validation.ok) {
      if (!force) {
        console.error(`❌ complete-stage 被拒绝：阶段 ${stage} 产物校验未通过`);
        for (const err of validation.errors) console.error(`   - ${err}`);
        console.error(`   请修复产物后重试，或走正常流程 sillyspec run ${stage} --done。`);
        console.error(`   确需强制标记（如 doctor 修复），使用 --force（将记录审计日志）。`);
        return;
      }
      console.warn(`⚠️  --force 强制完成阶段 ${stage}（校验未通过，已记录审计日志）`);
      for (const err of validation.errors) console.warn(`   - ${err}`);
      this.pm._appendAuditLog(cwd, {
        action: 'complete-stage --force',
        stage,
        change: cn,
        validationErrors: validation.errors,
      });
    } else if (force) {
      // 校验通过但仍显式 --force：也留一条审计记录，保持行为可追溯
      this.pm._appendAuditLog(cwd, { action: 'complete-stage --force', stage, change: cn, validationErrors: [] });
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
    const data = await this.pm.read(cwd, cn);
    if (data && data.stages && data.stages[stage]) {
      const historyDir = this.pm._runtimePath(cwd, 'history');
      mkdirSync(historyDir, { recursive: true });
      const ts = now.replace(/[:.TZ-]/g, '');
      const stageData = data.stages[stage];
      writeAtomicSync(
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
    const changes = await this.pm.listChanges(cwd);
    if (changes.length === 0) {
      console.log('ℹ️  没有活跃的变更');
      return;
    }

    if (changes.length === 1) {
      return await this._showChange(cwd, changes[0]);
    }

    // 多个变更：汇总显示
    const global = await this.pm.readGlobal(cwd);
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  项目: ${(global?.project) || basename(cwd) || '(未命名)'}`);
    console.log(`  活跃变更: ${changes.length} 个`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    for (const cn of changes) {
      const data = await this.pm.read(cwd, cn);
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
    const data = await this.pm.read(cwd, changeName);
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
      const batchLine = this.pm._renderBatchProgress(data.batchProgress);
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

  async validate(cwd, changeName = null) {
    const data = await this.pm.read(cwd, changeName);
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
      await this.pm._write(cwd, fixed);
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

    const data = await this.pm.read(cwd, changeName);
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

    await this.pm._write(cwd, data, changeName);

    // 级联标记下游阶段为 stale
    const downstreamStages = this._getDownstreamStages(stage);
    if (downstreamStages.length > 0) {
      const data2 = await this.pm.read(cwd, changeName); // 重新读取以获取最新状态
      if (data2) {
        for (const ds of downstreamStages) {
          if (data2.stages[ds] && data2.stages[ds].status === 'completed') {
            data2.stages[ds].status = 'stale';
            data2.stages[ds].staleReason = `上游阶段 ${stage} 已修订 (revision ${newRevision})`;
            data2.stages[ds].completedAt = null;
          }
        }
        await this.pm._write(cwd, data2, changeName);
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
      const data = await this.pm.read(cwd, changeName);
      if (!data) { console.log('❌ 无法读取进度数据'); return; }
      if (!data.stages[stage]) { console.log(`❌ 未知阶段: ${stage}`); return; }
      data.stages[stage] = emptyStage();
      data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
      await this.pm._write(cwd, data);
      console.log(`✅ 已重置阶段: ${stage}`);
    } else {
      // 重置所有变更或指定变更
      if (changeName) {
        // SQL: 删除该变更的所有 stages 和 steps 数据
        const db = await this.pm._ensureDB(cwd);
        db.transaction((sqlDb) => {
          const changeRow = sqlDb.exec('SELECT id FROM changes WHERE name = ?', [changeName]);
          if (changeRow && changeRow.length > 0 && changeRow[0].values.length > 0) {
            const changeId = changeRow[0].values[0][0];
            sqlDb.run('DELETE FROM steps WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?)', [changeId]);
            sqlDb.run('DELETE FROM stages WHERE change_id = ?', [changeId]);
            // 重新插入所有阶段（注意：上方已 DELETE stages，无需再 UPDATE）
            for (const s of VALID_STAGES) {
              sqlDb.run('INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, "pending")', [changeId, s]);
            }
          }
        });
        console.log(`✅ 已重置变更 ${changeName} 的进度`);
      } else {
        const changes = await this.pm.listChanges(cwd);
        const db = await this.pm._ensureDB(cwd);
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
}

