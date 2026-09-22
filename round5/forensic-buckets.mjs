import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });

const SESSIONS = {
  A: 'sess_e31939da-a166-4285-899e-8a8ecbd2823f', // sillyspec 3.30.0
  B: 'sess_e273fe12-2bb7-4f78-ae7d-f2851d6866cc', // OpenSpec 1.13.1
};

const WTRE = /[.]sillyspec[\\/]+[.]runtime[\\/]+worktrees[\\/][^\\/"&;|]+/g;
const stripWt = (s) => (s || '').replace(WTRE, '<WT>');

function mainVerbOf(cmd) {
  const segs = cmd.split(/&&|\|\||;|\n/).map((s) => s.trim()).filter(Boolean);
  for (const s of segs) {
    if (/^(cd|export|pwd|echo|true|sleep|date)\b/.test(s)) continue;
    const s2 = s.replace(/^(\w+=\S*\s+)+/, '');
    return s2.split(/\s+/)[0].replace(/^"|"$/g, '');
  }
  return '';
}

const SPEC_RE = /design\.md|proposal\.md|requirements\.md|[\\/]plan\.md|tasks\.md|task-\d+|decisions|module-impact|symbol-impact|prototype|verify-result|[\\/]specs?[\\/]|[\\/]openspec([\\/.\s:]|$)|[.]sillyspec[\\/]|quicklog|CLAUDE\.md|AGENTS\.md/i;
const SRC_RE = /(^|[\\/])(src|backend|frontend|sillyhub-daemon|tests|app)[\\/].*\.(ts|tsx|py|js|mjs|cts|mts|jsx|vue|svelte)\b|(^|[\\/])(src|backend|frontend|sillyhub-daemon|tests|app)[\\/]/i;
const TEST_RE = /\bvitest\b|\bpytest\b|tsc\b[^&|;]*--noEmit|--noEmit\b|\bgen:types\b|node --test|--test\b|\bpnpm test\b|\bpnpm run test\b|jest\b/;
const FLOW_TOOLS = new Set(['Skill', 'Agent', 'TaskOutput', 'SendMessage', 'AskUserQuestion']);

const PRI = { CLI: 0, TEST: 1, SPEC: 2, WRITE: 3, READ: 4, GIT: 5, MISC: 6, THINK: 7 };
const ORDER = ['CLI', 'TEST', 'SPEC', 'WRITE', 'READ', 'GIT', 'MISC', 'THINK'];

function classify(tool) {
  if (tool.tool === 'TodoWrite' || tool.tool === 'WebSearch') return 'MISC';
  if (FLOW_TOOLS.has(tool.tool)) return 'CLI'; // sillyspec:* skills + stage-review subagents = workflow driving
  const c = stripWt(tool.cmd);
  const p = stripWt(tool.path);
  const verb = mainVerbOf(c);
  if (/^sillyspec(\.cmd|\.js|\.mjs)?$/.test(verb) || /sillyspec\.js\b/.test(c)) return 'CLI';
  if (/^openspec(\.cmd|\.js)?$/.test(verb)) return 'CLI';
  if (TEST_RE.test(c)) return 'TEST';
  const specHit = SPEC_RE.test(p) || SPEC_RE.test(c);
  const srcHit = SRC_RE.test(p) || (/^(grep|cat|wc|head|tail|find|ls|sed|python|node|rg|ag|bat)\b/.test(verb) && SRC_RE.test(c));
  const isWrite = tool.tool === 'Write' || tool.tool === 'Edit' ||
    /\bsed\s+(-[a-zA-Z]*i\b|-i)/.test(c) ||
    (verb === 'python' && /io\.open\([^,)]*,\s*["']w/.test(c));
  if (specHit && !(tool.tool === 'Read' && !srcHit && false)) {
    // spec artifact IO via Read/Write/Edit/grep/cat/heredoc-python
    return 'SPEC';
  }
  if (isWrite) return srcHit || tool.tool === 'Write' || tool.tool === 'Edit' ? (srcHit ? 'WRITE' : 'MISC') : 'MISC';
  if (srcHit) return 'READ';
  if (verb === 'git' || /^git(\.exe)?$/.test(verb)) return 'GIT';
  if (tool.tool === 'Read') return SRC_RE.test(p) ? 'READ' : 'MISC';
  if (verb === 'git') return 'GIT';
  return 'MISC';
}

function loadRequests(sid) {
  return db.prepare('SELECT * FROM model_usage WHERE session_id=? ORDER BY started_at').all(sid).map((r) => ({
    started: Number(r.started_at),
    completed: r.completed_at ? Number(r.completed_at) : Number(r.started_at) + Number(r.duration_ms || 0),
    dur: Number(r.duration_ms || 0),
    tin: Number(r.input_tokens || 0),
    tout: Number(r.output_tokens || 0),
    tcache: Number(r.cache_read_input_tokens || 0),
    status: r.status,
  }));
}

function loadTools(sid) {
  const rows = db.prepare('SELECT time_created, time_updated, data FROM part WHERE session_id=? ORDER BY time_created').all(sid);
  const out = [];
  for (const row of rows) {
    let d; try { d = JSON.parse(row.data); } catch { continue; }
    if (d.type !== 'tool') continue;
    const st = d.state || {}; const inp = st.input || {};
    out.push({
      t: Number(row.time_created), tu: Number(row.time_updated || row.time_created),
      tool: d.tool,
      cmd: typeof inp.command === 'string' ? inp.command : '',
      path: inp.file_path || (typeof inp.path === 'string' ? inp.path : ''),
      raw: JSON.stringify(inp),
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

function analyze(label, sid) {
  const reqs = loadRequests(sid);
  const tools = loadTools(sid);
  // attach tools to requests by window
  let ti = 0;
  const per = reqs.map((r, i) => ({ ...r, i, tools: [] }));
  for (const r of per) {
    const end = per[r.i + 1] ? per[r.i + 1].started : Infinity;
    while (ti < tools.length && tools[ti].t < r.started) ti++;
    let j = ti;
    while (j < tools.length && tools[j].t < end) { r.tools.push(tools[j]); j++; }
  }
  const stats = {};
  const examples = {};
  for (const b of ORDER) stats[b] = { n: 0, tin: 0, tout: 0, tcache: 0, dur: 0, wallStart: Infinity, wallEnd: 0, wait: 0 };
  for (const r of per) {
    let bucket = 'THINK';
    if (r.tools.length) {
      let best = 'MISC';
      for (const t of r.tools) {
        const b = classify(t);
        if (PRI[b] < PRI[best]) best = b;
      }
      bucket = best;
    }
    r.bucket = bucket;
    const s = stats[bucket];
    s.n++; s.tin += r.tin; s.tout += r.tout; s.tcache += r.tcache; s.dur += r.dur;
    s.wallStart = Math.min(s.wallStart, r.started); s.wallEnd = Math.max(s.wallEnd, r.completed);
    for (const t of r.tools) {
      const b = classify(t);
      if (b === bucket && (!examples[b] || examples[b].length < 4)) {
        const desc = t.tool === 'Bash' ? stripWt(t.cmd).replace(/\s+/g, ' ').slice(0, 110)
          : (t.tool + ' ' + stripWt(t.path)).slice(0, 110);
        (examples[b] = examples[b] || []).push(desc);
      }
    }
  }
  // wait segments
  const waits = [];
  for (let i = 0; i < per.length - 1; i++) {
    const gap = per[i + 1].started - per[i].started;
    const wait = gap - per[i].dur;
    if (wait > 30000) {
      const wStart = per[i].completed, wEnd = per[i + 1].started;
      let longest = null;
      for (const t of per[i].tools) {
        const d = t.tu - t.t;
        if (t.t >= per[i].started && (!longest || d > longest.d)) longest = { d, tool: t.tool, cmd: t.cmd, path: t.path };
      }
      waits.push({ wait, i, bucket: per[i].bucket, at: per[i].started, longest });
      stats[per[i].bucket].wait += wait;
    }
  }
  return { label, per, stats, waits, examples };
}

const res = {};
for (const [label, sid] of Object.entries(SESSIONS)) res[label] = analyze(label, sid);

const fmt = (ms) => (ms / 60000).toFixed(1) + 'm';
const hhmm = (ms) => { const d = new Date(ms); return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const k = (n) => (n / 1e6).toFixed(2) + 'M';

for (const L of ['A', 'B']) {
  const r = res[L];
  const tot = r.per.reduce((a, x) => ({ tin: a.tin + x.tin, tout: a.tout + x.tout, tc: a.tc + x.tcache, dur: a.dur + x.dur }), { tin: 0, tout: 0, tc: 0, dur: 0 });
  const wall = r.per[r.per.length - 1].completed - r.per[0].started;
  console.log(`\n##### SESSION ${L}: ${r.per.length} reqs | in=${k(tot.tin)} cache=${k(tot.tc)} out=${k(tot.tout)} | model=${fmt(tot.dur)} wall=${fmt(wall)} | ${hhmm(r.per[0].started)} -> ${hhmm(r.per[r.per.length - 1].completed)}`);
  for (const b of ORDER) {
    const s = r.stats[b];
    if (!s.n) continue;
    console.log(`${b.padEnd(6)} n=${String(s.n).padStart(3)} in=${k(s.tin).padStart(7)} cache=${k(s.tcache).padStart(7)} out=${k(s.tout).padStart(7)} model=${fmt(s.dur).padStart(7)} wall=${fmt(s.wallEnd - s.wallStart).padStart(7)} toolWait=${fmt(s.wait).padStart(7)}`);
  }
  console.log('-- examples:');
  for (const b of ORDER) if (r.examples[b]) for (const e of r.examples[b].slice(0, 2)) console.log(`  [${b}] ${e}`);
}

// delta table
console.log('\n##### DELTA (A-B) by input tokens');
const deltas = ORDER.map((b) => ({ b, d: res.A.stats[b].tin - res.B.stats[b].tin })).sort((x, y) => y.d - x.d);
for (const { b, d } of deltas) console.log(`${b.padEnd(6)} A=${String(res.A.stats[b].n).padStart(3)}req/${k(res.A.stats[b].tin)}  B=${String(res.B.stats[b].n).padStart(3)}req/${k(res.B.stats[b].tin)}  delta=${(d / 1e6).toFixed(2)}M`);

// top 10 expensive requests in A
console.log('\n##### A top-10 by input_tokens');
const topA = [...res.A.per].sort((a, b) => b.tin - a.tin).slice(0, 10);
for (const r of topA) {
  const toolDesc = r.tools.slice(0, 3).map((t) => t.tool === 'Bash' ? 'Bash:' + stripWt(t.cmd).replace(/\s+/g, ' ').slice(0, 60) : t.tool + ':' + stripWt(t.path).slice(-45)).join(' | ').slice(0, 200);
  console.log(`${hhmm(r.started)} in=${k(r.tin)} ctx(in+cache)=${k(r.tin + r.tcache)} out=${k(r.tout)} bucket=${r.bucket} tools=${r.tools.length} :: ${toolDesc}`);
}

// top 5 waits in A
console.log('\n##### A top-5 wait segments (>30s)');
const topW = [...res.A.waits].sort((a, b) => b.wait - a.wait).slice(0, 5);
for (const w of topW) {
  const lc = w.longest ? (w.longest.tool === 'Bash' ? 'Bash(' + fmt(w.longest.d) + '):' + stripWt(w.longest.cmd).replace(/\s+/g, ' ').slice(0, 90) : w.longest.tool + ':' + stripWt(w.longest.path || '').slice(-60)) : 'no-tool(no tool call)';
  console.log(`${hhmm(w.at)} wait=${fmt(w.wait)} bucket=${w.bucket} longestTool=${lc}`);
}

// B top waits for reference
console.log('\n##### B top-3 wait segments');
for (const w of [...res.B.waits].sort((a, b) => b.wait - a.wait).slice(0, 3)) {
  const lc = w.longest ? (w.longest.tool === 'Bash' ? 'Bash(' + fmt(w.longest.d) + '):' + stripWt(w.longest.cmd).replace(/\s+/g, ' ').slice(0, 90) : w.longest.tool + ':' + stripWt(w.longest.path || '').slice(-60)) : 'no-tool';
  console.log(`${hhmm(w.at)} wait=${fmt(w.wait)} bucket=${w.bucket} longestTool=${lc}`);
}

// extra: A CLI bucket examples incl. skill/agent; and count of CLI requests whose window has sillyspec cmd
const aCli = res.A.per.filter((r) => r.bucket === 'CLI');
console.log('\n##### A CLI-bucket detail: skill/agent/TaskOutput parts count');
let cnt = { Skill: 0, Agent: 0, TaskOutput: 0, SendMessage: 0 };
for (const r of res.A.per) for (const t of r.tools) if (cnt[t.tool] !== undefined) cnt[t.tool]++;
console.log(JSON.stringify(cnt));
db.close();
