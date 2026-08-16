/**
 * docs-check 单测（change: 2026-08-15-docs-check-productize，task-04，FR-006）
 *
 * 覆盖：引用提取（全文扫描）、行号边界、候选解析三段回退、glob walker
 * （递归形态/skip 排除/字面路径/复杂形态报错）、runDocsCheck 集成（含 exit code 语义
 * 对应的 ok/invalid 结构、keywordAssert=false 行为）。fixture 全 tmp 不污染仓库。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  collectDocRefs, looksLikeCodeSymbol, validateRefLines, extractExpectedTokensFromLine,
  resolveCandidates, walkGlob, runDocsCheck, readDocsCheckConfig, DocsCheckConfigError,
} from '../src/docs-check.js'

let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'docscheck-'))
  // 源码树 fixture：src/a.js（8 行）、src/run/b.js、src/sub/c.mjs
  mkdirSync(join(root, 'src', 'run'), { recursive: true })
  mkdirSync(join(root, 'src', 'sub'), { recursive: true })
  writeFileSync(join(root, 'src', 'a.js'), 'export const alphaSymbol = 1\n// l2\n// l3\n// l4\n// l5\n// l6\n// l7\n// l8\n')
  writeFileSync(join(root, 'src', 'run', 'b.js'), 'export const betaSymbol = 2\n')
  writeFileSync(join(root, 'src', 'sub', 'c.mjs'), 'export const gammaSymbol = 3\n')
  // 文档树 fixture
  mkdirSync(join(root, 'docs', 'deep'), { recursive: true })
})
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

describe('collectDocRefs（全文扫描）', () => {
  it('提取 file.js:line 与 file.js:start-end，反引号与裸文本均命中', () => {
    const md = '见 `src/a.js:3` 与裸文本 b.js:2-5 结尾'
    const refs = collectDocRefs(md)
    assert.equal(refs.length, 2)
    assert.deepEqual(refs[0], { ref: 'src/a.js:3', file: 'src/a.js', start: 3, end: 3, docLine: 1 })
    assert.deepEqual(refs[1].file, 'b.js')
    assert.equal(refs[1].start, 2)
    assert.equal(refs[1].end, 5)
  })

  it('docLine 按 1-based 行号计算（CRLF 容错）', () => {
    const md = '第一行\r\n第二行 a.js:1\r\n'
    const refs = collectDocRefs(md)
    assert.equal(refs[0].docLine, 2)
  })

  it('空输入/无引用 → 空数组', () => {
    assert.deepEqual(collectDocRefs(''), [])
    assert.deepEqual(collectDocRefs(null), [])
    assert.deepEqual(collectDocRefs('无引用内容'), [])
  })
})

describe('looksLikeCodeSymbol', () => {
  it('代码符号 true / 纯小写自然语言 false', () => {
    assert.equal(looksLikeCodeSymbol('runDocsCheck'), true)
    assert.equal(looksLikeCodeSymbol('run_docs'), true)
    assert.equal(looksLikeCodeSymbol('local'), false, '纯小写不触发断言')
    assert.equal(looksLikeCodeSymbol('中文'), false)
    assert.equal(looksLikeCodeSymbol('a-b'), false, '连字符不是符号形态')
  })
})

describe('validateRefLines（行号边界）', () => {
  it('边界内 ok：start=1 / end=总行数', () => {
    assert.equal(validateRefLines(8, 1, 1).ok, true)
    assert.equal(validateRefLines(8, 8, 8).ok, true)
    assert.equal(validateRefLines(8, 2, 5).ok, true)
  })
  it('超界 / end<start → reasons', () => {
    assert.equal(validateRefLines(8, 9, 9).ok, false)
    assert.equal(validateRefLines(8, 5, 2).ok, false, 'end < start 非法')
    assert.equal(validateRefLines(8, 1, 9).ok, false, 'end 超界')
    assert.equal(validateRefLines(8, 0, 1).ok, false, 'start < 1')
  })
})

describe('extractExpectedTokensFromLine', () => {
  it('剥函数括号 + 点分拆段 + 滤纯小写', () => {
    const tokens = extractExpectedTokensFromLine('调用 `getDispatchMode()` 与 `syncMod.checkApproval`，看 local')
    assert.ok(tokens.includes('getDispatchMode'))
    assert.ok(tokens.includes('syncMod') || tokens.includes('checkApproval'), '点分拆段至少一段在')
    assert.ok(!tokens.includes('local'), '纯小写不进 token')
  })
  it('无反引号 → 空数组（纯位置引用跳过层2）', () => {
    assert.deepEqual(extractExpectedTokensFromLine('见 src/a.js:3'), [])
  })
})

describe('resolveCandidates（三段回退）', () => {
  it('①仓库根相对直拼', () => {
    const c = resolveCandidates(root, 'src/a.js')
    assert.equal(c.length, 1)
    assert.ok(c[0].replace(/\\/g, '/').endsWith('src/a.js'))
  })
  it('②src/ 内部相对重试（dispatch/probe.js 形态）', () => {
    const c = resolveCandidates(root, 'run/b.js')
    assert.equal(c.length, 1)
    assert.ok(c[0].replace(/\\/g, '/').endsWith('src/run/b.js'))
  })
  it('③裸文件名 src/ 全树递归（多候选）', () => {
    writeFileSync(join(root, 'src', 'dup.js'), 'x\n')
    writeFileSync(join(root, 'src', 'run', 'dup.js'), 'y\n')
    const c = resolveCandidates(root, 'dup.js')
    assert.equal(c.length, 2, 'src 树内两个同名文件都返回')
  })
  it('不存在 → 空数组', () => {
    assert.deepEqual(resolveCandidates(root, 'nope/nothere.js'), [])
  })
})

describe('walkGlob（三形态 + skip）', () => {
  beforeEach(() => {
    writeFileSync(join(root, 'docs', 'top.md'), 'x\n')
    writeFileSync(join(root, 'docs', 'deep', 'inner.md'), 'x\n')
    writeFileSync(join(root, 'docs', 'deep', 'note.txt'), 'x\n')
    mkdirSync(join(root, 'docs', 'skipme'), { recursive: true })
    writeFileSync(join(root, 'docs', 'skipme', 's.md'), 'x\n')
  })
  it('递归形态：docs/**/*.md 命中多层且带 baseDir 前缀', () => {
    const files = walkGlob(root, 'docs/**/*.md')
    assert.ok(files.includes('docs/top.md'), `含顶层，实际 ${JSON.stringify(files)}`)
    assert.ok(files.includes('docs/deep/inner.md'), '含深层')
    assert.ok(!files.some(f => f.endsWith('.txt')), '非 md 不命中')
  })
  it('skip 排除目录前缀', () => {
    const files = walkGlob(root, 'docs/**/*.md', ['docs/skipme'])
    assert.ok(!files.some(f => f.startsWith('docs/skipme')))
    assert.ok(files.includes('docs/top.md'))
  })
  it('单层形态：docs/*.md 只命中顶层', () => {
    const files = walkGlob(root, 'docs/*.md')
    assert.deepEqual(files, ['docs/top.md'])
  })
  it('字面路径直传', () => {
    assert.deepEqual(walkGlob(root, 'docs/top.md'), ['docs/top.md'])
    assert.deepEqual(walkGlob(root, 'docs/none.md'), [])
  })
  it('复杂形态 → DocsCheckConfigError（CLI exit 2 依据）', () => {
    assert.throws(() => walkGlob(root, 'docs/**/*.{md,txt}'), DocsCheckConfigError)
    assert.throws(() => walkGlob(root, 'docs/?.md'), DocsCheckConfigError)
  })
})

describe('runDocsCheck（集成）', () => {
  it('合法引用全过（含关键词断言窗口命中）', () => {
    writeFileSync(join(root, 'docs', 'ok.md'), '见 `src/a.js:1`（`alphaSymbol` 定义处）\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/ok.md'] })
    assert.equal(r.ok, true, JSON.stringify(r.invalid))
    assert.equal(r.total, 1)
    assert.equal(r.kwChecked, 1)
  })

  it('paths 传 null（无 local.yaml 的 CLI 回退路径）→ 落回缺省 glob 不崩', () => {
    // 回归：readDocsCheckConfig 无配置回退 { paths: null }，index.js 传 null 曾致
    // null.flatMap TypeError（CLI 裸跑必崩）——null/空数组都必须落回缺省范围。
    writeFileSync(join(root, 'docs', 'ok.md'), '见 `src/a.js:1`（`alphaSymbol` 定义处）\n')
    for (const paths of [null, [], undefined]) {
      const r = runDocsCheck({ projectRoot: root, paths })
      assert.equal(r.ok, true, `paths=${JSON.stringify(paths)}: ${JSON.stringify(r.invalid)}`)
      assert.equal(r.total, 1)
    }
  })

  it('缺省范围含 .sillyspec/docs（scan/modules 产物纳入；2026-08-16 用户裁决）', () => {
    // 回归：缺省 paths 曾只有 docs/**/*.md，.sillyspec/docs 游离在外须显式 opt-in 才扫。
    mkdirSync(join(root, '.sillyspec', 'docs'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'docs', 'mod.md'), '见 `src/a.js:1`（`alphaSymbol`）\n')
    writeFileSync(join(root, '.sillyspec', 'docs', 'bad.md'), '见 `src/a.js:99`（超界）\n')
    const r = runDocsCheck({ projectRoot: root })
    assert.equal(r.total, 2, 'docs/ 之外 .sillyspec/docs/ 下的文档也被扫到')
    assert.equal(r.ok, false, '其中的超界引用必须暴露')
    assert.ok(r.invalid.some((i) => i.doc === '.sillyspec/docs/bad.md'))
    // 显式 paths 覆盖时按覆盖值（可收窄回 docs/）
    const narrowed = runDocsCheck({ projectRoot: root, paths: ['docs/**/*.md'] })
    assert.equal(narrowed.total, 0, '显式收窄不扫 .sillyspec/docs')
  })

  it('失效引用带建议行号（suggest = token 在候选文件命中行）', () => {
    // a.js:6 处 L4-L11 窗口无 alphaSymbol token（在 L1）→ 失效；suggest 应含 L1
    writeFileSync(join(root, 'docs', 'sg.md'), '见 `src/a.js:6`（`alphaSymbol` 声明处）\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/sg.md'] })
    assert.equal(r.ok, false)
    const inv = r.invalid[0]
    assert.ok(Array.isArray(inv.suggest), 'suggest 字段存在且为数组')
    assert.ok(inv.suggest.includes(1), `建议行号含 token 真实行 L1（实际 ${JSON.stringify(inv.suggest)}）`)
    assert.ok(inv.suggest.every((n) => Number.isInteger(n) && n >= 1), '建议行号全为正整数')
  })

  it('token 不在候选文件（符号在别处/已删）→ suggest 空数组不硬猜', () => {
    writeFileSync(join(root, 'docs', 'ghost.md'), '见 `src/a.js:6`（`gammaSymbol` 声明处）\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/ghost.md'] })
    assert.equal(r.ok, false)
    assert.deepEqual(r.invalid[0].suggest, [], 'token 在 a.js 无命中 → suggest=[]')
  })

  it('无 token 的失效引用 suggest 为空数组（无符号线索不硬猜）', () => {
    writeFileSync(join(root, 'docs', 'over.md'), '见 src/run/b.js:99\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/over.md'] })
    assert.equal(r.ok, false)
    assert.deepEqual(r.invalid[0].suggest, [], '纯行号超界无 token → suggest=[]')
  })

  it('文件不存在 → invalid（exit 1 语义）', () => {
    writeFileSync(join(root, 'docs', 'bad.md'), '见 src/ghost.js:1\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/bad.md'] })
    assert.equal(r.ok, false)
    assert.ok(r.invalid[0].reason.includes('文件不存在'))
  })

  it('行号超界 → invalid', () => {
    writeFileSync(join(root, 'docs', 'over.md'), '见 src/run/b.js:99\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/over.md'] })
    assert.equal(r.ok, false)
    assert.ok(r.invalid[0].reason.includes('超界'))
  })

  it('关键词漂移（行号对但 token 不在窗口）→ invalid（FR-002 核心）', () => {
    // a.js:6 处 L4-L11 窗口内无 gammaSymbol token
    writeFileSync(join(root, 'docs', 'drift.md'), '见 `src/a.js:6`（`gammaSymbol` 声明处）\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/drift.md'] })
    assert.equal(r.ok, false)
    assert.ok(r.invalid[0].reason.includes('关键词缺失'))
  })

  it('keywordAssert=false → 只做存在性（关键词漂移放行 + warning）', () => {
    writeFileSync(join(root, 'docs', 'drift2.md'), '见 `src/a.js:6`（`gammaSymbol` 声明处）\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/drift2.md'], keywordAssert: false })
    assert.equal(r.ok, true)
    assert.equal(r.kwChecked, 0)
    assert.ok(r.warnings.some(w => w.includes('关键词断言已关闭')))
  })

  it('多候选宽容：任一候选全过即通过', () => {
    // dup.js 两候选：src/dup.js 第一行即 targetSymbol；src/run/dup.js 没有
    writeFileSync(join(root, 'src', 'dup.js'), 'const targetSymbol = 1\n')
    writeFileSync(join(root, 'src', 'run', 'dup.js'), 'const other = 2\n')
    writeFileSync(join(root, 'docs', 'multi.md'), '见 dup.js:1（`targetSymbol`）\n')
    const r = runDocsCheck({ projectRoot: root, docs: ['docs/multi.md'] })
    assert.equal(r.ok, true, JSON.stringify(r.invalid))
  })

  it('glob 形态错误 → throw DocsCheckConfigError（CLI 转 exit 2）', () => {
    assert.throws(() => runDocsCheck({ projectRoot: root, paths: ['docs/**/*.{md,txt}'] }), DocsCheckConfigError)
  })
})

describe('readDocsCheckConfig（local.yaml 读取，execute 审查修复 #3）', () => {
  it('无 local.yaml → 全缺省', () => {
    const c = readDocsCheckConfig(root)
    assert.equal(c.paths, null)
    assert.deepEqual(c.skip, [])
    assert.equal(c.keywordAssert, true)
  })
  it('有 docs-check 段 → 读出 paths/skip/keywordAssert', () => {
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'local.yaml'), 'docs-check:\n  paths:\n    - docs/api/*.md\n  skip:\n    - docs/old\n  keywordAssert: false\n')
    const c = readDocsCheckConfig(root)
    assert.deepEqual(c.paths, ['docs/api/*.md'])
    assert.deepEqual(c.skip, ['docs/old'])
    assert.equal(c.keywordAssert, false)
  })
  it('坏 YAML / 无段 → 降级缺省不抛', () => {
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'local.yaml'), '{{{broken\n')
    const c = readDocsCheckConfig(root)
    assert.equal(c.paths, null)
  })
})
