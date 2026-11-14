/**
 * scan-incremental 单测（change: 2026-11-14-scan-incremental / task-02）。
 * tmpdir fixture + safeGit/probe/listIndexFiles/affectedTests/writeFile 全 mock 注入——
 * 六类 full 回退（fail-soft 零 throw）、归属/篇章映射、对账排除、软门/quick 回退、
 * guardDocs 产出、目录邻居 hint（D-010）。
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { computeIncrementalPlan, isExcludedPath, INCREMENTAL_SOFT_GATE } from '../src/scan-incremental.js'

let tmp
before(() => { tmp = mkdtempSync(join(tmpdir(), 'scan-incr-')) })
after(() => { try { rmSync(tmp, { recursive: true, force: true }) } catch {} })

const HEAD = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const BASE = 'aaaaaaaa'

/** 建 fixture：scan 基线载体 + module-map；返回 { projectRoot, specBase, projectName } */
function mkFixture({ depth = 'standard', mapYaml = null, base = BASE } = {}) {
  const projectRoot = join(tmp, 'proj')
  const specBase = join(tmp, 'spec')
  mkdirSync(join(specBase, 'docs', 'proj', 'scan'), { recursive: true })
  mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
  const fm = [`---`, `source_commit: ${base}`]
  if (depth) fm.push(`scan_depth: ${depth}`)
  fm.push('---', '', '# 文档', '')
  writeFileSync(join(specBase, 'docs', 'proj', 'scan', 'ARCHITECTURE.md'), fm.join('\n'))
  writeFileSync(join(specBase, 'docs', 'proj', 'scan', 'PROJECT.md'), fm.join('\n'))
  if (mapYaml !== null) writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'), mapYaml)
  return { projectRoot, specBase, projectName: 'proj' }
}

const MAP = `schema_version: 2
project: proj
modules:
  mod-a:
    status: active
    doc: modules/mod-a.md
    paths:
      - src/**
      - lib/helper.js
`

/** mock safeGit：按子命令分派（rev-parse/merge-base/rev-list/diff 各自可覆盖） */
function mockGit({ head = HEAD, headErr = false, ancestorErr = false, count = '5', diff = '' } = {}) {
  return (cwd, args) => {
    const a = String(args[0] || '')
    if (a === 'rev-parse') return headErr ? { error: 'fatal: not a git repository' } : { value: head + '\n' }
    if (a === 'merge-base') return ancestorErr ? { error: 'not ancestor' } : { value: '' }
    if (a === 'rev-list') return { value: count + '\n' }
    if (a === 'diff') return { value: diff }
    return { error: 'unexpected ' + a }
  }
}

const probeOk = async () => ({ available: true, reason: '索引就绪', status: {} })
const probeNo = async () => ({ available: false, reason: '未安装 codegraph（命令不存在）' })

// ── 六类 full 回退（fail-soft 零 throw，Review Focus #3）────────────────────

test('绿地（无 scan 目录）→ mode full', async () => {
  const r = await computeIncrementalPlan({ projectRoot: tmp, specBase: tmp, projectName: 'nope', deps: { safeGit: mockGit(), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'full'); assert.match(r.reason, /绿地/)
})

test('无基线（source_commit 缺失）→ mode full', async () => {
  const d = join(tmp, 'green'); mkdirSync(join(d, 'docs', 'p2', 'scan'), { recursive: true })
  writeFileSync(join(d, 'docs', 'p2', 'scan', 'ARCHITECTURE.md'), '# 无 frontmatter\n')
  const r = await computeIncrementalPlan({ projectRoot: tmp, specBase: d, projectName: 'p2', deps: { safeGit: mockGit(), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'full'); assert.match(r.reason, /无 source_commit/)
})

test('git rev-parse 失败（非 git 仓）→ mode full 留痕不抛（Review Focus #3）', async () => {
  const f = mkFixture()
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit({ headErr: true }), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'full'); assert.match(r.reason, /git rev-parse HEAD 失败/)
})

test('非祖先基线（分支切换/rebase）→ mode full', async () => {
  const f = mkFixture()
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit({ ancestorErr: true }), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'full'); assert.match(r.reason, /脱锚|不在当前分支历史/)
})

test('quick 浅文档 → mode full（统一 bump 语义要求全量升级）', async () => {
  const f = mkFixture({ depth: 'quick' })
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit(), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'full'); assert.match(r.reason, /quick/)
})

test('软门超限（落后 >200 commit）→ mode full；forceIncremental 越过 → incremental+warning', async () => {
  const f = mkFixture({ mapYaml: MAP })
  const deps = { safeGit: mockGit({ count: '250', diff: 'M\tsrc/a.js\n' }), probeCodegraph: probeNo }
  const r1 = await computeIncrementalPlan({ ...f, deps })
  assert.equal(r1.mode, 'full'); assert.match(r1.reason, /漂移过大/)
  const r2 = await computeIncrementalPlan({ ...f, forceIncremental: true, deps })
  assert.equal(r2.mode, 'incremental')
  assert.ok(r2.warnings.some((w) => w.includes('force-incremental')))
})

test('软门超限（scope 内变更 >100 文件）→ mode full', async () => {
  const f = mkFixture({ mapYaml: MAP })
  const diff = Array.from({ length: INCREMENTAL_SOFT_GATE.maxDriftFiles + 1 }, (_, i) => `M\tsrc/f${i}.js`).join('\n') + '\n'
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit({ diff }), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'full'); assert.match(r.reason, /漂移过大/)
})

// ── 正常增量：归属 / 篇章映射 / guardDocs / hint ────────────────────────────

test('增量计划：归属+篇章映射+guardDocs 产出', async () => {
  const f = mkFixture({ mapYaml: MAP })
  const diff = 'M\tsrc/a.js\nA\tnewdir/b.js\nM\troutes/api.ts\nM\tnode_modules/junk.js\n'
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit({ diff }), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'incremental')
  // 归属：src/a.js → mod-a；node_modules 已被排除；newdir/b.js unmapped
  const modA = r.affectedModules.find((m) => m.id === 'mod-a')
  assert.ok(modA, 'mod-a 受影响')
  assert.equal(modA.modified, 1)
  // 篇章映射：unmapped 非空（newdir/b.js）→ STRUCTURE+ARCHITECTURE；路由文件 → INTEGRATIONS
  assert.deepEqual([...r.docsToRegenerate].sort(), ['ARCHITECTURE.md', 'INTEGRATIONS.md', 'STRUCTURE.md'])
  assert.ok(r.docsToSkip.includes('CONVENTIONS.md'))
  // guardDocs：篇章 + 模块卡 + map + audit + facts
  assert.ok(r.guardDocs.includes('docs/proj/scan/ARCHITECTURE.md'))
  assert.ok(r.guardDocs.includes('docs/proj/modules/mod-a.md'))
  assert.ok(r.guardDocs.includes('docs/proj/modules/_module-map.yaml'))
  assert.ok(r.guardDocs.includes('docs/proj/scan/_facts.md'))
  // codegraph 不可用 → warning + audit null + 增量仍成立（补强面降级）
  assert.equal(r.audit, null)
  assert.ok(r.warnings.some((w) => w.includes('codegraph 不可用')))
})

test('无结构信号（模块内 M 文件、无 unmapped、无路由）→ 篇章全跳过', async () => {
  const f = mkFixture({ mapYaml: MAP })
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit({ diff: 'M\tsrc/a.js\n' }), probeCodegraph: probeNo } })
  assert.equal(r.mode, 'incremental')
  assert.deepEqual(r.docsToRegenerate, [])
  assert.equal(r.docsToSkip.length, 7)
})

test('目录邻居 hint（D-010）：unmapped 文件同目录已归属 → hint 非空', async () => {
  // map 用精确文件 lib/helper.js（非 src/** glob——glob 会把同前缀新文件一并吞进归属）
  const mapB = `schema_version: 2\nproject: proj\nmodules:\n  mod-a:\n    status: active\n    doc: modules/mod-a.md\n    paths:\n      - lib/helper.js\n`
  const f = mkFixture({ mapYaml: mapB })
  const diff = 'M\tlib/helper.js\nA\tlib/other.js\n'
  const r = await computeIncrementalPlan({ ...f, deps: { safeGit: mockGit({ diff }), probeCodegraph: probeNo } })
  const u = r.unmappedFiles.find((x) => x.path === 'lib/other.js')
  assert.ok(u, 'lib/other.js unmapped')
  assert.ok(u.hint.includes('mod-a'), `hint 应含目录邻居 mod-a：${JSON.stringify(u.hint)}`)
})

// ── 对账排除（D-008 / Review Focus）────────────────────────────────────────

test('isExcludedPath：索引目录/node_modules/构建产物排除', () => {
  assert.ok(isExcludedPath('.sillyspec-codegraph/db.sqlite'))
  assert.ok(isExcludedPath('node_modules/x/index.js'))
  assert.ok(isExcludedPath('packages/app/node_modules/y.js')) // 任一段命中
  assert.ok(isExcludedPath('.sillyspec/changes/x/flow-state.yaml'))
  assert.ok(!isExcludedPath('src/scan-codegraph.js'))
})

test('对账：listIndexFiles mock（含索引目录与 node_modules 样本）→ uncovered 不含被排除项，报告落盘', async () => {
  const f = mkFixture({ mapYaml: MAP })
  const files = [
    { path: 'src/a.js', language: 'javascript', nodeCount: 1, size: 1 },       // in scope
    { path: 'lib/helper.js', language: 'javascript', nodeCount: 1, size: 1 },  // in scope
    { path: 'orphan/z.py', language: 'python', nodeCount: 1, size: 1 },        // uncovered
    { path: '.sillyspec-codegraph/db.sqlite', language: '', nodeCount: 0, size: 1 }, // 排除
    { path: 'node_modules/j/i.js', language: 'javascript', nodeCount: 1, size: 1 },  // 排除
  ]
  const writes = []
  const writeFile = (p, c) => writes.push({ p, c })
  const r = await computeIncrementalPlan({ ...f, deps: {
    safeGit: mockGit({ diff: 'M\tsrc/a.js\n' }),
    probeCodegraph: probeOk,
    listIndexFiles: async () => files,
    writeFile,
  } })
  assert.equal(r.mode, 'incremental')
  assert.equal(r.audit.totalIndexed, 3)
  assert.deepEqual(r.audit.uncoveredFiles, ['orphan/z.py'])
  assert.equal(r.audit.coverageRatio, 0.67)
  // 报告落盘（mock 写）且含未归属清单与 frontmatter
  const rep = writes.find((w) => String(w.p).includes('_module-map-audit.md'))
  assert.ok(rep, 'audit 报告已写')
  assert.match(rep.c, /orphan\/z\.py/)
  assert.match(rep.c, /source_commit: bbbbbbb/)
})

// ── 对账域过滤（2026-11-15-scan-audit-domain FR-01/FR-02）───────────────────

test('对账域过滤：多项目仓子项目按注册 path 剥前缀比对（域外文件不计入）', async () => {
  // 本项目注册为子项目（path: proj-sub）——map paths 是项目相对（src/**），索引是全仓相对
  const f = mkFixture({ mapYaml: MAP })
  mkdirSync(join(f.specBase, 'projects'), { recursive: true })
  writeFileSync(join(f.specBase, 'projects', 'proj.yaml'), 'name: proj\npath: proj-sub\n')
  writeFileSync(join(f.specBase, 'projects', 'other.yaml'), 'name: other\n')
  const files = [
    { path: 'proj-sub/src/a.js', language: 'javascript', nodeCount: 1, size: 1 }, // 剥后 src/a.js → inScope ✓
    { path: 'proj-sub/lib/other2.js', language: 'javascript', nodeCount: 1, size: 1 }, // 剥后未命中 → uncovered
    { path: 'frontend/app.tsx', language: 'tsx', nodeCount: 1, size: 1 },  // 其他项目域 → 跳过
    { path: 'backend/api.py', language: 'python', nodeCount: 1, size: 1 }, // 其他项目域 → 跳过
  ]
  const r = await computeIncrementalPlan({ ...f, deps: {
    safeGit: mockGit({ diff: 'M\tsrc/a.js\n' }),
    probeCodegraph: probeOk,
    listIndexFiles: async () => files,
    writeFile: () => {},
  } })
  assert.deepEqual(r.audit.uncoveredFiles, ['proj-sub/lib/other2.js'], 'uncovered=域内未归属（报全仓原始路径）；lib/other2.js 未被 lib/helper.js 精确路径覆盖')
  assert.equal(r.audit.totalIndexed, 2, '分母只算域内')
})

test('对账域过滤：单项目仓不启用（根级散文件仍报，行为不变）', async () => {
  const f = mkFixture({ mapYaml: MAP })
  rmSync(join(f.specBase, 'projects'), { recursive: true, force: true }) // 隔离上一用例的多项目注册残留
  const files = [
    { path: 'src/a.js', language: 'javascript', nodeCount: 1, size: 1 },
    { path: 'sync_tool.py', language: 'python', nodeCount: 1, size: 1 },
  ]
  const r = await computeIncrementalPlan({ ...f, deps: {
    safeGit: mockGit({ diff: 'M\tsrc/a.js\n' }),
    probeCodegraph: probeOk,
    listIndexFiles: async () => files,
    writeFile: () => {},
  } })
  assert.deepEqual(r.audit.uncoveredFiles, ['sync_tool.py'], '根级散文件不被域过滤藏掉')
  assert.equal(r.audit.totalIndexed, 2)
})
