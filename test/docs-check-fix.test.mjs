/**
 * docs check --fix 六场景 + CLI 对照测试（change: 2026-08-18-platform-map-auto-anchors，task-04）
 *
 * 覆盖（design §5.1/§5.2、§10 R-04/R-05、TaskCard 逐条）：
 *   S1 单命中自动改（FR-01）：修复后行号=token 当前行且文档其余字节逐字节不变
 *   S2 多命中不动（FR-03/D-006）：fix.fixable=false、fix.reason 含候选行号列表、文件不动
 *   S3 零命中报告（FR-02）：分类 needs-manual、文件不动
 *   S4 dry-run 零写盘（FR-05）：--fix --dry-run 组合，内容与 mtime 均不变
 *   S5 CRLF 保持（R-05）：修复后行结束符仍 \r\n
 *   S6 同行多引用（R-04）：同一行两个失效引用都正确替换、前序变长不错位
 *   S7 CLI 无 --fix 输出与改动前（84d498a = task-03 前）逐字节一致（FR-04/D-004）
 *
 * 双层覆盖：S1-S6 单测层（runDocsCheck 拿 invalid[].fix + applyFixes 写回）+ CLI 子进程层
 * （node bin/sillyspec.js --dir <fixture> docs check，exit code/stdout/stderr 实断言，不 mock 内部模块）。
 * S7 用 git archive 84d498a 完整树拼旧 CLI（node_modules junction 复用本 worktree 依赖），同一
 * fixture 新旧各跑一次，stdout/stderr/exit code 三者逐字节相等；限定非 json 模式（inv.fix 增量
 * 字段只在 json 输出可见，human 输出新旧同构）。
 *
 * fixture 语义注意（实现语义推导，防止 fixture 假合法/假歧义）：
 *   - 层2 窗口是 [start-2, end+5]，fixture 失效引用的行号必须让 token 落在窗口外；
 *   - token 集合按「引用所在文档行的全部反引号符号」整行共享（extractExpectedTokensFromLine），
 *     同行两个引用若指向同一源文件则共享同一命中行集合——要两条各自 fixable 必须用两个不同
 *     源文件（各 token 在各自候选文件内唯一命中）。
 * fixture 全 tmp（mkdtempSync）独立互不依赖、可重复跑；Windows 兼容（路径 join、CRLF 显式写）。
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, statSync, symlinkSync, existsSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runDocsCheck, applyFixes } from '../src/docs-check.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(REPO_ROOT, 'bin', 'sillyspec.js')

/** 生成 n 行源码（overrides：{ 行号: 行内容 }，缺省填充注释行） */
function padLines(n, overrides = {}) {
  const out = []
  for (let i = 1; i <= n; i++) out.push(overrides[i] !== undefined ? overrides[i] : `// filler-${i}`)
  return out
}

/**
 * 建 tmp fixture：写 { 相对路径: 内容 } 映射（父目录自动创建）。
 * 纯 fs 不 git init——CLI 实证带 --dir 显式路径在非 git 目录直达 docs check
 * （docs check 分支不经 resolveEffectiveDir，无 git 噪声）。
 */
function makeFixture(files) {
  const d = mkdtempSync(join(tmpdir(), 'dcfix-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(d, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return d
}

/**
 * CLI 子进程跑 docs check。spawnSync 分开收 stdout/stderr（失效详情走 stderr、全绿行走 stdout），
 * timeout 30000 治卡死。
 * @returns {{ code: number, stdout: string, stderr: string }}
 */
function runDocsCli(projectDir, args) {
  const r = spawnSync('node', [BIN, '--dir', projectDir, 'docs', 'check', ...args], {
    encoding: 'utf8', timeout: 30000, cwd: projectDir,
  })
  if (r.error) throw r.error
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' }
}

/** 单测层修复链路（与 CLI --fix 构造同构）：runDocsCheck → fixable 条目构造 fixes → applyFixes */
function runFixLayer(projectRoot, docRel) {
  const result = runDocsCheck({ projectRoot, docs: [docRel] })
  const fixes = []
  for (const inv of result.invalid) {
    if (inv.fix && inv.fix.fixable === true && Number.isInteger(inv.fix.newLine)) {
      const newRef = inv.ref.replace(/(\d+)(?:-\d+)?$/, String(inv.fix.newLine))
      fixes.push({ doc: inv.doc, docLine: inv.docLine, ref: inv.ref, newRef })
    }
  }
  const fixResult = applyFixes(projectRoot, fixes)
  return { result, fixes, fixResult }
}

describe('S1 单命中自动改（FR-01）', () => {
  /** src/a.js 8 行（alphaSymbol@L1）；doc 引用 :6 关键词漂移——token 全文件唯一命中 L1 */
  function s1Fixture() {
    return makeFixture({
      'src/a.js': padLines(8, { 1: 'export const alphaSymbol = 1' }).join('\n') + '\n',
      'docs/one.md': '见 `src/a.js:6`（`alphaSymbol` 声明处）\n',
    })
  }

  it('单测层：行号改写为 token 当前行，文档其余字节逐字节不变', () => {
    const d = s1Fixture()
    try {
      const docAbs = join(d, 'docs', 'one.md')
      const before = readFileSync(docAbs)
      const { result, fixes, fixResult } = runFixLayer(d, 'docs/one.md')
      assert.equal(result.ok, false, '前置：fixture 引用确为失效')
      assert.equal(fixResult.applied, 1, `单命中恰好应用 1 处（实际 applied=${fixResult.applied}）`)
      assert.deepEqual(fixResult.skipped, [])
      assert.equal(fixes[0].newRef, 'src/a.js:1', 'newRef = 文件名原样 + token 当前行号')
      // 核心契约（FR-01）：修复后行号 = token 当前所在行
      const after = readFileSync(docAbs)
      assert.equal(after.toString('utf8'), '见 `src/a.js:1`（`alphaSymbol` 声明处）\n')
      // 文档其余字节逐字节不变：6→1 等宽定点替换，总字节数不变且唯一差异在原行号数字位
      // （Buffer.indexOf 按字节搜——文档含多字节 UTF-8 中文，字符串 indexOf 的字符位不可比）
      assert.equal(after.length, before.length, '总字节数不变（等宽替换）')
      const diffIdx = [...before].findIndex((b, i) => b !== after[i])
      assert.equal(diffIdx, before.indexOf('6'), '唯一字节差异 = 原行号数字位')
      assert.equal(before[diffIdx], 0x36, "原字节为 '6'")
      assert.equal(after[diffIdx], 0x31, "新字节为 '1'")
      // 修复结果要能过层 2 窗口断言（design §10 R-03 二次拦截语义）
      const recheck = runDocsCheck({ projectRoot: d, docs: ['docs/one.md'] })
      assert.equal(recheck.ok, true, JSON.stringify(recheck.invalid))
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--fix 全修后 exit 0，重锚报告打改写明细', () => {
    const d = s1Fixture()
    try {
      const r = runDocsCli(d, ['--fix', '--paths', 'docs/one.md'])
      assert.equal(r.code, 0, `全部 fixable 修完 exit 0（实际 ${r.code}；stderr=${r.stderr.slice(0, 300)}）`)
      assert.equal(readFileSync(join(d, 'docs', 'one.md'), 'utf8'), '见 `src/a.js:1`（`alphaSymbol` 声明处）\n')
      assert.ok(r.stderr.includes('src/a.js:6 → src/a.js:1'), '明细行含 ref → newRef')
      assert.ok(r.stderr.includes('1 处已改写'), '重锚报告统计已改写 1 处')
      assert.ok(r.stderr.includes('0 处待人工'), '汇总零待人工（头部 ❌ 失效计数行在 --fix 前统计，合法保留）')
      assert.ok(!r.stderr.includes('（待人工）'), '无 needs-manual 条目行（条目行后缀（待人工）只在待修条目出现）')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--json --fix 输出 result.fixReport（stdout 纯 JSON 可解析，constraints）', () => {
    const d = s1Fixture()
    try {
      const r = runDocsCli(d, ['--json', '--fix', '--paths', 'docs/one.md'])
      assert.equal(r.code, 0)
      const parsed = JSON.parse(r.stdout)
      assert.equal(parsed.fixReport.applied, 1)
      assert.equal(parsed.fixReport.skipped, 0)
      assert.equal(parsed.fixReport.dryRun, false)
      assert.equal(parsed.invalid.length, 1, 'invalid 条目保留（fix 分类随条目）')
      assert.equal(parsed.invalid[0].fix.fixable, true)
      assert.equal(parsed.invalid[0].fix.newLine, 1)
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})

describe('S2 多命中：选优自动重锚 / 同分才人工（FR-03，2026-08-21 docs-ref-auto-pick）', () => {
  /**
   * multiSym 在 L1（定义行 export const）/ L5（调用点）两处出现；doc 引用 :7——窗口（行 6-12）
   * 无 token → 失效。多命中打分：L1 定义行模式 +50 → 54 分，L5 仅含 token + 距离近 → 8 分，
   * 严格领先 → 自动选优重锚 L1（实证痛点：一次大改 34 处漂移只有 2 处唯一命中，其余全人工）。
   */
  function s2Fixture() {
    return makeFixture({
      'src/m.js': padLines(8, {
        1: 'export const multiSym = 1',
        5: 'export const aliasSym = multiSym + 1 // multiSym 二次出现',
      }).join('\n') + '\n',
      'docs/multi.md': '见 `src/m.js:7`（`multiSym` 声明处）\n',
    })
  }

  it('单测层：定义行 vs 调用点严格分差 → fixable=true + newLine=1 + reason 可审计', () => {
    const d = s2Fixture()
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/multi.md'] })
      assert.equal(r.ok, false, `前置：fixture 引用确为失效（invalid=${JSON.stringify(r.invalid)}）`)
      const inv = r.invalid[0]
      assert.equal(inv.fix.fixable, true, '定义行严格领先调用点 → 自动选优')
      assert.equal(inv.fix.newLine, 1, '重锚到定义行 L1')
      assert.ok(inv.fix.reason.includes('picked=1'), `reason 附 picked 可审计（实际：${inv.fix.reason}）`)
      assert.ok(inv.fix.reason.includes('runnerUp=5'), 'reason 附 runnerUp')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--fix 自动选优改写 + exit 0', () => {
    const d = s2Fixture()
    try {
      const r = runDocsCli(d, ['--fix', '--paths', 'docs/multi.md'])
      assert.equal(r.code, 0, `自动选优全修 exit 0（实际 ${r.code}；stderr=${r.stderr}）`)
      assert.ok(r.stderr.includes('1 处已改写'), '重锚报告 1 处改写')
      const after = readFileSync(join(d, 'docs', 'multi.md'), 'utf8')
      assert.ok(after.includes('src/m.js:1'), `doc 已重锚到 :1（实际：${after.trim()}）`)
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  /**
   * 真歧义：tieSym 两处纯调用（L1/L13，均无定义行模式），doc 引用 :7（距离 6/6 同分）→
   * 选优无法严格分差 → 仍 needs-manual（保守语义保留的部分）。
   */
  function s2bFixture() {
    return makeFixture({
      'src/m.js': padLines(16, {
        1: 'useA(tieSym)',
        13: 'useB(tieSym)',
      }).join('\n') + '\n',
      'docs/tie.md': '见 `src/m.js:7`（`tieSym` 调用处）\n',
    })
  }

  it('单测层：同分歧义 → fixable=false 且 reason 含候选行号，文档不动', () => {
    const d = s2bFixture()
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/tie.md'] })
      assert.equal(r.ok, false, `前置：fixture 引用确为失效（invalid=${JSON.stringify(r.invalid)}）`)
      const inv = r.invalid[0]
      assert.equal(inv.fix.fixable, false, '同分不自动改（保守默认）')
      assert.ok(!('newLine' in inv.fix), '歧义条目不给 newLine')
      assert.ok(inv.fix.reason.includes('同分'), `reason 分类为同分歧义（实际：${inv.fix.reason}）`)
      assert.ok(inv.fix.reason.includes('1') && inv.fix.reason.includes('13'), `reason 含候选行号 1 与 13（实际：${inv.fix.reason}）`)
      const before = readFileSync(join(d, 'docs', 'tie.md'))
      const { fixResult } = runFixLayer(d, 'docs/tie.md')
      assert.equal(fixResult.applied, 0, '无 fixable 条目零应用')
      assert.ok(Buffer.compare(before, readFileSync(join(d, 'docs', 'tie.md'))) === 0, '文档逐字节不动')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--fix 报 needs-manual + 候选行号 + exit 1（歧义无 --force 逃生口）', () => {
    const d = s2bFixture()
    try {
      const before = readFileSync(join(d, 'docs', 'tie.md'))
      const r = runDocsCli(d, ['--fix', '--paths', 'docs/tie.md'])
      assert.equal(r.code, 1, `needs-manual 残留 exit 1（实际 ${r.code}）`)
      assert.ok(r.stderr.includes('待人工'), '分类为待人工')
      assert.ok(r.stderr.includes('候选行号'), '报告含候选行号列表')
      assert.ok(r.stderr.includes('0 处已改写'), '重锚报告零改写')
      assert.ok(Buffer.compare(before, readFileSync(join(d, 'docs', 'tie.md'))) === 0, 'CLI --fix 对歧义条目零写盘')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})

describe('S3 零命中报告（FR-02）', () => {
  /** ghostSymbol 不在任何候选文件（符号已删/在别处）→ 零命中 needs-manual */
  function s3Fixture() {
    return makeFixture({
      'src/a.js': padLines(8, { 1: 'export const alphaSymbol = 1' }).join('\n') + '\n',
      'docs/ghost.md': '见 `src/a.js:6`（`ghostSymbol` 声明处）\n',
    })
  }

  it('单测层：零命中分类 needs-manual，文件不动', () => {
    const d = s3Fixture()
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/ghost.md'] })
      assert.equal(r.ok, false)
      const inv = r.invalid[0]
      assert.equal(inv.fix.fixable, false)
      assert.ok(inv.fix.reason.includes('零命中'), `reason 分类为零命中（实际：${inv.fix.reason}）`)
      const before = readFileSync(join(d, 'docs', 'ghost.md'))
      const { fixResult } = runFixLayer(d, 'docs/ghost.md')
      assert.equal(fixResult.applied, 0)
      assert.ok(Buffer.compare(before, readFileSync(join(d, 'docs', 'ghost.md'))) === 0, '文档逐字节不动')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--fix 零命中报待人工 + exit 1', () => {
    const d = s3Fixture()
    try {
      const before = readFileSync(join(d, 'docs', 'ghost.md'))
      const r = runDocsCli(d, ['--fix', '--paths', 'docs/ghost.md'])
      assert.equal(r.code, 1, `零命中残留 exit 1（实际 ${r.code}）`)
      assert.ok(r.stderr.includes('零命中'), '报告零命中原因')
      assert.ok(r.stderr.includes('待人工'), '分类为待人工')
      assert.ok(Buffer.compare(before, readFileSync(join(d, 'docs', 'ghost.md'))) === 0, '零命中文件不动')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})

describe('S4 dry-run 零写盘（FR-05）', () => {
  /** 单命中可修——dry-run 下「将应用」但仍零写盘 */
  function s4Fixture() {
    return makeFixture({
      'src/a.js': padLines(8, { 1: 'export const alphaSymbol = 1' }).join('\n') + '\n',
      'docs/one.md': '见 `src/a.js:6`（`alphaSymbol` 声明处）\n',
    })
  }

  it('单测层：applyFixes dryRun 零写盘（内容 + mtime 均不变）', () => {
    const d = s4Fixture()
    try {
      const docAbs = join(d, 'docs', 'one.md')
      const before = readFileSync(docAbs)
      const m0 = statSync(docAbs).mtimeMs
      // 20ms 忙等保 mtime 分辨率（文件系统时间戳粒度兜底，TaskCard 要求）
      const t0 = Date.now()
      while (Date.now() - t0 < 20) { /* busy-wait */ }
      const result = runDocsCheck({ projectRoot: d, docs: ['docs/one.md'] })
      const inv = result.invalid[0]
      const fixes = [{
        doc: inv.doc, docLine: inv.docLine, ref: inv.ref,
        newRef: inv.ref.replace(/(\d+)(?:-\d+)?$/, String(inv.fix.newLine)),
      }]
      const fr = applyFixes(d, fixes, { dryRun: true })
      assert.equal(fr.applied, 1, 'dry-run applied = 将应用计数')
      assert.deepEqual(fr.skipped, [])
      assert.ok(Buffer.compare(before, readFileSync(docAbs)) === 0, '内容逐字节不变')
      assert.equal(statSync(docAbs).mtimeMs, m0, 'mtime 不变（零写盘实证）')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--fix --dry-run 报预览不写盘，随后纯 --fix 真写盘（对照防修坏路径）', () => {
    const d = s4Fixture()
    try {
      const docAbs = join(d, 'docs', 'one.md')
      const before = readFileSync(docAbs)
      const m0 = statSync(docAbs).mtimeMs
      const t0 = Date.now()
      while (Date.now() - t0 < 20) { /* busy-wait */ }
      const r = runDocsCli(d, ['--fix', '--dry-run', '--paths', 'docs/one.md'])
      // exit code 锁实现口径（src/index.js task-03：fixActive = fix || dryRun 统一走全修=0 判定，
      // 全 fixable 预览完 → 0）。design §5.2 行为矩阵 --dry-run 列严格读是「报告修复预览 + exit 1」，
      // 与实现存在张力（已在任务报告登记，测试按实现口径锁定）。
      assert.equal(r.code, 0, `dry-run 全 fixable 预览完 exit 0（实际 ${r.code}；stderr=${r.stderr.slice(0, 300)}）`)
      assert.ok(r.stderr.includes('src/a.js:6 → src/a.js:1'), '预览明细含 ref → newRef')
      assert.ok(r.stderr.includes('（dry-run 未写盘）'), '预览标注 dry-run 未写盘')
      assert.ok(r.stderr.includes('1 处已预览'), '重锚报告统计为预览')
      assert.ok(Buffer.compare(before, readFileSync(docAbs)) === 0, '内容逐字节不变')
      assert.equal(statSync(docAbs).mtimeMs, m0, 'mtime 不变（零写盘实证）')
      // 对照：同一 fixture 随后纯 --fix 真写盘成功，证明 dry-run 没把修复链路置于坏状态
      const r2 = runDocsCli(d, ['--fix', '--paths', 'docs/one.md'])
      assert.equal(r2.code, 0)
      assert.equal(readFileSync(docAbs, 'utf8'), '见 `src/a.js:1`（`alphaSymbol` 声明处）\n')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})

describe('S5 CRLF 保持（R-05）', () => {
  /** doc 显式 CRLF（\r\n）三行，src LF——修复后 doc 行结束符仍 CRLF */
  function s5Fixture() {
    return makeFixture({
      'src/a.js': padLines(8, { 1: 'export const alphaSymbol = 1' }).join('\n') + '\n',
      'docs/crlf.md': '首行说明文字。\r\n见 `src/a.js:6`（`alphaSymbol` 声明处）\r\n尾行备注。\r\n',
    })
  }

  it('单测层：修复后行结束符仍 \\r\\n 且总字节数=预期', () => {
    const d = s5Fixture()
    try {
      const docAbs = join(d, 'docs', 'crlf.md')
      const { fixResult } = runFixLayer(d, 'docs/crlf.md')
      assert.equal(fixResult.applied, 1)
      const after = readFileSync(docAbs)
      // 预期全文（唯一变化 :6 → :1，等宽；三行 \r\n 一个不少）
      const expected = '首行说明文字。\r\n见 `src/a.js:1`（`alphaSymbol` 声明处）\r\n尾行备注。\r\n'
      assert.equal(after.toString('utf8'), expected, '全文逐字节等于预期（含 CRLF）')
      assert.equal(after.length, Buffer.byteLength(expected), '总字节数=预期（无行结束符丢失/翻倍）')
      assert.ok(after.toString('utf8').includes('声明处）\r\n尾行'), '修复行与后继行之间仍为 \\r\\n')
      // 修复结果要能过层 2 校验（CRLF 文档同样复查全绿）
      const recheck = runDocsCheck({ projectRoot: d, docs: ['docs/crlf.md'] })
      assert.equal(recheck.ok, true, JSON.stringify(recheck.invalid))
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层：--fix 对 CRLF 文档修复后 \\r\\n 保持、总字节数=预期', () => {
    const d = s5Fixture()
    try {
      const r = runDocsCli(d, ['--fix', '--paths', 'docs/crlf.md'])
      assert.equal(r.code, 0, `CRLF 修复全绿 exit 0（实际 ${r.code}；stderr=${r.stderr.slice(0, 300)}）`)
      const after = readFileSync(join(d, 'docs', 'crlf.md'))
      const expected = '首行说明文字。\r\n见 `src/a.js:1`（`alphaSymbol` 声明处）\r\n尾行备注。\r\n'
      assert.equal(after.toString('utf8'), expected)
      assert.equal(after.length, Buffer.byteLength(expected))
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})

describe('S6 同行多引用（R-04）', () => {
  /**
   * 同一文档行两个失效引用、两条都 fixable：token 集合按整行共享（层2 提取语义），指向同一
   * 源文件的两条引用共享命中行集合必判多命中——用两个不同源文件，各 token 在各自候选文件内
   * 唯一命中，两条独立 fixable。
   */
  it('单测层（等宽+缩短）：同行两条都正确替换、无错位', () => {
    const d = makeFixture({
      'src/p.js': padLines(8, { 1: 'export const pSym = 1' }).join('\n') + '\n',
      'src/q.js': padLines(110, { 20: 'export const qSym = 2' }).join('\n') + '\n',
      'docs/line.md': '两失效同挂一行：见 `src/p.js:6`（`pSym` 声明处）与 `src/q.js:106`（`qSym` 声明处）。\n',
    })
    try {
      const { result, fixes, fixResult } = runFixLayer(d, 'docs/line.md')
      assert.equal(result.invalid.length, 2, `前置：两个失效引用（实际 ${result.invalid.length}）`)
      assert.equal(fixResult.applied, 2, `同行两条都应用（实际 applied=${fixResult.applied}）`)
      assert.deepEqual(fixResult.skipped, [])
      assert.equal(fixes.length, 2)
      // p.js:6（窗口 L5-L8 无 pSym）→ 唯一命中 L1（等宽）；q.js:106（窗口 L105-L110 无 qSym）→ 唯一命中 L20（缩短 1 字符）
      const expected = '两失效同挂一行：见 `src/p.js:1`（`pSym` 声明处）与 `src/q.js:20`（`qSym` 声明处）。\n'
      assert.equal(readFileSync(join(d, 'docs', 'line.md'), 'utf8'), expected, '同行双替换结果整行精确等于预期')
      const recheck = runDocsCheck({ projectRoot: d, docs: ['docs/line.md'] })
      assert.equal(recheck.ok, true, JSON.stringify(recheck.invalid))
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('CLI 层（前序变长）：前序替换 +2 字符（:2 → :106）时后序替换不错位', () => {
    const d = makeFixture({
      'src/g1.js': padLines(110, { 106: 'export const growSym = 1' }).join('\n') + '\n',
      'src/g2.js': padLines(110, { 8: 'export const lateSym = 2' }).join('\n') + '\n',
      'docs/grow.md': '前序变长：见 `src/g1.js:2`（`growSym` 声明处）与 `src/g2.js:88`（`lateSym` 声明处）。\n',
    })
    try {
      const r = runDocsCli(d, ['--fix', '--paths', 'docs/grow.md'])
      assert.equal(r.code, 0, `双 fixable 全修 exit 0（实际 ${r.code}；stderr=${r.stderr.slice(0, 400)}）`)
      // 前序 g1.js:2 → g1.js:106（+2 字符变长，从左挤偏后序是 R-04 风险点）；后序 g2.js:88 → g2.js:8
      const expected = '前序变长：见 `src/g1.js:106`（`growSym` 声明处）与 `src/g2.js:8`（`lateSym` 声明处）。\n'
      assert.equal(readFileSync(join(d, 'docs', 'grow.md'), 'utf8'), expected, '前序变长后序不错位')
      const recheck = runDocsCheck({ projectRoot: d, docs: ['docs/grow.md'] })
      assert.equal(recheck.ok, true, JSON.stringify(recheck.invalid))
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})

// ── S7 CLI 对照（FR-04/D-004：无 --fix 时输出与改动前逐字节一致）──

describe('S7 CLI 无 --fix 输出与改动前（84d498a）逐字节一致（FR-04/D-004）', () => {
  // 旧 CLI 完整树（84d498a = HEAD~1 = task-03 接线前）。不用 git show 拼单文件（相对 import 会解析
  // 到本 worktree 新代码），git archive 出完整树 + node_modules junction 复用本 worktree 依赖
  // （Windows 用 junction 类型；POSIX 符号链接同义）。旧 index.js 只在 --version 与 dashboard
  // 分支触 packages/（archive 树缺它），docs check 路径不加载。钩子收在本 describe 内——
  // 单跑 S1-S6（--test-name-pattern 调试）不付建树成本。
  let oldRoot = null
  before(() => {
    const t = mkdtempSync(join(tmpdir(), 'dcfix-oldcli-'))
    try {
      const tarPath = join(t, 'tree.tar')
      writeFileSync(tarPath, execFileSync(
        'git', ['-C', REPO_ROOT, 'archive', '--format=tar', '84d498a'],
        { maxBuffer: 64 * 1024 * 1024 },
      ))
      execFileSync('tar', ['-xf', 'tree.tar'], { cwd: t })
      rmSync(tarPath, { force: true })
      if (!existsSync(join(t, 'node_modules'))) {
        symlinkSync(join(REPO_ROOT, 'node_modules'), join(t, 'node_modules'), 'junction')
      }
      // rev 钉死：84d498a 的 docs check BARE_FLAGS 只有 --suggest（task-03 才加 --fix/--dry-run），
      // 防止未来 ref 漂移后对照跑错版本还静默「对齐」
      const oldIndex = readFileSync(join(t, 'src', 'index.js'), 'utf8')
      assert.ok(
        oldIndex.includes("const BARE_FLAGS = ['--suggest'];"),
        '旧 CLI 树 rev 特征校验失败：84d498a 的 BARE_FLAGS 应只含 --suggest',
      )
      oldRoot = t
    } catch (e) {
      try { rmSync(t, { recursive: true, force: true }) } catch {}
      throw e
    }
  })
  after(() => {
    // junction 先摘再删树（rmSync 对 junction 只删链接本身，不递归进真实 node_modules）
    if (oldRoot) {
      try { rmSync(join(oldRoot, 'node_modules'), { force: true }) } catch {}
      try { rmSync(oldRoot, { recursive: true, force: true }) } catch {}
    }
  })

  /** 失效混合 fixture：行号超界 + 关键词漂移 + 合法引用，输出覆盖多形态行 */
  function s7Fixture() {
    return makeFixture({
      'src/alpha.js': padLines(10, { 1: 'export const alphaSymbol = 1' }).join('\n') + '\n',
      'docs/api.md': [
        '# 标题', '',
        '见 `src/alpha.js:99`（`alphaSymbol` 声明处，行号超界失效）', '',
        '再见 `src/alpha.js:4`（`alphaSymbol` 声明处，关键词漂移失效）', '',
        '合法引用 `src/alpha.js:1`（`alphaSymbol`）保持。', '',
      ].join('\n') + '\n',
    })
  }

  /** 在指定 bin 跑 CLI（同 args 同 fixture），收 code/stdout/stderr 三元组 */
  function runAt(bin, args) {
    const r = spawnSync('node', [bin, ...args], { encoding: 'utf8', timeout: 30000 })
    if (r.error) throw r.error
    return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' }
  }

  it('无 flag：stdout + stderr + exit code 新旧 CLI 三者一致（fixture 同仓各跑一次）', () => {
    assert.ok(oldRoot, '前置：旧 CLI 树就绪（before 钩子）')
    const d = s7Fixture()
    try {
      const args = ['--dir', d, 'docs', 'check', '--paths', 'docs/api.md']
      const oldR = runAt(join(oldRoot, 'bin', 'sillyspec.js'), args)
      const newR = runAt(BIN, args)
      // 语义前置：失效确被报出（防两边都空输出/都崩的假对齐）
      assert.equal(newR.code, 1, '新 CLI exit 1（fixture 有 2 处失效）')
      assert.ok(newR.stderr.includes('❌ docs check: 2/3 处引用失效'), `新 CLI 失效计数 2/3（实际 stderr=${newR.stderr.slice(0, 300)}）`)
      assert.ok(newR.stderr.includes('行号超界') && newR.stderr.includes('关键词缺失'), '两种失效形态都在输出')
      // 逐字节三相等（D-004 缺省路径零显形）
      assert.equal(oldR.code, newR.code, 'exit code 一致')
      assert.equal(oldR.stdout, newR.stdout, `stdout 逐字节一致（旧=${JSON.stringify(oldR.stdout.slice(0, 200))} 新=${JSON.stringify(newR.stdout.slice(0, 200))}）`)
      assert.equal(oldR.stderr, newR.stderr, `stderr 逐字节一致（旧=${JSON.stringify(oldR.stderr.slice(0, 200))} 新=${JSON.stringify(newR.stderr.slice(0, 200))}）`)
      // 新输出无修复链路痕迹（无 --fix 时 fix 面零显形）
      assert.ok(!newR.stderr.includes('重锚报告') && !newR.stderr.includes('dry-run'), '无 --fix 无重锚报告/dry-run 痕迹')
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('--suggest 门控行为同样逐字节一致（suggest 数据面新旧同源）', () => {
    assert.ok(oldRoot, '前置：旧 CLI 树就绪（before 钩子）')
    const d = s7Fixture()
    try {
      const args = ['--dir', d, 'docs', 'check', '--suggest', '--paths', 'docs/api.md']
      const oldR = runAt(join(oldRoot, 'bin', 'sillyspec.js'), args)
      const newR = runAt(BIN, args)
      assert.equal(newR.code, 1)
      assert.ok(newR.stderr.includes('💡'), '新 CLI --suggest 打候选行号行')
      assert.equal(oldR.code, newR.code)
      assert.equal(oldR.stdout, newR.stdout)
      assert.equal(oldR.stderr, newR.stderr, `--suggest stderr 逐字节一致（旧=${JSON.stringify(oldR.stderr.slice(0, 200))} 新=${JSON.stringify(newR.stderr.slice(0, 200))}）`)
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('全绿 fixture：新旧 CLI stdout（✅ 全绿行）与 exit 0 一致', () => {
    assert.ok(oldRoot, '前置：旧 CLI 树就绪（before 钩子）')
    const d = makeFixture({
      'src/alpha.js': padLines(2, { 1: 'export const alphaSymbol = 1' }).join('\n') + '\n',
      'docs/ok.md': '合法引用 `src/alpha.js:1`（`alphaSymbol`）\n',
    })
    try {
      const args = ['--dir', d, 'docs', 'check', '--paths', 'docs/ok.md']
      const oldR = runAt(join(oldRoot, 'bin', 'sillyspec.js'), args)
      const newR = runAt(BIN, args)
      assert.equal(newR.code, 0)
      assert.ok(newR.stdout.includes('✅ docs check: 1 处引用全通过'), `全绿行走 stdout（实际 ${JSON.stringify(newR.stdout)}）`)
      assert.equal(oldR.code, 0)
      assert.equal(oldR.stdout, newR.stdout, `全绿 stdout 逐字节一致（旧=${JSON.stringify(oldR.stdout)} 新=${JSON.stringify(newR.stdout)}）`)
      assert.equal(oldR.stderr, newR.stderr)
    } finally { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })
})
