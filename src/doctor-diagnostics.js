/**
 * doctor-diagnostics.js — 结构化项目自检（平台模式状态分裂检测）
 *
 * 为什么需要这个模块：
 *   现状 doctor 阶段是 prompt 驱动的 bash 清单，假设单一本地 .sillyspec/，
 *   看不见平台模式下的本地/平台状态分裂（孤儿 db、changes 历史断裂、pointer
 *   失效静默回退）。本模块补这一层：
 *     - 维度化检测（D1 多 db / D2 pointer / D3 changes 分裂 / D4 change↔db 一致
 *                          / D5 execute-progress-plan-mismatch execute 派生戳 vs plan.md 声明）
 *     - 结构化 JSON 输出（sillyspec doctor --json），agent 可直接解析
 *     - safe_actions：只描述建议动作与风险等级，绝不自动执行
 *
 * 安全约束（硬性）：
 *   - 所有检测只读。DB 以 better-sqlite3 只读连接打开（readonly + fileMustExist），不调用
 *     export/writeFileSync，不跑建表/迁移，close 后丢弃——绝不写回原 db 文件。
 *   - 不删除/移动任何文件；orphan db 仅报告，处理交给后续 --dump-db / --confirm 流程。
 *   - execute-progress-plan-mismatch 维度同样只读：仅读 plan.md checkbox + 只读查 stages 表，
 *     绝不调用 ProgressManager 写方法（写操作是 progress.alignExecuteToPlan 的职责，D-001@v2 诊断/写分离）。
 *
 * 风格对齐 scan-postcheck.js：checks 用 CHECK_SEVERITY，formatter 产出 schema_version JSON，
 * writer 落盘到 <authoritySpecDir>/.runtime/。
 */
import Database from 'better-sqlite3';
import { existsSync, statSync, readFileSync, readdirSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { CHECK_SEVERITY } from './constants.js';

// db 角色标签
const DB_ROLE = {
  AUTHORITY: 'authority',        // pointer 指向 / 当前权威
  ORPHAN: 'orphan',              // 有内容但非权威 → pointer 失效时会静默读到它（定时炸弹）
  EMPTY_REMNANT: 'empty_remnant', // 0 字节或不可读的历史占位
};

// ── pointer 解析 ───────────────────────────────────────────────────────

function resolvePointer(cwd) {
  const pointerPath = join(cwd, '.sillyspec-platform.json');
  if (!existsSync(pointerPath)) return { present: false, path: pointerPath };
  try {
    const ptr = JSON.parse(readFileSync(pointerPath, 'utf8'));
    return {
      present: true,
      path: pointerPath,
      specRoot: ptr.specRoot || null,
      runtimeRoot: ptr.runtimeRoot || null,
      workspaceId: ptr.workspaceId || null,
      savedAt: ptr.savedAt || null,
      corrupted: !ptr.specRoot,
    };
  } catch (e) {
    return { present: true, path: pointerPath, specRoot: null, corrupted: true, error: e.message };
  }
}

// ── DB 只读探测 ────────────────────────────────────────────────────────

/**
 * 只读打开一个 db 文件，提取诊断信号。绝不写回。
 * 返回 null 表示文件不存在。
 */
function probeDb(dbPath) {
  if (!existsSync(dbPath)) return null;
  const st = statSync(dbPath);
  const base = { path: dbPath, exists: true, size: st.size, mtime: st.mtime.toISOString() };
  if (st.size === 0) {
    return { ...base, readable: false, reason: '0 字节文件（历史占位）' };
  }
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const pick = (sql, fallback = null) => {
      try {
        const r = db.prepare(sql).pluck().get();
        return r === undefined ? fallback : r;
      } catch { return fallback; }
    };
    const pickCol = (sql) => {
      try {
        return db.prepare(sql).pluck().all();
      } catch { return []; }
    };
    // 每个 active change 的 execute stage status（只读查询；stages 表的 status 列）。
    // 用于 execute-progress-plan-mismatch 诊断：execute 派生戳 vs plan.md 声明。
    // change_name → execute stage status（无 execute 行则 absent）。
    const pickExecuteStatusByChange = () => {
      try {
        const rows = db.prepare(
          `SELECT c.name, s.status FROM changes c
           LEFT JOIN stages s ON s.change_id = c.id AND s.stage = 'execute'`
        ).all();
        const out = {};
        for (const row of rows) out[row.name] = row.status || null;
        return out;
      } catch { return {}; }
    };
    return {
      ...base,
      readable: true,
      schema_version: pick('SELECT schema_version FROM project LIMIT 1'),
      change_count: pick('SELECT count(*) FROM changes', 0),
      active_changes: pickCol("SELECT name FROM changes WHERE status='active'"),
      last_active: pick('SELECT MAX(last_active) FROM changes'),
      execute_status_by_change: pickExecuteStatusByChange(),
    };
  } catch (e) {
    return { ...base, readable: false, reason: `打开失败: ${e.message}` };
  } finally {
    if (db) {
      try { db.close(); } catch { /* noop */ }
    }
  }
}

function summarizeActive(changes) {
  // 完整列表交给 changes_split 维度做对比；db 摘要里只给 count + 前 3 个 sample
  return { count: changes.length, sample: changes.slice(0, 3) };
}

// ── D1 多 db 探测与权威判定 ────────────────────────────────────────────

function detectMultiDb(cwd, pointer) {
  const localSpec = join(cwd, '.sillyspec');
  const candidates = [
    { path: join(localSpec, 'sillyspec.db'), kind: 'local_root' },
    { path: join(localSpec, '.runtime', 'sillyspec.db'), kind: 'local_runtime' },
  ];
  if (pointer.specRoot) {
    candidates.push({ path: join(pointer.specRoot, '.runtime', 'sillyspec.db'), kind: 'platform_runtime' });
    candidates.push({ path: join(pointer.specRoot, 'sillyspec.db'), kind: 'platform_root' });
  }

  const dbs = [];
  for (const c of candidates) {
    const probed = probeDb(c.path);
    if (!probed) continue;
    dbs.push({ kind: c.kind, ...probed });
  }

  // 权威判定：pointer 在 → platform_runtime 为权威；否则 local_runtime
  const authorityKind = pointer.present && pointer.specRoot ? 'platform_runtime' : 'local_runtime';
  for (const d of dbs) {
    if (!d.readable) d.role = DB_ROLE.EMPTY_REMNANT;
    else if (d.kind === authorityKind) d.role = DB_ROLE.AUTHORITY;
    else d.role = DB_ROLE.ORPHAN;
  }

  const orphans = dbs.filter((d) => d.role === DB_ROLE.ORPHAN);
  const authorities = dbs.filter((d) => d.role === DB_ROLE.AUTHORITY);
  const remnants = dbs.filter((d) => d.role === DB_ROLE.EMPTY_REMNANT);

  const findings = [];
  let pass = true;
  let severity = null;
  const safeActions = [];

  if (orphans.length > 0) {
    pass = false;
    severity = CHECK_SEVERITY.FAILED;
    for (const o of orphans) {
      findings.push(
        `孤儿 db [${o.kind}] ${o.path}：${o.size}B，${o.change_count} changes，最后写入 ${o.last_active || '?'}；` +
        `pointer 指向 ${authorityKind}，此 db 无人读——pointer 失效时 resolvePlatformSpecDir 会静默回退到这个过期状态`
      );
      safeActions.push({
        dimension: 'multi_db',
        action: 'dump_and_classify_orphan_db',
        target: o.path,
        risk: 'read_only',
        rationale: `孤儿 db 含 ${o.change_count} 个 change 的进度但已无人读；先 dump 到 .runtime/doctor-dumps/ 再决定导入/归档，绝不直接删除`,
        next_step: '后续实现 sillyspec doctor --dump-db --path <path> 后可直接执行',
      });
    }
  }
  if (authorities.length === 0 && dbs.some((d) => d.readable)) {
    pass = false;
    severity = CHECK_SEVERITY.FAILED;
    findings.push(`未找到权威 db（期望 ${authorityKind}，但该位置无有效 db），却存在其它可读 db——状态真相源缺失`);
  }
  for (const r of remnants) {
    findings.push(`空占位 db [${r.kind}] ${r.path}：${r.size}B——历史遗留，建议清理`);
    safeActions.push({
      dimension: 'multi_db',
      action: 'remove_empty_remnant',
      target: r.path,
      risk: 'confirm_required',
      rationale: '0 字节占位文件，无数据，可安全删除',
      next_step: 'sillyspec doctor --cleanup-remnant --path <path>（需 --confirm）',
    });
  }
  if (pass && findings.length === 0) {
    findings.push(`db 状态健康：权威为 ${authorityKind}，无孤儿`);
  }

  return {
    name: 'multi_db',
    label: '多 db 探测与权威判定',
    pass,
    severity,
    findings,
    safe_actions: safeActions,
    dbs: dbs.map((d) => ({
      kind: d.kind,
      role: d.role,
      path: d.path,
      size: d.size,
      mtime: d.mtime,
      readable: d.readable,
      schema_version: d.schema_version,
      change_count: d.change_count,
      last_active: d.last_active,
      active: d.readable ? summarizeActive(d.active_changes) : null,
    })),
  };
}

// ── D2 pointer 健康 ───────────────────────────────────────────────────

function detectPointerHealth(pointer) {
  if (!pointer.present) {
    return {
      name: 'pointer_health',
      label: '平台指针健康',
      pass: true,
      severity: null,
      findings: ['无平台 pointer，本地模式（无平台分裂风险）'],
      safe_actions: [],
    };
  }
  const findings = [];
  let pass = true;
  let severity = null;
  if (pointer.corrupted) {
    return {
      name: 'pointer_health',
      label: '平台指针健康',
      pass: false,
      severity: CHECK_SEVERITY.FAILED,
      findings: [`pointer 损坏: ${pointer.error || '缺少 specRoot 字段'}——建议删除后重跑平台 scan`],
      safe_actions: [{ dimension: 'pointer_health', action: 'recreate_pointer', risk: 'confirm_required', rationale: 'pointer 损坏，需重建', next_step: 'sillyspec platform pointer --cleanup 后重新 scan' }],
    };
  }
  const reachable = !!pointer.specRoot && existsSync(pointer.specRoot);
  if (!reachable) {
    pass = false;
    severity = CHECK_SEVERITY.FAILED;
    findings.push(
      `pointer.specRoot 不可达: ${pointer.specRoot}（daemon 未起？已迁移？）——` +
      `resolvePlatformSpecDir 当前会静默回退到本地孤儿 db，这是危险行为（建议改 fail-closed）`
    );
  }
  const authDb = pointer.specRoot ? join(pointer.specRoot, '.runtime', 'sillyspec.db') : null;
  if (authDb && !existsSync(authDb)) {
    pass = false;
    severity = severity || CHECK_SEVERITY.WARNING;
    findings.push(`权威 db 不存在: ${authDb}`);
  }
  if (pass) findings.push(`pointer 正常，specRoot 可达`);
  return {
    name: 'pointer_health',
    label: '平台指针健康',
    pass,
    severity,
    findings,
    safe_actions: [],
    pointer: { specRoot: pointer.specRoot, runtimeRoot: pointer.runtimeRoot, reachable, savedAt: pointer.savedAt },
  };
}

// ── D3 本地/平台 changes 分裂 ──────────────────────────────────────────

function listChanges(specRoot) {
  const dir = join(specRoot, 'changes');
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'archive')
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function detectChangesSplit(cwd, pointer) {
  const localChanges = listChanges(join(cwd, '.sillyspec'));
  const findings = [];
  let pass = true;
  let severity = null;
  const dim = {
    name: 'changes_split',
    label: '本地/平台 changes 分裂',
    local: localChanges,
    safe_actions: [],
  };

  if (!(pointer.present && pointer.specRoot && existsSync(pointer.specRoot))) {
    dim.platform = [];
    dim.findings = ['无可达平台 specRoot，仅本地 changes（无分裂可比较）'];
    return { ...dim, pass: true, severity: null };
  }

  const platformChanges = listChanges(pointer.specRoot);
  dim.platform = platformChanges;
  const platformSet = new Set(platformChanges);
  const localSet = new Set(localChanges);
  dim.local_only = localChanges.filter((c) => !platformSet.has(c));
  dim.platform_only = platformChanges.filter((c) => !localSet.has(c));
  dim.intersection = localChanges.filter((c) => platformSet.has(c));

  const lo = dim.local_only.length;
  const po = dim.platform_only.length;
  const ix = dim.intersection.length;

  if (lo > 0 && po > 0 && ix === 0) {
    pass = false;
    severity = CHECK_SEVERITY.FAILED;
    findings.push(
      `严重分裂：本地 ${localChanges.length} 个 changes 与平台 ${platformChanges.length} 个 零交集——` +
      `本地→平台模式切换时迁移未完成，变更历史断裂（6月在本地、7月在平台各走各的）`
    );
    dim.safe_actions.push({
      dimension: 'changes_split',
      action: 'migrate_local_changes',
      risk: 'confirm_required',
      rationale: `本地 ${lo} 个变更平台没有，需决定逐个导入进度 or 归档；属于数据迁移，必须逐项确认`,
      next_step: '后续实现 sillyspec doctor --merge-local-to-platform（带 --confirm）',
    });
  } else if (lo > 3 || po > 3) {
    pass = false;
    severity = CHECK_SEVERITY.WARNING;
    findings.push(`部分分裂：local_only ${lo}，platform_only ${po}，intersection ${ix}`);
  } else {
    findings.push(`本地/平台 changes 基本同步（intersection ${ix}，local_only ${lo}，platform_only ${po}）`);
  }

  return { ...dim, pass, severity, findings };
}

// ── D4 change↔db 一致性（针对权威 db + 权威 changes 目录）──────────────

function detectChangeDbConsistency(cwd, pointer, multiDb) {
  const auth = (multiDb.dbs || []).find((d) => d.role === DB_ROLE.AUTHORITY);
  if (!auth) {
    return {
      name: 'change_db_consistency',
      label: 'change↔db 一致性',
      pass: true,
      severity: null,
      findings: ['无权威 db，跳过一致性校验'],
      safe_actions: [],
    };
  }
  const authoritySpecRoot = pointer.present && pointer.specRoot ? pointer.specRoot : join(cwd, '.sillyspec');
  const dirChanges = listChanges(authoritySpecRoot);
  const dbActive = auth.active || { count: 0, sample: [] };
  // active.count 是权威 db 的 active change 数；但 listChanges 给的是目录数，两者口径要对齐
  // 这里用 active_changes 全量需从 probe 取——summary 只给了 count/sample，
  // 所以用 count 与目录数做粗对齐，细对齐留给后续 dump。
  const dirCount = dirChanges.length;
  const dbCount = dbActive.count;
  const findings = [];
  let pass = true;
  let severity = null;
  // 仅当差异显著才告警（口径不完全可比，避免误报）
  if (Math.abs(dirCount - dbCount) > Math.max(2, dirCount * 0.2)) {
    pass = false;
    severity = CHECK_SEVERITY.WARNING;
    findings.push(
      `权威 db active changes (${dbCount}) 与 changes/ 目录数 (${dirCount}) 差异显著——` +
      `可能存在孤儿目录（有目录无 db 记录）或幽灵记录（db 有记录无目录），需 dump 后细对齐`
    );
  } else {
    findings.push(`权威 db active changes (${dbCount}) 与 changes/ 目录数 (${dirCount}) 基本一致`);
  }
  return {
    name: 'change_db_consistency',
    label: 'change↔db 一致性',
    pass,
    severity,
    findings,
    safe_actions: [],
    authority_spec_root: authoritySpecRoot,
    dir_count: dirCount,
    db_active_count: dbCount,
  };
}

// ── D5 execute-progress-plan-mismatch（execute 派生戳 vs plan.md 声明）─────

/**
 * 只读解析 plan.md（回退 tasks.md）的 task checkbox 全勾状态。
 * 真相源语义对齐 run.js:832 + execute.js 的 checkbox 格式：
 *   `- [ ] task-NN: ...` / `- [x] task-NN: ...`
 * 只读文件，不调用任何 ProgressManager 写方法（D-001@v2 诊断/写分离）。
 * @returns {{total:number, checked:number} | null} null = plan/tasks.md 都不存在或无 task 行
 */
function readPlanCheckboxStatus(changeDir) {
  const planPath = join(changeDir, 'plan.md');
  const tasksPath = join(changeDir, 'tasks.md');
  let content = null;
  if (existsSync(planPath)) {
    try { content = readFileSync(planPath, 'utf8'); } catch { content = null; }
  }
  if (content == null && existsSync(tasksPath)) {
    try { content = readFileSync(tasksPath, 'utf8'); } catch { content = null; }
  }
  if (content == null) return null;
  // match both "- [ ] task-01: title" and "- [x] task-01: title"
  const taskLine = /(?:^- \[[ x]\] )task-\d+[^:]*:?\s*.+$/gm;
  const matches = content.match(taskLine) || [];
  if (matches.length === 0) return null;
  const checked = matches.filter((l) => /^- \[x\] task-\d+/i.test(l)).length;
  return { total: matches.length, checked };
}

/**
 * D5 诊断维度（advisory，CHECK_SEVERITY.WARNING，不阻断）：
 *   触发条件：change 的 execute stage status≠completed，且其 plan.md 所有 task checkbox 全勾。
 *   命中即输出 safe_action 建议显式对齐命令（绝不执行）。
 * 只读：仅读 changes/<name>/plan.md + 只读用 probeDb 已取回的 execute stage status 字段，
 *       绝不写 db、不动文件（D-001@v2）。
 */
function detectExecuteProgressPlanMismatch(authoritySpecRoot, authDb) {
  const dim = {
    name: 'execute-progress-plan-mismatch',
    label: 'execute 派生戳 vs plan.md 声明',
    safe_actions: [],
    findings: [],
    per_change: [],
  };
  if (!authoritySpecRoot || !existsSync(authoritySpecRoot)) {
    dim.pass = true;
    dim.severity = null;
    dim.findings = ['无权威 specRoot，跳过 execute-progress-plan-mismatch 诊断'];
    return dim;
  }
  const executeStatusByChange = (authDb && authDb.execute_status_by_change) || {};
  const changes = listChanges(authoritySpecRoot);
  let triggered = false;
  let severity = null;
  for (const name of changes) {
    const planStatus = readPlanCheckboxStatus(join(authoritySpecRoot, 'changes', name));
    if (!planStatus || planStatus.total === 0) {
      dim.per_change.push({ change: name, plan_total: 0, skipped: '无 task checkbox' });
      continue;
    }
    const execStatus = executeStatusByChange[name] !== undefined
      ? executeStatusByChange[name]
      : null;
    dim.per_change.push({
      change: name,
      plan_total: planStatus.total,
      plan_checked: planStatus.checked,
      execute_status: execStatus,
    });
    const allChecked = planStatus.checked >= planStatus.total;
    const execNotCompleted = execStatus !== 'completed';
    // 触发：execute status≠completed 且 plan.md 全勾
    if (allChecked && execNotCompleted) {
      triggered = true;
      severity = CHECK_SEVERITY.WARNING;
      dim.findings.push(
        `change [${name}]：plan.md ${planStatus.checked}/${planStatus.total} task 全勾，` +
        `但 execute stage status=${execStatus || 'absent'}（≠completed）——派生戳未对齐真相源声明`
      );
      dim.safe_actions.push({
        dimension: 'execute-progress-plan-mismatch',
        action: `sillyspec doctor --align-execute-progress --change ${name}`,
        risk: 'low',
        rationale: `plan.md 声明全完成但 execute 派生戳未对齐（${planStatus.checked}/${planStatus.total} 全勾，execute status=${execStatus || 'absent'}）；doctor 信任 plan.md 声明，对齐由 --confirm 显式触发`,
        next_step: 'sillyspec doctor --align-execute-progress --change ' + name + ' --confirm',
      });
    }
  }
  dim.pass = !triggered;
  dim.severity = triggered ? CHECK_SEVERITY.WARNING : null;
  if (!triggered) {
    dim.findings.push(
      changes.length === 0
        ? '无 changes，无 execute-progress-plan-mismatch 可检测'
        : `所有 ${changes.length} 个 change 的 execute 派生戳与 plan.md 声明一致（或 plan.md 未全勾）`
    );
  }
  return dim;
}

// ── 主入口 ────────────────────────────────────────────────────────────

export async function runDoctorDiagnostics({ cwd }) {
  const pointer = resolvePointer(cwd);
  const multiDb = detectMultiDb(cwd, pointer);
  const pointerHealth = detectPointerHealth(pointer);
  const changesSplit = detectChangesSplit(cwd, pointer);
  const changeDb = detectChangeDbConsistency(cwd, pointer, multiDb);

  // 权威 specDir（用于 D5 execute-progress-plan-mismatch 读 plan.md）
  const authoritySpecDir =
    pointer.present && pointer.specRoot && existsSync(pointer.specRoot)
      ? pointer.specRoot
      : existsSync(join(cwd, '.sillyspec'))
        ? join(cwd, '.sillyspec')
        : null;
  const authDb = (multiDb.dbs || []).find((d) => d.role === DB_ROLE.AUTHORITY);
  const executeMismatch = detectExecuteProgressPlanMismatch(authoritySpecDir, authDb);

  const dimensions = [multiDb, pointerHealth, changesSplit, changeDb, executeMismatch];

  return {
    dimensions,
    pointer_summary: pointer.present
      ? { present: true, specRoot: pointer.specRoot, corrupted: !!pointer.corrupted, savedAt: pointer.savedAt }
      : { present: false },
    dbs_summary: multiDb.dbs,
    authoritySpecDir,
  };
}

/**
 * 转结构化 JSON（sillyspec doctor --json 输出 + 落盘格式）。
 * severity 口径对齐 scan-postcheck：CHECK_SEVERITY.FAILED → 'critical'。
 */
export function formatDoctorJson(result, meta = {}) {
  const dims = result.dimensions;
  const critical = dims.filter((d) => d.severity === CHECK_SEVERITY.FAILED).length;
  const warning = dims.filter((d) => d.severity === CHECK_SEVERITY.WARNING).length;
  const overallStatus = critical > 0 ? 'failed' : warning > 0 ? 'warning' : 'pass';

  const safeActions = [];
  for (const d of dims) {
    for (const a of d.safe_actions || []) safeActions.push({ dimension: d.name, ...a });
  }

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    tool: 'sillyspec-doctor',
    overall_status: overallStatus,
    summary: { critical, warning, total_dimensions: dims.length },
    ...(meta.source_root ? { source_root: meta.source_root } : {}),
    ...(result.authoritySpecDir ? { authority_spec_dir: result.authoritySpecDir } : {}),
    pointer: result.pointer_summary,
    dbs: result.dbs_summary.map((d) => ({
      kind: d.kind,
      role: d.role,
      path: d.path,
      size: d.size,
      mtime: d.mtime,
      change_count: d.change_count,
      last_active: d.last_active,
    })),
    dimensions: dims.map((d) => {
      const out = {
        name: d.name,
        label: d.label,
        pass: d.pass,
        severity: d.severity === CHECK_SEVERITY.FAILED ? 'critical' : d.severity,
        evidence: (d.findings || []).join('; '),
      };
      if (d.name === 'changes_split') {
        out.local_count = d.local.length;
        out.platform_count = d.platform.length;
        out.local_only_count = (d.local_only || []).length;
        out.platform_only_count = (d.platform_only || []).length;
        out.intersection_count = (d.intersection || []).length;
        out.local_only_sample = (d.local_only || []).slice(0, 8);
        out.platform_only_sample = (d.platform_only || []).slice(0, 8);
      }
      return out;
    }),
    safe_actions: safeActions,
  };
}

/**
 * 落盘到 <authoritySpecDir>/.runtime/doctor-diagnosis.json（对齐 scan-postcheck.writeStructuredResult）。
 */
export function writeDoctorDiagnosis(json, specDir) {
  if (!specDir) return null;
  try {
    const runtimeDir = join(specDir, '.runtime');
    mkdirSync(runtimeDir, { recursive: true });
    const outPath = join(runtimeDir, 'doctor-diagnosis.json');
    writeFileSync(outPath, JSON.stringify(json, null, 2) + '\n');
    return outPath;
  } catch (e) {
    console.warn(`⚠️ doctor-diagnosis.json 写入失败: ${e.message}`);
    return null;
  }
}

// ── 执行流：安全清理 + 取证 dump ───────────────────────────────────────
//
// 让 doctor --json 输出的 safe_actions 真正可执行。安全约束不变：
// cleanup 只删 0 字节空占位（probeDb 判定 empty_remnant），绝不碰有内容的 db；
// dump 纯只读。destructive 操作必须 --confirm。

/**
 * 清理 0 字节空占位 db（历史遗留）。默认 dry-run，--confirm 才真删。
 * 只删 size===0 的文件；有内容的 db 一律不动。
 */
export async function cleanupRemnantDbs({ cwd, confirm = false }) {
  const pointer = resolvePointer(cwd);
  const localSpec = join(cwd, '.sillyspec');
  const candidates = [
    join(localSpec, 'sillyspec.db'),
    join(localSpec, '.runtime', 'sillyspec.db'),
  ];
  if (pointer.specRoot) {
    candidates.push(join(pointer.specRoot, '.runtime', 'sillyspec.db'));
    candidates.push(join(pointer.specRoot, 'sillyspec.db'));
  }
  const remnants = [];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const st = statSync(p);
      if (st.size === 0) remnants.push({ path: p, size: 0, mtime: st.mtime.toISOString() });
    } catch { /* stat 失败跳过 */ }
  }
  const deleted = [];
  const errors = [];
  if (confirm) {
    for (const r of remnants) {
      try {
        unlinkSync(r.path);
        deleted.push(r.path);
      } catch (e) {
        errors.push({ path: r.path, error: e.message });
      }
    }
  }
  return {
    action: confirm ? 'deleted' : 'dry_run',
    would_delete: remnants,
    deleted,
    errors,
    count: remnants.length,
  };
}

/**
 * 把任意 db 文件的内容 dump 成 JSON（schema_version + 全量 changes + stages）。
 * 落盘到 <authoritySpecDir>/.runtime/doctor-dumps/dump-<ts>.json。纯只读。
 */
export async function dumpDb({ dbPath, cwd }) {
  const pointer = resolvePointer(cwd);
  const authoritySpecDir = (pointer.present && pointer.specRoot && existsSync(pointer.specRoot))
    ? pointer.specRoot
    : (existsSync(join(cwd, '.sillyspec')) ? join(cwd, '.sillyspec') : null);
  if (!existsSync(dbPath)) {
    return { ok: false, error: `db 文件不存在: ${dbPath}`, path: dbPath };
  }
  const st = statSync(dbPath);
  const meta = { path: dbPath, size: st.size, mtime: st.mtime.toISOString(), dumped_at: new Date().toISOString() };
  if (st.size === 0) {
    return writeDump({ ok: true, meta, note: '0 字节文件，无表数据', changes: [], stages: [] }, authoritySpecDir);
  }
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = (sql) => {
      try { return db.prepare(sql).all(); } catch { return []; }
    };
    const sv = rows('SELECT schema_version FROM project LIMIT 1');
    const schemaVersion = sv.length ? sv[0].schema_version : null;
    const changes = rows('SELECT name, current_stage, status, created_at, last_active FROM changes ORDER BY last_active DESC')
      .map((r) => ({ name: r.name, current_stage: r.current_stage, status: r.status, created_at: r.created_at, last_active: r.last_active }));
    const stages = rows('SELECT c.name, s.stage, s.status, s.started_at, s.completed_at FROM stages s JOIN changes c ON s.change_id = c.id ORDER BY c.name, s.stage')
      .map((r) => ({ change: r.name, stage: r.stage, status: r.status, started_at: r.started_at, completed_at: r.completed_at }));
    return writeDump({ ok: true, meta, schema_version: schemaVersion, changes, stages }, authoritySpecDir);
  } catch (e) {
    return writeDump({ ok: false, meta, error: `读取失败: ${e.message}` }, authoritySpecDir);
  } finally {
    if (db) { try { db.close(); } catch { /* noop */ } }
  }
}

function writeDump(result, authoritySpecDir) {
  if (!authoritySpecDir) return result; // 无处落盘也把内容返回给调用方
  try {
    const outDir = join(authoritySpecDir, '.runtime', 'doctor-dumps');
    mkdirSync(outDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = join(outDir, `dump-${ts}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
    return { ...result, written_to: outPath };
  } catch (e) {
    return { ...result, dump_write_error: e.message };
  }
}
