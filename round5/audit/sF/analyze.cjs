const fs = require('fs');
const dir = 'C:/Users/qinyi/IdeaProjects/sillyspec/round5/audit/sF/';
const rd = l => fs.readFileSync(dir + l, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const reqs = rd('requests.jsonl'), tools = rd('tools.jsonl'), inputs = rd('toolinputs.jsonl');

// join tools+inputs by nearest timestamp
const usedI = new Array(inputs.length).fill(false);
tools.forEach(t => {
  let bi = -1, bd = 1e18;
  inputs.forEach((inp, k) => { if (usedI[k]) return; const d = Math.abs(t.t0 - inp.t); if (d < bd) { bd = d; bi = k; } });
  if (bi >= 0 && bd < 5000) { usedI[bi] = true; t.arg = inputs[bi].arg; } else t.arg = '(no-input)';
});
const norm = p => (p || '').replace(/\\/g, '/');

function cls(t) {
  const a = t.arg || '', p = norm(a);
  if (t.tool === 'TaskOutput') return 'C';
  if (t.tool === 'TodoWrite') return 'G';
  if (['Read', 'Grep', 'Glob'].includes(t.tool)) return 'A';
  if (t.tool === 'Write' || t.tool === 'Edit') {
    if (/review\.json/i.test(p)) return 'F';
    if (p.includes('.sillyspec/')) return 'E';
    return 'B';
  }
  if (t.tool === 'Bash') {
    const c = a;
    const ssCmd = /(^|[;&|]\s*|\w+=\S*\s+)sillyspec\s+(\S+)/.exec(c)
      || /\bsillyspec\s+(run|gate|status|taskcard|progress|docs|wt-commit|platform|verify-probes|archive|--help|--version)/.exec(c);
    if (ssCmd) {
      const rest = c.slice(c.indexOf(ssCmd[0]));
      if (/\bsillyspec\s+gate\b|\bsillyspec\s+verify-probes\b|\bsillyspec\s+review\b|\bsillyspec\s+run\s+(verify|review|backfill)\b/.test(rest)) return 'F';
      return 'D';
    }
    if (/sillyspec-gate/i.test(c)) return 'F';
    if (/(探针|probe)/i.test(c)) return 'F';
    if (/vitest|pnpm test|npm (run )?test|node --test|pytest|typecheck|\btsc\b/.test(c)) return 'C';
    if (/cli[\/\\]exec[\/\\]sess_/.test(c)) return 'C';
    if (/pnpm install|npm install|robocopy|mkdir/.test(c)) return 'G';
    if (/env \| grep|printenv|r5r-env|which codex/.test(c)) return 'G';
    if (/^git (add|commit)\b/.test(c.trim())) return 'B';
    if (/^git (show|log|status|diff|check-ignore)/.test(c.trim())) return 'A';
    if (/(sed -i|python)/.test(c) && p.includes('.sillyspec/')) return 'E';
    if (/^(ls|cat|head|tail|grep|wc|sed|find|echo)/.test(c.trim())) return 'A';
    return 'G';
  }
  return 'G';
}
tools.forEach(t => t.cat = cls(t));

// assign tool -> generating request = last request with t0 <= tool.t0
const toolsOf = Array.from({ length: reqs.length }, () => []);
let orphan = 0;
tools.forEach(t => {
  let lo = -1;
  for (let k = 0; k < reqs.length; k++) if (reqs[k].t0 <= t.t0) lo = k;
  if (lo >= 0) toolsOf[lo].push(t); else orphan++;
});

const catName = { A: 'A 代码阅读', B: 'B 代码测试编写', C: 'C 测试运行', D: 'D CLI协议', E: 'E 治理工件', F: 'F 审查门禁', G: 'G 环境杂项', H: 'H 无工具轮' };
const agg = {};
reqs.forEach((r, k) => {
  let cat = 'H';
  if (toolsOf[k].length) { const last = [...toolsOf[k]].sort((x, y) => x.t1 - y.t1).pop(); cat = last.cat; }
  r.cat = cat; r.tools = toolsOf[k];
  const g = agg[cat] = agg[cat] || { n: 0, in: 0, cr: 0, cw: 0, out: 0, dur: 0, t0: 1e18, t1: 0 };
  g.n++; g.in += r.in_tok; g.cr += r.cache_r; g.cw += r.cache_w; g.out += r.out_tok; g.dur += r.dur_ms;
  g.t0 = Math.min(g.t0, r.t0); g.t1 = Math.max(g.t1, r.t1);
});
const T = { n: 0, in: 0, cr: 0, cw: 0, out: 0, dur: 0 };
reqs.forEach(r => { T.n++; T.in += r.in_tok; T.cr += r.cache_r; T.cw += r.cache_w; T.out += r.out_tok; T.dur += r.dur_ms; });
const hh = t => new Date(t).toTimeString().slice(0, 8);
const mins = ms => (ms / 60000).toFixed(1);

console.log('orphan tools (before first request):', orphan);
console.log('reqs with tools_n=0:', reqs.filter(r => r.tools_n === 0).length, '| cat H reqs:', agg.H ? agg.H.n : 0);
console.log('\n=== CATEGORY TABLE (by in_tok desc) ===');
Object.entries(agg).map(([c, g]) => ({ c, g })).sort((a, b) => b.g.in - a.g.in).forEach(({ c, g }) =>
  console.log(`${catName[c]}: n=${g.n} in=${g.in} (cache_r=${g.cr}) out=${g.out} dur=${mins(g.dur)}min span=${hh(g.t0)}~${hh(g.t1)}`));
console.log(`\n=== TOTAL === reqs=${T.n} in=${T.in} cache_r=${T.cr} cache_w=${T.cw} out=${T.out} model_dur=${mins(T.dur)}min wall=${hh(reqs[0].t0)}~${hh(reqs[reqs.length - 1].t1)}`);

console.log('\n=== TOP 5 requests by in_tok ===');
[...reqs].sort((a, b) => b.in_tok - a.in_tok).slice(0, 5).forEach((r, j) => {
  console.log(`#${j + 1} ${hh(r.t0)} in=${r.in_tok} cr=${r.cache_r} out=${r.out_tok} dur=${(r.dur_ms / 1000).toFixed(0)}s cat=${r.cat}`);
  r.tools.forEach(t => console.log(`    ${t.cat} ${t.tool}: ${String(t.arg).replace(/\s+/g, ' ').slice(0, 90)}`));
});

// repetition detection: normalized command signatures
const sigOf = t => String(t.arg || '').replace(/\s+/g, ' ')
  .replace(/2026-09-21-r5r-autocompact-full/g, '<CH>')
  .replace(/C:[^"]*multi-agent-platform[^ ]*/g, '<SPEC>')
  .replace(/step\d*-[0-9a-f]+/g, 'step*')
  .replace(/\d{4,}/g, '#').slice(0, 120);
const cnt = {};
tools.filter(t => t.tool === 'Bash').forEach(t => { const s = sigOf(t); cnt[s] = (cnt[s] || 0) + 1; });
console.log('\n=== repeated bash commands (>=3) ===');
Object.entries(cnt).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`x${n} ${s}`));

// repeated injected text proxy: sillyspec full-path --spec-dir overhead per D/F call
const df = tools.filter(t => t.cat === 'D' || t.cat === 'F');
console.log('\nD/F bash calls:', df.length);
fs.writeFileSync(dir + '_classified.json', JSON.stringify({
  reqs: reqs.map(r => ({ t0: r.t0, in: r.in_tok, cat: r.cat, ntools: r.tools.length })),
  tools: tools.map(t => ({ t0: t.t0, tool: t.tool, cat: t.cat, arg: t.arg }))
}));
