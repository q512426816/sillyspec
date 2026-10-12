/**
 * 轻量道模块门与供料三档（变更 2026-10-12-thin-module-gate-and-feed）。
 *
 * 一档：flow done patch 子步未登记目录软门（--accept-unmapped 签收留痕，镜像 accept-dirty-gap 先例）；
 * 二档：distill 子步命中模块变更索引机械回写（sidecar 优先 / 卡内节次之 / 幂等去重 / 归档窄化入暂存）；
 * 三档：flow start 注入面命中模块 docs-debt behind 事实行（fail-open）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateModuleGate, appendChangeIndexEntries, renderThinDocsDebt } from '../src/flow-parity.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'modgate-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true, maxRetries: 3 }) })

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

const MAP_YAML = `schema_version: 2
modules:
  core:
    status: active
    doc: modules/core.md
    paths:
      - src/core/
`

function coreCard() {
  return `# 核心域（core）

## 定位

夹具卡。

## 变更索引（表格，初始为空）
`
}

/** thin 变更夹具：模块图只登记 src/core（core.md 卡含表格节）；交付 deliverDir 下 work.js。 */
function setupThinModuleChange(cwd, cn, { deliverDir = 'src/newdir', sidecar = false, ignore = null, withMap = true } = {}) {
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules'), { recursive: true })
  const localYaml = 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n' + (ignore ? `module_gate_ignore: ${ignore}\n` : '')
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), localYaml)
  if (withMap) writeFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', '_module-map.yaml'), MAP_YAML)
  if (withMap) writeFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', 'core.md'), coreCard())
  if (sidecar) writeFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', 'core.changelog.md'), `# core 变更索引

| 日期 | 变更名 | 摘要 |
|---|---|---|
| 2026-01-01 | 2026-01-01-init | 初始 |
`)
  mkdirSync(join(cwd, 'src', 'core'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'export const a = 1\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--no-review', '--input', '模块门 e2e\n\n成功标准：\n- 收口门行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规')
    + `\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 新增 | ${deliverDir}/work.js | 交付 |\n`)
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
  writeFileSync(join(base, 'tasks.md'), `---\nauthor: fixture\n---\n\n# 任务注册表（Tasks）\n\n- [x] task-01: 交付 ${deliverDir}/work.js（e2e 夹具）\n`)
  mkdirSync(join(cwd, ...deliverDir.split('/')), { recursive: true })
  writeFileSync(join(cwd, ...deliverDir.split('/'), 'work.js'), 'export const w = 1\n')
  writeFileSync(join(cwd, 'ev.txt'), 'tick evidence\n')
  run(['add', 'ev.txt'])
  run(['commit', '-q', '-m', 'chore: task tick evidence (task-01)'])
  run(['add', '.'])
  run(['commit', '-q', '-m', `feat: 交付 work（${cn}）(task-01)`])
  return { run, env, base }
}

function doneCmd(cwd, cn, env, extra = []) {
  return spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn, ...extra], { cwd, encoding: 'utf8', timeout: 300_000, env })
}

// ───────────────────────── 单元：evaluateModuleGate ─────────────────────────

test('单元 evaluateModuleGate：忽略前缀过滤 / 无图短路 / 空面不拦', () => {
  const g1 = evaluateModuleGate({ moduleScope: { moduleMaps: ['docs/p1/modules/_module-map.yaml'], uncoveredDirs: [{ dir: 'src/newdir', files: 2 }, { dir: 'docs', files: 1 }] }, ignore: ['docs'] })
  assert.equal(g1.block, true, '未登记目录（忽略后）在场且图在场 → 拦')
  assert.deepEqual(g1.dirs.map((d) => d.dir), ['src/newdir'], '忽略项前缀命中的目录被排除')
  const g2 = evaluateModuleGate({ moduleScope: { moduleMaps: [], uncoveredDirs: [{ dir: 'src/newdir', files: 1 }] }, ignore: [] })
  assert.equal(g2.block, false, '绿地无图不拦')
  const g3 = evaluateModuleGate({ moduleScope: { moduleMaps: ['x'], uncoveredDirs: [] }, ignore: [] })
  assert.equal(g3.block, false, '无未登记目录不拦')
  const g4 = evaluateModuleGate({ moduleScope: { moduleMaps: ['x'], uncoveredDirs: [{ dir: 'src/x', files: 1 }] }, ignore: ['src'] })
  assert.equal(g4.block, false, '前缀忽略（src 盖 src/x）')
  const g5 = evaluateModuleGate({ moduleScope: null, ignore: null })
  assert.equal(g5.block, false, 'moduleScope 缺失（对账异常兜底）不拦')
})

// ───────────────────────── 单元：appendChangeIndexEntries ─────────────────────────

function unitSpecBase(d, { sidecar = false, list = false } = {}) {
  const sb = join(d, 'spec')
  mkdirSync(join(sb, 'docs', 'p1', 'modules'), { recursive: true })
  writeFileSync(join(sb, 'docs', 'p1', 'modules', '_module-map.yaml'), MAP_YAML)
  writeFileSync(join(sb, 'docs', 'p1', 'modules', 'core.md'), list
    ? `# 核心域（core）\n\n## 变更索引\n\n- 2026-01-01-init | 初始\n`
    : coreCard())
  if (sidecar) writeFileSync(join(sb, 'docs', 'p1', 'modules', 'core.changelog.md'), `# core 变更索引\n\n| 日期 | 变更名 | 摘要 |\n|---|---|---|\n| 2026-01-01 | 2026-01-01-init | 初始 |\n`)
  return sb
}

test('单元 appendChangeIndexEntries：表格节追加 / sidecar 优先不动卡 / 幂等去重 / 无节跳过', () => {
  const d = fx()
  const sb = unitSpecBase(d)
  const modules = [{ id: 'core', files: 1, doc: 'docs/p1/modules/core.md', docTouched: false, docMissing: false }]
  const r1 = appendChangeIndexEntries({ specBase: sb, modules, change: '2026-10-12-x1', summary: '夹具动机|含竖线', date: '2026-10-12' })
  assert.equal(r1.appended.length, 1, '卡内表格节追加一行')
  const card = readFileSync(join(sb, 'docs', 'p1', 'modules', 'core.md'), 'utf8')
  assert.ok(card.includes('| 2026-10-12 | 2026-10-12-x1 | 夹具动机/含竖线 |'), `表格行形态与竖线清洗：${card}`)
  const r2 = appendChangeIndexEntries({ specBase: sb, modules, change: '2026-10-12-x1', summary: '再跑', date: '2026-10-12' })
  assert.equal(r2.appended.length, 0, '同变更名重跑不重复追加')
  assert.ok(r2.skipped.some((s) => /已记录/.test(s.reason)), '幂等跳过有理由')

  const d2 = fx()
  const sb2 = unitSpecBase(d2, { sidecar: true })
  const r3 = appendChangeIndexEntries({ specBase: sb2, modules, change: '2026-10-12-x2', summary: 'sidecar 优先', date: '2026-10-12' })
  assert.equal(r3.appended.length, 1)
  const cardAfter = readFileSync(join(sb2, 'docs', 'p1', 'modules', 'core.md'), 'utf8')
  assert.ok(!cardAfter.includes('2026-10-12-x2'), '已拆卡（sidecar 在场）不写回卡')
  const side = readFileSync(join(sb2, 'docs', 'p1', 'modules', 'core.changelog.md'), 'utf8')
  assert.ok(side.includes('| 2026-10-12 | 2026-10-12-x2 | sidecar 优先 |'), '追加落 sidecar')

  const d3 = fx()
  const sb3 = unitSpecBase(d3, { list: true })
  const r4 = appendChangeIndexEntries({ specBase: sb3, modules, change: '2026-10-12-x3', summary: '列表形态', date: '2026-10-12' })
  assert.equal(r4.appended.length, 1)
  assert.ok(readFileSync(join(sb3, 'docs', 'p1', 'modules', 'core.md'), 'utf8').includes('- 2026-10-12-x3 | 列表形态'), '列表形态自适应')

  const r5 = appendChangeIndexEntries({ specBase: sb, modules: [{ id: 'ghost', files: 1, doc: null, docTouched: false, docMissing: true }], change: '2026-10-12-x4', summary: 's', date: '2026-10-12' })
  assert.equal(r5.appended.length, 0, '无卡命中静默跳过')
})

// ───────────────────────── 单元：renderThinDocsDebt ─────────────────────────

test('单元 renderThinDocsDebt：无图零输出 / 坏路径零输出（fail-open 不抛）', () => {
  assert.deepEqual(renderThinDocsDebt({ specBase: join(fx(), 'nope'), projectRoot: null, changedFiles: ['src/core/a.js'] }), [])
  const sb = unitSpecBase(fx())
  assert.deepEqual(renderThinDocsDebt({ specBase: sb, projectRoot: null, changedFiles: ['src/无关/x.js'] }), [])
})

// ───────────────────────── FR-01：门三态 e2e ─────────────────────────

test('FR-01 门三态：裸跑阻断@patch / 登记后重跑通过 / --accept-unmapped 留痕 / ignore 命中不触发 / 绿地无图不触发', () => {
  const cwd = fx()
  const cn = '2026-10-12-mg-block'
  const { run, env, base } = setupThinModuleChange(cwd, cn)
  try {
    const s1 = doneCmd(cwd, cn, env)
    const out1 = s1.stdout + s1.stderr
    assert.ok(s1.status !== 0, `未登记目录裸跑应非零退出（实际 ${s1.status}）`)
    assert.ok(out1.includes('src/newdir'), '阻断信息点名未登记目录')
    assert.ok(out1.includes('--accept-unmapped'), '阻断信息含显式签收出路')
    assert.ok(out1.includes('中断于子步「patch」'), '中断点=patch 子步')
    assert.ok(existsSync(base), 'change 仍 active（未归档）')
    assert.ok(!existsSync(join(base, 'change-patch.json')), '阻断时未落冻结件')

    // 处置①：登记 src/newdir → 重跑通过
    writeFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', '_module-map.yaml'), MAP_YAML + `  newdir:\n    status: active\n    paths:\n      - src/newdir/\n`)
    const s2 = doneCmd(cwd, cn, env)
    assert.equal(s2.status, 0, `登记后重跑应完成: ${(s2.stdout + s2.stderr).split('\n').slice(-8).join(' | ')}`)
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', cn)
    assert.ok(existsSync(arch), '处置①后已归档')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }

  // 处置②：--accept-unmapped 放行留痕
  const cwd2 = fx()
  const cn2 = '2026-10-12-mg-accept'
  const st2 = setupThinModuleChange(cwd2, cn2)
  try {
    const s = doneCmd(cwd2, cn2, st2.env, ['--accept-unmapped'])
    assert.equal(s.status, 0, `签收放行应完成: ${(s.stdout + s.stderr).split('\n').slice(-8).join(' | ')}`)
    const meta = JSON.parse(readFileSync(join(cwd2, '.sillyspec', 'changes', 'archive', cn2, 'change-patch.json'), 'utf8'))
    assert.equal(meta.meta ? meta.meta.acceptedUnmappedDirs : meta.acceptedUnmappedDirs, 1, '缺口数随 change-patch.json 留痕')
  } finally { rmSync(cwd2, { recursive: true, force: true, maxRetries: 3 }) }

  // ignore 命中不触发门
  const cwd3 = fx()
  const cn3 = '2026-10-12-mg-ignore'
  const st3 = setupThinModuleChange(cwd3, cn3, { ignore: 'src/newdir' })
  try {
    const s = doneCmd(cwd3, cn3, st3.env)
    assert.equal(s.status, 0, `ignore 命中应直接通过: ${(s.stdout + s.stderr).split('\n').slice(-8).join(' | ')}`)
  } finally { rmSync(cwd3, { recursive: true, force: true, maxRetries: 3 }) }

  // 绿地无图不触发门
  const cwd4 = fx()
  const cn4 = '2026-10-12-mg-green'
  const st4 = setupThinModuleChange(cwd4, cn4, { withMap: false })
  try {
    const s = doneCmd(cwd4, cn4, st4.env)
    assert.equal(s.status, 0, `无模块图应直接通过: ${(s.stdout + s.stderr).split('\n').slice(-8).join(' | ')}`)
  } finally { rmSync(cwd4, { recursive: true, force: true, maxRetries: 3 }) }
})

// ───────────────────────── FR-02：回写 e2e ─────────────────────────

test('FR-02 变更索引回写：命中模块卡追加行 + 归档后已暂存 / sidecar 场景不写回卡', () => {
  const cwd = fx()
  const cn = '2026-10-12-mg-feed'
  const { env } = setupThinModuleChange(cwd, cn, { deliverDir: 'src/core' })
  try {
    const s = doneCmd(cwd, cn, env)
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `收口应完成: ${out.split('\n').slice(-8).join(' | ')}`)
    const card = readFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', 'core.md'), 'utf8')
    assert.ok(card.includes(`| 2026-10-12 | ${cn} |`), `卡内追加本变更行：${card}`)
    const st = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' })
    const cardLine = st.split('\n').find((l) => l.includes('docs/p1/modules/core.md'))
    assert.ok(cardLine && cardLine[1] === ' ', `归档后回写文件已暂存（porcelain 行「${cardLine}」第二列为空）`)
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }

  // sidecar 在场：追加 sidecar、卡逐字不变
  const cwd2 = fx()
  const cn2 = '2026-10-12-mg-side'
  const st2 = setupThinModuleChange(cwd2, cn2, { deliverDir: 'src/core', sidecar: true })
  try {
    const before = readFileSync(join(cwd2, '.sillyspec', 'docs', 'p1', 'modules', 'core.md'), 'utf8')
    const s = doneCmd(cwd2, cn2, st2.env)
    assert.equal(s.status, 0, `sidecar 场景收口应完成: ${(s.stdout + s.stderr).split('\n').slice(-8).join(' | ')}`)
    assert.equal(readFileSync(join(cwd2, '.sillyspec', 'docs', 'p1', 'modules', 'core.md'), 'utf8'), before, '已拆卡不写回卡（逐字不变）')
    const side = readFileSync(join(cwd2, '.sillyspec', 'docs', 'p1', 'modules', 'core.changelog.md'), 'utf8')
    assert.ok(side.includes(`| 2026-10-12 | ${cn2} |`), `sidecar 追加本变更行：${side}`)
  } finally { rmSync(cwd2, { recursive: true, force: true, maxRetries: 3 }) }
})

// ───────────────────────── FR-04：既有面回归 ─────────────────────────

test('FR-04 既有面回归：flow done 收口链在无门触发场景零行为变化', () => {
  const cwd = fx()
  const cn = '2026-10-12-mg-regress'
  // 登记面内交付、无 module_gate_ignore 键——门零触发；断言既有收口行为原样（归档完成 +
  // 既有模块文档对账 advisory 在场 + 无门标记）
  const { env } = setupThinModuleChange(cwd, cn, { deliverDir: 'src/core' })
  try {
    const s = doneCmd(cwd, cn, env)
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `无门触发场景收口应完成: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.ok(!out.includes('❌ 模块图未登记交付目录'), '门零触发（无阻断标记）')
    assert.ok(!out.includes('--accept-unmapped'), '无签收提示（门未参与）')
    assert.ok(out.includes('模块文档对账'), '既有对账 advisory 原样在场')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'archive', cn)), '归档完成')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

// ───────────────────────── FR-03：注入 e2e ─────────────────────────

test('FR-03 注入：behind>0 出欠账事实行 / 空债零输出', () => {
  // 命中且落后：base 提交卡+源码后再推一笔源码提交 → behind≥1
  const cwd = fx()
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', '_module-map.yaml'), MAP_YAML)
  writeFileSync(join(cwd, '.sillyspec', 'docs', 'p1', 'modules', 'core.md'), coreCard())
  mkdirSync(join(cwd, 'src', 'core'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'export const a = 1\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  writeFileSync(join(cwd, 'src', 'core', 'a.js'), 'export const a = 2\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'advance src'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  try {
    const s = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', '2026-10-12-mg-debt', '--autopilot', '--no-review', '--input', '改 src/core/a.js 的行为\n\n成功标准：\n- 注入面出现欠账'], { cwd, encoding: 'utf8', timeout: 120_000, env })
    assert.equal(s.status, 0, '注入异常不阻断 start（fail-open）')
    const out = s.stdout + s.stderr
    assert.ok(out.includes('模块卡欠账'), `behind>0 应出欠账块（尾部 ${out.split('\n').slice(-12).join(' | ')}）`)
    assert.ok(/core[：:].*落后源码 \d+ 个提交|core[：:].*从未提交/.test(out), '欠账行含模块与 behind 事实')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }

  // 空债（卡与源码同 commit）零输出
  const cwd2 = fx()
  const run2 = gitRepo(cwd2)
  mkdirSync(join(cwd2, '.sillyspec', 'docs', 'p1', 'modules'), { recursive: true })
  writeFileSync(join(cwd2, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd2, '.sillyspec', 'docs', 'p1', 'modules', '_module-map.yaml'), MAP_YAML)
  writeFileSync(join(cwd2, '.sillyspec', 'docs', 'p1', 'modules', 'core.md'), coreCard())
  mkdirSync(join(cwd2, 'src', 'core'), { recursive: true })
  writeFileSync(join(cwd2, 'src', 'core', 'a.js'), 'export const a = 1\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'base'])
  try {
    const s = spawnSync(process.execPath, [CLI, '--dir', cwd2, 'flow', 'start', '--change', '2026-10-12-mg-nodebt', '--autopilot', '--no-review', '--input', '改 src/core/a.js 的行为\n\n成功标准：\n- 空债零输出'], { cwd: cwd2, encoding: 'utf8', timeout: 120_000, env })
    assert.equal(s.status, 0)
    assert.ok(!(s.stdout + s.stderr).includes('模块卡欠账'), 'behind=0 不出欠账块')
  } finally { rmSync(cwd2, { recursive: true, force: true, maxRetries: 3 }) }
})
