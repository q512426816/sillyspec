/**
 * change-list-paren-strip.test.mjs — declared 面括号注记剥除三层（2026-10-13-declared-paren-strip）
 *
 * 坑档案：multi-agent-platform docs/sillyspec/flow-diff-declared-face-paren-pollution.md
 * （2026-10-13-turn-nav-rail-overflow-fix 归档件实证）：列表项「- <路径>（交付：<说明>）」
 * 的冒号落在括号内，冒号剥先跑把行砍成「路径黏连未闭合括号残片」，normalizePath 只剥闭合
 * 尾括号救不回 → 脏路径入库（同文件双行/totals 虚高/json join 失配/声明文件判 unplanned）。
 *
 * 覆盖：①列表/表格括号注记剥除（内嵌冒号/角色前缀/未闭合残片/嵌套）；②normalizePath 兜底
 * （未闭合剥 + 闭合剥超集 + 中段括号不动）；③buildThinSnapshotRows 兜底合并（单行 planned/
 * totals 唯一路径）；④既有形态零回归（冒号描述/双尾注/incidental 原文嗅探）；⑤e2e 污染清单
 * 收口后 scopeAudit 单行干净路径。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFileChangeListDetailed, normalizePath } from '../src/change-list.js'
import { buildThinSnapshotRows } from '../src/flow-parity.js'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

function designFile(body) {
  const root = mkdtempSync(join(tmpdir(), 'clps-'))
  const dp = join(root, 'design.md')
  writeFileSync(dp, `# 设计\n\n## 文件变更清单\n\n${body}\n`)
  return { root, dp }
}

test('① 列表项括号注记剥除：内嵌冒号/角色前缀/未闭合残片/嵌套 → 干净路径', () => {
  const { root, dp } = designFile([
    '- frontend/src/x.tsx（交付：rail 去 shrink-0 + nav 滚动条隐藏）',
    '- src/y.py（计划）',
    '- src/z.ts（交付',
    '- src/w.ts（交付：y（z））',
  ].join('\n'))
  const paths = parseFileChangeListDetailed(dp).map((e) => e.path)
  assert.deepEqual(paths, ['frontend/src/x.tsx', 'src/y.py', 'src/z.ts', 'src/w.ts'],
    `括号注记剥除: ${JSON.stringify(paths)}`)
  rmSync(root, { recursive: true, force: true })
})

test('① 表格 cell 括号注记剥除（normalizePath 兜底入口）', () => {
  const { root, dp } = designFile('| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | src/t.ts（交付：x） | d |')
  const paths = parseFileChangeListDetailed(dp).map((e) => e.path)
  assert.deepEqual(paths, ['src/t.ts'], `表格 cell: ${JSON.stringify(paths)}`)
  rmSync(root, { recursive: true, force: true })
})

test('② normalizePath 兜底：未闭合尾残片剥除；闭合剥超集；中段括号与普通路径不动', () => {
  assert.equal(normalizePath('src/a.ts（交付'), 'src/a.ts', '未闭合尾残片')
  assert.equal(normalizePath('src/a.ts（交付：x）'), 'src/a.ts', '闭合组剥（既有行为）')
  assert.equal(normalizePath('src/a(1).js'), 'src/a(1).js', '中段括号不动')
  assert.equal(normalizePath('src/plain.ts'), 'src/plain.ts', '普通路径不变')
})

test('④ 既有形态零回归：冒号描述/双尾注/incidental 原文嗅探', () => {
  const { root, dp } = designFile([
    '- src/e.ts：一句描述',
    '- src/f.ts ——尾注说明',
    '- src/g.ts（顺带修复）',
  ].join('\n'))
  const es = parseFileChangeListDetailed(dp)
  assert.deepEqual(es.map((e) => e.path), ['src/e.ts', 'src/f.ts', 'src/g.ts'], '三既有形态路径干净')
  assert.equal(es.find((e) => e.path === 'src/g.ts').incidental, true, 'incidental 嗅探用原文不受剥括号影响')
  rmSync(root, { recursive: true, force: true })
})

test('③ buildThinSnapshotRows 兜底合并：污染 declared 行与实际行同路径 → 单行 planned、totals 唯一路径', () => {
  const stats = new Map([['src/a.tsx', { additions: 47, deletions: 0, kind: 'modified' }]])
  const r = buildThinSnapshotRows({
    ownFiles: ['src/a.tsx'],
    stats,
    planEntries: [{ path: 'src/a.tsx（交付', operation: '修改', incidental: false, repo: null }],
    crossRepoRows: [],
  })
  assert.equal(r.rows.length, 1, `单行合并: ${JSON.stringify(r.rows)}`)
  assert.equal(r.rows[0].path, 'src/a.tsx')
  assert.equal(r.rows[0].verdict, 'planned', '归因取更准一行（planned）')
  assert.equal(r.rows[0].additions, 47, '真统计保留')
  assert.equal(r.totals.files, 1, 'totals 按唯一路径计')
})

test('③ 兜底合并不误伤：同名前缀不同文件（a.ts 与 a.tsx）不并', () => {
  const stats = new Map([
    ['src/a.ts', { additions: 1, deletions: 0, kind: 'modified' }],
    ['src/a.tsx', { additions: 2, deletions: 0, kind: 'modified' }],
  ])
  const r = buildThinSnapshotRows({
    ownFiles: ['src/a.ts', 'src/a.tsx'],
    stats,
    planEntries: [{ path: 'src/a.tsx（交付', operation: null, incidental: false, repo: null }],
    crossRepoRows: [],
  })
  assert.equal(r.rows.length, 2, `精确等值合并不并前缀近邻: ${JSON.stringify(r.rows)}`)
  assert.equal(r.rows.find((x) => x.path === 'src/a.tsx').verdict, 'planned')
  assert.equal(r.rows.find((x) => x.path === 'src/a.ts').verdict, 'unplanned')
})

// ── ⑤ e2e：污染写法清单收口 → scopeAudit 单行干净路径 ──
function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

test('⑤ e2e：清单写「work.txt（交付：单文件）」→ 收口 scopeAudit 单行干净路径、verdict=planned', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'clps-e2e-'))
  const change = '2026-10-13-clps-e2e'
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-q', '-m', 'base'])
  const specBase = join(cwd, '.sillyspec')
  const cli = (args) => spawnSync(process.execPath, [join(REPO, 'src', 'index.js'), ...args], {
    cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
  try {
    assert.equal(cli(['flow', 'start', '--change', change, '--input', 'x\n成功标准：\n- y', '--autopilot']).status, 0)
    writeFileSync(join(cwd, 'work.txt'), 'hello\n')
    git(cwd, ['add', 'work.txt'])
    git(cwd, ['commit', '-q', '-m', `work (${change}) (task-01)`])
    const base = join(specBase, 'changes', change)
    const fill = (f, fn) => writeFileSync(join(base, f), fn(readFileSync(join(base, f), 'utf8')))
    fill('design.md', (t) => t.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具')
      + '\n## 文件变更清单\n\n- work.txt（交付：单文件小改）\n')
    fill('requirements.md', (t) => t.replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为').replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具'))
    const tasksPath = join(base, 'tasks.md')
    writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
    git(cwd, ['add', tasksPath])
    git(cwd, ['commit', '-q', '-m', 'chore: tick (task-01)'])
    writeFileSync(join(base, 'review.json'), JSON.stringify({
      schemaVersion: 1, change, reviewer: 'test-fixture', verdict: 'PASS', reviewedAgainst: git(cwd, ['rev-parse', 'HEAD']),
      findings: [], dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
    }, null, 2))
    const done = cli(['flow', 'done', '--change', change])
    assert.equal(done.status, 0, `done: ${done.stdout}\n${done.stderr}`)
    const archDir = join(specBase, 'changes', 'archive')
    const archived = readdirSync(archDir).find((d) => d.includes(change))
    const meta = JSON.parse(readFileSync(join(archDir, archived, 'change-patch.json'), 'utf8'))
    const rows = (meta.scopeAudit || {}).rows || []
    assert.equal(rows.length, 1, `单行无占位: ${JSON.stringify(rows)}`)
    assert.equal(rows[0].path, 'work.txt', '干净路径（无括号残片）')
    assert.equal(rows[0].verdict, 'planned', '声明命中归因')
    assert.equal(rows[0].additions, 1)
    assert.equal(meta.totals.files, 1, 'totals 不虚高')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
