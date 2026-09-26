/**
 * timeline.js — 变更合成时间线（2026-09-26-watcher-timeline）。
 *
 * 只读合成器：watcher 事件流（jsonl）× tasks.md 勾选行 × git 提交锚 → 人类可读时间线。
 * 轻量变更无阶段 --done 步骤面（平台 UI 时间线只覆盖完整流程），本模块把既有留痕事后
 * 合成——零新落盘、零协议负担。CLI 出口：sillyspec watcher timeline --change <名>
 * （index.js watcher case，与 alerts 同族只读）。
 *
 * 纯度口径：本文件全部纯函数（git 经 gitLook 注入面，测试零真仓）；I/O 与退出码归接线层。
 * 诚实面（FR-04）：事件流 task-done 只记计数不记任务 id——勾选时刻按翻格顺序推断，表头
 * 显式「≈」，计数链断裂标「推断不可用」；提交 hash 不可解析只显 hash 并标注。
 */
import { readFileSync } from 'fs';
import { join } from 'path';

/** tasks.md 勾选行解析：`- [x] task-01: 描述` / `- [ ] task-02 无冒号描述`。 */
export function parseTaskLines(tasksMd) {
  const out = [];
  for (const line of String(tasksMd || '').split(/\r?\n/)) {
    const m = /^[-*] \[( |x|X)\] (task-\d+):?[ \t]*(.*)$/.exec(line);
    if (m) out.push({ id: m[2], checked: m[1].toLowerCase() === 'x', desc: m[3].trim() });
  }
  return out;
}

/**
 * 翻格顺序推断（FR-04）：task-done（stage='tasks'）事件序列 → 每任务序号的勾选时刻。
 * 计数链衔接（from === 游标）才赋值；断裂标 broken（此后不再赋值——不编造）。
 * @returns {{times:(number|null)[], broken:boolean}} times 按任务序号索引；未推断到 = null。
 */
export function inferFlipTimes(events, total) {
  const times = new Array(Math.max(0, total || 0)).fill(null);
  let cursor = 0;
  let broken = false;
  for (const e of events || []) {
    if (!e || e.kind !== 'task-done' || (e.stage && e.stage !== 'tasks')) continue;
    const m = /^checked (\d+)→(\d+)$/.exec(String(e.detail || ''));
    if (!m) continue;
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (from !== cursor) { broken = true; break; }
    for (let i = from; i < to && i < times.length; i++) times[i] = e.ts;
    cursor = to;
  }
  if (cursor < times.length && times.some((t) => t != null)) broken = true; // 链未覆盖全部已勾——尾部断
  return { times, broken };
}

/** 提交消息里的 task token 清单（去重保序）。 */
function tokensOf(text) {
  const out = [];
  for (const t of String(text || '').match(/task-\d+(?!\d)/g) || []) {
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * 提交锚解析：事件流 kind=commit 的短 hash → gitLook 解析出主题/时间/token。
 * @param {Function} gitLook (hash) => null | {hash, dateISO, message}（注入面，接线层包 gitQuiet）
 * @returns {Array<{hash, ts, subject, tokens, resolvable}>} ts 取事件观测时刻（git 日期仅存证）。
 */
export function resolveCommitAnchors(events, gitLook) {
  const out = [];
  for (const e of events || []) {
    if (!e || e.kind !== 'commit' || !e.detail) continue;
    const hash = String(e.detail).trim();
    let info = null;
    try { info = gitLook ? gitLook(hash) : null; } catch { info = null; }
    out.push({
      hash,
      ts: e.ts,
      subject: info ? String(info.message || '').split(/\r?\n/)[0] : null,
      tokens: info ? tokensOf(info.message) : [],
      resolvable: Boolean(info),
    });
  }
  return out;
}

/** 本地 HH:MM:SS（与 watcher alerts fmtLocal 同风格，供渲染层一致时间面）。 */
function fmtHMS(ts) {
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return String(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const clip = (s, n) => {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, Math.max(0, n - 1)) + '…' : t;
};

/** 事件 → 时间轴行文本（图标+标签+剪裁 detail；提交行拼 subject）。 */
function eventRow(e, anchors) {
  const icon = { file: '📄', 'file-update': '📝', 'task-done': '✅', commit: '🔀', verify: '🔬', warning: '⚠️', archived: '📦' }[e.kind] || '·';
  let label = e.detail || '';
  if (e.kind === 'commit') {
    const a = anchors.find((x) => x.hash === String(e.detail).trim());
    label = a && a.resolvable
      ? `${e.detail}  ${clip(a.subject, 56)}`
      : `${e.detail}（subject 不可解析——hash 失联/他仓）`;
  } else if (e.kind === 'warning') {
    label = `${e.rule || 'warning'}  ${clip(e.detail, 64)}`;
  } else {
    label = clip(e.detail, 72);
  }
  return `${fmtHMS(e.ts)}  ${icon} ${label}`;
}

/**
 * 合成渲染（纯函数，接线层 console.log）。
 * @param {object} args
 * @param {string} args.change 变更名
 * @param {Array} args.events 事件流（readWatcherEvents.events）
 * @param {Array|null} args.tasks parseTaskLines 产物（null=任务面缺失）
 * @param {Array} args.anchors resolveCommitAnchors 产物
 * @param {number|null} args.birthTs 诞生锚（工件 frontmatter created_at 毫秒；null=缺）
 * @param {string|null} args.tier flow-state tier（null=缺/未知）
 */
export function renderTimeline({ change, events, tasks, anchors, birthTs, tier }) {
  const L = [];
  L.push(`📅 ${change} — 合成时间线（${tier || 'tier 未知'}｜事件流 × tasks.md × git 提交锚）`);
  L.push('');
  L.push('── 事件时间轴 ──');
  if (birthTs != null) L.push(`${fmtHMS(birthTs)}  🁢 变更诞生（工件 frontmatter created_at）`);
  if (!events || events.length === 0) L.push('（无事件——watcher 未观测到活动）');
  for (const e of events || []) L.push(eventRow(e, anchors));

  if (tasks) {
    L.push('');
    L.push('── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──');
    const { times, broken } = inferFlipTimes(events, tasks.length);
    if (broken) L.push('（计数链断裂或未全覆盖——部分勾选时刻推断不可用，标 ?）');
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const when = t.checked
        ? (times[i] != null ? `≈${fmtHMS(times[i])}` : '?')
        : '未勾';
      const anchor = anchors.filter((a) => a.tokens.includes(t.id)).sort((a, b) => a.ts - b.ts)[0];
      const ev = anchor ? anchor.hash : (t.checked ? '无提交锚⚠️' : '—');
      L.push(`${t.id}  ${when.padEnd(10)}  ${clip(t.desc, 44).padEnd(46)}${ev}`);
    }
  } else {
    L.push('');
    L.push('── 任务面缺失（change 目录无 tasks.md——活跃/归档双路径均未命中）──');
  }

  const evN = (events || []).length;
  const commits = anchors.length;
  const lastTs = evN > 0 ? events[events.length - 1].ts : birthTs;
  const wall = birthTs != null && lastTs != null ? Math.max(0, Math.round((lastTs - birthTs) / 60000)) : null;
  const done = tasks ? tasks.filter((t) => t.checked).length : null;
  L.push('');
  L.push(`墙钟：${wall != null ? `${wall} 分钟` : '未知'}｜事件 ${evN} 条｜提交 ${commits}｜${tasks ? `任务 ${done}/${tasks.length} 勾选` : '任务面缺失'}`);
  L.push('注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。');
  return L.join('\n');
}

/** change 目录双路径探测（活跃 > 归档）+ tasks.md 读取 → {changeDir, tasksMd}（缺 tasksMd=null）。 */
export function loadChangeTasks(specBase, change) {
  const active = join(specBase, 'changes', change);
  const archived = join(specBase, 'changes', 'archive', change);
  const dir = [active, archived].find((d) => { try { return readFileSync(join(d, 'tasks.md'), 'utf8') != null } catch { return false } });
  if (!dir) return { changeDir: null, tasksMd: null };
  return { changeDir: dir, tasksMd: readFileSync(join(dir, 'tasks.md'), 'utf8') };
}

/** 诞生锚：change 目录工件 frontmatter created_at（requirements > proposal > design > tasks）。 */
export function readBirthTs(changeDir) {
  if (!changeDir) return null;
  for (const f of ['requirements.md', 'proposal.md', 'design.md', 'tasks.md']) {
    try {
      const m = /^created_at:\s*(\S+)/m.exec(readFileSync(join(changeDir, f), 'utf8'));
      const t = m ? Date.parse(m[1]) : Number.NaN;
      if (Number.isFinite(t)) return t;
    } catch { /* 缺件续查 */ }
  }
  return null;
}

export default { parseTaskLines, inferFlipTimes, resolveCommitAnchors, renderTimeline, loadChangeTasks, readBirthTs };
