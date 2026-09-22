import fs from 'fs';
const b = JSON.parse(fs.readFileSync('./b/sillyspec-work_6917a473/full.json', 'utf8'));
const logs = b.logs;

// 1. All sillyspec CLI calls: command + following TOOL_RESULT size
let totalResultBytes = 0, calls = 0;
const sizes = [];
for (let i = 0; i < logs.length; i++) {
  const l = logs[i];
  if (l.channel === 'tool_call' && l.tool_kind === 'sillyspec') {
    calls++;
    let cmd = '';
    try { cmd = (JSON.parse(l.content_redacted).args.command || '').replace(/\s+/g, ' ').slice(0, 70); } catch (e) {}
    // sum the next stdout TOOL_RESULTs until next tool_call
    let bytes = 0;
    for (let j = i + 1; j < logs.length && j < i + 12; j++) {
      if (logs[j].channel === 'tool_call') break;
      if (logs[j].channel === 'stdout') bytes += (logs[j].content_redacted || '').length;
    }
    totalResultBytes += bytes;
    sizes.push([l.timestamp.slice(11, 19), cmd, bytes]);
  }
}
console.log('sillyspec CLI calls:', calls, ' total result bytes:', totalResultBytes, `(≈${(totalResultBytes / 1000).toFixed(0)}KB ≈ ${Math.round(totalResultBytes / 3.5)} tokens 估算)`);
// top 12 biggest
console.log('\ntop 12 largest CLI outputs:');
for (const s of sizes.slice().sort((x, y) => y[2] - x[2]).slice(0, 12)) console.log(`  ${s[0]} ${String(s[2]).padStart(6)}B  ${s[1]}`);

// 2. Explicit gate rejections / blocks
console.log('\n=== gate/block evidence ===');
let blocked = 0;
for (const l of logs) {
  const c = l.content_redacted || '';
  if (l.channel === 'stdout' && /BLOCKED|⛔|门禁未通过|gate.*fail|不能直接 --done|回退到|未通过门禁|被拦截/.test(c)) {
    blocked++;
    if (blocked <= 10) console.log(l.timestamp.slice(11, 19), c.replace(/\s+/g, ' ').slice(0, 130));
  }
}
console.log('block-like lines total:', blocked);

// 3. plan --done 02:27-02:30 sequence: what happened between attempts
console.log('\n=== 02:27-02:31 plan --done sequence ===');
for (const l of logs) {
  if (l.timestamp >= '2026-09-21T02:27:00' && l.timestamp <= '2026-09-21T02:30:30') {
    const c = (l.content_redacted || '').replace(/\s+/g, ' ');
    if (l.channel === 'tool_call' && l.tool_kind === 'sillyspec') console.log(l.timestamp.slice(11, 19), '[CALL]', c.slice(0, 110));
    else if (l.channel === 'stdout' && /advanced|BLOCKED|⚠️|gate|门禁|step/.test(c)) console.log(l.timestamp.slice(11, 19), '[OUT ]', c.slice(0, 110));
  }
}

// 4. gate subcommand calls specifically
console.log('\n=== all gate calls ===');
for (const s of sizes) if (/gate /.test(s[1])) console.log(`  ${s[0]} ${s[2]}B  ${s[1]}`);
