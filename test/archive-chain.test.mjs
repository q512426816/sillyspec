/**
 * archive-chain.test.mjs — 归档执行链抽取（R7 切片二 task-02 / FR-05）
 *
 * 覆盖验收面：
 *   ① runArchiveChain 可导入、happy path 端到端（目录搬移+unregisterChange 终态一致化）；
 *   ② skipPlanCheck 两态：false（既有语义）缺 plan.md → 子进程 exit 1（移动前硬校验）；
 *      true（flow 薄工件面旁路）缺 plan.md → 归档成功；
 *   ③ 既有语义零变化：plan.md 在场 + skipPlanCheck=false → 正常归档（缺省路径回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const { runArchiveChain, buildArchiveModuleDocAdvisory, deriveFlowDeliverableFace } = await import('../src/run/complete-handlers.js')

function makeFixture(withPlan) {
  const root = mkdtempSync(join(tmpdir(), 'ac-'))
  const specBase = join(root, '.sillyspec')
  const srcDir = join(specBase, 'changes', 'c1')
  mkdirSync(srcDir, { recursive: true })
  if (withPlan) writeFileSync(join(srcDir, 'plan.md'), '# plan\n')
  writeFileSync(join(srcDir, 'proposal.md'), '# p\n')
  const destDir = join(specBase, 'changes', 'archive', '2026-09-22-c1')
  const pm = { unregisterChangeCalls: [], unregisterChange(cwd, name, opts) { this.unregisterChangeCalls.push({ cwd, name, opts }) } }
  return { root, specBase, srcDir, destDir, pm }
}

test('happy path: plan.md 在场 + skipPlanCheck 缺省 false → 目录搬移 + 终态一致化（既有语义回归）', async () => {
  const { root, specBase, srcDir, destDir, pm } = makeFixture(true)
  await runArchiveChain({ pm, cwd: root, specBase, changeName: 'c1', srcDir, destDir })
  assert.equal(existsSync(srcDir), false, '源目录已搬走')
  assert.equal(existsSync(join(destDir, 'plan.md')), true, '归档目录就位')
  assert.equal(pm.unregisterChangeCalls.length, 1)
  assert.equal(pm.unregisterChangeCalls[0].name, 'c1')
  rmSync(root, { recursive: true, force: true })
})

test('skipPlanCheck=true: 薄工件面（无 plan.md）旁路硬校验 → 归档成功（task-03 消费入口）', async () => {
  const { root, specBase, srcDir, destDir, pm } = makeFixture(false)
  await runArchiveChain({ pm, cwd: root, specBase, changeName: 'c1', srcDir, destDir, skipPlanCheck: true })
  assert.equal(existsSync(srcDir), false)
  assert.equal(existsSync(join(destDir, 'proposal.md')), true)
  assert.equal(pm.unregisterChangeCalls.length, 1)
  rmSync(root, { recursive: true, force: true })
})

test('skipPlanCheck=false: 缺 plan.md → 移动前硬校验阻断 exit 1（子进程验证，纯搬运不改 exit 语义）', () => {
  const { root, specBase, srcDir, destDir, pm } = makeFixture(false)
  const modUrl = new URL('../src/run/complete-handlers.js', import.meta.url).href
  const code = `import(${JSON.stringify(modUrl)}).then(async (m) => {`
    + ` await m.runArchiveChain({ pm: { unregisterChange() {} }, cwd: ${JSON.stringify(root)}, specBase: ${JSON.stringify(specBase)},`
    + ` changeName: 'c1', srcDir: ${JSON.stringify(srcDir)}, destDir: ${JSON.stringify(destDir)} }) }).catch((e) => { console.error(e && e.message); process.exit(3) })`
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 60_000 })
  assert.equal(r.status, 1, `期望 exit 1，实际 ${r.status}；stderr: ${r.stderr}`)
  assert.equal(existsSync(srcDir), true, '移动前阻断：源目录未动')
  assert.equal(existsSync(destDir), false, '目标未产生')
  rmSync(root, { recursive: true, force: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// 模块文档认领 advisory（资产三小件③）：交付面 × module-map 交集 ≥1 且无 docs 增量 → 警告
// ─────────────────────────────────────────────────────────────────────────────

/** module-map fixture：docs/<proj>/modules/_module-map.yaml（含 doc 卡路径 + paths 前缀）。 */
function writeModuleMap(specBase, project = 'demo') {
  const dir = join(specBase, 'docs', project, 'modules')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_module-map.yaml'), [
    'schema_version: 1',
    'modules:',
    '  core-engine:',
    '    status: active',
    '    doc: modules/core-engine.md',
    '    paths:',
    '      - "src/eng"',
    '  side-mod:',
    '    status: active',
    '    doc: modules/side-mod.md',
    '    paths:',
    '      - "lib/side"',
    '',
  ].join('\n'), 'utf8')
}

/** git fixture（真仓）：module-map 先入库（.sillyspec 跟踪态——真实仓形态，防整目录 untracked
 *  折叠成 `?? .sillyspec/` 行）→ 初始提交 → 返回 { root, specBase, baseline }。 */
function makeGitFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ac-doc-'))
  const specBase = join(root, '.sillyspec')
  writeModuleMap(specBase)
  for (const args of [
    ['init', '-q'],
    ['config', 'user.email', 't@t.local'],
    ['config', 'user.name', 't'],
  ]) {
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }
  execFileSync('git', ['add', '.sillyspec'], { cwd: root, encoding: 'utf8' })
  execFileSync('git', ['commit', '-qm', 'base'], { cwd: root, encoding: 'utf8' })
  const baseline = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  return { root, specBase, baseline }
}

test('buildArchiveModuleDocAdvisory: 命中模块卡且无文档增量 → 列出卡片路径（含项目归属）', () => {
  const root = mkdtempSync(join(tmpdir(), 'ac-doc-pure-'))
  const specBase = join(root, '.sillyspec')
  writeModuleMap(specBase)
  const msg = buildArchiveModuleDocAdvisory({ specBase, deliverableFiles: ['src/eng/foo.js', 'README.md'], docsIncrement: [] })
  assert.ok(msg && msg.includes('core-engine') && msg.includes('.sillyspec/docs/demo/modules/core-engine.md'),
    `警告列出未认领模块卡路径（实际 ${JSON.stringify(msg)}）`)
  assert.ok(!msg.includes('side-mod'), '未命中模块不出场')
  rmSync(root, { recursive: true, force: true })
})

test('buildArchiveModuleDocAdvisory: 三负例零输出（有文档增量/无交集/纯 spec 变更）', () => {
  const root = mkdtempSync(join(tmpdir(), 'ac-doc-neg-'))
  const specBase = join(root, '.sillyspec')
  writeModuleMap(specBase)
  assert.equal(buildArchiveModuleDocAdvisory({ specBase, deliverableFiles: ['src/eng/a.js'], docsIncrement: ['.sillyspec/docs/demo/modules/core-engine.md'] }), null,
    '有 .sillyspec/docs/** 增量 → null')
  assert.equal(buildArchiveModuleDocAdvisory({ specBase, deliverableFiles: ['other/x.js'], docsIncrement: [] }), null,
    '交付面与 module-map 无交集 → null')
  assert.equal(buildArchiveModuleDocAdvisory({ specBase, deliverableFiles: [], docsIncrement: [] }), null,
    '纯 spec 变更（交付面空）→ null')
  assert.equal(buildArchiveModuleDocAdvisory({ specBase: join(root, 'no-spec'), deliverableFiles: ['src/eng/a.js'], docsIncrement: [] }), null,
    '无 docs 目录 → null')
  rmSync(root, { recursive: true, force: true })
})

test('deriveFlowDeliverableFace: flow-state.yaml 基线自算交付面与 docs 增量；非 flow 变更 → null', () => {
  const { root, specBase, baseline } = makeGitFixture()
  // 基线后交付：commit 一个 src 文件 + 工作区脏一个 docs 文件
  mkdirSync(join(root, 'src', 'eng'), { recursive: true })
  writeFileSync(join(root, 'src', 'eng', 'a.js'), 'export const x = 1\n')
  execFileSync('git', ['add', 'src/eng/a.js'], { cwd: root, encoding: 'utf8' })
  execFileSync('git', ['commit', '-qm', 'deliver'], { cwd: root, encoding: 'utf8' })
  mkdirSync(join(specBase, 'docs', 'demo', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'demo', 'modules', 'core-engine.md'), '# core-engine\n')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${baseline}\n`)
  const face = deriveFlowDeliverableFace({ cwd: root, srcDir: changeDir })
  assert.deepEqual(face, {
    deliverableFiles: ['src/eng/a.js'],
    docsIncrement: ['.sillyspec/docs/demo/modules/core-engine.md'],
  }, `diff 基线→HEAD + porcelain 两段并入并按前缀分家（实际 ${JSON.stringify(face)}）`)
  // 非 flow 变更：无 flow-state.yaml → null
  const legacyDir = join(specBase, 'changes', 'c2')
  mkdirSync(legacyDir, { recursive: true })
  assert.equal(deriveFlowDeliverableFace({ cwd: root, srcDir: legacyDir }), null, '无 flow-state.yaml → null')
  rmSync(root, { recursive: true, force: true })
})

test('runArchiveChain 集成: flow 变更命中模块卡且无 docs 增量 → 归档前一行警告；有 docs 增量零输出', async () => {
  const capture = () => {
    const warns = []
    const orig = console.warn
    console.warn = (...a) => warns.push(a.join(' '))
    return { warns, restore: () => { console.warn = orig } }
  }
  // 正例：基线后 commit 交付（命中 src/eng 模块）、零 docs 增量
  {
    const { root, specBase, baseline } = makeGitFixture()
    mkdirSync(join(root, 'src', 'eng'), { recursive: true })
    writeFileSync(join(root, 'src', 'eng', 'a.js'), 'export const x = 1\n')
    execFileSync('git', ['add', 'src/eng/a.js'], { cwd: root, encoding: 'utf8' })
    execFileSync('git', ['commit', '-qm', 'deliver'], { cwd: root, encoding: 'utf8' })
    const srcDir = join(specBase, 'changes', 'c1')
    mkdirSync(srcDir, { recursive: true })
    writeFileSync(join(srcDir, 'plan.md'), '# plan\n')
    writeFileSync(join(srcDir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${baseline}\n`)
    const c = capture()
    try {
      await runArchiveChain({ pm: { unregisterChange() {} }, cwd: root, specBase, changeName: 'c1', srcDir, destDir: join(specBase, 'changes', 'archive', '2026-09-23-c1'), skipPlanCheck: false })
    } finally { c.restore() }
    assert.ok(c.warns.some((w) => w.includes('模块文档认领 advisory') && w.includes('.sillyspec/docs/demo/modules/core-engine.md')),
      `归档链内一行警告（实际 ${JSON.stringify(c.warns)}）`)
    assert.equal(existsSync(srcDir), false, 'advisory 不阻断：归档照常完成')
    rmSync(root, { recursive: true, force: true })
  }
  // 负例：有 docs 增量（工作区脏模块卡）→ 零 advisory 输出
  {
    const { root, specBase, baseline } = makeGitFixture()
    mkdirSync(join(root, 'src', 'eng'), { recursive: true })
    writeFileSync(join(root, 'src', 'eng', 'a.js'), 'export const x = 1\n')
    execFileSync('git', ['add', 'src/eng/a.js'], { cwd: root, encoding: 'utf8' })
    execFileSync('git', ['commit', '-qm', 'deliver'], { cwd: root, encoding: 'utf8' })
    writeFileSync(join(specBase, 'docs', 'demo', 'modules', 'core-engine.md'), '# core-engine 更新\n')
    const srcDir = join(specBase, 'changes', 'c1')
    mkdirSync(srcDir, { recursive: true })
    writeFileSync(join(srcDir, 'plan.md'), '# plan\n')
    writeFileSync(join(srcDir, 'flow-state.yaml'), `tier: thin\nbaseline_commit: ${baseline}\n`)
    const c = capture()
    try {
      await runArchiveChain({ pm: { unregisterChange() {} }, cwd: root, specBase, changeName: 'c1', srcDir, destDir: join(specBase, 'changes', 'archive', '2026-09-23-c1'), skipPlanCheck: false })
    } finally { c.restore() }
    assert.ok(!c.warns.some((w) => w.includes('模块文档认领 advisory')), `有文档增量零输出（实际 ${JSON.stringify(c.warns)}）`)
    rmSync(root, { recursive: true, force: true })
  }
})
