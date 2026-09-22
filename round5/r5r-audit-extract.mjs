#!/usr/bin/env node
// R5R 会话逐请求审计数据导出器：model_usage（token 账）+ tool_usage（工具调用）+ part.data 工具入参
// 用法：node r5r-audit-extract.mjs <sessionId> <outDir>
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const [sessionId, outDir] = process.argv.slice(2);
if (!sessionId || !outDir) { console.error('usage: node r5r-audit-extract.mjs <sessionId> <outDir>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });

// 1) 请求账（含子代理标记）
const reqs = db.prepare(`
  SELECT id, started_at, completed_at, duration_ms, agent, model_id,
         input_tokens, cache_read_input_tokens, cache_creation_input_tokens,
         output_tokens, reasoning_tokens, tool_call_count, status
  FROM model_usage WHERE session_id = ? ORDER BY started_at`).all(sessionId);
writeFileSync(join(outDir, 'requests.jsonl'),
  reqs.map(r => JSON.stringify({
    i: r.id, t0: r.started_at, t1: r.completed_at, dur_ms: r.duration_ms,
    agent: r.agent, in_tok: r.input_tokens, cache_r: r.cache_read_input_tokens,
    cache_w: r.cache_creation_input_tokens, out_tok: r.output_tokens,
    reason_tok: r.reasoning_tokens, tools_n: r.tool_call_count, st: r.status,
  })).join('\n'));

// 2) 工具调用（时间+名+字节）
const tools = db.prepare(`
  SELECT started_at, completed_at, duration_ms, tool_name, output_bytes, status, exit_code
  FROM tool_usage WHERE session_id = ? ORDER BY started_at`).all(sessionId);
writeFileSync(join(outDir, 'tools.jsonl'),
  tools.map(t => JSON.stringify({
    t0: t.started_at, t1: t.completed_at, dur_ms: t.duration_ms,
    tool: t.tool_name, out_bytes: t.output_bytes, st: t.status, exit: t.exit_code,
  })).join('\n'));

// 3) 工具入参摘要（file_path / command 截断；不含正文，控制体积）
const parts = db.prepare(`
  SELECT time_created, data FROM part WHERE session_id = ? ORDER BY time_created`).all(sessionId);
const lines = [];
for (const p of parts) {
  let d; try { d = JSON.parse(p.data); } catch { continue; }
  if (!d || d.type !== 'tool' || !d.tool) continue;
  const inp = (d.state && d.state.input) || {};
  let arg = '';
  if (inp.command) arg = String(inp.command).slice(0, 200);
  else if (inp.file_path) arg = String(inp.file_path).replace(/^.*worktrees[\\/]/, 'WT/').replace(/^.*multi-agent-platform[\\/]/, 'MP/').slice(-140);
  else arg = JSON.stringify(inp).slice(0, 140);
  lines.push(JSON.stringify({ t: p.time_created, tool: d.tool, st: d.state && d.state.status, arg }));
}
writeFileSync(join(outDir, 'toolinputs.jsonl'), lines.join('\n'));
console.log(JSON.stringify({ sessionId, requests: reqs.length, tools: tools.length, toolInputs: lines.length,
  tok: { in: reqs.reduce((s, r) => s + (r.input_tokens || 0), 0), cacheR: reqs.reduce((s, r) => s + (r.cache_read_input_tokens || 0), 0), out: reqs.reduce((s, r) => s + (r.output_tokens || 0), 0) } }));
