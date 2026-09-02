// W6 Step9d: 阶段状态机 —— completeStage/reopen/reset/validate/show/status + 产物校验 + 下游级联 +
// 显示辅助。从 src/progress.js 单体 ProgressManager 抽出（Step9 最后一步）。持有 pm 引用（构造注入），
// 调 pm.read/_write/_ensureDB/_getSpecDir/readGlobal/_runtimePath/listChanges/_appendAuditLog/
// _renderBatchProgress（persistence-core + 其他组 delegate）。组内方法互调保持 this.X（同 class）。
// completeStage 五层（resolve/validate/force/tx/history/print）整体搬迁，不拆流水线（保行为、最低风险）。
import { mkdirSync, existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import { writeAtomicSync } from '../fs-atomic.js';
import { runValidators } from '../stage-contract.js';
import { VALID_STAGES, STAGE_LABELS, STAGE_ORDER, MAIN_FLOW_ORDER, SPEC_DIR_NAME, CURRENT_VERSION, STALL_WARN_DAYS, emptyStage } from './shared.js';

/**
 * 归一化步骤的已记录等待回答（show 渲染用，跨会话恢复数据源）。
 * waitAnswers 走 pm.read 时已 JSON.parse，但容错字符串/损坏；单值列 wait_answer（旧路径）并入第 1 轮。
 */
function _stepWaitRounds(step) {
  let arr = step.waitAnswers;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = null; } }
  const rounds = Array.isArray(arr) ? arr.filter(r => r && typeof r.answer === 'string' && r.answer.trim() !== '') : [];
  if (rounds.length === 0 && typeof step.waitAnswer === 'string' && step.waitAnswer.trim() !== '') {
    return [{ round: 1, answer: step.waitAnswer }];
  }
  return rounds.map((r, i) => ({ round: typeof r.round === 'number' ? r.round : i + 1, answer: r.answer }));
}

/**
 * 容错时间戳解析：ISO 8601（DB last_active 正常形态）优先，回退 zh-CN 本地格式
 * （reopenStage/reset 等旧路径曾把 toLocaleString('zh-CN') 写进 lastActive）。解析失败 → null。
 */
function _parseFlexibleTs(dateStr) {
  if (!dateStr) return null;
  let ts = Date.parse(dateStr);
  if (isNaN(ts)) {
    const m = dateStr.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) ts = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  }
  return isNaN(ts) ? null : ts;
}

export class StageMachine {
  constructor(pm) {
    this.pm = pm;
  }

  /**
   * 阶段产物校验门：progress complete-stage / update-step 自动完成时复用
   * stage-contract 的 validator，防止零产物阶段被直接标 completed。
   */
  _validateStageArtifacts(cwd, stage, changeName) {
    const specDir = this.pm._getSpecDir(cwd);
    const defaultSpec = join(resolve(cwd), SPEC_DIR_NAME);
    const specRoot = resolve(specDir) === defaultSpec ? null : specDir;
    let projectName = null;
    try {
      const g = this.pm.readGlobal(cwd);
      projectName = g?.project || null;
    } catch {}
    return runValidators(stage, cwd, changeName, {
      projectName: projectName || basename(resolve(cwd)),
      specRoot,
    });
  }

  completeStage(cwd, stage, changeName = null, opts = {}) {
    const { force = false } = opts;
    if (!VALID_STAGES.includes(stage)) {
      console.log(`❌ 未知阶段: ${stage}`);
      return;
    }

    const db = this.pm._ensureDB(cwd);
    const now = new Date().toISOString();

    // 获取变更名
    let cn = changeName;
    if (!cn) {
      const changes = this.pm.listChanges(cwd);
      if (changes.length === 1) cn = changes[0];
      if (!cn) { console.log('❌ 无法确定当前变更，请指定 --change <name>'); return; }
    }

    // ── stale 拒绝门（W1 改动点 2）：complete-stage 不再静默回填 stale 步骤 ──
    // 放在产物校验门之前——stale 是更具体的拒绝原因（产物缺失时旧序会被产物门先拦走，
    // stale 门永远执行不到）；无 --force 拒绝并列名，有 --force 放行并把 stale 步骤名并入审计。
    let staleBackfillNote = null;
    {
      const sqlDbForStaleCheck = db.getDb();
      const changeRowForStale = sqlDbForStaleCheck.prepare('SELECT id FROM changes WHERE name = ?').get(cn);
      if (changeRowForStale !== undefined) {
        const stageRowForStale = sqlDbForStaleCheck.prepare('SELECT id FROM stages WHERE change_id = ? AND stage = ?').get(changeRowForStale.id, stage);
        if (stageRowForStale !== undefined) {
          const staleSteps = sqlDbForStaleCheck.prepare('SELECT name FROM steps WHERE stage_id = ? AND status = ?').all(stageRowForStale.id, 'stale');
          if (staleSteps.length > 0) {
            if (!force) {
              console.error(`❌ complete-stage 被拒绝：阶段 ${stage} 存在 ${staleSteps.length} 个 stale 步骤`);
              for (const st of staleSteps) console.error(`   - ${st.name}`);
              console.error(`   stale 步骤需真实执行推进（sillyspec run ${stage} 逐个完成），或确认方案未变后用 --force 强制回填（将记录审计日志）。`);
              return;
            }
            staleBackfillNote = `stale 步骤回填: ${staleSteps.map(s => s.name).join(', ')}`;
          }
        }
      }
    }

    // ── 产物校验门：complete-stage 不再是零校验后门 ──
    // 与 run.js completeStep 的 validator 同源；--force 为显式逃生口（留审计）。
    const validation = this._validateStageArtifacts(cwd, stage, cn);
    if (staleBackfillNote) {
      validation.errors = [...(validation.errors || []), staleBackfillNote];
      validation.ok = false;
    }
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

    db.transaction(() => {
      const sqlDb = db.getDb();
      const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(cn);
      if (changeRow === undefined) return;
      const changeId = changeRow.id;

      // 确保 stages 行存在（阶段不存在时自动创建）
      sqlDb.prepare(`INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, 'pending')`).run(changeId, stage);

      // UPDATE stages.status=completed + completed_at
      sqlDb.prepare(`UPDATE stages SET status = 'completed', completed_at = ? WHERE change_id = ? AND stage = ?`).run(now, changeId, stage);

      // 将该阶段所有 pending 步骤标记为 completed
      const stageRow = sqlDb.prepare('SELECT id FROM stages WHERE change_id = ? AND stage = ?').get(changeId, stage);
      if (stageRow !== undefined) {
        const stageId = stageRow.id;
        sqlDb.prepare(
          `UPDATE steps SET status = 'completed', completed_at = ? WHERE stage_id = ? AND status IN ('pending', 'stale')` // stale 一并回填（reopen --done 场景，坑 brainstorm-reopen-step-state-desync；--force 时放行）
        ).run(now, stageId);
      }

      // UPDATE changes.last_active
      sqlDb.prepare('UPDATE changes SET last_active = ? WHERE name = ?').run(now, cn);
      // 本地脏度（D-013 / task-04）：阶段完成是本地推进
      this.pm._touchLocalModified(cwd, cn, now);
    });

    // 写 history 文件（保持文件系统，不变）
    const data = this.pm.read(cwd, cn);
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

  show(cwd, changeName = null) {
    // 如果指定了变更名，只显示该变更
    if (changeName) {
      return this._showChange(cwd, changeName);
    }

    // 否则显示所有变更
    const changes = this.pm.listChanges(cwd);
    if (changes.length === 0) {
      console.log('ℹ️  没有活跃的变更');
      return;
    }

    if (changes.length === 1) {
      return this._showChange(cwd, changes[0]);
    }

    // 多个变更：汇总显示
    const global = this.pm.readGlobal(cwd);
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log(`  项目: ${(global?.project) || basename(cwd) || '(未命名)'}`);
    // 当前操作目标与活跃列表区分（坑 status-change-pointer-ambiguous）：多活跃时不带
    // --change 的 run/progress 不隐式选任何一个（index.js --change 解析多活跃报错），明确
    // 说出来，防止把残留空壳（default/quick-xxx/目录缺失记录）误当操作目标跑错 change。
    console.log(`  当前操作目标: （多活跃——不带 --change 时不隐式选定，run 须显式 --change <name>）`);
    console.log(`  活跃变更记录: ${changes.length} 个（下列为 DB 中存在的活跃记录，非操作目标）`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    const changesRoot = join(this.pm._getSpecDir(cwd), 'changes');
    for (const cn of changes) {
      const data = this.pm.read(cwd, cn);
      const dirMissing = !existsSync(join(changesRoot, cn));
      if (!data) {
        console.log(`  📂 ${cn} — (无法读取)${dirMissing ? ' ⚠️ 目录缺失（残留记录，sillyspec doctor --cleanup-ghosts --confirm 可归档清理）' : ''}`);
        continue;
      }
      const currentStage = data.currentStage || '(无)';
      const stageLabel = STAGE_LABELS[data.currentStage] || currentStage;
      const lastActive = data.lastActive ? this._timeAgo(data.lastActive) : '未知';

      console.log(`  📂 ${cn}${dirMissing ? ' ⚠️ 目录缺失（残留记录，sillyspec doctor --cleanup-ghosts --confirm 可归档清理）' : ''}`);
      console.log(`     当前阶段: ${stageLabel}  最近活跃: ${lastActive}`);
      // 滞留/疑似完成信号（2026-08-30 用户反馈②）：多变更汇总逐行透出，无需逐个 --change 看详情
      const stall = this._stallSignal(cwd, data, cn);
      if (stall) {
        console.log(`     ⏳ ${stall.text}`);
        console.log(stall.kind === 'likely-complete'
          ? `        → 建议：${stall.command ? `${stall.command} 收口后走 verify，或 ` : ''}sillyspec doctor --align-execute-progress 对齐派生戳`
          : `        → 若已放弃：sillyspec change-delete --change ${cn}（默认 dry-run）`);
      }
      console.log('');
    }

    console.log(`  💡 查看详情：sillyspec progress show --change <name>`);
    console.log('');
  }

  /**
   * 只读全局总览数据（show 多变更汇总视图的机器版，2026-09-02 跨 agent 单一状态源）。
   * 列出全部活跃变更：各自当前阶段 / 各阶段步骤计数 / ghost（目录缺失残留）/ stall 信号。
   * 纯数据零 console——machine-interface.runStatusOverview 包装 envelope（`sillyspec progress show --json`）。
   *
   * 与 dump（§6.2 单变更视角）语义互补：dump 取最近活跃一个供 daemon 轮询「当前工作流状态」；
   * overview 列出全部活跃，供 SillyHub 面板 / 跨 agent 看「谁在动哪些变更」（多活跃是变更隔离常态）。
   * 字段 snake_case + last_active ISO 规范化（_dumpIso），与 dump 契约风格对齐（backend pydantic 消费）。
   *
   * @param {string} cwd - 项目根目录（show 同参语义，非 specDir）
   * @returns {{project: string|null, active_changes: number, changes: Array<object>}}
   */
  overview(cwd) {
    const changes = this.pm.listChanges(cwd);
    const changesRoot = join(this.pm._getSpecDir(cwd), 'changes');
    const list = [];
    for (const cn of changes) {
      const data = this.pm.read(cwd, cn);
      const dirMissing = !existsSync(join(changesRoot, cn));
      const entry = {
        name: cn,
        readable: !!data,
        ghost: dirMissing,
        current_stage: data?.currentStage || null,
        stage_label: data ? (STAGE_LABELS[data.currentStage] || data.currentStage || null) : null,
        last_active: this.pm._dumpIso(data?.lastActive) || null,
      };
      if (data) {
        // 各阶段状态 + 步骤计数（面板进度条数据源）；总计另出顶层 steps 汇总
        let stepsTotal = 0, stepsCompleted = 0;
        const stages = {};
        for (const st of VALID_STAGES) {
          const sd = data.stages?.[st];
          if (!sd) continue;
          const steps = Array.isArray(sd.steps) ? sd.steps : [];
          const completed = steps.filter(s => s.status === 'completed').length;
          stages[st] = { status: sd.status || 'pending', steps_total: steps.length, steps_completed: completed };
          stepsTotal += steps.length;
          stepsCompleted += completed;
        }
        entry.stages = stages;
        entry.steps = { total: stepsTotal, completed: stepsCompleted };
        // 滞留/疑似完成信号（与 show 汇总同源 _stallSignal，纯数据不带渲染建议文案）
        const stall = this._stallSignal(cwd, data, cn);
        if (stall) {
          entry.stall = { kind: stall.kind, days: this._daysSince(data.lastActive), text: stall.text };
        }
      }
      list.push(entry);
    }
    const global = this.pm.readGlobal(cwd);
    return {
      project: global?.project || basename(cwd) || null,
      active_changes: changes.length,
      changes: list,
    };
  }

  _showChange(cwd, changeName) {
    const data = this.pm.read(cwd, changeName);
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
          // 已记录的历史回答（等待中/已完成步骤都可能累积多轮；续跑时由 outputStep 自动回放，
          // 此处摘要供人工排查「中断后哪些用户回答还在」）。每轮截断 120 字，全文在进度库 wait_answers。
          const rounds = _stepWaitRounds(step);
          if (rounds.length > 0) {
            console.log(`       历史回答（${rounds.length} 轮，续跑自动回放）：`);
            for (const r of rounds) {
              console.log(`         第${r.round}轮: ${r.answer.length > 120 ? r.answer.slice(0, 120) + '…' : r.answer}`);
            }
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

    // ── 滞留/疑似完成信号（2026-08-30 用户反馈②）──
    const stall = this._stallSignal(cwd, data, changeName);
    if (stall) {
      console.log('');
      console.log(`  ⏳ ${stall.text}`);
      console.log(stall.kind === 'likely-complete'
        ? `     建议：${stall.command ? `${stall.command} 收口后走 verify，或 ` : ''}sillyspec doctor --align-execute-progress 对齐派生戳`
        : `     若已放弃：sillyspec change-delete --change ${changeName}（默认 dry-run）；若仍在推进请忽略`);
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
    // 建议命令携带 --change（坑 suggestion-command-missing-change，2026-08-21 实证）：
    // 多活跃变更仓 pm.read(cwd, null) 无法自动定位变更 → 照抄建议命令（不带 --change）执行
    // 报「未找到进度数据」，阶段完结后的 --wait 确认门也登记不上。progress 带 currentChange
    // 时附加；无（测试 fixture / 旧数据）保持裸命令（存量断言零回归）。
    const cc = data.currentChange ? ` --change ${data.currentChange}` : '';
    // 找到第一个 revising 阶段
    const revisingStage = STAGE_ORDER.find(s => data.stages[s]?.status === 'revising');
    if (revisingStage) {
      const sd = data.stages[revisingStage];
      return {
        text: `${STAGE_LABELS[revisingStage] || revisingStage} 正在修订中（revision ${sd.revision || 1}），请继续完成修订。`,
        command: `sillyspec run ${revisingStage}${cc}`,
      };
    }

    // 找到第一个 stale 阶段（上游已修，下游需要重建）
    const staleStage = STAGE_ORDER.find(s => data.stages[s]?.status === 'stale');
    if (staleStage) {
      const sd = data.stages[staleStage];
      return {
        text: `${STAGE_LABELS[staleStage] || staleStage} 已失效（${sd.staleReason || '上游修订'}），需要从第一步重建。`,
        command: `sillyspec run ${staleStage} --reopen --from-step 1${cc}`,
      };
    }

    // 找到第一个有 pending/waiting/failed 步骤的 in-progress 阶段
    // C14b：排除 scan（同下方主流程推荐循环）——scan 是 auxiliary，中途未完成时恒处
    // STAGE_ORDER 首位且 in-progress，会把「下一步」劫持为 scan，掩盖主流程真实待办。
    for (const s of STAGE_ORDER) {
      if (s === 'scan') continue
      const sd = data.stages[s];
      if (!sd) continue;
      if (sd.status === 'in-progress' && sd.steps) {
        // waiting 优先于 pending/failed：暂停等用户决策的阶段，下一步是 --continue --answer
        // 恢复（坑 archive-step3-wait-answer-hint-late：建议命令前置 --answer，而非泛泛的
        // 「继续执行」让 agent 撞 --done 报错才知道要 --answer）
        const waitIdx = sd.steps.findIndex(st => st.status === 'waiting');
        if (waitIdx !== -1) {
          const ws = sd.steps[waitIdx];
          return {
            text: `${STAGE_LABELS[s] || s} 进行中，Step ${waitIdx + 1}「${ws.name}」等待用户输入${ws.waitReason ? `（${ws.waitReason}）` : ''}，用 --answer 恢复。`,
            command: `sillyspec run ${s} --continue --answer "用户回答"${cc}`,
          };
        }
        // blocked（deps/review.json 门控阻断标记）也计入待办（坑 deps-gate-blocked-invisible）：
        // 漏计会让全局「下一步」建议跳过被阻断的阶段/步骤，误导 agent 去跑更后面的阶段。
        const hasPending = sd.steps.some(st => ['pending', 'waiting', 'failed', 'blocked'].includes(st.status));
        if (hasPending) {
          return {
            text: `${STAGE_LABELS[s] || s} 进行中，继续执行下一步。`,
            command: `sillyspec run ${s}${cc}`,
          };
        }
      }
    }

    // 找主流程里第一个「未完成且上游已就绪」的阶段，推荐它作为下一步。
    // 修两个缺陷（曾导致 brainstorm 完成后误推 archive）：
    //   ① 原 steps.length>0 要求：plan/execute/verify 首次 run 前惰性未初始化(steps 空)被跳过；
    //   ② 原 upstream 把 pending 当就绪：archive 的上游 plan/execute/verify 即便 pending 也算 ok。
    //   叠加 → 循环跳过未初始化的中间阶段，漏到 archive(steps 非空)误推，违反流程顺序。
    // 改为：不要求 steps(空=该开始了)；upstream 必须全 completed(pending 不算就绪)——
    // archive 只在 scan/brainstorm/plan/execute/verify 全完成后才可能被推荐。
    for (const s of STAGE_ORDER) {
      if (s === 'scan') continue  // scan 是 auxiliary（按需显式跑），不作"下一步"推荐——否则未 completed 时恒处 STAGE_ORDER 首位且 upstream 空→恒就绪→误推 scan（回头路，与 complete.js brainstorm/quick 专属分支同类根因）。prompt-control-debt plan-c。
      const sd = data.stages[s];
      if (!sd) continue;
      if (sd.status === 'completed' || sd.status === 'skipped') continue;
      const idx = STAGE_ORDER.indexOf(s);
      const upstream = STAGE_ORDER.slice(0, idx).filter(us => us !== 'scan');  // scan(auxiliary)不算上游——否则 scan 未 completed 会阻塞所有主流程阶段，与上面跳过 scan 的迭代矛盾
      const upstreamOk = upstream.every(us => data.stages[us]?.status === 'completed');
      if (upstreamOk) {
        return {
          text: `可以开始 ${STAGE_LABELS[s] || s}。`,
          command: `sillyspec run ${s}${cc}`,
        };
      }
    }

    return null;
  }

  status(cwd, changeName = null) {
    this.show(cwd, changeName);
  }

  validate(cwd, changeName = null) {
    const data = this.pm.read(cwd, changeName);
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
      this.pm._write(cwd, fixed);
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
  reopenStage(cwd, stage, opts = {}) {
    const { fromStep, changeName = null } = opts;

    const data = this.pm.read(cwd, changeName);
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

    this.pm._write(cwd, data, changeName);

    // 级联标记下游阶段为 stale
    const downstreamStages = this._getDownstreamStages(stage);
    if (downstreamStages.length > 0) {
      const data2 = this.pm.read(cwd, changeName); // 重新读取以获取最新状态
      if (data2) {
        for (const ds of downstreamStages) {
          if (data2.stages[ds] && data2.stages[ds].status === 'completed') {
            data2.stages[ds].status = 'stale';
            data2.stages[ds].staleReason = `上游阶段 ${stage} 已修订 (revision ${newRevision})`;
            data2.stages[ds].completedAt = null;
          }
        }
        this.pm._write(cwd, data2, changeName);
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

  reset(cwd, stage, changeName = null) {
    if (stage) {
      const data = this.pm.read(cwd, changeName);
      if (!data) { console.log('❌ 无法读取进度数据'); return; }
      if (!data.stages[stage]) { console.log(`❌ 未知阶段: ${stage}`); return; }
      // 破坏性预览：reset 不可逆地清空该阶段所有步骤（含已完成），先告诉 agent 丢了什么。
      const sd = data.stages[stage];
      const steps = sd.steps || [];
      const doneCount = steps.filter(s => s.status === 'completed').length;
      console.warn(`⚠️  即将重置阶段「${stage}」：丢弃 ${steps.length} 个步骤（其中 ${doneCount} 个已完成，revision ${sd.revision || 0}）。此操作不可逆。`);
      data.stages[stage] = emptyStage();
      data.lastActive = new Date().toLocaleString('zh-CN',{hour12:false});
      this.pm._write(cwd, data);
      console.log(`✅ 已重置阶段: ${stage}`);
    } else {
      // 重置所有变更或指定变更
      if (changeName) {
        console.warn(`⚠️  即将重置变更「${changeName}」的全部进度（所有阶段的 steps + stage 状态，产物文件不动）。此操作不可逆。`);
        // SQL: 删除该变更的所有 stages 和 steps 数据
        const db = this.pm._ensureDB(cwd);
        db.transaction(() => {
          const sqlDb = db.getDb();
          const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(changeName);
          if (changeRow !== undefined) {
            const changeId = changeRow.id;
            sqlDb.prepare('DELETE FROM steps WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?)').run(changeId);
            sqlDb.prepare('DELETE FROM stages WHERE change_id = ?').run(changeId);
            // 重新插入所有阶段（注意：上方已 DELETE stages，无需再 UPDATE）
            for (const s of VALID_STAGES) {
              sqlDb.prepare(`INSERT OR IGNORE INTO stages (change_id, stage, status) VALUES (?, ?, 'pending')`).run(changeId, s);
            }
            // 本地脏度（D-013 / task-04）：重置该变更全部进度是本地推进
            this.pm._touchLocalModified(cwd, changeName);
          }
        });
        console.log(`✅ 已重置变更 ${changeName} 的进度`);
      } else {
        const changes = this.pm.listChanges(cwd);
        console.warn(`⚠️  即将重置【所有 ${changes.length} 个变更】的进度（仅 stage 状态，产物文件不动）。此操作不可逆且范围最大。`);
        const db = this.pm._ensureDB(cwd);
        db.transaction(() => {
          const sqlDb = db.getDb();
          for (const cn of changes) {
            const changeRow = sqlDb.prepare('SELECT id FROM changes WHERE name = ?').get(cn);
            if (changeRow !== undefined) {
              const changeId = changeRow.id;
              sqlDb.prepare('DELETE FROM steps WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?)').run(changeId);
              sqlDb.prepare(`UPDATE stages SET status = 'pending', started_at = NULL, completed_at = NULL WHERE change_id = ?`).run(changeId);
              // 本地脏度（D-013 / task-04）：重置进度是本地推进
              this.pm._touchLocalModified(cwd, cn);
            }
          }
        });
        console.log('✅ 已重置所有变更的进度');
      }
    }
  }

  /**
   * 滞留信号检测（2026-08-30 用户反馈②：7 个「代码全落地但流程没收口」的变更挂 38 天
   * 无人发现——progress 视图缺中期滞留提示）。两类信号（advisory，只打印提示行不阻断）：
   *   - likely-complete：tasks.md 全勾但 execute 阶段未完成（不限天数——全勾未收口本身
   *     即异常态；判据与 doctor D5 execute-progress-plan-mismatch 同源，但 D5 藏在
   *     doctor --json 里，日常 progress show 看不见）
   *   - stalled：流程未收口（archive 未完成）且 last_active 超 STALL_WARN_DAYS 天无活跃
   * 流程已收口（archive completed / currentStage=archive）不提示。
   * @returns {{kind:'likely-complete'|'stalled', text:string, command?:string}|null}
   */
  _stallSignal(cwd, data, changeName) {
    if (!data || !data.stages) return null;
    if (data.stages.archive?.status === 'completed' || data.currentStage === 'archive') return null;
    const stageLabel = STAGE_LABELS[data.currentStage] || data.currentStage || '(无)';
    // ① 实现疑似完成：tasks 全勾 + execute 未完成（回 verify 收口的前置是 execute 收口）
    if (data.stages.execute?.status !== 'completed') {
      let plan = null;
      try {
        plan = this.pm.readPlanCheckboxStatus(join(this.pm._getSpecDir(cwd), 'changes', changeName));
      } catch { plan = null; }
      if (plan && plan.total > 0 && plan.checked >= plan.total) {
        return {
          kind: 'likely-complete',
          text: `实现疑似完成未收口：tasks ${plan.checked}/${plan.total} 全勾，但流程停在「${stageLabel}」（execute 阶段 ${data.stages.execute?.status || '未开始'}）`,
          // execute 阶段才建议 run execute 收口；更早阶段（brainstorm/plan）tasks 全勾属
          // 数据异常态，只提示事实 + doctor 对齐备选，不给当前状态下不可执行的命令
          command: data.currentStage === 'execute'
            ? `sillyspec run execute${data.currentChange ? ` --change ${data.currentChange}` : ''}`
            : null,
        };
      }
    }
    // ② 滞留：超 N 天无活跃
    const days = this._daysSince(data.lastActive);
    if (days !== null && days >= STALL_WARN_DAYS) {
      return {
        kind: 'stalled',
        text: `滞留：已 ${days} 天无活跃，流程停在「${stageLabel}」未收口`,
      };
    }
    return null;
  }

  /** last_active 距今天数（向下取整）；解析失败 → null（不提示，宁漏勿误报） */
  _daysSince(dateStr) {
    const ts = _parseFlexibleTs(dateStr);
    if (ts === null) return null;
    return Math.floor((Date.now() - ts) / 86400000);
  }

  _timeAgo(dateStr) {
    const ts = _parseFlexibleTs(dateStr);
    if (ts === null) return dateStr || '未知';
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }
}

