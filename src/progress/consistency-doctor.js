// W6 Step9a: Revision v1 状态一致性检查 + 修复 + --force 审计日志。
// 从 src/progress.js 单体 ProgressManager 抽出。持有 pm 引用（构造注入），调 pm.read / pm._write /
// pm._ensureRuntimeDir / pm._runtimePath（persistence-core 留 facade 本体）。
import { appendFileSync } from 'fs';
import { existsSync } from 'fs';
import { STAGE_ORDER } from './shared.js';

export class ConsistencyDoctor {
  constructor(pm) {
    this.pm = pm;
  }

  /**
   * 强制状态变更的审计记录（--force 逃生口专用）。
   * 追加到 .runtime/audit.log，供人工/doctor 追溯"谁在什么时候绕过了校验"。
   */
  _appendAuditLog(cwd, entry) {
    try {
      this.pm._ensureRuntimeDir(cwd);
      const auditPath = this.pm._runtimePath(cwd, 'audit.log');
      const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
      appendFileSync(auditPath, line + '\n');
    } catch (e) {
      console.warn(`⚠️  审计日志写入失败: ${e.message}`);
    }
  }

  /**
   * Revision v1 状态一致性检查
   * 只报告，不自动修复。
   * @param {string} cwd
   * @param {string|null} changeName
   * @returns {{ ok: boolean, issues: string[], warnings: string[] }}
   */
  async checkConsistency(cwd, changeName = null) {
    const data = await this.pm.read(cwd, changeName);
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

    const data = await this.pm.read(cwd, changeName);
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

      // Fix e: execute 阶段 completed stage 有 pending/stale/in-progress step，但 review.json 客观产出已全通过 → 状态脱钩自动修
      // （坑 verify-archive-flow-pitfalls 坑1+坑5：plan 加 Wave / execute Wave step 未走 --done，但 task 实际有 review.json verdict 且非 fail）
      // 安全边界：仅当 changeName 有效、source=review.json（客观源可用）且 pending=0（所有 task verdict 通过）才自动修，
      // 否则回落到 Manual a（保守不动）。不碰非 execute 阶段。
      let executeAutoFixed = false;
      if (stageName === 'execute' && changeName && sd.status === 'completed' && sd.steps) {
        const badSteps = sd.steps.filter(st => ['pending', 'stale', 'in-progress'].includes(st.status));
        if (badSteps.length > 0) {
          try {
            const changeDir = this.pm._changePath(cwd, changeName);
            if (changeDir && existsSync(changeDir)) {
              const runtimeRoot = this.pm._runtimePath(cwd);
              const { summarizeTaskCompletion } = await import('../task-review.js');
              const summary = summarizeTaskCompletion({ changeDir, runtimeRoot, changeName });
              if (summary.source === 'review.json' && summary.total > 0 && summary.pending.length === 0) {
                const desc = `execute: ${badSteps.length} 个 step 状态脱钩（${badSteps.map(st => st.name).join(', ')}）——review.json 客观产出全通过（${summary.completed}/${summary.total}），自动标 completed`;
                fixable.push({
                  stage: stageName,
                  action: 'align_execute_steps_to_reviews',
                  description: desc,
                  apply: (d) => {
                    for (const st of d.stages[stageName].steps) {
                      if (['pending', 'stale', 'in-progress'].includes(st.status)) {
                        st.status = 'completed';
                        st.completedAt = st.completedAt || now;
                      }
                    }
                  },
                });
                executeAutoFixed = true;
              }
            }
          } catch (e) {
            console.warn(`⚠️  execute 产出核验异常（回落 manual）: ${e.message}`);
          }
        }
      }

      // Manual a: completed stage 里有 pending/stale/in-progress steps（execute 已由 Fix e 自动修则跳过）
      if (!executeAutoFixed && sd.status === 'completed' && sd.steps) {
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
      await this.pm._write(cwd, data, changeName);
      console.log(`\n  ✅ 已修复 ${applied.length} 项`);
    }

    console.log('');

    return { fixable, manual, applied };
  }
}

