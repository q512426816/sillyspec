// 全量会话导出：node extract-full.mjs <session前缀> <输出文件>
// 正文全量、reasoning 截 300、工具输入截 500（命令全文）、工具输出截 700
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const [prefix, outFile] = process.argv.slice(2);
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });
const sess = db.prepare('SELECT id, title, time_created FROM session WHERE id LIKE ?').get('sess_' + prefix + '%');
if (!sess) { console.error('not found'); process.exit(1); }

const parts = db.prepare(
  `SELECT p.data, p.time_created tc, JSON_EXTRACT(m.data,'$.role') role
   FROM part p JOIN message m ON p.message_id = m.id
   WHERE p.session_id = ? ORDER BY p.time_created ASC, p.sequence ASC`
).all(sess.id);

const t0 = Number(sess.time_created);
const lines = [`# ${sess.title}`, `# 会话 ${sess.id} 起点 ${new Date(t0).toISOString()}`, ''];
for (const row of parts) {
  const d = JSON.parse(row.data);
  const rel = ((Number(d.time?.created ?? row.tc) - t0) / 60000).toFixed(1);
  const clean = (s, n) => String(s ?? '').replace(/\u001b\[[0-9;]*m/g, '').slice(0, n);
  if (d.type === 'text') {
    lines.push(`\n[${rel}m] ${String(row.role).toUpperCase()} 正文:\n${clean(d.text, 6000)}`);
  } else if (d.type === 'reasoning') {
    const r = clean(d.text ?? d.summary, 300);
    if (r.trim()) lines.push(`[${rel}m] (思考) ${r}`);
  } else if (d.type === 'tool') {
    const inp = d.state?.input ?? {};
    const key = inp.command ?? inp.file_path ?? inp.path ?? inp.pattern ?? inp.prompt ?? JSON.stringify(inp);
    lines.push(`\n[${rel}m] 🛠 ${d.tool} ${d.state?.status === 'running' ? '(未完成)' : ''}\n  输入: ${clean(key, inp.command ? 2500 : 500)}`);
    const out = clean(String(d.state?.output ?? ''), 700);
    if (out.trim()) lines.push(`  输出: ${out.replace(/\n+/g, '\n  ')}`);
  }
}
writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`wrote ${outFile}: ${lines.length} lines, ${(lines.join('\n').length / 1024).toFixed(0)}KB`);
db.close();
