// 转录命令级分析 v2：response.toolCalls 提取
// 用法: node analyze-transcript.cjs <model-io.jsonl>
const fs = require('fs');
const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
const calls = [];
const slowReqs = [];
for (const line of lines) {
  let rec;
  try { rec = JSON.parse(line); } catch { continue; }
  const dur = rec.durationMs || 0;
  const ts = rec.startedAt ? new Date(rec.startedAt).toTimeString().slice(0, 8) : '?';
  if (dur > 30000) slowReqs.push({ ts, dur: Math.round(dur / 1000), n: (rec.response && rec.response.toolCalls || []).length });
  for (const tc of (rec.response && rec.response.toolCalls) || []) {
    const inp = tc.input || {};
    let arg = '';
    if (tc.name === 'Bash') arg = String(inp.command || '').replace(/\s+/g, ' ').slice(0, 130);
    else if (tc.name === 'Read') arg = String(inp.file_path || '').split(/[\\/]/).slice(-2).join('/');
    else if (tc.name === 'Edit' || tc.name === 'Write') arg = String(inp.file_path || '').split(/[\\/]/).slice(-2).join('/');
    else if (tc.name === 'Grep') arg = String(inp.pattern || '').slice(0, 40) + ' @' + String(inp.path || '').split(/[\\/]/).slice(-1);
    else if (tc.name === 'Agent') arg = 'dispatch: ' + String(inp.description || '').slice(0, 50);
    else arg = JSON.stringify(inp).slice(0, 80);
    calls.push({ ts, tool: tc.name, arg });
  }
}
const byTool = {};
const byArg = {};
for (const c of calls) {
  byTool[c.tool] = (byTool[c.tool] || 0) + 1;
  byArg[c.tool + ' :: ' + c.arg] = (byArg[c.tool + ' :: ' + c.arg] || 0) + 1;
}
console.log('请求行:', lines.length, '| 工具调用:', calls.length, '| 分布:', JSON.stringify(byTool));
console.log('\n== 重复 ≥2 次调用 top20 ==');
for (const [k, n] of Object.entries(byArg).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(n + 'x |', k.slice(0, 160));
console.log('\n== 慢请求 >30s ==');
for (const s of slowReqs.sort((a, b) => b.dur - a.dur)) console.log(s.ts, '|', s.dur + 's', '| 本轮工具数:', s.n);
console.log('\n== 全部 Bash 命令时间线 ==');
for (const c of calls.filter((c) => c.tool === 'Bash')) console.log(c.ts, '|', c.arg);
