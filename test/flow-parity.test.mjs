/**
 * flow-parity.test.mjs — 轻量变更模块对账结构化落盘（2026-09-27-thin-module-scope-persist，FR-01~FR-04）
 *
 * 覆盖验收面：
 *   ① reconcileModuleDocs 结构化返回：modules: 包层命中（旧实现 js-yaml 顶层迭代命中恒 0 的
 *      修复锁定）+ docTouched 以仓根相对 committedRaw 判定（旧实现 specBase 相对比对恒 false 的
 *      修复锁定）；console lines 与结构化值同源（FR-02）；
 *   ② 无模块图 / 零命中向后兼容：空数组形态不抛错（FR-03）；
 *   ③ .sillyspec 治理面不入对账（不污染 uncoveredDirs）；子项目 paths 前缀（collectModuleMaps 口径）；
 *   ④ 集成：临时仓真跑 flow start → 干活 → done → 归档件 change-patch.json 含
 *      modules/uncoveredDirs/moduleMaps 三键，console 对账行与落盘同一次计算（FR-01）。
 *   ⑤ buildFrozenPatch fail-closed：diff 采集失败返回 null 不落伪 patch（评审 P1 清偿——
 *      实证 core.bare 被误写 true 时 untracked 自拼 hunk 仍拼出 patchStatus ok 的伪完整件）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { reconcileModuleDocs } = await import('../src/flow-parity.js')
const { buildFrozenPatch } = await import('../src/scope-audit.js')

/** 单元夹具：tmp 仓根 + .sillyspec specBase（docTouched 比对走真实相对层级）。 */
function unitBase() {
  const cwd = mkdtempSync(join(tmpdir(), 'mpar-'))
  const specBase = join(cwd, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  return { cwd, specBase }
}

/** 写一张模块图（parseModuleMapSimple 行级口径：2 空格 id、4 空格字段、6 空格列表项）。 */
function writeMap(specBase, project, yamlText) {
  const dir = join(specBase, 'docs', project, 'modules')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_module-map.yaml'), yamlText)
  return dir
}

test('① 结构化返回：modules: 包层命中 + docTouched 仓根相对判定 + 与 console 行同源', () => {
  const { cwd, specBase } = unitBase()
  const dir = writeMap(specBase, 'demo', [
    'modules:',
    '  core:',
    '    doc: modules/core.md',
    '    paths:',
    '      - src/core/',
    '  ui:',
    '    doc: modules/ui.md',
    '    paths:',
    '      - src/ui/widget.js',
    '',
  ].join('\n'))
  writeFileSync(join(dir, 'core.md'), '# core\n')
  writeFileSync(join(dir, 'ui.md'), '# ui\n')
  const rec = reconcileModuleDocs({
    cwd,
    specBase,
    ownFiles: ['src/core/a.js', 'src/core/deep/b.js', 'src/ui/widget.js', 'src/ui/other.js', '.sillyspec/changes/c/design.md'],
    committedRaw: ['src/core/a.js', '.sillyspec/docs/demo/modules/core.md'],
  })
  assert.equal(rec.hits, 2, '两个模块命中（包层解析生效——旧实现恒 0）')
  assert.deepEqual(rec.modules, [
    { id: 'core', files: 2, doc: 'docs/demo/modules/core.md', docTouched: true, docMissing: false },
    { id: 'ui', files: 1, doc: 'docs/demo/modules/ui.md', docTouched: false, docMissing: false },
  ], '结构化模块面（docTouched 按仓根相对 committedRaw 判定——旧实现恒 false）')
  assert.deepEqual(rec.uncoveredDirs, [{ dir: 'src/ui', files: 1 }], '未命中 paths 的交付目录点名（.sillyspec 治理面已滤除）')
  assert.deepEqual(rec.moduleMaps, ['docs/demo/modules/_module-map.yaml'])
  const text = rec.lines.join('\n')
  assert.match(text, /📎 模块文档对账（advisory）：交付面命中 2 个模块/)
  assert.match(text, new RegExp(`✓ core（2 文件）——文档 docs/demo/modules/core.md 已同步`))
  assert.match(text, new RegExp(`⚠️ ui（1 文件）`))
  assert.match(text, /未登记模块图的交付目录（src\/ui（1 文件））/)
  rmSync(cwd, { recursive: true, force: true })
})

test('② 无模块图 / 零命中向后兼容：空数组形态，不抛错', () => {
  const { cwd, specBase } = unitBase()
  const noMap = reconcileModuleDocs({ cwd, specBase, ownFiles: ['src/a.js'], committedRaw: [] })
  assert.deepEqual(noMap, { lines: [], hits: 0, modules: [], uncoveredDirs: [], moduleMaps: [] }, '无图=三键空数组')
  writeMap(specBase, 'demo', 'modules:\n  core:\n    paths:\n      - src/core/\n')
  const zeroHit = reconcileModuleDocs({ cwd, specBase, ownFiles: ['lib/x.js'], committedRaw: [] })
  assert.deepEqual(zeroHit.modules, [], '零命中=modules 空数组')
  assert.deepEqual(zeroHit.uncoveredDirs, [{ dir: 'lib', files: 1 }])
  assert.deepEqual(zeroHit.moduleMaps, ['docs/demo/modules/_module-map.yaml'], '图在场=moduleMaps 非空')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ 子项目前缀（project 名=仓库顶层目录 → paths 相对该子目录）+ doc 缺失标记', () => {
  const { cwd, specBase } = unitBase()
  mkdirSync(join(cwd, 'app'), { recursive: true })
  writeMap(specBase, 'app', [
    'modules:',
    '  svc:',
    '    doc: modules/svc.md',
    '    paths:',
    '      - src/',
    '',
  ].join('\n')) // svc.md 不写——docMissing true 面
  const rec = reconcileModuleDocs({
    cwd,
    specBase,
    ownFiles: ['app/src/a.js', 'src/stray.js'],
    committedRaw: [],
  })
  assert.deepEqual(rec.modules, [
    { id: 'svc', files: 1, doc: 'docs/app/modules/svc.md', docTouched: false, docMissing: true },
  ], 'app/src/a.js 命中（前缀 app/ 生效）；根层 src/stray.js 不命中')
  assert.deepEqual(rec.uncoveredDirs, [{ dir: 'src', files: 1 }])
  rmSync(cwd, { recursive: true, force: true })
})

/* ───── 集成：真跑 flow done，锁 change-patch.json 落盘三键（FR-01） ───── */

function makeRepo(testCmd = 'node -e 0') {
  const cwd = mkdtempSync(join(tmpdir(), 'mspr-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "' + testCmd + '"\nflow:\n  mode: thin\n')
  // 模块图随基线入库（modules: 包层——锁真实 schema v2 形态，非顶层裸键）
  const modDir = join(cwd, '.sillyspec', 'docs', 'demo', 'modules')
  mkdirSync(modDir, { recursive: true })
  writeFileSync(join(modDir, '_module-map.yaml'), 'modules:\n  core:\n    doc: modules/core.md\n    paths:\n      - src/core/\n')
  writeFileSync(join(modDir, 'core.md'), '# core\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd, run }
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

function fillDesignSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：模块对账落盘夹具——一行作答即合规'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 模块对账结果随 change-patch.json 落盘\nGiven 仓内有模块图\nWhen flow done 执行\nThen change-patch.json 含 modules/uncoveredDirs/moduleMaps 三键')
    .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：本变更为 flow done 行为本身（test/flow-parity.test.mjs ④ 集成锁定）'))
}

test('④ 集成：flow done 后归档件 change-patch.json 落盘模块对账三键（console 与落盘同源）', () => {
  const { cwd, run } = makeRepo()
  const change = '2026-09-01-msp-it1'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--no-review', '--input', '改 core 模块代码\n成功标准：\n- src/core/a.js 生成且 flow done 全绿\n- change-patch.json 含模块对账三键'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  // 干活：交付代码 + 模块文档同步更新（同一提交——锁 docTouched=true 面）
  mkdirSync(join(cwd, 'src', 'core'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'export const a = 1\n')
  writeFileSync(join(cwd, '.sillyspec', 'docs', 'demo', 'modules', 'core.md'), '# core\na=1\n')
  run(['add', 'src/core/a.js', '.sillyspec/docs/demo/modules/core.md'])
  run(['commit', '-q', '-m', 'feat: core 变更（task-01）'])
  fillDesignSlots(cwd, change)
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  assert.match(s2.stdout, /📎 模块文档对账（advisory）：交付面命中 1 个模块/, 'console 对账行走同一计算（FR-02）')
  const archiveDir = join(cwd, '.sillyspec', 'changes', 'archive', change)
  assert.ok(existsSync(archiveDir), '变更已归档')
  const meta = JSON.parse(readFileSync(join(archiveDir, 'change-patch.json'), 'utf8'))
  assert.deepEqual(meta.modules, [
    { id: 'core', files: 1, doc: 'docs/demo/modules/core.md', docTouched: true, docMissing: false },
  ], 'FR-01：受影响模块结构化落盘（文档随变更更新→docTouched true）')
  assert.deepEqual(meta.uncoveredDirs, [], '全命中=未登记空数组（键恒在场）')
  assert.deepEqual(meta.moduleMaps, ['docs/demo/modules/_module-map.yaml'])
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ buildFrozenPatch fail-closed：diff 采集失败返回 null，不落伪 patch（评审 P1 清偿）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'mspf-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' })
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'a.txt'), 'a\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'a'])
  const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd }).toString().trim()
  writeFileSync(join(cwd, 'a.txt'), 'a2\n')
  const ok = buildFrozenPatch(cwd, ['a.txt'], { baseRef: base })
  assert.match(String(ok), /diff --git a\/a\.txt/, '正常态：tracked 改动进 patch 正文')
  // core.bare=true → `git diff <ref>` 报「must be run in a work tree」→ 必须判采集失败
  run(['config', 'core.bare', 'true'])
  assert.equal(buildFrozenPatch(cwd, ['a.txt'], { baseRef: base }), null,
    'diff 失败 fail-closed——不再静默跳过 tracked 段拼出 patchStatus ok 的伪完整件')
  rmSync(cwd, { recursive: true, force: true })
})
