import fs from 'fs';
const a = JSON.parse(fs.readFileSync('./a/openspec-work_c76fe169/full.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('./b/sillyspec-work_6917a473/full.json', 'utf8'));

function runsTimeline(x, name) {
  console.log('=====', name, '· runs timeline =====');
  for (const r of x.runs) {
    const st = r.started_at ? r.started_at.slice(11, 19) : '-';
    const fi = r.finished_at ? r.finished_at.slice(11, 19) : '-';
    const dur = r.finished_at && r.started_at ? ((new Date(r.finished_at) - new Date(r.started_at)) / 1000).toFixed(0) + 's' : '-';
    console.log(`${st} -> ${fi} (${dur}) ${r.status} ${r.model} in:${r.input_tokens} out:${r.output_tokens}`);
  }
  console.log();
}

function gitActivity(x, name) {
  console.log('=====', name, '· git commit calls =====');
  let n = 0;
  const msgs = [];
  for (const l of x.logs) {
    if (l.channel === 'tool_call' && l.tool_kind === 'bash') {
      try {
        const j = JSON.parse(l.content_redacted);
        const cmd = j.args && (j.args.command || '');
        if (cmd && /git commit/.test(cmd)) {
          n++;
          const m = cmd.match(/-m\s+"([^"]{0,80})/);
          msgs.push((m ? m[1] : cmd.slice(0, 60)).replace(/\s+/g, ' '));
        }
      } catch (e) {}
    }
  }
  console.log('git commit calls:', n);
  console.log(msgs.join('\n'));
  console.log();
}

function sillyspecCli(x, name) {
  console.log('=====', name, '· sillyspec CLI calls (command head) =====');
  const heads = [];
  for (const l of x.logs) {
    if (l.channel === 'tool_call' && l.tool_kind === 'sillyspec') {
      try {
        const j = JSON.parse(l.content_redacted);
        const cmd = j.args && (j.args.command || j.args.cmd || JSON.stringify(j.args));
        heads.push(l.timestamp.slice(11, 19) + ' ' + String(cmd).replace(/\s+/g, ' ').slice(0, 90));
      } catch (e) {
        heads.push(l.timestamp.slice(11, 19) + ' ' + (l.content_redacted || '').replace(/\s+/g, ' ').slice(0, 90));
      }
    }
  }
  console.log('count:', heads.length);
  console.log(heads.join('\n'));
  console.log();
}

runsTimeline(a, 'A openspec');
runsTimeline(b, 'B sillyspec');
gitActivity(a, 'A openspec');
gitActivity(b, 'B sillyspec');
sillyspecCli(b, 'B sillyspec');
