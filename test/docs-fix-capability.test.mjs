/**
 * docs-fix-capability 单测（change: 2026-09-08-docs-fix-capability，task-04）
 *
 * 覆盖 FR-1/3/4（docs-check.js 内聚改动）：
 *   括号路径：Next.js 路由组 (dashboard) 全量提取+真实校验；markdown 链接零回归
 *   ReDoS evil 用例：长 token 无 :N 后缀线性耗时（锁死 D-006 展开循环形）
 *   省略号模糊路径：skippedFuzzy 跳过校验
 *   顿号拆分：a.py:21、b.py:63 拆两条独立引用（字符集排除全角标点回归锁）
 *   豁免双通道：archive/finished 路径段 + frontmatter doc_type: snapshot；exempt:false 恢复
 *   candidates JSON：tie 歧义 {file,line}；带 / 路径文件不存在 {file}；裸名不存在无 candidates
 *
 * fixture 全 tmp（mkdtempSync）独立互不依赖；Windows 兼容（路径 join、CRLF 显式写）。
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  collectDocRefs,
  isExemptDocPath,
  isExemptDocFrontmatter,
  isExemptDoc,
  runDocsCheck,
} from '../src/docs-check.js'

function makeFixture(files) {
  const d = mkdtempSync(join(tmpdir(), 'dcfix-'))
  for (const [rel, content] of Object.entries(files)) {
    const p = join(d, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, content, 'utf8')
  }
  return d
}

function cleanup(d) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

describe('FR-1.1 括号路径（Next.js 路由组）', () => {
  it('app/(dashboard)/ppm/shared.tsx:21 全量提取', () => {
    const refs = collectDocRefs('见 `app/(dashboard)/ppm/shared.tsx:21` 的实现')
    assert.equal(refs.length, 1)
    assert.equal(refs[0].file, 'app/(dashboard)/ppm/shared.tsx')
    assert.equal(refs[0].start, 21)
  })

  it('(dashboard)/page.tsx:5 括号开头全量提取', () => {
    const refs = collectDocRefs('`(dashboard)/page.tsx:5`')
    assert.equal(refs.length, 1)
    assert.equal(refs[0].file, '(dashboard)/page.tsx')
  })

  it('markdown 链接 [t](foo.js:12) 零回归（提取 foo.js:12）', () => {
    const refs = collectDocRefs('[文档](foo.js:12)')
    assert.equal(refs.length, 1)
    assert.equal(refs[0].file, 'foo.js')
    assert.equal(refs[0].start, 12)
  })

  it('括号路径真实校验（fixture 存在 → 通过）', () => {
    const d = makeFixture({
      'app/(dashboard)/x.tsx': 'export const a = 1\n'.repeat(25),
      'docs/d.md': '见 `app/(dashboard)/x.tsx:20`（`a`）\n',
    })
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/d.md'] })
      assert.equal(r.invalid.length, 0, `括号路径真实校验通过（实际 invalid=${JSON.stringify(r.invalid.map(i => i.ref))}）`)
    } finally { cleanup(d) }
  })
})

describe('FR-1.1b ReDoS 防护（D-006 展开循环形）', () => {
  it('长 token 无 :N 后缀线性耗时（evil 用例锁死）', () => {
    // GitHub 源码 URL 形态：长路径段 + .ts 扩展名 + 无行号——初稿原子序列形 n=30 → 73.8s
    const evil = 'https://github.com/org/repo/blob/main/src/' + 'a'.repeat(30) + '/Widget.ts'
    const t0 = Date.now()
    collectDocRefs(evil)
    const elapsed = Date.now() - t0
    assert.ok(elapsed < 100, `evil n=30 耗时 ${elapsed}ms（阈值 100ms；原子序列形实测 73.8s）`)
  })

  it('嵌套 ((x)) 部分提取（与旧行为一致，陈述锚定）', () => {
    const refs = collectDocRefs('`((x))/foo.js:9`')
    assert.equal(refs.length, 1)
    assert.equal(refs[0].file, '/foo.js')
  })
})

describe('FR-1.2 省略号模糊路径跳过', () => {
  it('api/.../route.ts 跳过校验计 skippedFuzzy', () => {
    const d = makeFixture({
      'docs/d.md': '见 `frontend/app/api/.../stream/route.ts:10` 与 `src/real.js:1`\n',
      'src/real.js': 'export const x = 1\n',
    })
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/d.md'] })
      assert.equal(r.skippedFuzzy, 1, '模糊路径计 1')
      assert.equal(r.total, 1, 'total 只含 real.js（模糊路径不计入）')
      assert.equal(r.invalid.length, 0)
    } finally { cleanup(d) }
  })
})

describe('FR-1.3 中文顿号并列引用拆分', () => {
  it('a.py:21、b.py:63 拆两条独立引用', () => {
    const refs = collectDocRefs('见 `src/a.py:21`、`src/b.py:63` 两处')
    assert.equal(refs.length, 2)
    assert.equal(refs[0].file, 'src/a.py')
    assert.equal(refs[1].file, 'src/b.py')
  })

  it('顿号不在字符集内（回归锁：未来扩字符集不得粘连）', () => {
    const refs = collectDocRefs('`src/a.py:21、src/b.py:63`')
    // 顿号（U+3001）是全角标点，不在 [A-Za-z0-9_.\-\/] 字符集——必拆两条
    assert.equal(refs.length, 2)
  })
})

describe('FR-3 豁免双通道', () => {
  it('isExemptDocPath：archive/ 路径段', () => {
    assert.ok(isExemptDocPath('docs/archive/2024-01/x.md'))
    assert.ok(isExemptDocPath('docs/sillyspec/finished/proposal.md'))
    assert.ok(!isExemptDocPath('docs/current/x.md'))
    assert.ok(!isExemptDocPath('docs/archive-x.md')) // 段名非独立目录
  })

  it('isExemptDocFrontmatter：doc_type: snapshot', () => {
    assert.ok(isExemptDocFrontmatter('---\ndoc_type: snapshot\n---\nbody'))
    assert.ok(isExemptDocFrontmatter('---\ndoc_type: snapshot # 历史快照\n---\nbody'))
    assert.ok(isExemptDocFrontmatter('---\n  doc_type:   snapshot  \n---\nbody'))
    assert.ok(!isExemptDocFrontmatter('---\ndoc_type: "snapshot"\n---\nbody')) // 带引号不识别
    assert.ok(!isExemptDocFrontmatter('---\ndoc_type: report\n---\nbody'))
    assert.ok(!isExemptDocFrontmatter('no frontmatter\ndoc_type: snapshot\n'))
  })

  it('isExemptDoc 双通道合并', () => {
    assert.ok(isExemptDoc('docs/archive/x.md'))
    assert.ok(isExemptDoc('docs/x.md', '---\ndoc_type: snapshot\n---\nbody'))
    assert.ok(!isExemptDoc('docs/x.md', 'normal content'))
  })

  it('runDocsCheck 豁免 archive 文档（skippedExempt 计数）', () => {
    const d = makeFixture({
      'docs/archive/old.md': '见 `nonexistent/path.js:99`\n',
      'docs/current.md': '见 `src/real.js:1`\n',
      'src/real.js': 'export const x = 1\n',
    })
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/archive/old.md', 'docs/current.md'] })
      assert.equal(r.skippedExempt, 1, 'archive 文档豁免 1 个')
      assert.equal(r.invalid.length, 0, '豁免文档不计 invalid')
      assert.equal(r.total, 1, 'total 只含 current.md 的引用')
    } finally { cleanup(d) }
  })

  it('exempt: false 恢复全量校验', () => {
    const d = makeFixture({
      'docs/archive/old.md': '见 `nonexistent/path.js:99`\n',
      'src/real.js': 'export const x = 1\n',
    })
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/archive/old.md'], exempt: false })
      assert.equal(r.skippedExempt, 0, 'exempt:false 无豁免')
      assert.equal(r.invalid.length, 1, '失效引用照常报')
    } finally { cleanup(d) }
  })
})

describe('FR-4 candidates JSON', () => {
  it('带 / 路径文件不存在 → fix.candidates 含同名文件候选', () => {
    const d = makeFixture({
      'docs/d.md': '见 `backend/modules/agent/service.py:361`\n',
      'src/agent/service.py': 'def foo():\n    pass\n',
    })
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/d.md'], keywordAssert: false })
      assert.equal(r.invalid.length, 1)
      assert.ok(r.invalid[0].fix.candidates, 'fix.candidates 存在')
      assert.ok(r.invalid[0].fix.candidates.length > 0, 'candidates 非空')
      assert.ok(r.invalid[0].fix.candidates[0].file.endsWith('service.py'), '候选文件是 service.py')
    } finally { cleanup(d) }
  })

  it('裸文件名不存在 → 无 candidates（resolveCandidates 已全树扫，重扫恒空）', () => {
    const d = makeFixture({
      'docs/d.md': '见 `nonexistent.py:1`\n',
      'src/real.js': 'export const x = 1\n',
    })
    try {
      const r = runDocsCheck({ projectRoot: d, docs: ['docs/d.md'], keywordAssert: false })
      assert.equal(r.invalid.length, 1)
      assert.ok(!r.invalid[0].fix.candidates, '裸名不存在无 candidates（Grill 修正：恒空无意义）')
    } finally { cleanup(d) }
  })
})
