#!/usr/bin/env node
// B3a prompt 审计 v3（只读，db 全量口径）：
//   A. R4-L 主会话 CLI 渲染体量按子命令归因（修正 v2 分类正则）
//   B. 近重复渲染检测（同头签名多次渲染 = 瘦身/缓存首要候选）
//   C. 实跑措辞的规则转发率（execute.js buildWavePrompt 口径）
// 用法：node b3a-prompt-audit.mjs
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });
const sid = 'sess_5cb66a7e-2ba6-44f9-9916-226fc553778b';
const parts = db.prepare(
  'SELECT data, time_created tc FROM part WHERE session_id=? ORDER BY time_created ASC, sequence ASC'
).all(sid);
const t0 = Number(parts[0].tc);

const calls = [];
const agentPrompts = [];
for (const row of parts) {
  const d = JSON.parse(row.data);
  if (d.type !== 'tool') continue;
  const rel = ((Number(d.time?.created ?? row.tc) - t0) / 60000).toFixed(0);
  const inp = d.state?.input ?? {};
  if (d.tool === 'Bash') {
    const cmd = String(inp.command ?? '');
    if (!/sillyspec/.test(cmd)) continue;
    // 子命令 = sillyspec 后跳过所有 --flag（含带引号值）后的第一个词
    const m = cmd.match(/sillyspec\s+(?:--[\w-]+(?:\s+(?:"[^"]*"|\S+))?\s+)*([\w-]+)/);
    calls.push({ rel, sub: m ? m[1] : '?', chars: String(d.state?.output ?? '').length, out: String(d.state?.output ?? '') });
  }
  if (d.tool === 'Agent' || d.tool === 'Task')
    agentPrompts.push({ rel, prompt: String(inp.prompt ?? '') });
}

const by = {};
for (const c of calls) {
  by[c.sub] ??= { n: 0, chars: 0, max: 0 };
  by[c.sub].n++; by[c.sub].chars += c.chars; by[c.sub].max = Math.max(by[c.sub].max, c.chars);
}
const total = Object.values(by).reduce((s, v) => s + v.chars, 0);

// 近重复：输出头部 200 字（压缩空白）做签名
const sig = {};
for (const c of calls) {
  const s = c.out.slice(0, 200).replace(/\s+/g, ' ').replace(/\|/g, '/');
  (sig[s] ??= []).push(c);
}
const dups = Object.entries(sig).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

// 实跑措辞规则转发率
const SIGS = [
  'workdir 参数是强制必传', '破坏隔离', '调度者 + 审查者', '你不要自己写代码',
  '禁止读', '禁止 push', '工作目录（强制', 'allowed_paths', 'TDD', '先读后写',
];
const cliAll = calls.map(c => c.out).join('\n');
const agentAll = agentPrompts.map(a => a.prompt).join('\n');

const L = [];
L.push('# B3a prompt 审计——db 全量口径（2026-09-21，v3 修正版）');
L.push('');
L.push(`## A. CLI 渲染体量（R4-L 主会话，${calls.length} 次 sillyspec Bash，合计 ${(total / 1024).toFixed(0)}KB ≈ ${Math.round(total / 3.5 / 1000)}K tokens）`);
L.push('');
L.push('| 子命令 | 次数 | 累计KB | 最大单次KB |');
L.push('|---|---|---|---|');
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].chars - a[1].chars))
  L.push(`| ${k} | ${v.n} | ${(v.chars / 1024).toFixed(1)} | ${(v.max / 1024).toFixed(1)} |`);
L.push('');
L.push('## B. 近重复渲染（头部签名相同出现 >1 次——重复注入的直接瘦身候选）');
L.push('');
L.push('| 次数 | 单次体量 | 头部签名 |');
L.push('|---|---|---|');
for (const [k, v] of dups.slice(0, 10))
  L.push(`| ×${v.length} | ~${(v[0].chars / 1024).toFixed(1)}KB | ${k.slice(0, 90)} |`);
const dupChars = dups.reduce((s, [, v]) => s + v.length * v[0].chars, 0);
L.push('');
L.push(`近重复渲染累计 ≈${(dupChars / 1024).toFixed(0)}KB（占 CLI 渲染总量 ${((dupChars / total) * 100).toFixed(0)}%）。`);
L.push('');
L.push('## C. 实跑措辞规则转发率（execute.js buildWavePrompt 口径 → 编排者组装的子代理 prompt）');
L.push('');
L.push('| 规则（实跑措辞） | CLI 渲染 | 转发进子代理 prompt |');
L.push('|---|---|---|');
for (const s of SIGS)
  L.push(`| ${s} | ${cliAll.split(s).length - 1} | ${agentAll.split(s).length - 1} |`);
L.push('');
L.push(`Agent 派发 ${agentPrompts.length} 次，prompt 合计 ${(agentPrompts.reduce((s, a) => s + a.prompt.length, 0) / 1024).toFixed(1)}KB（均值 ${(agentPrompts.reduce((s, a) => s + a.prompt.length, 0) / agentPrompts.length / 1024).toFixed(1)}KB，最大 ${Math.max(...agentPrompts.map(a => a.prompt.length)) / 1024 | 0}KB）。`);
const outPath = new URL('b3a-prompt-audit-result.md', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
writeFileSync(outPath, L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
db.close();
