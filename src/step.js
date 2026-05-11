import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';

// ── 简易 YAML 工具 ──

function parseYaml(text) {
  const result = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^(\w[\w-]*):\s*(.*)/);
    if (m) {
      const key = m[1];
      const val = m[2].trim();
      if (val === '' || val === '[]') result[key] = val === '[]' ? [] : '';
      else if (val.startsWith('[')) result[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
      else if (/^\d+$/.test(val)) result[key] = parseInt(val, 10);
      else result[key] = val;
    }
  }
  return result;
}

function parseManifest(text) {
  const lines = text.split('\n');
  const result = { phase: '', description: '', requires: [], steps: [] };
  let inSteps = false;
  let currentStep = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (inSteps && trimmed.startsWith('- file:')) {
      if (currentStep) result.steps.push(currentStep);
      currentStep = { file: '', name: '' };
      currentStep.file = trimmed.match(/^- file:\s*(.+)/)?.[1]?.trim() || '';
      continue;
    }
    if (inSteps && currentStep && trimmed.startsWith('name:')) {
      currentStep.name = trimmed.match(/^name:\s*(.+)/)?.[1]?.trim() || '';
      continue;
    }
    if (inSteps && !trimmed.startsWith('-') && !trimmed.startsWith(' ')) {
      if (currentStep) result.steps.push(currentStep);
      currentStep = null;
      inSteps = false;
    }

    if (trimmed.startsWith('phase:')) result.phase = trimmed.match(/^phase:\s*(.+)/)?.[1]?.trim() || '';
    else if (trimmed.startsWith('description:')) result.description = trimmed.match(/^description:\s*(.+)/)?.[1]?.trim() || '';
    else if (trimmed.startsWith('requires:')) {
      const m = trimmed.match(/^requires:\s*\[?(.*?)\]?$/);
      result.requires = m ? m[1].split(',').map(s => s.trim()).filter(Boolean) : [];
    }
    else if (trimmed.startsWith('steps:')) inSteps = true;
  }
  if (currentStep) result.steps.push(currentStep);
  return result;
}

function toYaml(obj) {
  return Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: []`;
    return `${k}: ${v}`;
  }).join('\n') + '\n';
}

// ── 文件操作 ──

function atomicWrite(filePath, content) {
  const tmpPath = filePath + '.tmp.' + process.pid;
  writeFileSync(tmpPath, content, 'utf8');
  writeFileSync(filePath, content, 'utf8');
  try { unlinkSync(tmpPath); } catch {}
}

function findSillyspecDir(dir) {
  const p = join(dir, '.sillyspec');
  if (existsSync(p)) return p;
  return null;
}

function getAvailablePhases(sillyDir) {
  const stepsDir = join(sillyDir, 'steps');
  if (!existsSync(stepsDir)) return [];
  return readdirSync(stepsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(stepsDir, d.name, 'manifest.yaml')))
    .map(d => d.name);
}

// ── 会话管理 ──

function getSessionId(dir, explicitId) {
  if (explicitId) return explicitId;
  if (process.env.SILLYSPEC_SESSION) return process.env.SILLYSPEC_SESSION;
  const markerFile = join(dir, '.sillyspec', '.session');
  if (existsSync(markerFile)) return readFileSync(markerFile, 'utf8').trim();
  // 生成新 ID 并原子写入
  const id = randomBytes(4).toString('hex');
  const sillyDir = join(dir, '.sillyspec');
  try {
    writeFileSync(markerFile, id + '\n', { flag: 'wx' });
  } catch {
    // 已存在，读取
    return readFileSync(markerFile, 'utf8').trim();
  }
  return id;
}

function getProgress(sillyDir, sessionId) {
  const pFile = join(sillyDir, 'sessions', sessionId, 'progress.yaml');
  if (!existsSync(pFile)) return {};
  return parseYaml(readFileSync(pFile, 'utf8'));
}

function saveProgress(sillyDir, sessionId, progress) {
  const pDir = join(sillyDir, 'sessions', sessionId);
  mkdirSync(pDir, { recursive: true });
  atomicWrite(join(pDir, 'progress.yaml'), toYaml(progress));
}

function updateLastActive(sillyDir, sessionId) {
  const pDir = join(sillyDir, 'sessions', sessionId);
  mkdirSync(pDir, { recursive: true });
  atomicWrite(join(pDir, 'last-active'), Date.now().toString());
}

function getLastActive(sillyDir, sessionId) {
  const f = join(sillyDir, 'sessions', sessionId, 'last-active');
  if (!existsSync(f)) return null;
  try { return parseInt(readFileSync(f, 'utf8').trim(), 10); } catch { return null; }
}

// ── 时间格式化 ──

function timeAgo(ts) {
  if (!ts) return '未知';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── 核心逻辑 ──

function getManifest(sillyDir, phase) {
  const mFile = join(sillyDir, 'steps', phase, 'manifest.yaml');
  if (!existsSync(mFile)) return null;
  return parseManifest(readFileSync(mFile, 'utf8'));
}

function checkPhaseComplete(sillyDir, phase, progress) {
  const m = getManifest(sillyDir, phase);
  if (!m) return false;
  const p = parseInt(progress[phase], 10) || 0;
  return p >= m.steps.length;
}

function formatNextOutput(manifest, stepNum, stepFile) {
  return `---\nphase: ${manifest.phase}\nstep: ${stepNum}/${manifest.steps.length}\nname: ${manifest.steps[stepNum - 1].name}\n---\n\n${stepFile}\n\n---\n完成后请执行: sillyspec step ${manifest.phase} --next\n`;
}

function handleNext(dir, sillyDir, phase, sessionId, json) {
  const manifest = getManifest(sillyDir, phase);
  if (!manifest) {
    return { ok: false, error: `❌ 阶段 "${phase}" 不存在`, available: getAvailablePhases(sillyDir) };
  }

  // 前置依赖提醒
  for (const req of manifest.requires) {
    const progress = getProgress(sillyDir, sessionId);
    if (!checkPhaseComplete(sillyDir, req, progress)) {
      console.log(`⚠️  建议先完成 ${req} 阶段`);
    }
  }

  const progress = getProgress(sillyDir, sessionId);
  let p = parseInt(progress[phase], 10);
  if (isNaN(p) || p < 0) {
    console.log(`⚠️  progress 值非法，已重置为 0`);
    p = 0;
    progress[phase] = 0;
    saveProgress(sillyDir, sessionId, progress);
  }

  const total = manifest.steps.length;

  if (p >= total) {
    if (json) return { ok: true, done: true, phase, total };
    console.log(`DONE ✅`);
    return { ok: true, done: true, phase, total };
  }

  // 确定要分发的步骤
  let nextStep;
  if (p === 0) {
    nextStep = 1;
  } else {
    nextStep = p + 1;
  }

  if (nextStep > total) {
    if (json) return { ok: true, done: true, phase, total };
    console.log(`DONE ✅`);
    return { ok: true, done: true, phase, total };
  }

  // 标记进度
  progress[phase] = nextStep;
  saveProgress(sillyDir, sessionId, progress);
  updateLastActive(sillyDir, sessionId);

  // 读取步骤文件
  const stepFile = join(sillyDir, 'steps', phase, manifest.steps[nextStep - 1].file);
  if (!existsSync(stepFile)) {
    return { ok: false, error: `❌ 步骤文件不存在: ${manifest.steps[nextStep - 1].file}` };
  }
  const content = readFileSync(stepFile, 'utf8');

  if (json) {
    return { ok: true, done: false, phase, step: nextStep, total, name: manifest.steps[nextStep - 1].name, content };
  }

  console.log(formatNextOutput(manifest, nextStep, content));
  return { ok: true, done: false, phase, step: nextStep, total, name: manifest.steps[nextStep - 1].name };
}

function handleJump(dir, sillyDir, phase, target, sessionId, json) {
  const manifest = getManifest(sillyDir, phase);
  if (!manifest) {
    return { ok: false, error: `❌ 阶段 "${phase}" 不存在`, available: getAvailablePhases(sillyDir) };
  }

  const total = manifest.steps.length;
  if (target < 1 || target > total) {
    return { ok: false, error: `❌ 步骤 ${target} 越界（有效范围: 1-${total}）` };
  }

  const progress = getProgress(sillyDir, sessionId);
  progress[phase] = target;
  saveProgress(sillyDir, sessionId, progress);
  updateLastActive(sillyDir, sessionId);

  const stepFile = join(sillyDir, 'steps', phase, manifest.steps[target - 1].file);
  if (!existsSync(stepFile)) {
    return { ok: false, error: `❌ 步骤文件不存在: ${manifest.steps[target - 1].file}` };
  }
  const content = readFileSync(stepFile, 'utf8');

  if (json) {
    return { ok: true, phase, step: target, total, name: manifest.steps[target - 1].name, content };
  }

  console.log(formatNextOutput(manifest, target, content));
  return { ok: true, phase, step: target, total, name: manifest.steps[target - 1].name };
}

function handleStatus(sillyDir, sessionId, json) {
  const phases = getAvailablePhases(sillyDir);
  const progress = getProgress(sillyDir, sessionId);
  const results = [];

  for (const phase of phases) {
    const manifest = getManifest(sillyDir, phase);
    const p = parseInt(progress[phase], 10) || 0;
    const total = manifest ? manifest.steps.length : 0;
    const name = manifest ? (manifest.steps[Math.max(0, p - 1)]?.name || '') : '';
    results.push({ phase, progress: p, total, name });
  }

  if (json) return { ok: true, phases: results };

  for (const r of results) {
    if (r.total === 0) {
      console.log(`${r.phase}: 未开始`);
    } else if (r.progress === 0) {
      console.log(`${r.phase}: 未开始`);
    } else if (r.progress >= r.total) {
      console.log(`${r.phase}: 已完成 ✅`);
    } else {
      console.log(`${r.phase}: 步骤 ${r.progress}/${r.total}（${r.name}）`);
    }
  }
  return { ok: true, phases: results };
}

function handleList(sillyDir, phase, sessionId, json) {
  const manifest = getManifest(sillyDir, phase);
  if (!manifest) {
    return { ok: false, error: `❌ 阶段 "${phase}" 不存在`, available: getAvailablePhases(sillyDir) };
  }

  const progress = getProgress(sillyDir, sessionId);
  const current = parseInt(progress[phase], 10) || 0;
  const results = [];

  if (!json) console.log(`# ${phase} — ${manifest.description}`);

  for (let i = 0; i < manifest.steps.length; i++) {
    const num = i + 1;
    const s = manifest.steps[i];
    let status = '';
    if (num < current) status = '✅';
    else if (num === current) status = '← 当前';
    results.push({ step: num, name: s.name, status: num < current ? 'done' : num === current ? 'current' : 'pending' });

    if (!json) {
      console.log(`  ${num}. ${s.name.padEnd(16)}${status}`);
    }
  }
  return { ok: true, phase, description: manifest.description, steps: results };
}

function handleSessions(sillyDir, json) {
  const sessionsDir = join(sillyDir, 'sessions');
  if (!existsSync(sessionsDir)) {
    if (json) return { ok: true, sessions: [] };
    console.log('暂无会话');
    return { ok: true, sessions: [] };
  }

  const dirs = readdirSync(sessionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  if (dirs.length === 0) {
    if (json) return { ok: true, sessions: [] };
    console.log('暂无会话');
    return { ok: true, sessions: [] };
  }

  const phases = getAvailablePhases(sillyDir);
  const results = [];

  for (const sid of dirs) {
    const progress = getProgress(sillyDir, sid);
    const last = getLastActive(sillyDir, sid);
    const phaseSummaries = phases.map(ph => {
      const manifest = getManifest(sillyDir, ph);
      const p = parseInt(progress[ph], 10) || 0;
      const total = manifest ? manifest.steps.length : 0;
      return { phase: ph, progress: p, total };
    });
    const allDone = phaseSummaries.every(ps => ps.total > 0 && ps.progress >= ps.total);
    results.push({ sessionId: sid, phases: phaseSummaries, lastActive: last, allDone });
  }

  if (json) return { ok: true, sessions: results };

  for (const r of results) {
    const phaseStr = r.phases.map(ps => `${ps.phase} ${ps.progress}/${ps.total}`).join('  ');
    const done = r.allDone ? ' ✅' : '';
    console.log(`${r.sessionId}  ${phaseStr}  (last: ${timeAgo(r.lastActive)})${done}`);
  }
  return { ok: true, sessions: results };
}

function handleClean(sillyDir, options, json) {
  const { allDone, olderThan, sessionId: targetSession } = options;
  const sessionsDir = join(sillyDir, 'sessions');
  if (!existsSync(sessionsDir)) {
    if (json) return { ok: true, cleaned: [], dryRun: !targetSession && !allDone && !olderThan };
    console.log('暂无会话');
    return { ok: true, cleaned: [], dryRun: true };
  }

  const dirs = readdirSync(sessionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const phases = getAvailablePhases(sillyDir);
  const toClean = [];

  for (const sid of dirs) {
    const progress = getProgress(sillyDir, sid);
    const last = getLastActive(sillyDir, sid);
    const isAllDone = phases.every(ph => {
      const manifest = getManifest(sillyDir, ph);
      const p = parseInt(progress[ph], 10) || 0;
      return manifest && p >= manifest.steps.length;
    });
    const ageMs = last ? Date.now() - last : Infinity;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    let match = false;
    if (targetSession) match = sid === targetSession;
    else if (allDone) match = true;
    else if (olderThan !== null) match = ageDays >= olderThan;

    toClean.push({ sessionId: sid, allDone: isAllDone, lastActive: last, ageDays, match });
  }

  // 无参数 = dry-run
  const isDryRun = !targetSession && !allDone && olderThan === null;

  if (isDryRun) {
    if (json) return { ok: true, dryRun: true, sessions: toClean.map(s => ({ sessionId: s.sessionId, allDone: s.allDone, lastActive: s.lastActive, ageDays: Math.floor(s.ageDays) })) };
    console.log('📋 会话列表（dry-run，未执行清理）：');
    console.log('');
    for (const s of toClean) {
      const status = s.allDone ? '✅ 全部完成' : `进行中（${Math.floor(s.ageDays)}天前活跃）`;
      console.log(`  ${s.sessionId}  ${status}  (last: ${timeAgo(s.lastActive)})`);
    }
    return { ok: true, dryRun: true, sessions: toClean };
  }

  // 执行清理
  const cleaned = toClean.filter(s => s.match);
  if (cleaned.length === 0) {
    if (json) return { ok: true, cleaned: [] };
    console.log('没有匹配的会话需要清理');
    return { ok: true, cleaned: [] };
  }

  for (const s of cleaned) {
    rmSync(join(sessionsDir, s.sessionId), { recursive: true });
  }

  if (json) return { ok: true, cleaned: cleaned.map(s => s.sessionId) };
  console.log(`🗑️  已清理 ${cleaned.length} 个会话:`);
  for (const s of cleaned) console.log(`  - ${s.sessionId}`);
  return { ok: true, cleaned: cleaned.map(s => s.sessionId) };
}

// ── 主入口 ──

export async function cmdStep(dir, args = []) {
  const sillyDir = findSillyspecDir(dir);
  if (!sillyDir) {
    console.log('❌ 未找到 .sillyspec/ 目录，请先执行 sillyspec init');
    process.exit(1);
  }

  // 解析参数
  let json = false;
  let sessionId = null;
  let action = null;
  let phase = null;
  let jumpTarget = null;
  let cleanAllDone = false;
  let cleanOlderThan = null;
  let cleanSession = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') json = true;
    else if (a === '--session' && args[i + 1]) { sessionId = args[++i]; }
    else if (a === '--next') action = 'next';
    else if (a === '--status') action = 'status';
    else if (a === '--list') action = 'list';
    else if (a === '--jump' && args[i + 1]) { action = 'jump'; jumpTarget = parseInt(args[++i], 10); }
    else if (a === '--sessions') action = 'sessions';
    else if (a === '--clean') {
      action = 'clean';
      // 检查后续选项
      if (args[i + 1] === '--all-done') { cleanAllDone = true; i++; }
      else if (args[i + 1] === '--session' && args[i + 2]) { cleanSession = args[i + 2]; i += 2; }
      else if (args[i + 1] === '--older-than' && args[i + 2]) { cleanOlderThan = parseFloat(args[i + 2]); i += 2; }
    }
    else if (!a.startsWith('-')) {
      if (!phase) phase = a;
    }
  }

  const sid = getSessionId(dir, sessionId);

  // 如果 phase 提供但步骤目录不存在
  if (phase && action && action !== 'sessions' && action !== 'clean') {
    const stepsDir = join(sillyDir, 'steps');
    if (!existsSync(stepsDir) || !existsSync(join(stepsDir, phase, 'manifest.yaml'))) {
      const available = getAvailablePhases(sillyDir);
      if (json) {
        console.log(JSON.stringify({ ok: false, error: `阶段 "${phase}" 不存在`, available }));
        process.exit(1);
      }
      console.log(`❌ 阶段 "${phase}" 不存在`);
      if (available.length > 0) {
        console.log(`可用阶段: ${available.join(', ')}`);
      } else {
        console.log('暂无可用阶段（.sillyspec/steps/ 下无 manifest.yaml）');
      }
      process.exit(1);
    }
  }

  let result;
  switch (action) {
    case 'next':
      result = handleNext(dir, sillyDir, phase, sid, json);
      break;
    case 'jump':
      result = handleJump(dir, sillyDir, phase, jumpTarget, sid, json);
      break;
    case 'status':
      result = handleStatus(sillyDir, sid, json);
      break;
    case 'list':
      result = handleList(sillyDir, phase, sid, json);
      break;
    case 'sessions':
      result = handleSessions(sillyDir, json);
      break;
    case 'clean':
      result = handleClean(sillyDir, { allDone: cleanAllDone, olderThan: cleanOlderThan, sessionId: cleanSession }, json);
      break;
    default:
      console.log('❌ 请指定操作: --next, --status, --list, --jump <n>, --sessions, --clean');
      console.log('');
      console.log('用法:');
      console.log('  sillyspec step <phase> --next          获取步骤 + 自动推进');
      console.log('  sillyspec step <phase> --status        查看进度');
      console.log('  sillyspec step <phase> --list          查看步骤列表');
      console.log('  sillyspec step <phase> --jump <n>      跳到指定步骤');
      console.log('  sillyspec step --sessions              查看所有会话');
      console.log('  sillyspec step --clean                 dry-run 列出可清理会话');
      console.log('  sillyspec step --clean --all-done      清理所有阶段完成的会话');
      console.log('  sillyspec step --clean --session <id>  清理指定会话');
      console.log('  sillyspec step --clean --older-than <days>  清理 N 天前的会话');
      console.log('');
      console.log('选项:');
      console.log('  --session <id>    指定会话 ID');
      console.log('  --json            输出 JSON');
      process.exit(1);
  }

  if (result && !result.ok) {
    if (json) {
      console.log(JSON.stringify(result));
    } else if (result.error) {
      console.log(result.error);
    }
    process.exit(1);
  }

  if (json && result) {
    console.log(JSON.stringify(result));
  }
}
