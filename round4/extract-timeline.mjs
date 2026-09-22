// 用法：node extract-timeline.mjs <session前缀> <输出文件>
// 从 zcode db.sqlite 提取会话时间线：文本节选 + 工具调用（名/输入头/输出头）
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const [prefix, outFile] = process.argv.slice(2);
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });

const sess = db.prepare('SELECT id FROM session WHERE id LIKE ?').get('sess_' + prefix + '%');
if (!sess) { console.error('session not found'); process.exit(1); }

const parts = db.prepare(
  `SELECT p.data, m.time_created mt, JSON_EXTRACT(m.data,'$.role') role
   FROM part p JOIN message m ON p.message_id = m.id
   WHERE p.session_id = ? ORDER BY p.sequence`
).all(sess.id);

const t0 = parts.length ? Number(JSON.parse(parts[0].data).time?.created ?? parts[0].mt) : 0;
const lines = [];
let lastTs = t0;
for (const row of parts) {
  const d = JSON.parse(row.data);
  const ts = Number(d.time?.created ?? row.mt);
  if (ts > lastTs) lastTs = ts;
  const rel = ((ts - t0) / 60000).toFixed(1);
  const one = (s, n) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
  if (d.type === 'text') {
    lines.push(`[${rel}m] ${row.role?.toUpperCase()} TEXT: ${one(d.text, 200)}`);
  } else if (d.type === 'reasoning') {
    // 只留极短摘要，标注存在性
    lines.push(`[${rel}m] ${row.role?.toUpperCase()} think: ${one(d.text ?? d.summary, 90)}`);
  } else if (d.type === 'tool') {
    const inp = d.state?.input ?? {};
    const key = inp.file_path ?? inp.command ?? inp.path ?? inp.pattern ?? JSON.stringify(inp);
    const outHead = one(String(d.state?.output ?? ''), 140);
    lines.push(`[${rel}m] TOOL ${d.tool}: ${one(key, 150)}`);
    if (outHead) lines.push(`        → ${outHead}`);
  }
}
lines.push(`\n[last-part @ +${((lastTs - t0) / 60000).toFixed(1)}m]`);
writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`wrote ${outFile}: ${lines.length} lines, span ${((lastTs - t0) / 60000).toFixed(1)}min`);
db.close();
