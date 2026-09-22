#!/usr/bin/env node
// 2026-09-22-session-fork-continuation 全家法证分解：CLI 调用占比精确归因
// 用法：node round5/fork-continuation-forensic.mjs
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'fs';

const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });
const fam = db.prepare("SELECT id FROM session WHERE id LIKE '%1a74e642%' OR parent_id LIKE '%1a74e642%'").all().map(r => r.id);
console.log('家族会话数:', fam.length, fam.map(s => s.slice(5, 13)).join(' '));

// 请求与工具
const reqs = []; const tins = [];
for (const id of fam) {
  for (const r of db.prepare('SELECT session_id, started_at, completed_at, duration_ms, input_tokens, cache_read_input_tokens, output_tokens, tool_call_count FROM model_usage WHERE session_id = ? ORDER BY started_at').all(id))
    reqs.push({ sid: id, t0: Number(r.started_at), t1: Number(r.completed_at), dur: r.duration_ms, in: r.input_tokens || 0, cr: r.cache_read_input_tokens || 0, out: r.output_tokens || 0 });
  for (const p of db.prepare('SELECT time_created, data FROM part WHERE session_id = ? ORDER BY time_created').all(id)) {
    let d; try { d = JSON.parse(p.data); } catch { continue; }
    if (!d || d.type !== 'tool' || !d.tool) continue;
    const inp = (d.state && d.state.input) || {};
    let arg = '';
    if (inp.command) { let c = inp.command.trim(); for (let i = 0; i < 10; i++) { if (/^cd\s/.test(c)) { c = c.replace(/^cd\s+("[^"]*"|\S+)\s*&&\s*/, ''); continue; } if (/^export\s+[A-Z_]/.test(c)) { c = c.replace(/^export\s+\S+\s*&&\s*/, ''); continue; } if (/^[A-Z_][A-Z0-9_]*=\S*\s+/.test(c)) { c = c.replace(/^[A-Z_][A-Z0-9_]*=\S*\s+/, ''); continue; } break; } arg = c.slice(0, 160); }
    else if (inp.file_path) arg = 'F:' + String(inp.file_path).replace(/\\/g, '/').slice(-110);
    else arg = JSON.stringify(inp).slice(0, 110);
    tins.push({ sid: id, t: Number(p.time_created), tool: d.tool, arg });
  }
}
reqs.sort((a, b) => a.t0 - b.t0); tins.sort((a, b) => a.t - b.t);
console.log('请求总数:', reqs.length, '| 工具总数:', tins.length);

// 工具归轮（时间窗包含）
let ri = 0; const per = reqs.map(() => []);
for (const t of tins) { while (ri < reqs.length - 1 && t.t > reqs[ri].t1) ri++; if (t.sid === reqs[ri].sid || t.t >= reqs[ri].t0 - 120000) per[ri].push(t); }

const cls = t => {
  if (!t) return 'H';
  if (['TodoWrite', 'TaskOutput', 'SendMessage', 'Agent', 'Skill'].includes(t.tool)) return 'T';
  if (['Edit', 'Write'].includes(t.tool)) return /\.sillyspec\//.test(t.arg) ? 'E' : 'B';
  if (t.tool === 'Read') return 'A';
  if (t.tool === 'Bash') {
    const c = t.arg;
    if (/^sillyspec(\.cmd)?\s/.test(c)) return /(gate|verify|review|backfill)/.test(c) ? 'F' : 'D';
    if (/^(pnpm|npm|npx|uv|python\s+-m\s+pytest|pytest)\b/.test(c) && /(test|vitest|--test|tsc|pytest|ruff|lint)/.test(c)) return 'C';
    if (/^(grep|rg|sed|cat|head|tail|ls|wc|find|file|diff)\b/.test(c)) return 'A';
    if (/^git\s/.test(c)) return 'A';
    if (/^python/.test(c)) return 'B';
    return 'G';
  }
  return 'G';
};
const sum = {}, cnt = {};
reqs.forEach((r, i) => { const c = cls(per[i].length ? per[i][per[i].length - 1] : null); cnt[c] = (cnt[c] || 0) + 1; sum[c] = sum[c] || { in: 0, cr: 0, out: 0, dur: 0 }; sum[c].in += r.in; sum[c].cr += r.cr; sum[c].out += r.out; sum[c].dur += r.dur; });
const tot = reqs.reduce((s, r) => s + r.in, 0); const totDur = reqs.reduce((s, r) => s + r.dur, 0);
const label = { A: '读', B: '写码/提交', C: '测试运行', D: 'CLI协议调用', E: '.sillyspec工件', F: '门禁/审查CLI', G: '环境/其他', H: '无工具轮', T: '调度/todo' };
console.log('\n类别 | 轮数 | in_tok | 占比 | 模型时长 | 时长占比');
for (const k of Object.keys(sum).sort((a, b) => sum[b].in - sum[a].in))
  console.log(String(label[k]).padEnd(12), String(cnt[k]).padStart(4) + '轮', (sum[k].in / 1e6).toFixed(2) + 'M', (100 * sum[k].in / tot).toFixed(1) + '%', (sum[k].dur / 60000).toFixed(1) + 'min', (100 * sum[k].dur / totDur).toFixed(1) + '%');
console.log('总计', reqs.length + '轮', (tot / 1e6).toFixed(2) + 'M', '模型时长', (totDur / 60000).toFixed(1) + 'min');

// CLI 专项：次数、子命令分布、单轮上下文
const cliCalls = tins.filter(t => t.tool === 'Bash' && /^sillyspec(\.cmd)?\s/.test(t.arg));
const sub = {};
for (const c of cliCalls) { const m = c.arg.match(/^sillyspec(?:\.cmd)?\s+(?:run\s+)?([a-z-]+)/); if (m) sub[m[1]] = (sub[m[1]] || 0) + 1; }
console.log('\n=== CLI 专项 ===');
console.log('sillyspec 调用总次数:', cliCalls.length, '| 子命令:', Object.entries(sub).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '×' + v).join(' '));
const dRounds = reqs.filter((r, i) => ['D', 'F'].includes(cls(per[i].length ? per[i][per[i].length - 1] : null)));
if (dRounds.length) {
  const dIn = dRounds.reduce((s, r) => s + r.in, 0); const dDur = dRounds.reduce((s, r) => s + r.dur, 0);
  console.log('CLI 轮均上下文:', (dIn / dRounds.length / 1e3).toFixed(0) + 'K', '| CLI 轮模型时长合计', (dDur / 60000).toFixed(1) + 'min');
}
writeFileSync('round5/audit/fork-cont-requests.jsonl', reqs.map(r => JSON.stringify(r)).join('\n'));
writeFileSync('round5/audit/fork-cont-toolinputs.jsonl', tins.map(t => JSON.stringify(t)).join('\n'));
console.log('\n数据已落 round5/audit/fork-cont-*.jsonl');
