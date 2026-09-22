#!/usr/bin/env node
// 资产审计：对 sillyspec 本仓与 SillyHub 平台仓做只读盘点，产出 CSV/JSON 数据文件。
// 方法即证据：本脚本只读不写仓库内容，输出全部落在本目录。重跑：node asset-audit.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT = __dirname;
const REPOS = [
  { key: 'sillyspec', root: 'C:/Users/qinyi/IdeaProjects/sillyspec' },
  { key: 'platform', root: 'C:/Users/qinyi/IdeaProjects/multi-agent-platform' },
];

// ---------- 工具 ----------
const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const walk = (dir, pred, acc = [], exclude = []) => {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (e.isDirectory() && exclude.includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc, exclude);
    else if (pred(p)) acc.push(p);
  }
  return acc;
};
const csvEscape = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
const writeCsv = (name, header, rows) => {
  const body = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
  fs.writeFileSync(path.join(OUT, name), '\ufeff' + body, 'utf8'); // BOM 便于 Excel 直接开
};
const lineCount = (p) => { const t = readText(p); return t ? t.split(/\r?\n/).length : 0; };

// ---------- 采集器 ----------
function auditArchive(repo) {
  const dir = path.join(repo.root, '.sillyspec/changes/archive');
  const names = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  const DOCS = ['proposal.md', 'requirements.md', 'design.md', 'tasks.md', 'verify-result.md', 'verify-facts.json'];
  const rows = []; const complete = []; const dated = [];
  for (const n of names) {
    const flags = DOCS.map((d) => (fs.existsSync(path.join(dir, n, d)) ? 1 : 0));
    rows.push([n, ...flags, flags.reduce((a, b) => a + b, 0)]);
    if (flags.every((f) => f === 1)) complete.push(n);
    const m = n.match(/^(\d{4}-\d{2}-\d{2})/); if (m) dated.push(m[1]);
  }
  dated.sort();
  const active = (() => {
    const cd = path.join(repo.root, '.sillyspec/changes');
    try { return fs.readdirSync(cd, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== 'archive').map((e) => e.name); } catch { return []; }
  })();
  writeCsv(`${repo.key}-archive.csv`, ['change', ...DOCS, 'doc_count'], rows);
  return {
    total: names.length,
    fullSixDocs: complete.length,
    dateRange: dated.length ? `${dated[0]} ~ ${dated[dated.length - 1]}` : '(无日期前缀)',
    datedNamed: dated.length,
    activeChanges: active,
  };
}

function auditQuicklog(repo) {
  const dir = path.join(repo.root, '.sillyspec/quicklog');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^QUICKLOG-.*\.md$/.test(f)).sort() : [];
  const rows = []; const status = {}; const byMonth = {}; const sessions = new Set();
  let firstTs = null, lastTs = null;
  for (const f of files) {
    const mUser = f.match(/^QUICKLOG-(.+?)(-\d{4}-\d{2}-\d{2})?\.md$/);
    if (mUser) sessions.add(f.replace(/-\d{4}-\d{2}-\d{2}\.md$/, '').replace(/^QUICKLOG-/, ''));
    const lines = (readText(path.join(dir, f)) || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const h = lines[i].match(/^## (ql-[A-Za-z0-9-]+) \| ([^|]+) \| (.*)$/);
      if (!h) continue;
      const [, id, ts, title] = h;
      let st = '(未标)';
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const s = lines[j].match(/^状态：(.+)$/); if (s) { st = s[1].trim(); break; }
      }
      rows.push([id, ts.trim(), st, title.trim()]);
      status[st] = (status[st] || 0) + 1;
      const mo = (ts.trim().match(/^(\d{4}-\d{2})/) || [])[1]; if (mo) byMonth[mo] = (byMonth[mo] || 0) + 1;
      if (!firstTs || ts.trim() < firstTs) firstTs = ts.trim();
      if (!lastTs || ts.trim() > lastTs) lastTs = ts.trim();
    }
  }
  writeCsv(`${repo.key}-quicklog.csv`, ['ql_id', 'timestamp', 'status', 'title'], rows);
  return { files: files.length, entries: rows.length, status, byMonth, firstTs, lastTs };
}

function collectDocFiles(repo) {
  // 模块文档与 troubleshooting 只认 docs/ 与 .sillyspec/docs/ 两个根，避开 .runtime/worktrees 副本
  const roots = [path.join(repo.root, 'docs'), path.join(repo.root, '.sillyspec/docs')];
  const moduleFiles = [], tsFiles = [];
  for (const r of roots) {
    walk(r, (p) => { if (/\.md$/.test(p) && path.dirname(p).split(path.sep).pop() === 'modules' && !/\.changelog\.md$/.test(p)) moduleFiles.push(p); });
    walk(r, (p) => { if (path.basename(p) === 'troubleshooting.md') tsFiles.push(p); });
  }
  return { moduleFiles, tsFiles };
}

function auditModules(repo, files) {
  const rows = files.map((p) => [path.relative(repo.root, p).replace(/\\/g, '/'), lineCount(p)]).sort((a, b) => a[0].localeCompare(b[0]));
  writeCsv(`${repo.key}-modules.csv`, ['file', 'lines'], rows);
  const byDir = {};
  for (const r of rows) { const d = r[0].split('/').slice(0, -1).join('/'); byDir[d] = (byDir[d] || 0) + 1; }
  return { count: rows.length, totalLines: rows.reduce((a, b) => a + b[1], 0), byDir };
}

function auditTroubleshooting(repo, files) {
  const rows = []; let total = 0; let numbered = 0;
  for (const p of files) {
    const lines = (readText(p) || '').split(/\r?\n/);
    for (const ln of lines) {
      const h = ln.match(/^##\s+(.+)$/);
      if (h && !/^##\s*#/.test(ln) && !/^## (参考|附录|索引)/.test(h[1])) {
        rows.push([path.relative(repo.root, p).replace(/\\/g, '/'), ++total, h[1].trim()]);
        if (/^\d+[.、]/.test(h[1].trim())) numbered++;
      }
    }
  }
  writeCsv(`${repo.key}-troubleshooting.csv`, ['file', 'seq', 'title'], rows);
  return { files: files.map((p) => path.relative(repo.root, p).replace(/\\/g, '/')), entries: total, numberedEntries: numbered };
}

function auditKnownIssues(repo) {
  const p = path.join(repo.root, '.sillyspec/knowledge/known-issues.md');
  const t = readText(p);
  if (!t) return { exists: false };
  const rows = []; const tally = {};
  let cur = null;
  for (const ln of t.split(/\r?\n/)) {
    const h = ln.match(/^##\s+(.+)$/);
    if (h) { if (cur) rows.push(cur); cur = [h[1].trim(), '(未标)']; continue; }
    const s = ln.match(/^状态[:：]\s*(.+)$/);
    if (s && cur) { cur[1] = s[1].trim(); tally[cur[1]] = (tally[cur[1]] || 0) + 1; }
  }
  if (cur) rows.push(cur);
  writeCsv(`${repo.key}-knownissues.csv`, ['title', 'status'], rows);
  return { exists: true, entries: rows.length, statusTally: tally, lines: t.split(/\r?\n/).length };
}

function auditFr(repo) {
  const dir = path.join(repo.root, '.sillyspec/knowledge/fr');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  const rows = []; const uniqHash = new Set();
  for (const f of files) {
    const t = readText(path.join(dir, f)) || '';
    let cur = null;
    for (const ln of t.split(/\r?\n/)) {
      const h = ln.match(/^##\s+(FR-.+)$/);
      if (h) { if (cur) rows.push(cur); cur = [h[1].trim(), '', '', '', '']; continue; }
      if (!cur) continue;
      let m = ln.match(/^变更[:：]\s*(.+)$/); if (m) cur[1] = m[1].trim();
      m = ln.match(/^状态[:：]\s*(.+)$/); if (m) cur[2] = m[1].trim();
      m = ln.match(/^最近确认[:：]\s*([0-9a-f]{7,40})/); if (m) { cur[3] = m[1]; uniqHash.add(m[1]); }
    }
    if (cur) rows.push(cur);
  }
  const hashOk = {};
  for (const h of uniqHash) {
    try { execSync(`git cat-file -t ${h}`, { cwd: repo.root, stdio: ['ignore', 'ignore', 'ignore'] }); hashOk[h] = 1; }
    catch { hashOk[h] = 0; }
  }
  for (const r of rows) r[4] = r[3] ? String(hashOk[r[3]] === 1) : '(无确认哈希)';
  writeCsv(`${repo.key}-fr.csv`, ['fr_id', 'source_change', 'status', 'last_confirm_commit', 'commit_exists_in_git'], rows);
  return {
    entries: rows.length,
    withConfirm: rows.filter((r) => r[3]).length,
    confirmVerified: rows.filter((r) => r[4] === 'true').length,
  };
}

function auditTests(repo) {
  // monorepo：全仓扫（避开 node_modules/.git/构建产物/.sillyspec 运行态/.worktrees 存储副本/.claude 夹具仓），匹配 *.test.* / *.spec.*
  const EXCLUDE = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.sillyspec', '.next', 'target', 'out', '.worktrees', '.claude']);
  const files = walk(repo.root, (p) => /\.(test|spec)\.[cm]?[jt]s$/.test(p), [], [...EXCLUDE]);
  const pin = files.filter((p) => { const t = readText(p); return t && /回归钉|回归锁定|回归锁/.test(t); }).length;
  const byTop = {};
  for (const p of files) {
    const rel = path.relative(repo.root, p).replace(/\\/g, '/');
    const seg = rel.split('/')[0]; byTop[seg] = (byTop[seg] || 0) + 1;
  }
  return { testFiles: files.length, testLines: files.reduce((a, p) => a + lineCount(p), 0), regressionPinIndicator: pin, byTopLevelDir: byTop };
}

function auditGit(repo) {
  try {
    const count = execSync('git rev-list --count HEAD', { cwd: repo.root }).toString().trim();
    const head = execSync('git rev-parse --short HEAD', { cwd: repo.root }).toString().trim();
    const lastDate = execSync('git log -1 --format=%cs', { cwd: repo.root }).toString().trim();
    return { commits: Number(count), head, lastCommitDate: lastDate };
  } catch (e) { return { error: String(e.message) }; }
}

function auditGotchas(repo) {
  // knowledge/ 下的坑目/模式账本（gotchas 族）：平台仓的真实坑目基础设施，条目带 frontmatter + INDEX 关键词路由
  const dir = path.join(repo.root, '.sillyspec/knowledge');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /gotchas|patterns|uncategorized|conventions/.test(f) && f.endsWith('.md')) : [];
  const rows = []; const tally = {};
  for (const f of files) {
    const t = readText(path.join(dir, f)) || '';
    const entries = (t.match(/^##\s+(?![#])/gm) || []).length;
    rows.push([`knowledge/${f}`, t.split(/\r?\n/).length, entries]);
    tally[f] = entries;
  }
  const index = readText(path.join(dir, 'INDEX.md')) || '';
  const routes = (index.match(/^\s*-\s+.+→/gm) || []).length;
  writeCsv(`${repo.key}-gotchas.csv`, ['file', 'lines', 'entries'], rows);
  return { files: rows.length, entries: rows.reduce((a, b) => a + b[2], 0), byFile: tally, indexRouteLines: routes };
}

function auditMisc(repo) {
  const roadmap = path.join(repo.root, '.sillyspec/ROADMAP.md');
  const rt = readText(roadmap);
  const index = path.join(repo.root, '.sillyspec/knowledge/INDEX.md');
  const it = readText(index);
  return {
    roadmap: rt ? { exists: true, lines: rt.split(/\r?\n/).length, items: (rt.match(/^###\s+/gm) || []).length } : { exists: false },
    knowledgeIndex: it ? { exists: true, lines: it.split(/\r?\n/).length } : { exists: false },
    redlinesYaml: fs.existsSync(path.join(repo.root, '.sillyspec/redlines.yaml')),
  };
}

// ---------- 汇总 ----------
const summary = { generatedAt: new Date().toISOString(), repos: {} };
for (const repo of REPOS) {
  const docFiles = collectDocFiles(repo);
  summary.repos[repo.key] = {
    root: repo.root,
    archive: auditArchive(repo),
    quicklog: auditQuicklog(repo),
    moduleDocs: auditModules(repo, docFiles.moduleFiles),
    troubleshooting: auditTroubleshooting(repo, docFiles.tsFiles),
    knownIssues: auditKnownIssues(repo),
    frIndex: auditFr(repo),
    gotchas: auditGotchas(repo),
    tests: auditTests(repo),
    git: auditGit(repo),
    misc: auditMisc(repo),
  };
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

// 控制台速览
for (const [k, v] of Object.entries(summary.repos)) {
  console.log(`== ${k} (${v.root})`);
  console.log(`  归档变更 ${v.archive.total}（六件套齐全 ${v.archive.fullSixDocs}，${v.archive.dateRange}）｜活跃 ${v.archive.activeChanges.length}`);
  console.log(`  quicklog ${v.quicklog.entries} 条 / ${v.quicklog.files} 文件（${v.quicklog.firstTs} ~ ${v.quicklog.lastTs}）状态分布 ${JSON.stringify(v.quicklog.status)}`);
  console.log(`  模块文档 ${v.moduleDocs.count} 个 / ${v.moduleDocs.totalLines} 行｜troubleshooting ${v.troubleshooting.entries} 条`);
  console.log(`  known-issues ${v.knownIssues.entries ?? 0} 条｜FR 索引 ${v.frIndex.entries} 条（带确认 ${v.frIndex.withConfirm}，哈希验真 ${v.frIndex.confirmVerified}）`);
  console.log(`  gotchas 族 ${v.gotchas.entries} 条（${JSON.stringify(v.gotchas.byFile)}，INDEX 路由行 ${v.gotchas.indexRouteLines}）`);
  console.log(`  测试文件 ${v.tests.testFiles} 个 / ${v.tests.testLines} 行（回归钉指示器 ${v.tests.regressionPinIndicator}）｜git 提交 ${v.git.commits}（HEAD ${v.git.head} @ ${v.git.lastCommitDate}）`);
}
console.log('输出目录:', OUT);
