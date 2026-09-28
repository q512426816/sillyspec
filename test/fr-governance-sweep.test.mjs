/**
 * fr-governance-sweep.test.mjs — 知识/防线治理清偿（2026-09-25-fr-governance-sweep）
 *
 * 覆盖验收面：
 *   ① patchText null/空分径：null（采集失败）→ 需评审（豁免证据不成立）；空（真无 diff）→ 纯治理面豁免照旧；
 *   ② resume 声明通道：--review 对在途变更重入 start 落盘 review_force（与新变更/adopt 口径一致）；
 *   ③ status 归档检测精确匹配钉（flow-check 不再误命中 flow-checkpoints）；
 *   ④ flow-review 头注释与实现一致钉（--no-review 先判豁免的优先序如实陈述）。
 *   （FR-runtime-020 承接翻链由 flow done distill 实际执行验证——收口后知识库断言，非本套件面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { classifyReviewNeed } = await import(pathToFileURL(join(ROOT, 'src', 'flow-review.js')).href)

const QUIET_DESIGN = [
  '# 设计记录',
  '<!--AGENT:槽3 盲维四问作答 -->',
  '不适用：纯防线分径修复，无并发面',
  '',
].join('\n')

function makeChangeDir() {
  const root = mkdtempSync(join(tmpdir(), 'fgs-'))
  const changeDir = join(root, 'changes', 'c-x')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), QUIET_DESIGN)
  writeFileSync(join(changeDir, 'requirements.md'), '# 需求\n普通防线修复\n')
  return { root, changeDir }
}

test('① patchText 分径：null=采集失败→需评审；空=真无 diff→纯治理豁免', () => {
  let { root, changeDir } = makeChangeDir()
  try {
    // null（patch 子步 fail-soft catch 传 null）——此前被误标「无交付 diff」豁免证据
    const tNull = classifyReviewNeed({ changeDir, patchText: null, change: 'q-null' })
    assert.equal(tNull.required, true, 'null patchText 应需评审')
    assert.ok(tNull.reasons.some((r) => /不可得/.test(r)), `分径理由在场: ${tNull.reasons}`)
    assert.ok(!tNull.exemptEvidence.some((e) => /纯治理面/.test(e)), 'null 不进豁免证据')
    // 空字符串（真无交付 diff）——豁免照旧（其余信号静默 + 非采样桶前提下）
    const tEmpty = classifyReviewNeed({ changeDir, patchText: '', change: 'q-empty' })
    assert.ok(tEmpty.exemptEvidence.some((e) => /纯治理面/.test(e)), '空 patch 豁免证据照旧')
    if (!tEmpty.required) assert.ok(!tEmpty.reasons.some((r) => /不可得/.test(r)), '空 patch 不触发不可得分径')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('② resume 声明通道：--review 对在途变更重入落盘 review_force', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fgs2-'))
  try {
    const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
    g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
    writeFileSync(join(cwd, '.sillyspec.yaml'), 'project:\n  type: generic\n')
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'commands:\n  test: node -e "1"\n') // flow start fail-fast 契约：local.yaml 必须在场
    writeFileSync(join(cwd, 'base.txt'), 'b\n')
    g(['add', '.']); g(['commit', '-q', '-m', 'b'])
    const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
    const INPUT = '动机：夹具\n成功标准：\n- 夹具行为'
    const r1 = cli(['flow', 'start', '--change', '2026-09-01-c-rf', '--input', INPUT])
    assert.equal(r1.status, 0, `首次 start 应成功: ${r1.stderr}`)
    // 在途变更 resume 带 --review → review_force 落盘
    const r2 = cli(['flow', 'start', '--change', '2026-09-01-c-rf', '--review'])
    assert.equal(r2.status, 0, `resume 应成功: ${r2.stderr}`)
    assert.ok(r2.stdout.includes('review_force=true'), 'resume 应打印落盘回执')
    const state = readFileSync(join(cwd, '.sillyspec', 'changes', '2026-09-01-c-rf', 'flow-state.yaml'), 'utf8')
    assert.ok(/review_force:\s*true/.test(state), 'flow-state 应含 review_force: true')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('③ status 归档检测精确匹配钉（子串误报清偿）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('some((e) => e === change)'), '归档检测应精确匹配（目录名恒等 change 名）')
  assert.ok(!src.includes('e.includes(change)'), '不应再有子串匹配形态')
})

test('④ flow-review 头注释优先序钉（--no-review 先判如实陈述）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow-review.js'), 'utf8')
  assert.ok(src.includes('--no-review 显式豁免除外'), '头注释应如实陈述豁免优先序')
})
