import fs from 'fs';
const a = JSON.parse(fs.readFileSync('./a/openspec-work_c76fe169/full.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('./b/sillyspec-work_6917a473/full.json', 'utf8'));

// A: timeline of writes by category + key build/test moments
console.log('===== A openspec · phase timeline =====');
const evts = [];
for (const l of a.logs) {
  const c = l.content_redacted || '';
  if (l.channel === 'tool_call' && l.tool_kind === 'write') {
    try {
      const j = JSON.parse(c);
      const fp = (j.args && j.args.file_path) || '';
      let cat = 'other';
      if (/openspec.changes|openspec.specs/.test(fp)) cat = 'spec文档';
      else if (fp.includes('pollute')) cat = '后端代码';
      else if (fp.includes('sub-grid-security')) cat = '网页端代码';
      else if (fp.includes('spdemo')) cat = '小程序代码';
      else if (/verify-rp|GenToken|gen-token|cleanup|check-leftover/.test(fp)) cat = 'E2E工具';
      evts.push([l.timestamp, 'W:' + cat, fp.split(/[\\/]/).pop()]);
    } catch (e) {}
  }
  if (l.channel === 'tool_call' && l.tool_kind === 'bash') {
    try {
      const j = JSON.parse(c);
      const cmd = (j.args && j.args.command) || '';
      if (/mvn.*(package|compile|install)/.test(cmd)) evts.push([l.timestamp, 'BUILD:mvn', '']);
      else if (/build:weapp/.test(cmd)) evts.push([l.timestamp, 'BUILD:weapp', '']);
      else if (/verify-rp\.py/.test(cmd)) evts.push([l.timestamp, 'E2E:run', '']);
      else if (/java -jar|pollute-service.*\.jar/.test(cmd)) evts.push([l.timestamp, 'DEPLOY', '']);
    } catch (e) {}
  }
}
// collapse into phase summary: first occurrence of each category
const first = {}, last = {}, count = {};
for (const [ts, cat] of evts) {
  if (cat.startsWith('W:')) {
    first[cat] = first[cat] || ts;
    last[cat] = ts;
    count[cat] = (count[cat] || 0) + 1;
  }
}
console.log('write categories (first -> last, count):');
for (const k of Object.keys(first)) console.log(`  ${k.slice(2)}: ${first[k].slice(11,19)} -> ${last[k].slice(11,19)}  x${count[k]}`);
console.log('build/deploy/e2e moments:');
for (const [ts, cat] of evts) if (!cat.startsWith('W:')) console.log(`  ${ts.slice(11,19)} ${cat}`);

// B: taskcard authoring window + grill/plan review dispatch/complete
console.log('\n===== B sillyspec · plan/taskcard/review timing =====');
for (const l of b.logs) {
  const c = l.content_redacted || '';
  const t = l.timestamp.slice(11, 19);
  if (l.channel === 'tool_call' && l.tool_kind === 'write') {
    try {
      const j = JSON.parse(c);
      const fp = (j.args && j.args.file_path) || '';
      if (/tasks.task-/.test(fp)) process.stdout.write(t + ' ');
    } catch (e) {}
  }
}
console.log('\n(taskcard write moments above)');

// USAGE_NOTE count in both (token attribution reliability)
for (const [n, x] of [['A', a], ['B', b]]) {
  let u = 0;
  for (const l of x.logs) if ((l.content_redacted || '').includes('[USAGE_NOTE]')) u++;
  console.log(`${n} USAGE_NOTE rows: ${u}`);
}
