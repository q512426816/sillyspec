#!/usr/bin/env node
// B-① 靶点验证：解剖 R4-L 的 8.6M 实现子代理——读了什么、多大、是否越界
// 用法：node b1-analyze-task08.mjs
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });
const sid = 'sess_subagent_agent_d60364e3-c378-49b8-a715-6ac5b9d9aa4f';
const WT = 'C:\\Users\\qinyi\\IdeaProjects\\multi-agent-platform\\.sillyspec\\.runtime\\worktrees\\2026-09-20-r4-session-replay';

const parts = db.prepare(
  'SELECT data, time_created tc FROM part WHERE session_id=? ORDER BY time_created ASC, sequence ASC'
).all(sid);
const t0 = Number(parts[0].tc);
const rows = [];
for (const row of parts) {
  const d = JSON.parse(row.data);
  if (d.type !== 'tool') continue;
  const rel = ((Number(d.time?.created ?? row.tc) - t0) / 60000).toFixed(0);
  const inp = d.state?.input ?? {};
  const out = String(d.state?.output ?? '');
  const kb = Math.round(out.length / 1024);
  const short = (p) => String(p).split(WT + '\\').pop()?.replaceAll('\\', '/') ?? p;
  let detail = '';
  if (d.tool === 'Read') detail = short(inp.file_path ?? '?');
  else if (d.tool === 'Grep') detail = 'q=' + String(inp.pattern ?? inp.query ?? '').slice(0, 40);
  else if (d.tool === 'Bash') detail = String(inp.command ?? '').slice(0, 70);
  else detail = JSON.stringify(inp).slice(0, 60);
  rows.push({ rel, tool: d.tool, detail, kb, status: d.state?.status });
}
const byTool = {};
for (const r of rows) byTool[r.tool] = (byTool[r.tool] ?? 0) + r.kb;
console.log('tool calls:', rows.length, '| 按工具 KB:', JSON.stringify(byTool));
console.log('--- 全部调用（时间 | 工具 | 输出KB | 详情）---');
for (const r of rows) console.log(`${r.rel}m ${r.tool.padEnd(7)} ${String(r.kb).padStart(6)}KB ${r.detail}`);
console.log('--- Read 同文件累计 ---');
const byPath = {};
for (const r of rows) if (r.tool === 'Read') (byPath[r.detail] ??= []).push(r.kb);
const s = (a) => a.reduce((x, y) => x + y, 0);
for (const [p, arr] of Object.entries(byPath).sort((a, b) => s(b[1]) - s(a[1])))
  console.log(`${String(s(arr)).padStart(6)}KB ×${arr.length} ${p}`);
db.close();
