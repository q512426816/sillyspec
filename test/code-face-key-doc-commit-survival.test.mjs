/**
 * 代码树内容键 + 两指纹「文档提交存活 / 代码提交击穿」回归锁
 * （2026-10-09-verify-reuse-friction FR-03 / D-002@v1）。
 *
 * 2026-10-09 取证：收口窗口内每笔声明修正 commit（哪怕纯文档）都换 HEAD → 两类复用
 * 指纹（green-cache / 质量扫描）必 miss。修复：HEAD 分量替换为 ls-tree 过滤哈希的
 * 代码树内容键——纯文档提交不进键，缓存存活；代码提交必进键，必失配。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { computeCodeTreeKey, filterCodePorcelain, isNonCodePath } from '../src/run/code-face-key.js'
import { computeGateFingerprint } from '../src/run/green-cache.js'
import { computeQualityScanFingerprint } from '../src/run/verify-quality-scan.js'

function makeFixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'cfk-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'app.js'), 'export const x = 1\n')
  mkdirSync(join(dir, 'docs'), { recursive: true })
  writeFileSync(join(dir, 'docs', 'note.md'), 'doc\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node app.js\n  lint: node app.js\n')
  return dir
}

test('代码树键：纯文档提交（含非 ASCII 文档路径）不变；代码提交必变；git 不可用 null', () => {
  const dir = makeFixtureRepo()
  try {
    const k0 = computeCodeTreeKey({ cwd: dir })
    assert.ok(typeof k0 === 'string' && k0.length === 64, '键为 sha256 hex')
    // 纯文档提交 1：根 README.md + docs 修改
    writeFileSync(join(dir, 'README.md'), '# doc commit\n')
    writeFileSync(join(dir, 'docs', 'note.md'), 'doc changed\n')
    execSync('git add -A && git commit -qm doc-only', { cwd: dir })
    assert.equal(computeCodeTreeKey({ cwd: dir }), k0, '纯文档提交（HEAD 已推进）→ 键不变')
    // 纯文档提交 2：非 ASCII 路径（-z 无引号转义——endsWith 判据不被尾部引号击穿）
    writeFileSync(join(dir, 'docs', '中文文档说明.md'), '非 ASCII\n')
    execSync('git add -A && git commit -qm doc-cjk', { cwd: dir })
    assert.equal(computeCodeTreeKey({ cwd: dir }), k0, '非 ASCII 文档路径提交 → 键不变（-z 解析）')
    // 代码提交 → 键必变
    writeFileSync(join(dir, 'app.js'), 'export const x = 2\n')
    execSync('git add -A && git commit -qm code', { cwd: dir })
    assert.notEqual(computeCodeTreeKey({ cwd: dir }), k0, '代码提交 → 键必变')
    // git 不可用 → null（fail-open miss）
    const notRepo = mkdtempSync(join(tmpdir(), 'norepo-'))
    try {
      assert.equal(computeCodeTreeKey({ cwd: notRepo }), null, '非 git 目录 → null')
    } finally { try { rmSync(notRepo, { recursive: true, force: true }) } catch {} }
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('两指纹：纯文档提交存活（green-cache 与质量扫描一致）；代码提交击穿', () => {
  const dir = makeFixtureRepo()
  try {
    const specBase = join(dir, '.sillyspec')
    const g0 = computeGateFingerprint({ cwd: dir, specBase })
    const q0 = computeQualityScanFingerprint({ cwd: dir, specBase })
    assert.ok(g0 && q0, 'git 仓内两指纹可得')
    // 纯文档提交（声明修正类）→ 两指纹均存活（HEAD 已推进——旧口径此处必 miss）
    writeFileSync(join(dir, 'README.md'), '# declaration fix\n')
    mkdirSync(join(dir, '.sillyspec', 'changes'), { recursive: true })
    writeFileSync(join(dir, '.sillyspec', 'changes', 'verify-result.md'), '# PASS\n')
    execSync('git add -A && git commit -qm doc-fix', { cwd: dir })
    assert.equal(computeGateFingerprint({ cwd: dir, specBase }), g0, 'green-cache 指纹：纯文档提交存活')
    assert.equal(computeQualityScanFingerprint({ cwd: dir, specBase }), q0, '质量扫描指纹：纯文档提交存活')
    // 代码提交 → 两指纹必击穿
    writeFileSync(join(dir, 'app.js'), 'export const x = 3\n')
    execSync('git add -A && git commit -qm code2', { cwd: dir })
    const g2 = computeGateFingerprint({ cwd: dir, specBase })
    const q2 = computeQualityScanFingerprint({ cwd: dir, specBase })
    assert.notEqual(g2, g0, 'green-cache 指纹：代码提交击穿')
    assert.notEqual(q2, q0, '质量扫描指纹：代码提交击穿')
    // 未提交代码脏面 → 击穿（脏面分量语义不变）
    writeFileSync(join(dir, 'app.js'), 'export const x = 4\n')
    assert.notEqual(computeGateFingerprint({ cwd: dir, specBase }), g2, '未提交代码脏面击穿（脏面分量不变）')
    assert.notEqual(computeQualityScanFingerprint({ cwd: dir, specBase }), q2, '质量扫描同款')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('口径单点：green-cache 的 filterCodePorcelain re-export 自 code-face-key；isNonCodePath 路径口径', async () => {
  const { filterCodePorcelain: viaGreenCache } = await import('../src/run/green-cache.js')
  const sample = ' M src/app.js\n M docs/note.md\n?? .sillyspec/x.json\n M README.md\nR  old.md -> new.md\n'
  assert.deepEqual(viaGreenCache(sample), [' M src/app.js'], '文档面与 rename 文档行剔除，代码行保留')
  assert.equal(isNonCodePath('docs/中文.md'), true)
  assert.equal(isNonCodePath('src/组件.vue'), false)
  assert.equal(isNonCodePath('X.MD'), true, '单点口径大小写不敏感（.MD 同豁免）')
})
