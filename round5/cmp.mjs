import fs from 'fs';
const a = JSON.parse(fs.readFileSync('./a/openspec-work_c76fe169/full.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('./b/sillyspec-work_6917a473/full.json', 'utf8'));

function repoOf(fp) {
  const norm = fp.replace(/\\/g, '/');
  if (norm.includes('/openspec/pollute') || norm.includes('\\openspec\\pollute')) {
    if (norm.includes('/openspec/')) {
      // openspec spec dir vs code
      const idx = norm.indexOf('/openspec/pollute/openspec/');
      if (idx >= 0) return 'openspec规范(仓内openspec/)';
    }
    return 'pollute后端';
  }
  if (norm.includes('sub-grid-security')) return 'sub-grid-security网页端';
  if (norm.includes('spdemo')) return 'spdemo小程序';
  if (norm.includes('.sillyspec')) return '.sillyspec规范';
  if (norm.includes('/openspec/')) return 'openspec规范(其他)';
  return 'other:' + norm.split('/').slice(0, -1).join('/').slice(-60);
}

function writes(x, name) {
  console.log('=====', name, '· Write file targets (unique) =====');
  const files = {};
  for (const l of x.logs) {
    if (l.channel === 'tool_call' && l.tool_kind === 'write') {
      try {
        const j = JSON.parse(l.content_redacted);
        const fp = j.args && (j.args.file_path || j.args.path);
        if (fp) files[fp] = (files[fp] || 0) + 1;
      } catch (e) {}
    }
  }
  const groups = {};
  for (const fp of Object.keys(files)) {
    const g = repoOf(fp);
    groups[g] = groups[g] || new Set();
    const short = fp.replace(/^.*?(openspec|sillyspec)\//, '');
    groups[g].add(short + (files[fp] > 1 ? `  (x${files[fp]})` : ''));
  }
  for (const g of Object.keys(groups).sort()) {
    console.log(`--- ${g} · ${groups[g].size} unique files ---`);
    console.log([...groups[g]].join('\n'));
  }
  console.log();
}
writes(a, 'A openspec');
writes(b, 'B sillyspec');
