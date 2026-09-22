import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/qinyi/.zcode/cli/db/db.sqlite', { readOnly: true });
const from = Date.parse('2026-09-20T15:00:00+08:00');
const to = Date.parse('2026-09-21T06:00:00+08:00');
console.log('window', from, '->', to, new Date(from).toISOString());
const rows = db.prepare(
  'SELECT id, title, time_created, parent_id FROM session WHERE time_created >= ? AND time_created <= ? ORDER BY time_created'
).all(from, to);
for (const r of rows) {
  const top = r.parent_id ? '  child-of-' + String(r.parent_id).slice(5, 13) : 'TOP ';
  console.log(new Date(Number(r.time_created)).toISOString().slice(5, 16), top, r.id.slice(5, 13), (r.title || '').slice(0, 75));
}
db.close();
