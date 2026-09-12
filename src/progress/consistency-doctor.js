// W6 Step9a: Revision v1 状态一致性检查 + 修复 + --force 审计日志。
// 从 src/progress.js 单体 ProgressManager 抽出。持有 pm 引用（构造注入），调 pm.read / pm._write /
// pm._ensureRuntimeDir / pm._runtimePath（persistence-core 留 facade 本体）。
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { DB } from '../db.js';
import { openDatabase } from '../db-engine.js';
import { summarizeTaskCompletion } from '../task-review.js';
import { STAGE_ORDER, MAIN_FLOW_ORDER } from './shared.js';

export class ConsistencyDoctor {
  constructor(pm) {
    this.pm = pm;
  }

  /**
   * 双进度库分裂探测（坑 progress-repair-dual-library-blind，2026-09-04 用户实证②：
   * 接管指针切换库后 progress repair 只看当前库，旧库残留的活跃变更进度完全不可见，
   * 报告「未发现问题，无需修复」的假阴性）。
   *
   * 判据：cwd 存在平台接管指针（.sillyspec-platform.json 指向库 A = 当前修复目标），
   * 同时 cwd/.sillyspec/.runtime/sillyspec.db（库 B = 切库前旧库）也存在且 ≠ 库 A
   * → 双库并存。自指指针（specRoot 解析回本地 .sillyspec）不算。
   *
   * 只读探测：另一库仅在 sillyspec.db 已存在时直读（DB 类 + 存在性前置检查，绝不新建库文件）；
   * 读失败 fail-open 返回库存在但活跃清单不可读，不阻断 check/repair 主流程。
   *
   * @param {string} cwd - 进度库锚定 cwd（index.js 传入 progDir）
   * @param {string|null} [changeName] - check/repair 的 --change 目标（判「操作错了库」用）
   * @returns {{ split: boolean, dualDb: boolean, bothActive: boolean, targetInOther: boolean, lines: string[] }}
   */
  detectLibrarySplit(cwd, changeName = null) {
    const out = { split: false, dualDb: false, bothActive: false, targetInOther: false, lines: [] };
    const pointerPath = join(cwd, '.sillyspec-platform.json');
    if (!existsSync(pointerPath)) return out;
    let ptr = null;
    try {
      ptr = JSON.parse(readFileSync(pointerPath, 'utf8'));
    } catch {
      return out; // 指针损坏由 resolvePlatformSpecDir fail-closed 负责，此处不重复报
    }
    if (!ptr.specRoot) return out;

    const localRoot = join(cwd, '.sillyspec');
    const localDbPath = join(localRoot, '.runtime', 'sillyspec.db');
    if (resolve(ptr.specRoot) === resolve(localRoot)) return out; // 自指/同库
    if (!existsSync(localDbPath)) return out; // 旧库无 DB → 无分裂

    out.dualDb = true;
    const currentSpecDir = this.pm._getSpecDir(cwd);
    // 当前库：DB 已存在才读（readGlobal 走 pm 连接池，不新开连接；不存在时 readGlobal 会
    // 隐式建库，须前置 existsSync 挡住——探测绝不产生写副作用）
    let current = null;
    if (existsSync(join(currentSpecDir, '.runtime', 'sillyspec.db'))) {
      try {
        const g = this.pm.readGlobal(cwd);
        current = { activeChanges: (g && g.activeChanges) || [] };
      } catch (e) {
        current = { activeChanges: [], unreadable: true, error: e.message };
      }
    }
    const other = this._readActiveQuiet(localRoot, cwd);
    const currentActive = current?.activeChanges || [];
    const otherActive = other?.activeChanges || [];

    out.lines.push(
      `双进度库并存（接管指针 ${pointerPath} → ${currentSpecDir}；切库前旧库残留 ${localRoot}）` +
      `——本次 check/repair 只作用于当前库，旧库状态不可见`
    );
    out.lines.push(
      `  当前库活跃变更: ${currentActive.length > 0 ? currentActive.join('、') : '(无)'}${current?.unreadable ? '（读取失败：' + current.error + '）' : ''}`
    );
    out.lines.push(
      `  旧库活跃变更: ${otherActive.length > 0 ? otherActive.join('、') : '(无)'}${other?.unreadable ? '（读取失败：' + other.error + '）' : ''}`
    );
    out.lines.push(
      `  处理：确认权威库后收尾/归档弃用库的活跃变更；或 sillyspec platform pointer --cleanup 删指针后重跑平台 scan 指向正确库；临时读旧库用 --spec-dir ${localRoot}`
    );

    if (currentActive.length > 0 && otherActive.length > 0) {
      out.bothActive = true;
      out.split = true;
    }
    // 目标变更只在旧库活跃（当前库查无）→ 本次操作几乎必然找错了库，最强信号
    if (changeName && otherActive.includes(changeName) && !currentActive.includes(changeName)) {
      out.targetInOther = true;
      out.split = true;
      out.lines.push(
        `  ⚠️ 目标变更 "${changeName}" 不在当前库，但旧库有同名活跃变更——本次操作错了库，修复应带上 --spec-dir ${localRoot}（或修正指针）`
      );
    }
    return out;
  }

  /**
   * 只读读一个库的活跃变更清单（detectLibrarySplit 专用）。
   * sillyspec.db 不存在返回 null（绝不新建库）；打开/读取失败返回 { unreadable, error }
   * 不上抛——分裂探测 fail-open，不阻断主流程。
   */
  _readActiveQuiet(specDir, cwd) {
    const dbPath = join(specDir, '.runtime', 'sillyspec.db');
    if (!existsSync(dbPath)) return null;
    let db = null;
    try {
      // 真只读（坑 read-active-quiet-write-open，2026-09-12 审查批 C-⑤）：旧 new DB().init()
      // 会跑 WAL PRAGMA（创建 -wal/-shm 侧车）且 schema 戳不匹配时执行 DDL 迁移——「只读探测」
      // 实际改写被探测库。readOnly 打开零副作用；打开失败（损坏/权限）→ unreadable 降级不变。
      db = openDatabase(dbPath, { readOnly: true });
      const rows = db.prepare("SELECT name FROM changes WHERE status = 'active' ORDER BY name").all();
      db.close();
      return { activeChanges: rows.map(r => r.name) };
    } catch (e) {
      try { if (db) db.close(); } catch { /* 已关闭/打开失败 */ }
      return { activeChanges: [], unreadable: true, error: e.message };
    }
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
  checkConsistency(cwd, changeName = null) {
    const data = this.pm.read(cwd, changeName);
    if (!data) {
      // 双库分裂探测不依赖单变更 progress 可读（read 失败时更要看见另一库，坑
      // progress-repair-dual-library-blind）：无 progress 也要报分裂，不能只报「无法读取」
      const splitNoData = this.detectLibrarySplit(cwd, changeName);
      const issuesNoData = ['无法读取进度数据'];
      if (splitNoData.targetInOther || splitNoData.bothActive) issuesNoData.push(...splitNoData.lines);
      return { ok: false, issues: issuesNoData, warnings: splitNoData.dualDb && !splitNoData.split ? splitNoData.lines : [] };
    }

    const issues = [];
    const warnings = [];

    // 双库分裂（2026-09-04 ②）：目标变更只在旧库 / 两库皆有活跃 → issue；
    // 仅双库并存（单侧活跃）→ warning（平台模式本地库保留真实资产是容忍态，避免常态误报）
    const libSplit = this.detectLibrarySplit(cwd, changeName);
    if (libSplit.targetInOther || libSplit.bothActive) {
      issues.push(...libSplit.lines);
    } else if (libSplit.dualDb) {
      warnings.push(...libSplit.lines);
    }

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
      // 用 MAIN_FLOW_ORDER（不含 scan）算上下游：scan 是 auxiliary 永不要求 completed，
      // 把 scan 当上游会让「scan stale/revising」误报 brainstorm 不该 completed（plan-c 同根因）。
      const stageIdx = MAIN_FLOW_ORDER.indexOf(stageName);
      for (let i = 0; i < stageIdx; i++) {
        const upstream = MAIN_FLOW_ORDER[i];
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

    // FR-07 / AC-03 / design §7 / D-02：lost-update 间接信号
    // （.runtime/worktrees/<change> 目录残留 vs DB current_stage≠execute）。
    // 只读诊断并入 issues 报告，不写 DB / 不删 worktree / 不自动修复。
    const lostUpdateSignals = this.detectLostUpdateSignals(cwd);
    issues.push(...lostUpdateSignals);

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
   * 检测 lost-update 间接信号（FR-07 / AC-03 / design §7 / D-02）。
   *
   * 判据：.runtime/worktrees/<change> 目录存在但 DB current_stage ≠ 'execute'
   * → worktree 残留但进度被回退，是并发场景下 lost-update 的间接痕迹。
   *
   * 信号定义严格遵循 design §7 / FR-07：仅 current_stage !== 'execute' 判信号，
   * 不扩展到 quick 等其它 stage；DB 无对应行（data=null）的 worktree 目录不算信号。
   *
   * 只读诊断：不写 DB、不删 worktree 目录、不自动修复
   * （修复仍走 doctor --align / repairConsistency 既有逻辑）。
   *
   * @param {string} cwd
   * @returns {string[]} issue 描述数组（每条含 change 名、实际 current_stage、worktree 目录路径）
   */
  detectLostUpdateSignals(cwd) {
    const worktreesRoot = this.pm._runtimePath(cwd, 'worktrees');
    // 零信号兼容既有 fixture：worktrees 目录不存在或读取失败时直接返回空数组
    if (!existsSync(worktreesRoot)) return [];

    let entries;
    try {
      entries = readdirSync(worktreesRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    const issues = [];
    for (const entry of entries) {
      // Dirent.isDirectory 在 Windows / Linux / macOS 上一致判定目录项
      if (!entry.isDirectory()) continue;
      const changeName = entry.name;
      const worktreeDir = join(worktreesRoot, changeName);

      // 复用 pm.read（task-08 已同步化，直接拿返回值，无 await），不新开 DB 连接
      const data = this.pm.read(cwd, changeName);
      // DB 无对应行（data=null）不算信号，跳过
      if (!data) continue;
      // 仅 current_stage !== 'execute' 判信号
      if (data.currentStage !== 'execute') {
        issues.push(
          `lost-update 信号: change "${changeName}" 的 worktree 目录仍存在（${worktreeDir}），` +
          `但 current_stage 为 "${data.currentStage}"（非 execute，疑进度被回退）`
        );
      }
    }
    return issues;
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
  repairConsistency(cwd, opts = {}) {
    const { apply = false, changeName = null } = opts;

    // 双库分裂（2026-09-04 ②）：repair 修不了「哪边是权威库」，只能把另一库的存在与活跃
    // 变更亮出来进 manual 清单。放 read 之前——多活跃/读不了库时 read 早退，探测不能跟着瞎。
    const libSplit = this.detectLibrarySplit(cwd, changeName);
    const splitManual = libSplit.dualDb ? [...libSplit.lines] : [];

    const data = this.pm.read(cwd, changeName);
    if (!data) {
      console.log('❌ 无法读取进度数据');
      for (const m of splitManual) console.log(`   - ${m}`);
      return { fixable: [], manual: ['无法读取进度数据', ...splitManual], applied: [] };
    }

    const fixable = []; // { stage, action, description, apply: (data) => void }
    const manual = [...splitManual];  // string

    // ISO（Fix d 的 reopenedAt / Fix e 的 completedAt 均落库）：zh-CN 串的 '/' 在字符串 MAX 中
    // 恒盖过 ISO 值，会污染 getLatestActivityAt 时近性闸与平台同步（2026-09-11 审查）
    const now = new Date().toISOString();

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

      // Fix b: 上游 stale/revising，下游仍 completed → cascade stale（同 d，用 MAIN_FLOW_ORDER 排除 scan）
      const stageIdx = MAIN_FLOW_ORDER.indexOf(stageName);
      for (let i = 0; i < stageIdx; i++) {
        const upstream = MAIN_FLOW_ORDER[i];
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
      this.pm._write(cwd, data, changeName);
      console.log(`\n  ✅ 已修复 ${applied.length} 项`);
    }

    console.log('');

    return { fixable, manual, applied };
  }
}

