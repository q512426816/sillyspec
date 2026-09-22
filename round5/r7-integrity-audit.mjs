#!/usr/bin/env node
// R7-L 实验完整性审计：①子代归属 ②R7-L 全家修正重扫（路径归一后判违规）③交叉写入检查
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });

console.log('== ① 子代归属 ==');
for (const s of db.prepare("SELECT id, parent_id, title FROM session WHERE time_created > ?").all(Date.parse('2026-09-22T10:00:00Z'))) {
  if (s.parent_id) console.log('子代', s.id.slice(5, 13), '←', s.parent_id.slice(5, 13), '|', s.title.slice(0, 24));
}

console.log('== ② R7-L 全家修正重扫 ==');
const fam = db.prepare("SELECT id FROM session WHERE id LIKE '%ab4e4c64%' OR parent_id LIKE '%ab4e4c64%'").all().map(r => r.id);
console.log('家族会话数:', fam.length);
const bad = [
  ['R4答案树', /2026-09-20-r4-/],
  ['R5答案树', /2026-09-21-r5-/],
  ['主仓生产实现', /agent-log-session-replay/],
  ['replay-redo', /replay-redo/],
  ['主仓本体', /multi-agent-platform\/(?!\.sillyspec)/],
  ['git捞他支', /log --all|cherry-pick/],
];
let violations = 0;
for (const id of fam) {
  for (const p of db.prepare('SELECT data FROM part WHERE session_id = ?').all(id)) {
    let d; try { d = JSON.parse(p.data); } catch { continue; }
    if (!d || d.type !== 'tool' || !d.state || !d.state.input) continue;
    const arg = JSON.stringify(d.state.input).replace(/\\\\/g, '/').replace(/\\/g, '/');
    for (const [name, re] of bad) {
      const m = arg.match(re);
      if (m) { violations++; const i = arg.indexOf(m[0]); console.log('❌', id.slice(5, 13), name, '→', arg.slice(Math.max(0, i - 40), i + 70)); }
    }
  }
}
console.log(violations === 0 ? '✅ R7-L 家族（主+子代）工具入参零违规' : `违规 ${violations} 处`);

console.log('== ③ 1a74e642 是否污染 r7 工作树 ==');
let wrote = 0, touchedR7 = 0;
for (const p of db.prepare("SELECT data FROM part WHERE session_id LIKE '%1a74e642%'").all()) {
  let d; try { d = JSON.parse(p.data); } catch { continue; }
  if (!d || d.type !== 'tool' || !d.state || !d.state.input) continue;
  const arg = JSON.stringify(d.state.input).replace(/\\\\/g, '/').replace(/\\/g, '/');
  if (/2026-09-22-r7-session-replay/.test(arg)) {
    touchedR7++;
    if (['Edit', 'Write'].includes(d.tool)) { wrote++; console.log('✍️ 写入:', arg.slice(0, 140)); }
    else console.log('👁 触及(读/命令):', arg.slice(0, 120));
  }
}
console.log(`1a74e642 触及 r7 工作树 ${touchedR7} 次，其中写入 ${wrote} 次`);
