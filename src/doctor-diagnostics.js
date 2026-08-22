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
 *   - 所有检测只读。DB 以 node:sqlite 只读连接打开（readOnly + existsSync 前置门），不调用
 *     export/writeFileSync，不跑建表/迁移，close 后丢弃——绝不写回原 db 文件。
 *   - 不删除/移动任何文件；orphan db 仅报告，处理交给后续 --dump-db / --confirm 流程。
 *   - execute-progress-plan-mismatch 维度同样只读：仅读 plan.md checkbox + 只读查 stages 表，
 *     绝不调用 ProgressManager 写方法（写操作是 progress.alignExecuteToPlan 的职责，D-001@v2 诊断/写分离）。
 *
 * 风格对齐 scan-postcheck.js：checks 用 CHECK_SEVERITY，formatter 产出 schema_version JSON，
 * writer 落盘到 <authoritySpecDir>/.runtime/。
 */
import { openDatabase, pluckGet, pluckAll } from './db-engine.js';
import { existsSync, statSync, readFileSync, readdirSync, mkdirSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { CHECK_SEVERITY } from './constants.js';
import { checkPlatformManaged } from './run/shared.js';

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
    db = openDatabase(dbPath, { readOnly: true });
    const pick = (sql, fallback = null) => {
      try {
        const r = pluckGet(db, sql);
        return r === undefined ? fallback : r;
      } catch { return fallback; }
    };
    const pickCol = (sql) => {
      try {
        return pluckAll(db, sql);
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
      // SS-2b（2026-08-20）：active 行 name → last_active 映射，供 D4 空壳判定做时间门槛
      //（刚创建的合法变更目录本来就是空的，见 GHOST_EMPTY_DIR_STALE_MS 注释）。
      active_last_active: (() => {
        try {
          const rows = db.prepare("SELECT name, last_active FROM changes WHERE status='active'").all();
          return Object.fromEntries(rows.map((r) => [r.name, r.last_active]));
        } catch { return {}; }
      })(),
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
      // SS-2：全量名单随摘要透传，供 D4 精确集合对账（ghost/orphan）消费。
      active_changes: d.readable ? (d.active_changes || []) : [],
      // SS-2b：name → last_active 映射随摘要透传，供 D4 空壳判定（时间门槛）消费。
      active_last_active: d.readable ? (d.active_last_active || {}) : {},
    })),
  };
}

// ── D2 pointer 健康 ───────────────────────────────────────────────────

function detectPointerHealth(pointer, cwd = null) {
  if (!pointer.present) {
    // FR-06：指针缺失但接管声明存在 → 报 pointer_missing_but_managed（warning 非阻断）。
    // 此状态 resolvePlatformSpecDir / runCommand 恢复链会 fail-closed 拒绝静默落本地，
    // doctor 只读诊断给出同款恢复引导（不自动执行任何修复）。
    if (cwd) {
      const decl = checkPlatformManaged(cwd);
      if (decl) {
        return {
          name: 'pointer_health',
          label: '平台指针健康',
          pass: false,
          severity: CHECK_SEVERITY.WARNING,
          findings: [
            `pointer_missing_but_managed: 平台接管声明存在但恢复指针缺失（原 specRoot: ${decl.specRoot || '(未记录)'}）——` +
            `裸调命令将 fail-closed 拒绝静默落本地。恢复：① 重跑平台 scan/init（带 --spec-root）重建指针；` +
            `② sillyspec platform disconnect（删除接管声明，彻底脱离平台）；③ 显式 --spec-dir <路径> 临时指定。`,
          ],
          safe_actions: [{ dimension: 'pointer_health', action: 'recreate_pointer', risk: 'confirm_required', rationale: '接管声明存在但指针缺失，需重建指针或显式脱离平台', next_step: '重跑平台 scan（带 --spec-root）或 sillyspec platform disconnect' }],
        };
      }
    }
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

// SS-2b（2026-08-20）：空壳目录判定的 last_active 时间门槛（7 天）。
// 背景：brainstorm 刚注册的合法变更目录本来就是 0 文件（首份产物 proposal.md
// 落盘前有空窗，2026-08-20 task-truth-unify 即空目录数小时）。「active 行 + 目录
// 0 文件」不能直接判幽灵，必须叠加 last_active 陈旧度；门槛取 7 天（quick 会话
// 生命周期通常当天结束，正规变更 brainstorm 首产物也远早于 7 天）。
const GHOST_EMPTY_DIR_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** 目录内是否 0 个常规文件（递归；空目录/仅空子目录都算 0 文件）。读失败按非空处理（宁漏勿杀）。 */
function dirHasNoFiles(dirPath) {
  const stack = [dirPath];
  while (stack.length > 0) {
    const cur = stack.pop();
    let entries;
    try { entries = readdirSync(cur, { withFileTypes: true }); } catch { return false; }
    for (const e of entries) {
      if (e.isFile()) return false;
      if (e.isDirectory()) stack.push(join(cur, e.name));
    }
  }
  return true;
}

/** last_active 是否陈旧超过 GHOST_EMPTY_DIR_STALE_MS。无值/不可解析按非陈旧处理（宁漏勿杀）。 */
function isStaleLastActive(lastActive, now = Date.now()) {
  if (!lastActive) return false;
  const ts = Date.parse(lastActive);
  return Number.isFinite(ts) && (now - ts) > GHOST_EMPTY_DIR_STALE_MS;
}

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
  // SS-2（2026-08-20）：从 count 粗对齐升级为精确集合对账——ghost_rows（db active
  // 无目录）与 orphan_dirs（目录无 db active 行）逐名列出，供 doctor --cleanup-ghosts
  // 消费，不再让 52 条残留只停留在「需 dump 后细对齐」。
  const activeNames = (auth.active_changes && Array.isArray(auth.active_changes))
    ? auth.active_changes
    : [];
  const dirSet = new Set(dirChanges);
  const activeSet = new Set(activeNames);
  const ghostRows = activeNames.filter((n) => !dirSet.has(n));
  const orphanDirs = dirChanges.filter((n) => !activeSet.has(n));
  // SS-2b：空壳——db active + 目录存在但 0 文件 + last_active 超过 7 天。有目录所以
  // 逃过 ghostRows 的「无目录」判定（2026-08-15 清理时 6 个空壳即此漏网形态）。
  const activeLastActive = (auth.active_last_active && typeof auth.active_last_active === 'object')
    ? auth.active_last_active
    : {};
  const emptyShells = activeNames.filter((n) =>
    dirSet.has(n) && isStaleLastActive(activeLastActive[n]) && dirHasNoFiles(join(authoritySpecRoot, 'changes', n)));
  const findings = [];
  let pass = true;
  let severity = null;
  if (ghostRows.length > 0) {
    pass = false;
    severity = CHECK_SEVERITY.WARNING;
    findings.push(
      `幽灵记录 ${ghostRows.length} 条（db active 但无目录）：${ghostRows.slice(0, 10).join(', ')}${ghostRows.length > 10 ? ' …' : ''}——` +
      `可用 sillyspec doctor --cleanup-ghosts --confirm 归档清理`
    );
  }
  if (emptyShells.length > 0) {
    pass = false;
    severity = severity || CHECK_SEVERITY.WARNING;
    findings.push(
      `空壳目录 ${emptyShells.length} 个（db active + 目录 0 文件 + last_active 超 7 天）：${emptyShells.slice(0, 10).join(', ')}${emptyShells.length > 10 ? ' …' : ''}——` +
      `可用 sillyspec doctor --cleanup-ghosts --confirm 归档行并移除空目录`
    );
  }
  if (orphanDirs.length > 0) {
    pass = false;
    severity = severity || CHECK_SEVERITY.WARNING;
    findings.push(
      `孤儿目录 ${orphanDirs.length} 个（目录存在但无 db active 行）：${orphanDirs.slice(0, 10).join(', ')}${orphanDirs.length > 10 ? ' …' : ''}——` +
      `先 dump 确认再手工归位，doctor 不自动删目录`
    );
  }
  if (pass) {
    findings.push(`权威 db active changes (${activeNames.length}) 与 changes/ 目录数 (${dirChanges.length}) 完全一致`);
  }
  return {
    name: 'change_db_consistency',
    label: 'change↔db 一致性',
    pass,
    severity,
    findings,
    safe_actions: ghostRows.length > 0 || emptyShells.length > 0
      ? ['sillyspec doctor --cleanup-ghosts（dry-run）→ 加 --confirm 归档幽灵行/空壳目录']
      : [],
    authority_spec_root: authoritySpecRoot,
    dir_count: dirChanges.length,
    db_active_count: activeNames.length,
    ghost_rows: ghostRows,
    orphan_dirs: orphanDirs,
    empty_shells: emptyShells,
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
  // 2026-08-20-task-truth-unify：tasks.md（任务注册表）优先；plan.md 纯 ID 引用行无 checkbox，
  // 旧「plan 优先」顺序对新契约变更恒 null（D5 诊断静默致盲）。tasks.md 缺失回退 plan.md（旧变更兼容）。
  const tasksPath = join(changeDir, 'tasks.md');
  const planPath = join(changeDir, 'plan.md');
  let content = null;
  if (existsSync(tasksPath)) {
    try { content = readFileSync(tasksPath, 'utf8'); } catch { content = null; }
  }
  if (content == null && existsSync(planPath)) {
    try { content = readFileSync(planPath, 'utf8'); } catch { content = null; }
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

// ── 文档膨胀检测（token 成本优化 P0b/P2b，2026-08-22-token-cost-optimization）──
// 模块卡与 knowledge/uncategorized.md 是每个 task 子代理的重复读取税：实测 backend.md
// 18 天 15KB→55KB（变更索引段每变更追加、单调膨胀）、uncategorized.md 38KB 从未迁出。
// 只读软检查（WARNING 级，不阻断）：超限给 safe_action 指路，不自动改文件。

/** 模块卡整卡可读软上限（字节），与 module-resolve.js MODULE_CARD_SOFT_LIMIT_BYTES 同值 */
const DOC_BLOAT_MODULE_CARD_LIMIT = 12 * 1024;
/** knowledge/uncategorized.md 软上限（字节）——待确认条目应经知识审阅迁移，不该只增不减 */
const DOC_BLOAT_UNCATEGORIZED_LIMIT = 20 * 1024;

export function detectDocBloat(specRoot) {
  const dim = { name: 'doc_bloat', label: '文档膨胀（模块卡/知识库读取税）', safe_actions: [] };
  const findings = [];
  if (!specRoot || !existsSync(specRoot)) {
    return { ...dim, findings: ['无可达 specRoot，跳过文档膨胀检测'], pass: true, severity: null };
  }
  // 模块卡：docs/<p>/modules/*.md（排除 _module-map.yaml 与 *.changelog.md sidecar）
  try {
    for (const proj of readdirSync(join(specRoot, 'docs'), { withFileTypes: true })) {
      if (!proj.isDirectory()) continue;
      const modulesDir = join(specRoot, 'docs', proj.name, 'modules');
      if (!existsSync(modulesDir)) continue;
      for (const f of readdirSync(modulesDir)) {
        if (!f.endsWith('.md') || f === '_module-map.yaml' || f.endsWith('.changelog.md')) continue;
        const size = statSync(join(modulesDir, f)).size;
        if (size > DOC_BLOAT_MODULE_CARD_LIMIT) {
          findings.push(`模块卡超软上限 ${DOC_BLOAT_MODULE_CARD_LIMIT / 1024}KB：docs/${proj.name}/modules/${f}（${(size / 1024).toFixed(1)}KB）——子代理每次整读都是读取税`);
        }
      }
    }
  } catch { /* docs 不可读 → 跳过该项 */ }
  if (findings.length > 0) {
    dim.safe_actions.push({ action: '跑 sillyspec modules split-changelog（先 dry-run 预览，确认后 --force）把「变更索引」历史段迁出大卡', risk: 'low' });
  }
  // knowledge/uncategorized.md
  try {
    const uncPath = join(specRoot, 'knowledge', 'uncategorized.md');
    if (existsSync(uncPath)) {
      const size = statSync(uncPath).size;
      if (size > DOC_BLOAT_UNCATEGORIZED_LIMIT) {
        findings.push(`knowledge/uncategorized.md 超软上限 ${DOC_BLOAT_UNCATEGORIZED_LIMIT / 1024}KB（${(size / 1024).toFixed(1)}KB）——已确认/已修复条目应迁入专题文件后从待确认清单删除，而非只增不减`);
        dim.safe_actions.push({ action: 'execute 末步「知识库审阅」把已确认条目归档迁出 uncategorized.md（迁入专题文件后删除原条目）', risk: 'low' });
      }
    }
  } catch { /* knowledge 不可读 → 跳过该项 */ }

  dim.findings = findings;
  return findings.length === 0
    ? { ...dim, findings: ['模块卡与知识库体量在软限内'], pass: true, severity: CHECK_SEVERITY.PASSED }
    : { ...dim, pass: false, severity: CHECK_SEVERITY.WARNING };
}
export async function runDoctorDiagnostics({ cwd }) {
  const pointer = resolvePointer(cwd);
  const multiDb = detectMultiDb(cwd, pointer);
  const pointerHealth = detectPointerHealth(pointer, cwd);
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
  const docBloat = detectDocBloat(authoritySpecDir);

  const dimensions = [multiDb, pointerHealth, changesSplit, changeDb, executeMismatch, docBloat];

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
    db = openDatabase(dbPath, { readOnly: true });
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


/**
 * SS-2（2026-08-20）：归档幽灵行——db active 但 changes/ 无同名目录的记录。
 * SS-2b（2026-08-20）：扩空壳目录——db active + 目录存在但 0 文件 + last_active 超
 * 7 天（GHOST_EMPTY_DIR_STALE_MS）。两者都是 quick 收尾注销缺陷（工具侧已修）在
 * 历史会话中累积的僵尸 active 行，污染 listChanges/progress show 的「活跃变更」
 * 列表；旧 doctor 只 WARNING 不给动作（stage-machine 提示「可用 doctor 清理」却清不掉）。
 *
 * 安全设计：
 * - 仅把 changes.status 从 active 改为 archived（对齐 change-registry 归档语义，
 *   状态可逆：手工改回 status='active' 即恢复，不删任何行）。
 * - 默认 dry-run 只列名单；加 confirm 才写。
 * - 空壳目录归档时同时移除空目录（删前复查仍为 0 文件，复查非空整条放过）；
 *   有内容的目录一律不动。孤儿目录（有目录无行）不自动删，留给人工归位。
 */
export async function cleanupGhostChanges({ cwd, specDir = null, confirm = false }) {
  const pointer = resolvePointer(cwd);
  const localSpec = join(cwd, '.sillyspec');
  const candidates = [
    join(localSpec, '.runtime', 'sillyspec.db'),
    join(localSpec, 'sillyspec.db'),
  ];
  if (pointer.specRoot) {
    candidates.unshift(
      join(pointer.specRoot, '.runtime', 'sillyspec.db'),
      join(pointer.specRoot, 'sillyspec.db'),
    );
  }
  let dbPath = null;
  for (const p of candidates) {
    try {
      if (existsSync(p) && statSync(p).size > 0) { dbPath = p; break; }
    } catch { /* stat 失败跳过 */ }
  }
  if (!dbPath) {
    return { action: 'skipped', reason: '未找到非空 sillyspec.db', ghosts: [], archived: [], errors: [], count: 0 };
  }
  const authoritySpecRoot = (pointer.present && pointer.specRoot && existsSync(pointer.specRoot))
    ? pointer.specRoot
    : localSpec;
  const changesDir = join(authoritySpecRoot, 'changes');
  let dirNames = [];
  try {
    dirNames = readdirSync(changesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'archive')
      .map((e) => e.name);
  } catch { /* 目录缺失 → 全部 active 都是幽灵 */ }
  const dirSet = new Set(dirNames);

  let db = null;
  const archived = [];
  const finalized = [];
  const errors = [];
  const skippedNonEmpty = [];
  const removedDirs = [];
  try {
    db = openDatabase(dbPath, { readOnly: !confirm });
    // last_active 与 name 一起取：空壳判定需要时间门槛（见 isStaleLastActive）。
    const activeRows = db.prepare("SELECT name, last_active FROM changes WHERE status='active'").all();
    const ghosts = activeRows.filter((r) => !dirSet.has(r.name)).map((r) => r.name);
    const emptyShells = activeRows
      .filter((r) => dirSet.has(r.name) && isStaleLastActive(r.last_active) && dirHasNoFiles(join(changesDir, r.name)))
      .map((r) => r.name);
    if (confirm) {
      const now = new Date().toISOString();
      const stmt = db.prepare("UPDATE changes SET status = 'archived', last_active = ? WHERE name = ? AND status = 'active'");
      // 终态一致化（坑 manual-archive-desync-status-only，2026-08-21 实证）：手动搬目录到 archive/
      // 绕过标准归档的变更在此被当幽灵归档——只翻 status 会留「已归档 + current_stage 停留 +
      // 归档 0/5」的矛盾终态，平台渲染成「进度丢失」。有 archive/ 实体证据的幽灵同步收尾
      // archive 阶段（current_stage/stages/steps）；目录真丢失（无实体证据）保持 status-only
      //（收尾=宣称归档完成属伪造，保持可逆的原语义）。步骤名取 stageRegistry 单一真相。
      const { stageRegistry } = await import('./stages/index.js').catch(() => ({ stageRegistry: null }));
      const archiveStepNames = Array.isArray(stageRegistry?.archive?.steps)
        ? stageRegistry.archive.steps.map(s => s.name) : [];
      const archiveDir = join(changesDir, 'archive');
      const finalizeTerminal = (name) => {
        if (archiveStepNames.length === 0) return false;
        try {
          const row = db.prepare('SELECT id FROM changes WHERE name = ?').get(name);
          if (!row) return false;
          db.prepare("UPDATE changes SET current_stage = 'archive' WHERE id = ?").run(row.id);
          db.prepare(
            `INSERT INTO stages (change_id, stage, status, started_at, completed_at)
             VALUES (?, 'archive', 'completed', ?, ?)
             ON CONFLICT(change_id, stage) DO UPDATE SET status = 'completed', completed_at = excluded.completed_at`
          ).run(row.id, now, now);
          const stageRow = db.prepare('SELECT id FROM stages WHERE change_id = ? AND stage = ?').get(row.id, 'archive');
          if (!stageRow) return false;
          db.prepare('UPDATE steps SET status = ?, completed_at = ? WHERE stage_id = ?').run('completed', now, stageRow.id);
          const existing = new Set(
            db.prepare('SELECT name FROM steps WHERE stage_id = ?').all(stageRow.id).map(r => r.name)
          );
          let order = existing.size;
          const ins = db.prepare(
            `INSERT INTO steps (stage_id, name, status, completed_at, ordering) VALUES (?, ?, 'completed', ?, ?)`
          );
          for (const sn of archiveStepNames) {
            if (!existing.has(sn)) ins.run(stageRow.id, sn, now, order++)
          }
          return true;
        } catch { return false }
      };
      for (const n of ghosts) {
        try {
          stmt.run(now, n);
          // 手动归档证据：changes/archive/ 下有该变更目录 → 一并收尾终态
          const archivedEvidence = (() => {
            try {
              if (!existsSync(archiveDir)) return false;
              return readdirSync(archiveDir).some(e => e === n && existsSync(join(archiveDir, e, 'plan.md')))
                || readdirSync(archiveDir).some(e => e.startsWith(n) && existsSync(join(archiveDir, e, 'plan.md')));
            } catch { return false }
          })();
          if (archivedEvidence && finalizeTerminal(n)) {
            finalized.push(n);
          }
          archived.push(n);
        } catch (e) {
          errors.push({ name: n, error: e.message });
        }
      }
      for (const n of emptyShells) {
        // 删目录前复查非空：dry-run 与 --confirm 之间并发会话可能已往空目录写入首份产物
        //（如 brainstorm 落 proposal.md）。复查非空 → 整条放过（行也不归档），宁漏勿杀。
        const dirPath = join(changesDir, n);
        if (!dirHasNoFiles(dirPath)) {
          skippedNonEmpty.push(n);
          continue;
        }
        try {
          stmt.run(now, n);
          rmSync(dirPath, { recursive: true, force: true });
          removedDirs.push(n);
          archived.push(n);
        } catch (e) {
          errors.push({ name: n, error: e.message });
        }
      }
    }
    const activeAfter = confirm ? pluckAll(db, "SELECT name FROM changes WHERE status='active'") : null;
    return {
      action: confirm ? 'archived' : 'dry_run',
      db_path: dbPath,
      changes_dir: changesDir,
      ghosts: confirm ? archived : ghosts,
      empty_shells: confirm ? removedDirs : emptyShells,
      skipped_nonempty: skippedNonEmpty,
      removed_dirs: removedDirs,
      archived,
      finalized, // 手动归档型幽灵已同步收尾 archive 阶段终态（坑 manual-archive-desync-status-only）
      errors,
      count: ghosts.length + emptyShells.length,
      active_after: activeAfter,
    };
  } catch (e) {
    return { action: 'error', reason: e.message, ghosts: [], archived: [], errors: [{ error: e.message }], count: 0 };
  } finally {
    if (db) { try { db.close(); } catch { /* 忽略关闭失败 */ } }
  }
}
