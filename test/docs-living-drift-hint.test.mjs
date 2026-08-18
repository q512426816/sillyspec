/**
 * task-03（2026-08-16-state-split-fixes）: docsCheckHint 扩展活文档漂移提示测试。
 * 2026-08-18 精度对齐改写：漂移提示升级为 runDocsCheck 分层真校验（存在 + 行界 + 关键词窗口），
 * 只报「真失效且指向本次改动 src 文件」的引用——被引用但行号锚未断 → 零输出（与 docs check 结论同源）。
 *
 * 覆盖：
 *   1. 被活文档引用且引用真失效（行号超界 / 关键词缺失）→ livingDocDrift 命中（files/docs/total/invalid）
 *   2. 被引用但校验全过 → 无 livingDocDrift（精度修复核心：不误报）
 *   3. changedFiles 不含被引用文件 → 无 livingDocDrift
 *   4. 活文档缺失 → 静默跳过（不误报不阻断）
 *   5. local.yaml docs-check.living-docs 配置生效（只追加不覆盖缺省集合）
 * 纯函数单测（matchLivingDocRefs 三形态 + matchInvalidRefsToChanged 行号剥离与匹配）与
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
import { matchLivingDocRefs, matchInvalidRefsToChanged, resolveLivingDocs, DEFAULT_LIVING_DOC } from '../src/run/shared.js'
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

describe('matchLivingDocRefs（纯函数：三形态匹配，预过滤用）', () => {
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

describe('matchInvalidRefsToChanged（纯函数：invalid 引用剥行号后匹配改动文件）', () => {
  const invalid = [
    { ref: 'src/a.js:99', doc: 'd.md', docLine: 3, reason: '行号超界' },
    { ref: 'run/b.js:5-8', doc: 'd.md', docLine: 4, reason: '关键词缺失' },
    { ref: 'c.js:2', doc: 'd.md', docLine: 5, reason: 'x' },
    { ref: '', doc: 'd.md', docLine: 0, reason: '文档不存在' }, // 文档不存在条目（ref 空串）不匹配
  ]
  it('三形态匹配 + 行号段剥离（范围 end 也剥净）', () => {
    const out = matchInvalidRefsToChanged(invalid, ['src/a.js', 'src/run/b.js', 'src/x/c.js'])
    assert.deepEqual(out.map((x) => x.changed), ['src/a.js', 'src/run/b.js', 'src/x/c.js'])
    assert.equal(out[0].ref, 'src/a.js:99')
    assert.equal(out[1].ref, 'run/b.js:5-8')
    assert.ok(!out.some((x) => x.ref === ''), 'ref 空串条目被跳过')
  })
  it('无交集 / 空输入 → 空数组', () => {
    assert.deepEqual(matchInvalidRefsToChanged(invalid, ['src/zz.js']), [])
    assert.deepEqual(matchInvalidRefsToChanged([], ['src/a.js']), [])
    assert.deepEqual(matchInvalidRefsToChanged(null, ['src/a.js']), [])
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

describe('auditQuickCompletion 活文档漂移（集成，2026-08-18 精度对齐）', () => {
  it('被引用且引用真失效（行号超界）→ livingDocDrift 命中含 invalid（advisory 不阻断）', async () => {
    const d = makeRepo({
      'src/a.js': 'export const alpha = 1\n',
      'src/other.js': 'export const omega = 2\n',
      [DEFAULT_DOC]: `# 接口映射\n\n- 主入口定义见 \`src/a.js:99\`（\`alpha\`）\n- 另见 src/other.js:1\n`,
    })
    writeFileSync(join(d, 'src', 'a.js'), 'export const alpha = 2\n') // 改 tracked 文件 → changedFiles=['src/a.js']
    const r = await auditQuickCompletion(d, baseGuard, {})
    assert.ok(r.docsCheckHint?.livingDocDrift, `livingDocDrift 命中（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.deepEqual(r.docsCheckHint.livingDocDrift.files, ['src/a.js'])
    assert.deepEqual(r.docsCheckHint.livingDocDrift.docs, [DEFAULT_DOC])
    assert.equal(r.docsCheckHint.livingDocDrift.total, 1, 'total = 本次 src/ 改动文件数')
    const inv = r.docsCheckHint.livingDocDrift.invalid
    assert.equal(inv.length, 1, 'invalid 恰含 1 处真失效（超界引用）')
    assert.ok(inv[0].ref.includes('src/a.js:99'), 'invalid ref 指向超界引用')
    assert.ok(inv[0].reason.includes('超界'), `reason 含超界说明（实际 ${inv[0].reason}）`)
    assert.ok(r.reasons.some((x) => x.includes('活文档引用真失效')), `reasons 记录真失效提示`)
    assert.equal(r.status, 'safe', '纯 advisory 不改 status（实际 ' + r.status + '）')
  })

  it('被引用但校验全过（行号锚未断）→ 无 livingDocDrift（精度修复核心：不误报）', async () => {
    const d = makeRepo({
      'src/a.js': 'export const alpha = 1\n',
      [DEFAULT_DOC]: `# 接口映射\n\n- 主入口定义见 \`src/a.js:1\`（\`alpha\`）\n`,
    })
    writeFileSync(join(d, 'src', 'a.js'), 'export const alpha = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    assert.equal(r.status, 'safe')
    assert.ok(!r.docsCheckHint?.livingDocDrift, `引用有效 → 零输出（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.ok(!r.reasons.some((x) => x.includes('活文档引用真失效')), 'reasons 无真失效条目')
  })

  it('关键词窗口失败（行号在界但 token 不在窗口）→ invalid 命中且 reason 含关键词缺失', async () => {
    const d = makeRepo({
      'src/a.js': 'export const beta = 1\n', // 文件窗口内没有 betaValue token
      [DEFAULT_DOC]: `# 接口映射\n\n- 主入口定义见 \`src/a.js:1\`（\`betaValue\`）\n`,
    })
    writeFileSync(join(d, 'src', 'a.js'), 'export const beta = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    const inv = r.docsCheckHint?.livingDocDrift?.invalid
    assert.ok(Array.isArray(inv) && inv.length === 1, `关键词断言失败命中（实际 ${JSON.stringify(inv)}）`)
    assert.ok(inv[0].reason.includes('关键词缺失'), `reason 含关键词缺失（实际 ${inv[0].reason}）`)
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
    assert.ok(!r.reasons.some((x) => x.includes('活文档引用真失效')), 'reasons 无真失效条目')
  })

  it('活文档缺失 → 静默跳过（不误报不阻断）', async () => {
    const d = makeRepo({ 'src/a.js': 'export const alpha = 1\n' }) // 无 docs/sillyspec/ 目录
    writeFileSync(join(d, 'src', 'a.js'), 'export const alpha = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    assert.equal(r.status, 'safe')
    assert.ok(!r.docsCheckHint?.livingDocDrift, `缺省活文档不在盘 → 静默跳过（实际 ${JSON.stringify(r.docsCheckHint)}）`)
    assert.ok(!r.reasons.some((x) => x.includes('活文档引用真失效')))
  })

  it('local.yaml living-docs 配置生效（双文档各自真失效 → invalid 并集）', async () => {
    const d = makeRepo({
      'src/b.js': 'export const beta = 1\n',
      'src/c.js': 'export const gamma = 1\n',
      'docs/my-map.md': `# 自定义映射\n\n- 见 \`src/b.js:99\`（\`beta\`）\n`,
      [DEFAULT_DOC]: `# 接口映射\n\n- 见 \`src/c.js:99\`（\`gamma\`）\n`,
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
    assert.equal(drift.invalid.length, 2, '两处超界引用各入 invalid')
  })

  it('src 内部相对引用形态（ref=run/x.js 命中 changed=src/run/x.js）真失效也命中', async () => {
    const d = makeRepo({
      'src/run/x.js': 'export const x = 1\n',
      'docs/plain-map.md': `# 映射\n\n- 见 \`run/x.js:99\`（\`x\`，src 内部相对形态）\n`,
    })
    writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'docs-check:\n  living-docs:\n    - docs/plain-map.md\n')
    writeFileSync(join(d, 'src', 'run', 'x.js'), 'export const x = 2\n')
    const r = await auditQuickCompletion(d, baseGuard, {})
    // src/run/ 是危险前缀 → blocked 属既有语义；真失效提示仍应照常给出（advisory 独立于 status 三态）
    assert.deepEqual(r.docsCheckHint?.livingDocDrift?.files, ['src/run/x.js'], 'src 内部相对形态命中')
    assert.ok(r.docsCheckHint?.livingDocDrift?.invalid?.some((x) => x.ref === 'run/x.js:99'), '剥行号后按 src 内部相对匹配')
    assert.equal(r.status, 'blocked', '危险前缀照拦——真失效提示不改变阻断语义')
  })
})

describe('printQuickAuditReview 活文档漂移渲染（精度对齐）', () => {
  const driftInvalid = { files: ['src/a.js'], docs: [DEFAULT_DOC], total: 3, invalid: [
    { changed: 'src/a.js', doc: DEFAULT_DOC, docLine: 5, ref: 'src/a.js:99', reason: '行号超界（start=99 > 总行数 1）' },
  ] }
  it('livingDocDrift 含 invalid → warn 列出真失效引用（doc:line + ref + reason）', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'safe', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
      docsCheckHint: { livingDocDrift: driftInvalid },
    }))
    assert.ok(out.includes('活文档引用真失效'), `含真失效提示行（实际 ${JSON.stringify(out)}）`)
    assert.ok(out.includes('src/a.js:99'), `含失效 ref`)
    assert.ok(out.includes('行号超界'), `含失效原因`)
    assert.ok(out.includes('docs check'), `含修复指引`)
  })
  it('livingDocDrift 无 invalid（旧形态/全过）→ 不打漂移行（零噪声回归）', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'safe', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
      docsCheckHint: { livingDocDrift: { files: ['src/a.js'], docs: [DEFAULT_DOC], total: 3 } },
    }))
    assert.ok(!out.includes('活文档引用真失效'), '无 invalid → 零输出')
    assert.ok(!out.includes('活文档引用漂移'), '旧口径「被引用即提示」文案不再出现')
  })
  it('无 livingDocDrift → 不打漂移行（回归：不误报）', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'safe', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
    }))
    assert.ok(!out.includes('活文档引用真失效'))
  })
  it('真失效提示与失效引用提示并存时互不覆盖（docsCheckHint 合并保留 invalid）', () => {
    const out = capturePrint(() => printQuickAuditReview({
      status: 'warning', reasons: [], changedFiles: ['src/a.js'], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
      docsCheckHint: { invalid: 2, total: 5, livingDocDrift: driftInvalid },
    }))
    assert.ok(out.includes('文档引用失效'), '失效引用提示保留')
    assert.ok(out.includes('活文档引用真失效'), '真失效提示并存')
  })
})

// node:test 直跑模式收尾：清理 tmp 仓（run-tests.mjs 以 execFile 跑本文件，此钩子必经）
import { after } from 'node:test'
after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
