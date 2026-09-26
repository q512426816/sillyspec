/**
 * 动态测试推断（2026-09-26-dynamic-test-inference）防回归：
 *
 * 1. resolveTestFileRel：测试路径仓根相对化三段解析（根相对直取 / 子项目根前缀补全 /
 *    裸文件名受限 glob 兜底——仅测试形态文件，防误命中同名源文件）。
 * 2. detectSubprojectRoots：monorepo 子项目根探测（深度 ≤2 清单文件）。
 * 3. buildDepsBatches：runner 自项目结构推断（py→最近 pyproject/uv 祖先；tsx→最近含
 *    vitest/jest 的 package.json），不再依赖 modules.*.test 命令。
 * 4. activeFrCoverageHits / collectFrLinkedTests：FR 覆盖命中查询反用为需求关联回归测试面
 *    （绑定路径解析 + 锚保留 + 未解析披露）。
 * 5. upsertFrBindings projectRoot：写入侧路径归一。
 * 6. runVerifyTestCheck E2E：未配置 local.yaml 的仓（R22 之痛）缺省走动态子集实测；
 *    FR 绑定回归测试并入执行面；doc-only → dynamic-empty 不硬跑全量。
 * 7. CLI tests repair-paths：三种错形路径干跑预览 + --write 归一。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { resolveTestFileRel, detectSubprojectRoots, upsertFrBindings, readFrBindings } from '../src/test-bindings.js'
import { buildDepsBatches, runVerifyTestCheck } from '../src/verify-postcheck.js'
import { activeFrCoverageHits, collectFrLinkedTests } from '../src/fr-index.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function sh(args, cwd) { execFileSync(args[0], args.slice(1), { cwd, stdio: 'pipe' }) }

// ── 1+2 路径解析与子项目探测 ──────────────────────────────────────────

test('resolveTestFileRel 三段解析：根相对 / 子项目前缀 / 裸文件名 glob / 拒绝非测试形态', () => {
  const root = mk('rtf-')
  mkdirSync(join(root, 'frontend', 'src', '__tests__'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'frontend', 'package.json'), '{"name":"fe"}')
  writeFileSync(join(root, 'frontend', 'src', '__tests__', 'app.test.ts'), 'x')
  writeFileSync(join(root, 'test', 'root.test.mjs'), 'x')
  writeFileSync(join(root, 'frontend', 'src', 'app.ts'), 'x') // 同名源文件（非测试形态）

  assert.equal(resolveTestFileRel('test/root.test.mjs', { projectRoot: root }), 'test/root.test.mjs', '根相对直取')
  assert.equal(resolveTestFileRel('src/__tests__/app.test.ts', { projectRoot: root }), 'frontend/src/__tests__/app.test.ts',
    '丢 frontend/ 前缀（cwd 相对）→ 子项目根前缀补全')
  assert.equal(resolveTestFileRel('app.test.ts', { projectRoot: root }), 'frontend/src/__tests__/app.test.ts',
    '裸文件名 → 受限 glob 兜底（最短路径）')
  assert.equal(resolveTestFileRel('app.ts', { projectRoot: root }), null, '非测试形态裸名不兜底（防误命中源文件）')
  assert.equal(resolveTestFileRel('missing.test.mjs', { projectRoot: root }), null, '不存在的测试名 → null（宁缺勿错跑）')

  const sprs = detectSubprojectRoots(root)
  assert.ok(sprs.includes('frontend'), `子项目根探测命中 frontend（实得 ${JSON.stringify(sprs)}）`)
})

test('detectSubprojectRoots：深度 2 嵌套清单与根清单', () => {
  const root = mk('spr-')
  writeFileSync(join(root, 'package.json'), '{"name":"r"}')
  mkdirSync(join(root, 'packages', 'be'), { recursive: true })
  writeFileSync(join(root, 'packages', 'be', 'pyproject.toml'), '')
  mkdirSync(join(root, 'node_modules', 'dep'), { recursive: true })
  writeFileSync(join(root, 'node_modules', 'dep', 'package.json'), '{}')
  const sprs = detectSubprojectRoots(root)
  assert.ok(sprs.includes(''), '根清单计入（空串）')
  assert.ok(sprs.includes('packages/be'), '深度 2 子项目计入')
  assert.ok(!sprs.some(s => s.includes('node_modules')), '依赖目录排除')
})

// ── 3 runner 结构推断（buildDepsBatches 直测）─────────────────────────

test('buildDepsBatches：.py runner 自最近 pyproject 祖先推断（uv 优先）', () => {
  const root = mk('pyrun-')
  mkdirSync(join(root, 'backend', 'app', 'tests'), { recursive: true })
  writeFileSync(join(root, 'backend', 'pyproject.toml'), '[project]\nname="b"\n')
  const batches = buildDepsBatches({ deps: ['backend/app/tests/test_x.py'], changedFiles: [], hits: [], cwd: root })
  const py = batches.find(b => b.short === 'py')
  assert.ok(py, 'py 批在场')
  assert.equal(py.command, 'cd backend && python -m pytest app/tests/test_x.py', `pyproject 祖先 → cd + python -m pytest + 文件重定基（实得 ${py.command}）`)

  writeFileSync(join(root, 'backend', 'uv.lock'), '')
  const batches2 = buildDepsBatches({ deps: ['backend/app/tests/test_x.py'], changedFiles: [], hits: [], cwd: root })
  assert.match(batches2.find(b => b.short === 'py').command, /cd backend && uv run pytest/, 'uv.lock 在场 → uv run pytest（防错解释器假红）')
})

test('buildDepsBatches：tsx runner 自最近含 vitest 的 package.json 推断', () => {
  const root = mk('jsxrun-')
  mkdirSync(join(root, 'frontend', 'src', '__tests__'), { recursive: true })
  writeFileSync(join(root, 'frontend', 'package.json'), JSON.stringify({ name: 'fe', devDependencies: { vitest: '^1.0.0' } }))
  writeFileSync(join(root, 'frontend', 'pnpm-lock.yaml'), '')
  const batches = buildDepsBatches({ deps: ['frontend/src/__tests__/comp.test.tsx'], changedFiles: [], hits: [], cwd: root })
  const jsx = batches.find(b => b.short === 'jsx')
  assert.ok(jsx, 'jsx 批在场')
  assert.equal(jsx.command, 'cd frontend && pnpm exec vitest run src/__tests__/comp.test.tsx',
    `vitest 依赖 + pnpm 锁 → cd + pnpm exec vitest run + 重定基（实得 ${jsx.command}）`)

  // 无 vitest/jest 可推断 → 整批 skip 转项目运行器（不造恒败段）
  const root2 = mk('jsxskip-')
  mkdirSync(join(root2, 'web', 't'), { recursive: true })
  writeFileSync(join(root2, 'web', 'package.json'), '{"name":"w"}')
  const batches2 = buildDepsBatches({ deps: ['web/t/a.test.jsx'], changedFiles: [], hits: [], cwd: root2 })
  const jsx2 = batches2.find(b => b.short === 'jsx-skip')
  assert.ok(jsx2 && jsx2.skip, '无可推断运行器 → skip 批披露')
})

// ── 4 FR 覆盖命中查询 + 需求关联回归测试面 ────────────────────────────

function frFixture() {
  const root = mk('frlink-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
  mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'), 'modules:\n  core:\n    paths:\n      - src/\n')
  // 来源变更的归档 patch（thin 主源）：FR 覆盖面 = patch 文件 ∪ 绑定 tests
  mkdirSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change', 'change-patch.json'), '{"files": ["src/lib.js"]}\n')
  writeFileSync(join(root, 'src', 'lib.js'), 'export const a = 1\n')
  writeFileSync(join(root, 'test', 'bound.test.mjs'), "import { test } from 'node:test'\ntest('b', () => {})\n")
  writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'),
    '## FR-core-001 库行为\n' +
    '变更：2026-09-20-old-change\n' +
    '状态：active\n' +
    '摘要：默认场景\n' +
    '\n' +
    '测试绑定：\n' +
    '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->\n' +
    '- row: 2026-09-20-old-change:task-01:FR-01\n' +
    '  tests: test/bound.test.mjs\n' +
    '  reason: spec\n' +
    '  state: candidate\n' +
    '  discovery: machine\n' +
    '  confirmed_by: null\n' +
    '  confirmed_at: null\n')
  return { root, specBase }
}

test('activeFrCoverageHits：覆盖面∩触碰文件 → 强命中（rot 查询同口径）', async () => {
  const { root, specBase } = frFixture()
  const q = activeFrCoverageHits({ specBase, changeName: 'c1', files: ['src/lib.js'] })
  assert.equal(q.hits.length, 1, '触达 src/lib.js（绑定面）→ FR-core-001 强命中')
  assert.equal(q.hits[0].id, 'FR-core-001')
  const q2 = activeFrCoverageHits({ specBase, changeName: 'c1', files: ['docs/x.md'] })
  assert.equal(q2.hits.length, 0, '触碰文件不在任何覆盖面 → 零命中')
})

test('collectFrLinkedTests：绑定解析为仓根相对 + 错形路径补全 + 锚保留', async () => {
  const { root, specBase } = frFixture()
  const r = collectFrLinkedTests({ specBase, changeName: 'c1', changedFiles: ['src/lib.js'], projectRoot: root })
  assert.deepEqual(r.files, ['test/bound.test.mjs'], '命中 FR 的绑定测试文件集')
  assert.equal(r.frHits[0].id, 'FR-core-001')

  // 错形路径：丢 test/ 前缀的裸文件名 → glob 兜底解析回仓根相对
  const f2 = readFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), 'utf8')
  writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), f2.replace('tests: test/bound.test.mjs', 'tests: bound.test.mjs::test_b'))
  const r2 = collectFrLinkedTests({ specBase, changeName: 'c1', changedFiles: ['src/lib.js'], projectRoot: root })
  assert.deepEqual(r2.files, ['test/bound.test.mjs'], '裸文件名 + 用例锚 → 文件面解析、锚不进文件集')

  // 完全无法解析 → 披露不进测试面
  writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), f2.replace('tests: test/bound.test.mjs', 'tests: nope-missing.test.mjs'))
  const r3 = collectFrLinkedTests({ specBase, changeName: 'c1', changedFiles: ['src/lib.js'], projectRoot: root })
  assert.equal(r3.files.length, 0, '未解析路径不入测试面（宁缺勿错跑）')
  assert.ok(r3.unresolved.some(u => u.includes('nope-missing.test.mjs')), '未解析披露')
})

// ── 5 写入侧归一 ──────────────────────────────────────────────────────

test('upsertFrBindings projectRoot：写入路径归一仓根相对（丢前缀/裸名补全）', () => {
  const { root, specBase } = frFixture()
  upsertFrBindings({
    knowledgeRoot: join(specBase, 'knowledge'),
    frId: 'FR-core-001',
    rows: [{ row_id: 'new-change:task-02:FR-01', tests: ['bound.test.mjs', 'src/__tests__/x.test.ts'], reason: 'spec', state: 'candidate', discovery: 'machine', confirmed_by: null, confirmed_at: null, source_change: 'new-change' }],
    projectRoot: root,
  })
  const rows = readFrBindings({ knowledgeRoot: join(specBase, 'knowledge'), frId: 'FR-core-001' })
  const added = rows.find(r => r.row_id.startsWith('new-change'))
  assert.ok(added.tests.includes('test/bound.test.mjs'), `裸名补全（实得 ${JSON.stringify(added.tests)}）`)
  assert.ok(added.tests.includes('src/__tests__/x.test.ts'), '不存在且不可解析的路径保留原值（不误改）')
})

// ── 6 E2E：未配置仓缺省动态子集 + FR 回归并入 + doc-only 空 ───────────

test('runVerifyTestCheck E2E：无 local.yaml 的仓（R22 之痛）缺省动态子集实测 + FR 回归并入', () => {
  const { root, specBase } = frFixture()
  sh(['git', 'init', '-q'], root)
  sh(['git', 'config', 'user.email', 't@t'], root)
  sh(['git', 'config', 'user.name', 't'], root)
  sh(['git', 'add', '.'], root)
  sh(['git', 'commit', '-qm', 'init'], root)
  // 变更触碰 src/lib.js（FR-core-001 覆盖面）→ 三源：FR 回归 bound.test.mjs 并入
  writeFileSync(join(root, 'src', 'lib.js'), 'export const a = 2\n')
  delete process.env.NODE_TEST_CONTEXT
  const r = runVerifyTestCheck({ cwd: root, specBase, changeName: null })
  assert.equal(r.status, 'passed', `动态子集通过（${r.reason || ''}）`)
  assert.equal(r.mode, 'dynamic-subset', '缺省=动态子集（无 local.yaml 测试配置不再 skip/裸全量）')
  assert.match(String(r.command), /deps\(js1\)/, `FR 绑定测试并入执行面（${r.command}）`)
})

test('runVerifyTestCheck E2E：doc-only 变更 → dynamic-empty 不硬跑全量', () => {
  const { root, specBase } = frFixture()
  sh(['git', 'init', '-q'], root)
  sh(['git', 'config', 'user.email', 't@t'], root)
  sh(['git', 'config', 'user.name', 't'], root)
  sh(['git', 'add', '.'], root)
  sh(['git', 'commit', '-qm', 'init'], root)
  writeFileSync(join(root, 'README.md'), 'doc only\n')
  const r = runVerifyTestCheck({ cwd: root, specBase, changeName: null })
  assert.equal(r.mode, 'dynamic-empty', '三源空 → 不硬跑全量')
  assert.equal(r.status, 'skipped')
  assert.match(String(r.reason), /零关系/, 'reason 陈述零关系')
})

// ── 7 CLI repair-paths（三形态归一）───────────────────────────────────

test('CLI tests repair-paths：干跑预览 + --write 三形态归一仓根相对', async () => {
  const { root, specBase } = frFixture()
  // 造三种错形：根相对（已对）/ 丢 frontend 前缀 / 裸文件名
  mkdirSync(join(root, 'frontend', 'src', '__tests__'), { recursive: true })
  writeFileSync(join(root, 'frontend', 'src', '__tests__', 'app.test.ts'), 'x')
  const frFile = join(specBase, 'knowledge', 'fr', 'core.md')
  const f = readFileSync(frFile, 'utf8')
  writeFileSync(frFile, f.replace('tests: test/bound.test.mjs', 'tests: bound.test.mjs | src/__tests__/app.test.ts | test/bound.test.mjs'))

  const { execFileSync: ex } = await import('node:child_process')
  const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js') // 锚 import.meta.url（npm runner 的 cwd 不在仓根——并发跑 MODULE_NOT_FOUND 实证）
  const dry = ex('node', [bin, 'tests', 'repair-paths'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(dry, /预览/, '缺省干跑不落盘')
  assert.match(dry, /2 个路径归一/, `预览计数（${dry.split('\n').find(l => l.includes('归一')) || ''}）`)
  const rowsBefore = readFrBindings({ knowledgeRoot: join(specBase, 'knowledge'), frId: 'FR-core-001' })
  assert.deepEqual(rowsBefore[0].tests, ['bound.test.mjs', 'src/__tests__/app.test.ts', 'test/bound.test.mjs'], '干跑不改盘（错形保留）')

  ex('node', [bin, 'tests', 'repair-paths', '--write'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const rowsAfter = readFrBindings({ knowledgeRoot: join(specBase, 'knowledge'), frId: 'FR-core-001' })
  assert.deepEqual(rowsAfter[0].tests, ['frontend/src/__tests__/app.test.ts', 'test/bound.test.mjs'],
    `--write 后全部仓根相对可解析（实得 ${JSON.stringify(rowsAfter[0].tests)}）`)

  // 幂等：再跑报无需修复
  const again = ex('node', [bin, 'tests', 'repair-paths'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(again, /无需修复/, '幂等（已是仓根相对）')
})
