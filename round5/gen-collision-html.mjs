#!/usr/bin/env node
// gen-collision-html.mjs — R5 对撞会话蝴蝶时间线（左 A·openspec / 中 时间轴 / 右 B·sillyspec）
// 用法: node gen-collision-html.mjs [A.json B.json 输出html]
import fs from 'fs';
import path from 'path';

const DEF_A = 'C:/Users/qinyi/Downloads/_cmp_zip/a/openspec-work_c76fe169/full.json';
const DEF_B = 'C:/Users/qinyi/Downloads/_cmp_zip/b/sillyspec-work_6917a473/full.json';
const OUT = process.argv[4] || new URL('./r5-collision-timeline.html', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const A = JSON.parse(fs.readFileSync(process.argv[2] || DEF_A, 'utf8'));
const B = JSON.parse(fs.readFileSync(process.argv[3] || DEF_B, 'utf8'));

const T0 = Math.min(...[A, B].map(x => new Date(x.logs[0].timestamp).getTime()));
const T1 = Math.max(...[A, B].map(x => new Date(x.logs[x.logs.length - 1].timestamp).getTime()));
const PXMS = 20 / 60000; // 20px / 分钟（纵向）
const CENTER = 860, CONTW = 1730, PAD = 40;
const H = Math.ceil((T1 - T0) * PXMS) + PAD * 2;
const Y = t => PAD + (t - T0) * PXMS;

const CATS = {
  SPEC: { c: '#7b1fa2', n: '规范/流程工件' },
  BACK: { c: '#2e7d32', n: '后端代码' },
  WEB: { c: '#00838f', n: '网页端代码' },
  MINI: { c: '#c2185b', n: '小程序代码' },
  E2ET: { c: '#ef6c00', n: 'E2E 工具' },
  BUILD: { c: '#b8860b', n: '构建/编译' },
  DEPLOY: { c: '#d84315', n: '部署' },
  E2ER: { c: '#ff6f00', n: 'E2E 执行' },
  COMMIT: { c: '#1b5e20', n: 'git 提交' },
  CLI: { c: '#1565c0', n: 'sillyspec CLI' },
  OCLI: { c: '#00695c', n: 'openspec CLI' },
  SKILL: { c: '#827717', n: 'skill/指令调用' },
  GATE: { c: '#c62828', n: 'gate 门禁' },
  USER: { c: '#111111', n: '真实用户消息' },
  NOTIF: { c: '#9e9e9e', n: '后台任务通知' },
  COMPACT: { c: '#616161', n: '上下文压缩' },
  SUB: { c: '#5e35b1', n: '子代理派发' },
};
const LANE = { // 每侧轨道（距中心偏移，两侧镜像）
  run: [6, 10], phase: [16, 150], spec: [170, 104], code: [278, 117], ops: [399, 130], flow: [533, 156],
};
const ANNO_OFF = 701, ANNO_W = 150;
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const bj = t => { const d = new Date(t + 8 * 3600e3); return d.toISOString().slice(11, 19); };

function classifyWrite(fp) {
  const n = fp.replace(/\\/g, '/');
  if (n.includes('.sillyspec')) return 'SPEC';
  if (/openspec\/pollute\/openspec\//.test(n)) return 'SPEC';
  if (/verify-rp|GenToken|gen-token|cleanup-covtest|check-leftover/.test(n)) return 'E2ET';
  if (n.includes('pollute')) return 'BACK';
  if (n.includes('sub-grid-security')) return 'WEB';
  if (n.includes('spdemo')) return 'MINI';
  if (n.includes('/openspec/')) return 'E2ET';
  return 'SPEC';
}
function classifyBash(cmd) {
  if (/git commit/.test(cmd)) return 'COMMIT';
  if (/build:weapp/.test(cmd)) return 'BUILD';
  if (/\bmvn\b/.test(cmd) && /package|compile|install|test/.test(cmd)) return 'BUILD';
  if (/verify-rp\.py/.test(cmd)) return 'E2ER';
  if (/java .*(-jar|\bjar\b)|pollute-service\.jar/.test(cmd)) return 'DEPLOY';
  return null;
}
function laneOf(cat) {
  if (cat === 'SPEC' || cat === 'E2ET') return 'spec';
  if (['BACK', 'WEB', 'MINI'].includes(cat)) return 'code';
  if (['BUILD', 'DEPLOY', 'E2ER', 'COMMIT'].includes(cat)) return 'ops';
  return 'flow'; // CLI/GATE/USER/NOTIF/COMPACT/SUB
}

function extract(x, side) {
  const ev = [];
  const push = (t, cat, label, detail = '', extra = {}) => ev.push({ t: new Date(t).getTime(), side, cat, label, detail: detail.slice(0, 260), ...extra });
  for (const r of x.runs) push(r.started_at, 'RUN', `${r.model} ${r.status}`, `${r.model} · ${((new Date(r.finished_at || r.started_at) - new Date(r.started_at)) / 1000).toFixed(0)}s · in:${(r.input_tokens / 1000).toFixed(0)}K out:${(r.output_tokens / 1000).toFixed(0)}K${r.error_code ? ' · ' + r.error_code : ''}`, { run: true, end: new Date(r.finished_at || r.started_at).getTime(), model: r.model, status: r.status });
  const logs = x.logs;
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    const c = l.content_redacted || '';
    const t = new Date(l.timestamp).getTime();
    if (l.channel === 'user_input') {
      const notif = c.includes('[后台任务通知]') || c.includes('[USAGE_NOTE]');
      push(t, notif ? 'NOTIF' : 'USER', notif ? '通知' : '用户: ' + c.replace(/\s+/g, ' ').slice(0, 60), c.replace(/\s+/g, ' '));
    } else if (l.channel === 'stdout') {
      if (c.startsWith('[TASK_STARTED]')) {
        try { const j = JSON.parse(c.slice(13)); push(t, 'SUB', '派发: ' + (j.task_name || '').slice(0, 40), j.task_name || ''); } catch { }
      } else if (c.includes('COMPACT_STATUS') || c.includes('session is being continued')) push(t, 'COMPACT', '上下文压缩', c.replace(/\s+/g, ' ').slice(0, 120));
    } else if (l.channel === 'tool_call') {
      if (l.tool_kind === 'write') {
        try { const j = JSON.parse(c); const fp = j.args?.file_path || j.args?.path || ''; if (fp) push(t, classifyWrite(fp), path.basename(fp), fp); } catch { }
      } else if (l.tool_kind === 'bash') {
        try {
          const cmd = JSON.parse(c).args?.command || '';
          const osm = cmd.match(/(?:npx (?:-y )?)?openspec\s+(validate|list|status|instructions|show|archive|init|apply|sync|update)\b/);
          if (osm) {
            let verdict = '';
            if (osm[1] === 'validate') {
              for (let j2 = i + 1; j2 < Math.min(i + 10, logs.length) && logs[j2].channel !== 'tool_call'; j2++) {
                const s = logs[j2].content_redacted || '';
                if (/is valid|✅|no (issues|errors)/i.test(s)) { verdict = ' ✅过'; break; }
                if (/error|missing|invalid|❌|fail/i.test(s)) { verdict = ' ❌未过'; break; }
              }
            }
            push(t, 'OCLI', 'openspec ' + osm[1] + verdict, cmd.replace(/\s+/g, ' ').slice(0, 200));
          } else {
            const cat = classifyBash(cmd);
            if (cat) push(t, cat, cat === 'COMMIT' ? 'git commit' : cat === 'BUILD' ? (cmd.includes('weapp') ? 'weapp 构建' : 'mvn 构建') : cat === 'E2ER' ? 'E2E 断言跑' : '部署 8416', cmd.replace(/\s+/g, ' ').slice(0, 200));
          }
        } catch { }
      } else if (l.tool_kind === 'skill') {
        try { const j = JSON.parse(c); const sk = (j.args && j.args.skill) || 'skill'; push(t, 'SKILL', '/' + sk, c.slice(0, 150)); } catch { }
      } else if (l.tool_kind === 'sillyspec') {
        try {
          const cmd = JSON.parse(c).args?.command || '';
          const isGate = /\bgate\s+(\w+)/.test(cmd);
          let verdict = '';
          if (isGate) for (let j2 = i + 1; j2 < Math.min(i + 15, logs.length) && logs[j2].channel !== 'tool_call'; j2++) {
            const s = logs[j2].content_redacted || '';
            if (/未通过|❌/.test(s)) { verdict = ' ❌未过'; break; }
            if (/✅|通过/.test(s) && /gate/i.test(s)) { verdict = ' ✅过'; break; }
          }
          const m = cmd.match(/sillyspec\s+([a-z-]+(?:\s+[a-z-]+)?)/);
          push(t, isGate ? 'GATE' : 'CLI', (isGate ? 'gate ' : '') + (m ? m[1] : '').slice(0, 24) + verdict, cmd.replace(/\s+/g, ' ').slice(0, 200));
        } catch { }
      }
    }
  }
  return ev.sort((a, b2) => a.t - b2.t);
}

const evA = extract(A, 'A'), evB = extract(B, 'B');
const all = [...evA, ...evB].sort((a, b) => a.t - b.t);

// daemon 空窗（双侧共同）
function gaps(x) { const ts = x.logs.map(l => new Date(l.timestamp).getTime()); const out = []; for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > 120e3) out.push([ts[i - 1], ts[i]]); return out; }
const gA = gaps(A), gB = gaps(B);
const gap = gA.find(g => gB.some(g2 => Math.abs(g2[0] - g[0]) < 60e3)) || null;

const PH = (h1, m1, h2, m2) => [Date.parse(`2026-09-21T${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}:00Z`), Date.parse(`2026-09-21T${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}:00Z`)];
const PHASES = {
  A: [
    [...PH(0, 46, 0, 52), '探索+proposal/specs', '#e3f2fd'],
    [...PH(1, 37, 1, 44), '恢复→design/tasks 薄写', '#fff3e0'],
    [...PH(1, 44, 2, 55), '三端写码+增量编译', '#e8f5e9'],
    [...PH(2, 55, 3, 6), '部署 8416', '#fce4ec'],
    [...PH(3, 6, 3, 26), 'E2E 全场景+修复+清理', '#fffde7'],
    [...PH(3, 26, 3, 30), '归档 3/5(截断)', '#f3e5f5'],
  ],
  B: [
    [...PH(0, 47, 0, 52), 'brainstorm 起步+派调研', '#e3f2fd'],
    [...PH(1, 37, 1, 40), '恢复重定向+重派调研', '#fff3e0'],
    [...PH(1, 40, 1, 59), 'brainstorm 收尾(Grill 审查)', '#ede7f6'],
    [...PH(1, 59, 2, 30), 'plan+15 卡+plan 审查', '#e8eaf6'],
    [...PH(2, 30, 2, 45), 'execute 前置+环境准备', '#fbe9e7'],
    [...PH(2, 45, 3, 18), 'Wave1 实现(3 子代理)', '#e8f5e9'],
    [...PH(3, 18, 3, 30), 'Wave2(被截断)', '#ffebee'],
  ],
};
const MODELC = { 'glm-5.1': '#78909c', 'glm-5.3': '#1976d2', 'glm-5.3-flashx': '#ef6c00' };
const ANNOS = [
  ['A', '2026-09-21T01:37:42Z', '恢复（同句"继续跑"）'],
  ['A', '2026-09-21T01:44:46Z', '首行业务代码·复跑后 7′'],
  ['A', '2026-09-21T01:56:49Z', '边写边 mvn 编译'],
  ['A', '2026-09-21T02:55:27Z', '部署 8416'],
  ['A', '2026-09-21T03:08:37Z', 'E2E 全场景开跑'],
  ['A', '2026-09-21T03:26:10Z', '进入归档(3/5)'],
  ['B', '2026-09-21T01:37:25Z', '恢复（同句"继续跑"）'],
  ['B', '2026-09-21T02:08:51Z', 'TaskCard×15(3 子代理)'],
  ['B', '2026-09-21T02:27:51Z', 'plan --done 三连卡假阳性'],
  ['B', '2026-09-21T02:30:10Z', 'execute 开跑'],
  ['B', '2026-09-21T02:38:49Z', 'robocopy 全量 node_modules'],
  ['B', '2026-09-21T02:47:12Z', '首行业务代码·复跑后 70′(子代理)'],
  ['B', '2026-09-21T03:17:19Z', 'Wave1 完成→Wave2'],
  ['B', '2026-09-21T03:21:59Z', 'Wave2 派发(截断前在飞)'],
];

// ── 渲染 ──
let ticks = '';
for (let tt = Math.ceil(T0 / 300000) * 300000; tt <= T1; tt += 300000) {
  const y = Y(tt), major = new Date(tt).getUTCMinutes() % 10 === 0;
  ticks += `<div class="tick${major ? ' major' : ''}" style="top:${y}px"></div>`;
  if (major) ticks += `<div class="tlabel" style="top:${y - 8}px">${bj(tt).slice(0, 5)}</div>`;
}

function sideHTML(side, evs, phases) {
  const dir = side === 'A' ? -1 : 1; // A 向左
  // 统一 left 坐标：轨道元素 x = CENTER-off-w（A，右缘贴 CENTER-off）/ CENTER+off（B）
  const lx = (off, w) => (dir < 0 ? CENTER - off - w : CENTER + off);
  // run 竖条
  let runs = '';
  for (const e of evs) {
    if (!e.run) continue;
    const y1 = Y(e.t), y2 = Math.max(Y(e.end), y1 + 2);
    const dur = (e.end - e.t) / 1000;
    runs += `<div class="runbar${e.status === 'failed' ? ' failed' : ''}" style="top:${y1}px;height:${y2 - y1}px;left:${CENTER - (dir < 0 ? 6 : -6)}px;background:${MODELC[e.model] || '#455a64'}" title="${bj(e.t)}-${bj(e.end)} ${esc(e.detail)}"></div>`;
    if (dur > 240) {
      const lbl = dur > 5400 ? `${(dur / 60).toFixed(0)}min 连续` : `${(dur / 60).toFixed(0)}min`;
      runs += `<div class="runlbl" style="top:${(y1 + y2) / 2 - 8}px;left:${dir < 0 ? 0 : CENTER + 14}px;${dir < 0 ? `width:${CENTER - 14}px;` : ''}text-align:${dir < 0 ? 'right' : 'left'}">${lbl}</div>`;
    }
  }
  // 阶段段
  const ph = phases.map(([a, b, label, c]) => {
    const y1 = Y(a), y2 = Y(b);
    return `<div class="phseg" style="top:${y1 + 1}px;height:${y2 - y1 - 2}px;left:${lx(LANE.phase[0], LANE.phase[1])}px;width:${LANE.phase[1]}px;background:${c}" title="${bj(a)}-${bj(b)} ${esc(label)}"><span>${esc(label)}</span></div>`;
  }).join('');
  // 事件点：按(轨道,分钟)桶内水平错位
  const buckets = {};
  for (const e of evs) {
    if (e.run) continue;
    const lane = laneOf(e.cat);
    const m = Math.floor((e.t - T0) / 60000);
    const k = lane + '|' + m;
    (buckets[k] = buckets[k] || []).push(e);
  }
  let dots = '';
  for (const e of evs) {
    if (e.run) continue;
    const lane = laneOf(e.cat);
    const m = Math.floor((e.t - T0) / 60000);
    const idx = buckets[lane + '|' + m].indexOf(e);
    const [base, wdt] = LANE[lane];
    const step = 13, slot = Math.min(idx, Math.floor(wdt / step) - 1);
    const off = base + slot * step;
    const x = dir < 0 ? CENTER - off - 11 : CENTER + off; // 点宽 11
    const sym = { USER: '★', GATE: 'G', CLI: 's', OCLI: 'o', SKILL: '⌘', NOTIF: '·', COMPACT: '↻', SUB: '▸' }[e.cat] || '·';
    dots += `<i class="d ${e.cat}${e.cat === 'USER' ? ' big' : ''}" style="top:${Y(e.t) - 6}px;left:${x}px;background:${CATS[e.cat].c}" data-idx="${all.indexOf(e)}" title="${bj(e.t)} [${CATS[e.cat].n}] ${esc(e.label)}&#10;${esc(e.detail)}">${sym}</i>`;
  }
  // 里程碑注释（最外列）
  const annos = ANNOS.filter(a => a[0] === side).map(([s, t, txt]) => {
    const y = Y(Date.parse(t));
    return `<div class="anno" style="top:${y - 9}px;left:${lx(ANNO_OFF, ANNO_W)}px;width:${ANNO_W}px;text-align:${dir < 0 ? 'right' : 'left'};border-${dir < 0 ? 'right' : 'left'}:3px solid ${side === 'A' ? '#e65100' : '#1565c0'}">${esc(txt)}<div class="annotime">${bj(Date.parse(t))}</div></div>`;
  }).join('');
  return runs + ph + dots + annos;
}

const gapBand = gap ? `<div class="gapband" style="top:${Y(gap[0])}px;height:${(Y(gap[1]) - Y(gap[0])).toFixed(1)}px"><span>daemon 宕机 ${((gap[1] - gap[0]) / 60000).toFixed(0)} 分钟（双方向步）</span></div>` : '';
const endMark = `<div class="endmark" style="top:${Y(Date.parse('2026-09-21T03:29:00Z'))}px"><span>11:29 daemon_interrupted 双方同断</span></div>`;

const stats = `
<table class="stats"><tr><th>维度</th><th>A · openspec（左）</th><th>B · sillyspec v3.29.5（右）</th></tr>
<tr><td>轮数 (runs)</td><td><b>4</b>（复跑后 1 轮连续 6743s）</td><td><b>23</b>（最长 3020s，19 轮为通知轮）</td></tr>
<tr><td>token（导出口径，不含缓存读）</td><td>929K in / 303K out</td><td><b>1.84M in / 572K out（≈2×）</b></td></tr>
<tr><td>复跑→首行业务代码</td><td><b>7 分钟</b></td><td><b>70 分钟</b></td></tr>
<tr><td>业务代码文件</td><td>55（后端24/网页19/小程序12）</td><td>26（数据层+骨架）</td></tr>
<tr><td>流程工件</td><td>11</td><td>30（含 15 TaskCard+2 审查）</td></tr>
<tr><td>git 提交</td><td>12（三仓全提交）</td><td>5</td></tr>
<tr><td>E2E 证据</td><td>55/55 断言+负例+清理回查</td><td>无（verify 未到达）</td></tr>
<tr><td>中断时进度</td><td>归档 3/5</td><td>execute step 6/14，Wave2 在飞</td></tr></table>`;

const legend = Object.entries(CATS).map(([k, v]) => `<span class="lg"><i style="background:${v.c}"></i>${v.n}</span>`).join('') +
  `<span class="lg"><i style="background:#78909c;width:18px;height:5px;border-radius:2px"></i>run·glm-5.1</span><span class="lg"><i style="background:#1976d2;width:18px;height:5px;border-radius:2px"></i>run·glm-5.3</span><span class="lg"><i style="background:#ef6c00;width:18px;height:5px;border-radius:2px"></i>run·flashx</span>`;

// 事件明细：蝴蝶表 —— 按分钟桶，左 A / 中时间 / 右 B
const chipColor = e => e.run ? (MODELC[e.model] || '#455a64') : CATS[e.cat].c;
const chipName = e => e.run ? 'agent 运行(run)' : CATS[e.cat].n;
const chip = e => {
  const idx = all.indexOf(e);
  return `<span class="chip" data-idx="${idx}" data-side="${e.side}" data-cat="${e.run ? 'RUN' : e.cat}" style="border-color:${chipColor(e)}"><i class="dot" style="background:${chipColor(e)}"></i><b>${esc(e.label)}</b><em>${esc(String(e.detail).slice(0, 90))}${String(e.detail).length > 90 ? '…' : ''}</em></span>`;
};
const minBuckets = new Map();
for (const e of all) {
  const m = Math.floor((e.t - T0) / 60000);
  if (!minBuckets.has(m)) minBuckets.set(m, { A: [], B: [] });
  minBuckets.get(m)[e.side].push(e);
}
const evRows = [...minBuckets.entries()].sort((a, b) => a[0] - b[0]).map(([m, g]) => {
  const label = bj(T0 + m * 60000).slice(0, 5);
  return `<tr class="evrow"><td class="cellA">${g.A.map(chip).join('') || '<span class="empty">·</span>'}</td><td class="tcell">${label}</td><td class="cellB">${g.B.map(chip).join('') || '<span class="empty">·</span>'}</td></tr>`;
}).join('');

// 轨道表头（与轨道同 x 位）
const laneHeads = [
  ['阶段', LANE.phase], ['工件', LANE.spec], ['代码', LANE.code], ['构建·E2E·提交', LANE.ops], ['流程·CLI·子代理', LANE.flow],
];
const headA = laneHeads.map(([n, [off, w]]) => `<div class="lh" style="left:${CENTER - off - w}px;width:${w}px">${n}</div>`).join('') + `<div class="lh sideName" style="left:12px;width:${ANNO_W}px;text-align:right;color:#e65100">A · openspec</div>`;
const headB = laneHeads.map(([n, [off, w]]) => `<div class="lh" style="left:${CENTER + off}px;width:${w}px">${n}</div>`).join('') + `<div class="lh sideName" style="left:${CENTER + ANNO_OFF}px;width:${ANNO_W}px;color:#1565c0">B · sillyspec</div>`;

const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>R5 对撞蝴蝶时间线 · 左 openspec / 右 sillyspec</title><style>
*{box-sizing:border-box}body{font:13px/1.45 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;margin:0;background:#fafafa;color:#212121}
header{padding:14px 18px 6px}h1{font-size:17px;margin:0 0 4px}.sub{color:#666;font-size:12px}
.stats{border-collapse:collapse;margin:8px 0;background:#fff}.stats th,.stats td{border:1px solid #ddd;padding:4px 10px;font-size:12px;text-align:left}.stats th{background:#f0f0f0}
.legend{padding:4px 18px 10px;display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:#555}.lg{display:inline-flex;align-items:center;gap:4px}.lg i{width:10px;height:10px;border-radius:50%;display:inline-block}
.chartwrap{overflow-x:auto;background:#fff;border-top:1px solid #ccc;border-bottom:1px solid #ccc}
.heads{position:sticky;top:0;z-index:9;background:#fff;height:26px;border-bottom:1px solid #ddd}
.chart{position:relative;width:${CONTW}px;height:${H}px;margin:0 auto}
.spine{position:absolute;left:${CENTER - 1}px;top:0;bottom:0;width:2px;background:#90a4ae}
.tick{position:absolute;left:${CENTER - 5}px;width:10px;height:1px;background:#b0bec5}.tick.major{left:${CENTER - 8}px;width:16px;height:2px;background:#78909c}
.tlabel{position:absolute;left:${CENTER + 10}px;font-size:10.5px;color:#546e7a;background:#ffffffd9;padding:0 3px;border-radius:3px}
.lh{position:absolute;top:5px;font-size:11px;color:#455a64;text-align:center;white-space:nowrap}.lh.sideName{font-weight:700;font-size:12.5px}
.runbar{position:absolute;width:6px;border-radius:3px;opacity:.9;z-index:3}.runbar.failed{outline:2px solid #b71c1c}
.runlbl{position:absolute;font-size:10px;color:#607d8b;white-space:nowrap;z-index:3}
.phseg{position:absolute;overflow:hidden;border-right:1px solid #fff;z-index:1}.phseg span{font-size:10.5px;padding:1px 4px;white-space:nowrap;color:#37474f}
.d{position:absolute;width:11px;height:11px;border-radius:50%;color:#fff;font-size:8.5px;line-height:11px;text-align:center;font-style:normal;cursor:pointer;z-index:4}.d.big{width:14px;height:14px;line-height:14px;font-size:10px;z-index:5}
.gapband{position:absolute;left:0;width:${CONTW}px;background:repeating-linear-gradient(45deg,#eceff1,#eceff1 8px,#e0e0e0 8px,#e0e0e0 16px);opacity:.8;z-index:2}.gapband span{position:absolute;left:50%;transform:translateX(-50%);font-size:11px;color:#607d8b;background:#ffffffd9;padding:1px 8px;border-radius:3px}
.endmark{position:absolute;left:0;width:${CONTW}px;border-top:2px dashed #b71c1c;z-index:6}.endmark span{position:absolute;left:50%;transform:translateX(-50%);top:3px;font-size:11px;color:#b71c1c;background:#fff;padding:1px 8px;border-radius:3px}
.anno{position:absolute;font-size:10.5px;color:#333;padding:1px 5px;background:#ffffffe8;border-radius:3px;z-index:7;pointer-events:none}.annotime{font-size:9.5px;color:#888}
.tbl{padding:10px 18px}.tbl h2{font-size:14px;margin:6px 0}
.filters{margin:6px 0;font-size:12px}.filters label{margin-right:10px;cursor:pointer;white-space:nowrap}
table.ev{border-collapse:collapse;width:100%;background:#fff}table.ev td,table.ev th{border:1px solid #e0e0e0;padding:3px 8px;font-size:12px;vertical-align:top}table.ev th{position:sticky;top:26px;background:#eee;z-index:2}
tr.evrow .cellA{text-align:right;width:46%}tr.evrow .cellB{text-align:left;width:46%}
.tcell{text-align:center;white-space:nowrap;color:#37474f;font-weight:700;background:#f5f7f8;font-size:11.5px}
.chip{display:inline-block;margin:1px 0 1px 6px;padding:1px 7px;border:1px solid;border-radius:9px;font-size:11px;max-width:100%;vertical-align:top}
.cellA .chip{margin:1px 6px 1px 0}
.chip b{font-weight:600;margin:0 3px 0 2px}
.chip em{font-style:normal;color:#757575;font-family:Consolas,monospace;font-size:10px;word-break:break-all}
.chip .dot{margin-right:2px}
.empty{color:#cfd8dc}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
.lb{font-weight:600}.dt{color:#616161;font-family:Consolas,monospace;font-size:11px;word-break:break-all}
p.tip{font-size:12px;color:#888}
</style></head><body>
<header><h1>R5 对撞蝴蝶时间线：左 A·OpenSpec ｜ 中间时间轴 ｜ 右 B·SillySpec v3.29.5 — 2026-09-21 08:46–11:30（北京时间）</h1>
<div class="sub">同一任务（EHS 安全奖惩三端开发）· 08:52–09:38 daemon 宕机（双侧斜纹带）· 11:29 同被 daemon_interrupted（红虚线）· 事件点悬停看详情、点击在底部明细表定位 · 页面纵向滚动即时间推进</div>
${stats}</header>
<div class="legend">${legend}</div>
<div class="chartwrap">
  <div class="heads" style="width:${CONTW}px;margin:0 auto;position:relative">${headA}${headB}<div class="lh" style="left:${CENTER - 30}px;width:60px;color:#37474f;font-weight:700">时间</div></div>
  <div class="chart">
    <div class="spine"></div>
    ${ticks}
    ${gapBand}${endMark}
    ${sideHTML('A', evA, PHASES.A)}
    ${sideHTML('B', evB, PHASES.B)}
  </div>
</div>
<div class="tbl"><h2>事件明细（蝴蝶对照：左 A·openspec ｜ 时间 ｜ 右 B·sillyspec，同一分钟一行）</h2>
<div class="filters" id="filters">
<label><input type="checkbox" checked data-side="A">A · openspec</label><label><input type="checkbox" checked data-side="B">B · sillyspec</label>
${Object.entries(CATS).map(([k, v]) => `<label><input type="checkbox" checked data-cat="${k}"><i class="dot" style="background:${v.c}"></i>${v.n}</label>`).join('')}
<label><input type="checkbox" checked data-cat="RUN"><i class="dot" style="background:#1976d2"></i>agent 运行(run)</label>
</div>
<table class="ev" id="ev"><thead><tr><th style="text-align:right">A · openspec（左）</th><th style="width:64px">时间</th><th style="text-align:left">B · sillyspec（右）</th></tr></thead><tbody>${evRows}</tbody></table>
<p class="tip">数据源：两会话 full.json 全量导出（2358/3333 条日志）；由 round5/gen-collision-html.mjs 生成，归因见 r5-collision-ehs-attribution.md。导出 token 不含缓存读，真实账单差距更大（P14）。</p>
</div>
<script>
document.querySelectorAll('.d[data-idx]').forEach(el=>{el.addEventListener('click',()=>{const ch=document.querySelector('.chip[data-idx=\"'+el.dataset.idx+'\"]');if(ch){ch.scrollIntoView({block:'center'});ch.style.background='#fff9c4';setTimeout(()=>ch.style.background='',2500);}});});
const f=document.getElementById('filters');
function applyFilters(){const sides=[...f.querySelectorAll('[data-side]:checked')].map(x=>x.dataset.side);const cats=[...f.querySelectorAll('[data-cat]:checked')].map(x=>x.dataset.cat);document.querySelectorAll('.chip').forEach(ch=>{ch.style.display=(sides.includes(ch.dataset.side)&&cats.includes(ch.dataset.cat))?'':'none';});document.querySelectorAll('tr.evrow').forEach(tr=>{const any=[...tr.querySelectorAll('.chip')].some(c=>c.style.display!=='none');tr.style.display=any?'':'none';});}
f.addEventListener('change',applyFilters);
</script></body></html>`;

fs.writeFileSync(OUT, html);
console.log('OK ->', OUT);
console.log('A:', evA.length, 'B:', evB.length, 'rows:', all.length, 'height:', H + 'px', 'gap:', gap ? bj(gap[0]) + '-' + bj(gap[1]) : 'none');
