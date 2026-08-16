/**
 * task-03（2026-08-16-state-split-fixes）: docsCheckHint 扩展活文档漂移提示测试。
 *
 * 覆盖四条验收：
 *   1. 活文档引用的 src 文件出现在审计 changedFiles → livingDocDrift 命中（files/docs/total）
 *   2. changedFiles 不含被引用文件 → 无 livingDocDrift（不误报）
 *   3. 活文档缺失 → 静默跳过（不误报不阻断）
 *   4. local.yaml docs-check.living-docs 配置生效（只追加不覆盖缺省集合）
 * 外加纯函数单测（matchLivingDocRefs 三形态匹配 + 前导斜杠防误吃）与
 * resolveLivingDocs 配置解析、printQuickAuditReview 渲染。
 *
 * fixture 模式沿用 audit-quick-completion.test.mjs：tmp git 仓 + quicklog 目录
 * （避免 quicklog 检查升级 warning）+ 活文档/源码先 commit 再改（changedFiles 干净归因）。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { auditQuickCompletion } from '../src/run.js'
import { matchLivingDocRefs, resolveLivingDocs, DEFAULT_LIVING_DOC } from '../src/run/shared.js'
import { printQuickAuditReview } from '../src/run/quick-audit.js'

const DEFAULT_DOC = 'docs/sillyspec/platform-interface-map.md'
const tmpRoots = []

/** tmp git 仓 fixture：quicklog 目录（非空）+ gitignore .sillyspec/，参数 extra 为 { relPath: content } 先 commit 的文件。 */
function makeRepo(extra = {}) {
  const d = mkdtempSync(join(tmpdir(), 'living-drift-'))
  tmpRoots.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  mkdirSync(join(d, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'quicklog', 'test.md'), '# task\n')
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  for (const [rel, content] of Object.entries(extra)) {
    const abs = join(d, ...rel.split('/'))
    mkdirSync(join(d, ...rel.split('/').slice(0, -1)), { recursive: true })
    writeFileSync(abs, content)
  }
  if (Object.keys(extra).length > 0) {
    execSync('git add .', { cwd: d, stdio: 'pipe' })
    execSync('git commit -q -m fixture', { cwd: d, stdio: 'pipe' })
  } else {
    writeFileSync(join(d, 'README.md'), 'init\n')
    execSync('git add .', { cwd: d, stdio: 'pipe' })
    execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  }
  return d
}

const baseGuard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: [] }

/** 挖 console.warn/error 输出（printQuickAuditReview 三态分支都可能走 warn/error）。 */
function capturePrint(fn) {
  const lines = []
  const origWarn = console.warn, origErr = console.error
  console.warn = (...a) => lines.push(a.join(' '))
  console.error = (...a) => lines.push(a.join(' '))
  try { fn() } finally { console.warn = origWarn; console.error = origErr }
  return lines.join('\n')
}

describe('matchLivingDocRefs（纯函数：三形态匹配）', () => {
  const refs = (files) => files.map((f) => ({ ref: `${f}:1`, file: f, start: 1, end: 1, docLine: 1 }))
  it('①仓库根相对精确匹配（src/a.js）', () => {
    assert.deepEqual(matchLivingDocRefs(['src/a.js'], refs(['src/a.js'])), ['src/a.js'])
  })
  it('②src 内部相对（ref=run/b.js 命中 changed=src/run/b.js）', () => {
    assert.deepEqual(matchLivingDocRefs(['src/run/b.js'], refs(['run/b.js'])), ['src/run/b.js'])
  })
  it('③裸名/中缀后缀（ref=b.js 命中 src/run/b.js；前导斜杠防 aa.js 误吃 a.js）', () => {
    assert.deepEqual(matchLivingDocRefs(['src/run/b.js'], refs(['b.js'])), ['src/run/b.js'])
    assert.deepEqual(matchLivingDocRefs(['src/aaa.js'], refs(['a.js'])), [], 'aaa.js 不被 a.js 引用误判')
  })
  it('无交集 / 空输入 → 空数组', () => {
    assert.deepEqual(matchLivingDocRefs(['src/x.js'], refs(['src/a.js'])), [])
    assert.deepEqual(matchLivingDocRefs([], refs(['src/a.js'])), [])
    assert.deepEqual(matchLivingDocRefs(['src/a.js'], []), [])
  })
})

describe('resolveLivingDocs（local.yaml living-docs 解析）', () => {
  it('无 local.yaml → 仅缺省集合', async () => {
    const d = makeRepo()
    assert.deepEqual(await resolveLivingDocs(d), [DEFAULT_LIVING_DOC])
  })
  it('living-docs 配置 → 追加不覆盖缺省（缺省排首位）', async () => {
    const d = makeRepo()
    writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'docs-check:\n  living-docs:\n    - docs/my-map.md\n')
    assert.deepEqual(await resolveLivingDocs(d), [DEFAULT_LIVING_DOC, 'docs/my-map.md'])
  })
  it('坏 YAML / 非数组 → 降级仅缺省不抛', async () => {
    const d1 = makeRepo()
    writeFileSync(join(d1, '.sillyspec', 'local.yaml'), '{{{broken\n')
    assert.deepEqual(await resolveLivingDocs(d1), [DEFAULT_LIVING_DOC])
    const d2 = makeRepo()
    writeFileSync(join(d2, '.sillyspec', 'local.yaml'), 'docs-check:\n  living-docs: not-a-list\n')
    assert.deepEqual(await resolveLivingDocs(d2), [DEFAULT_LIVING_DOC])
  })
})

describe('auditQuickCompletion 活文档漂移（集成）', () => {
  it('changedFiles 含被活文档引用的 src 文件 → livingDocDrift 命中（advisory 不阻断）', async () => {
    const d = makeRepo({
      'src/a.js': 'export const alpha = 1\n',
      'src/other.js': 'export const omega = 2\n',
      [DEFAULT_DOC]: `# 接口映射\n\n- 主入口定义见 \`src/a.js:1\`（\`alpha\`）\n- 另见 src/other.js:1\n`,
    })
    writeFileSync(join(d, 'src', 'a.js'), 'export const alpha = 2\n') // 改 tracked 文件 → changedFiles=['src/a.js']
    const r = await auditQuickCompletion(d, baseGuard, {})
    assert.ok(r.docsCheckHint?.livingDocDrift, `livingDocDrift 命中（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.deepEqual(r.docsCheckHint.livingDocDrift.files, ['src/a.js'])
    assert.deepEqual(r.docsCheckHint.livingDocDrift.docs, [DEFAULT_DOC])
    assert.equal(r.docsCheckHint.livingDocDrift.total, 1, 'total = 本次 src/ 改动文件数')
    assert.ok(r.reasons.some((x) => x.includes('活文档引用漂移')), `reasons 记录漂移提示`)
    assert.equal(r.status, 'safe', '纯 advisory 不改 status（实际 ' + r.status + '）')
  })

  it('changedFiles 不含被引用文件 → 无 livingDocDrift（不误报）', async () => {
    const d = makeRepo({
      'src/a.js': 'export const alpha = 1\n',
      [DEFAULT_DOC]: `# 接口映射\n\n- 主入口定义见 \`src/other.js:1\`（\`omega\`）\n`,
    })
    writeFileSync(join(d, 'src', 'a.js'), 'export const alpha = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    assert.equal(r.status, 'safe', 'src/a.js 非危险文件')
    assert.ok(!r.docsCheckHint?.livingDocDrift, `无交集不误报（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.ok(!r.reasons.some((x) => x.includes('活文档引用漂移')), 'reasons 无漂移条目')
  })

  it('活文档缺失 → 静默跳过（不误报不阻断）', async () => {
    const d = makeRepo({ 'src/a.js': 'export const alpha = 1\n' }) // 无 docs/sillyspec/ 目录
    writeFileSync(join(d, 'src', 'a.js'), 'export const alpha = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    assert.equal(r.status, 'safe')
    assert.ok(!r.docsCheckHint?.livingDocDrift, `缺省活文档不在盘 → 静默跳过（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.ok(!r.reasons.some((x) => x.includes('活文档引用漂移')))
  })

  it('local.yaml living-docs 配置生效（自定义文档命中 + 缺省并存追加）', async () => {
    const d = makeRepo({
      'src/b.js': 'export const beta = 1\n',
      'src/c.js': 'export const gamma = 1\n',
      'docs/my-map.md': `# 自定义映射\n\n- 见 \`src/b.js:1\`（\`beta\`）\n`,
      [DEFAULT_DOC]: `# 接口映射\n\n- 见 \`src/c.js:1\`（\`gamma\`）\n`,
    })
    writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'docs-check:\n  living-docs:\n    - docs/my-map.md\n')
    writeFileSync(join(d, 'src', 'b.js'), 'export const beta = 2\n')
    writeFileSync(join(d, 'src', 'c.js'), 'export const gamma = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    const drift = r.docsCheckHint?.livingDocDrift
    assert.ok(drift, `配置文档命中（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.deepEqual([...drift.files].sort(), ['src/b.js', 'src/c.js'], '两个活文档各自命中的文件并集')
    assert.deepEqual([...drift.docs].sort(), ['docs/my-map.md', DEFAULT_DOC], '缺省 + 配置文档并存（追加不覆盖）')
    assert.equal(drift.total, 2)
  })

  it('src 内部相对引用形态（ref=run/x.js 命中 changed=src/run/x.js）也命中', async () => {
    const d = makeRepo({
      'src/run/x.js': 'export const x = 1\n',
      'docs/plain-map.md': `# 映射\n\n- 见 \`run/x.js:1\`（\`x\`，src 内部相对形态）\n`,
    })
    writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'docs-check:\n  living-docs:\n    - docs/plain-map.md\n')
    writeFileSync(join(d, 'src', 'run', 'x.js'), 'export const x = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    // src/run/ 是危险前缀 → blocked 属既有语义；漂移提示仍应照常给出（advisory 独立于 status 三态）
    assert.deepEqual(r.docsCheckHint?.livingDocDrift?.files, ['src/run/x.js'], 'src 内部相对形态命中')
    assert.equal(r.status, 'blocked', '危险前缀照拦——漂移提示不改变阻断语义')
  })
})

describe('printQuickAuditReview 活文档漂移渲染', () => {
  it('livingDocDrift → warn 含提示行 + 文件清单', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'safe', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
      docsCheckHint: { livingDocDrift: { files: ['src/a.js'], docs: [DEFAULT_DOC], total: 3 } },
    }))
    assert.ok(out.includes('活文档引用漂移'), `含漂移提示行（实际 ${JSON.stringify(out)}）`)
    assert.ok(out.includes('1/3'), `X/Y 计数（命中/本次 src 改动总数）`)
    assert.ok(out.includes('docs check'), `含修复指引`)
    assert.ok(out.includes('src/a.js'), `含文件清单`)
  })
  it('无 livingDocDrift → 不打漂移行（回归：不误报）', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'safe', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
    }))
    assert.ok(!out.includes('活文档引用漂移'))
  })
  it('漂移提示与失效引用提示并存时互不覆盖（docsCheckHint 合并保留 invalid）', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'warning', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
      docsCheckHint: { invalid: 2, total: 5, livingDocDrift: { files: ['src/a.js'], docs: [DEFAULT_DOC], total: 3 } },
    }))
    assert.ok(out.includes('文档引用失效'), '失效引用提示保留')
    assert.ok(out.includes('活文档引用漂移'), '漂移提示并存')
  })
})

// node:test 直跑模式收尾：清理 tmp 仓（run-tests.mjs 以 execFile 跑本文件，此钩子必经）
import { after } from 'node:test'
after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
