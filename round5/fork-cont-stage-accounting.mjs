#!/usr/bin/env node
// 2026-09-22-session-fork-continuation 全家分阶段精确账（墙钟/活跃/停摆/token/轮次/CLI卡耗时/产物）
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });
const fam = db.prepare("SELECT id FROM session WHERE id LIKE '%1a74e642%' OR parent_id LIKE '%1a74e642%'").all().map(r => r.id);
const MAIN = fam.find(s => s.includes('1a74e642'));

const rounds = [];
for (const id of fam) for (const r of db.prepare('SELECT started_at t0, completed_at t1, duration_ms d, input_tokens i, cache_read_input_tokens c, output_tokens o FROM model_usage WHERE session_id = ? ORDER BY t0').all(id))
  rounds.push({ sid: id === MAIN ? 'M' : 'S', t0: Number(r.t0), t1: Number(r.t1), d: r.d, in: r.i || 0, out: r.o || 0 });
rounds.sort((a, b) => a.t0 - b.t0);

// CLI 调用：part 工具入参识别 sillyspec，按时间贴 tool_usage 时长
const cliCalls = [];
for (const id of fam) {
  const tu = db.prepare("SELECT started_at, duration_ms, tool_name FROM tool_usage WHERE session_id = ? AND tool_name = 'Bash' ORDER BY started_at").all(id).map(x => ({ sid: id === MAIN ? 'M' : 'S', t: Number(x.started_at), d: x.duration_ms }));
  const parts = db.prepare('SELECT time_created, data FROM part WHERE session_id = ? ORDER BY time_created').all(id);
  for (const p of parts) {
    let d; try { d = JSON.parse(p.data); } catch { continue; }
    if (!d || d.type !== 'tool' || d.tool !== 'Bash' || !d.state || !d.state.input || !d.state.input.command) continue;
    let c = d.state.input.command.trim();
    for (let i = 0; i < 10; i++) {
      if (/^cd\s/.test(c)) { c = c.replace(/^cd\s+("[^"]*"|\S+)\s*&&\s*/, ''); continue; }
      if (/^export\s+[A-Z_]/.test(c)) { c = c.replace(/^export\s+\S+\s*&&\s*/, ''); continue; }
      break;
    }
    if (!/^sillyspec(\.cmd)?\s/.test(c)) continue;
    const m = c.match(/^sillyspec(?:\.cmd)?\s+(?:run\s+)?([a-z-]+)/);
    const t = Number(p.time_created);
    const cand = tu.filter(x => Math.abs(x.t - t) < 90000).sort((a,b)=>Math.abs(a.t-t)-Math.abs(b.t-t))[0]; const dur = cand ? cand.d : null;
    cliCalls.push({ sid: id === MAIN ? 'M' : 'S', t, cmd: m ? m[1] : '?', dur });
  }
}
cliCalls.sort((a, b) => a.t - b.t);

// 阶段窗口（UTC；产物 mtime 本地-8h）
const STAGES = [
  ['S0 对话期(任务演化)', Date.parse('2026-09-22T10:33:00Z'), Date.parse('2026-09-22T11:23:00Z'), '（需求两度变更→新变更立项）'],
  ['S1 brainstorm', Date.parse('2026-09-22T11:23:00Z'), Date.parse('2026-09-22T13:07:00Z'), 'prototype/proposal/module+symbol-impact/spike/design/requirements'],
  ['S2 plan', Date.parse('2026-09-22T13:07:00Z'), Date.parse('2026-09-22T13:28:00Z'), 'plan.md + tasks.md + 8 任务卡'],
  ['S3 execute(至14:50)', Date.parse('2026-09-22T13:28:00Z'), Date.parse('2026-09-22T14:50:00Z'), '5/8 任务勾选 + worktree 提交 + review/D-013'],
];
const fmt = ms => (ms / 60000).toFixed(0) + 'm';
for (const [name, w0, w1, arts] of STAGES) {
  const rs = rounds.filter(r => r.t0 >= w0 && r.t0 < w1);
  const main = rs.filter(r => r.sid === 'M'), sub = rs.filter(r => r.sid === 'S');
  const tok = a => a.reduce((s, r) => s + r.in, 0);
  const act = a => a.reduce((s, r) => s + (r.t1 - r.t0), 0);
  // 主会话停摆：窗内主会话轮间隙>3min
  let idle = 0; const sorted = [...main].sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < sorted.length; i++) { const g = sorted[i].t0 - sorted[i - 1].t1; if (g > 180000) idle += g; }
  const clis = cliCalls.filter(c => c.t >= w0 && c.t < w1);
  const cliDur = clis.reduce((s, c) => s + (c.d || 0), 0);
  const cliRoundTok = clis.length ? tok(main.filter(r => clis.some(c => c.t >= r.t0 && c.t <= r.t1 + 300000))) : 0;
  const subCmd = {}; clis.forEach(c => subCmd[c.cmd] = (subCmd[c.cmd] || 0) + 1);
  console.log('━━ ' + name + ' | 墙钟 ' + fmt(w1 - w0));
  console.log('   主会话: ' + main.length + '轮 ' + (tok(main) / 1e6).toFixed(1) + 'M | 活跃 ' + fmt(act(main)) + ' 停摆 ' + fmt(idle));
  console.log('   子代理: ' + sub.length + '轮 ' + (tok(sub) / 1e6).toFixed(1) + 'M | 活跃 ' + fmt(act(sub)));
  console.log('   CLI: ' + clis.length + '次 [' + Object.entries(subCmd).map(([k, v]) => k + '×' + v).join(' ') + '] | 卡耗时合计 ' + (cliDur / 1000).toFixed(0) + 's | 所在轮 token ' + (cliRoundTok / 1e3).toFixed(0) + 'K');
  console.log('   产物: ' + arts);
}
console.log('━━ 总计 | 主+子 ' + rounds.length + '轮 ' + (rounds.reduce((s, r) => s + r.in, 0) / 1e6).toFixed(1) + 'M | CLI ' + cliCalls.length + '次 卡耗时 ' + (cliCalls.reduce((s, c) => s + (c.d || 0), 0) / 1000).toFixed(0) + 's');
