/**
 * change-list-repo-heading.test.mjs — 「## <注册key> 仓变更」h2 段头解析
 * （2026-10-13-h2-repo-heading-parse）
 *
 * 坑背景：段头形态是生态既定约定（brainstorm 厚道模板教学、plan-postcheck 覆盖对账
 * parseDesignCoverageByRepo 穿过段头、design-facts/docs-check 复用同一切分、评审清单口径），
 * 但 thin 收口对账解析器 change-list.js 的节扫描在 ^## 一刀切——h2 段头终结「文件变更清单」
 * 节，其后条目整段静默丢失（agent 照模板/告警①书写即丢对账，fire-ledger-form-strict 事故族）。
 *
 * 覆盖验收面：
 *   FR-01 h2 段头（含编号前缀/括号备注）解析出条目且带 repo；段头前主仓条目照常；
 *   FR-02 fail-closed（未注册 key 含 main 归主仓）+ 非段头 ## 章节仍截断节（零回归）；
 *   附 h3 段头与既有 ### token 子段/cross-repo: 前缀等价共存。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFileChangeListDetailed, REPO_SECTION_HEADER_RE } from '../src/change-list.js'

// FR-04 单一源守卫（评审 P3 清偿）：plan-postcheck 不得再有本地 RE 定义、必须 import 同一符号
test('FR-04 单一源守卫：REPO_SECTION_HEADER_RE 定义唯一在 change-list，plan-postcheck 仅 import', () => {
  const ppSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'stages', 'plan-postcheck.js'), 'utf8')
  assert.doesNotMatch(ppSrc, /^const REPO_SECTION_HEADER_RE\s*=/m, 'plan-postcheck 不得有本地 RE 定义（防镜像漂移）')
  assert.match(ppSrc, /import\s*\{[^}]*REPO_SECTION_HEADER_RE[^}]*\}\s*from\s*'\.\.\/change-list\.js'/, 'plan-postcheck 必须 import change-list 的 RE')
  // 导出的正则与解析行为同体：段头形态在导出符号上直接命中（消费方 import 的是同一对象）
  assert.match('## libx 仓变更', REPO_SECTION_HEADER_RE)
  assert.doesNotMatch('## 接口契约', REPO_SECTION_HEADER_RE)
})

function fixture(body) {
  const root = mkdtempSync(join(tmpdir(), 'clrh-'))
  const dp = join(root, 'design.md')
  writeFileSync(dp, `# 设计记录\n\n## 文件变更清单\n\n${body}\n`)
  const entries = parseFileChangeListDetailed(dp, { keepSillyspecDocs: true, repoKeys: ['libx'] })
  return { root, entries }
}

const TABLE_MAIN = '| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | work.txt | 主仓 |'
const TABLE_ROW = (p) => `| 修改 | ${p} | 交付 |`

test('FR-01 h2 段头不截断节：段下条目带 repo、段头前主仓条目照常', () => {
  const { root, entries } = fixture(`${TABLE_MAIN}\n\n## libx 仓变更\n\n${TABLE_ROW('src/routes/X.js')}\n`)
  assert.deepEqual(entries.map((e) => [e.path, e.repo]), [['work.txt', null], ['src/routes/X.js', 'libx']],
    `h2 段头条目须带 repo 且主仓条目在场: ${JSON.stringify(entries)}`)
  rmSync(root, { recursive: true, force: true })
})

test('FR-01 变体：编号前缀/括号备注/冒号后缀的段头同样识别', () => {
  for (const h of ['## 2. libx 仓变更', '## libx 仓变更（跨仓，X1-X4）', '## libx 仓变更：']) {
    const { root, entries } = fixture(`${h}\n\n${TABLE_MAIN}\n`)
    assert.deepEqual(entries.map((e) => [e.path, e.repo]), [['work.txt', 'libx']], `段头「${h}」识别: ${JSON.stringify(entries)}`)
    rmSync(root, { recursive: true, force: true })
  }
})

test('FR-01 列表形态在 h2 段头下同样带 repo', () => {
  const { root, entries } = fixture(`## libx 仓变更\n\n- src/b.js\n`)
  assert.deepEqual(entries.map((e) => [e.path, e.repo]), [['src/b.js', 'libx']], `列表形态: ${JSON.stringify(entries)}`)
  rmSync(root, { recursive: true, force: true })
})

test('FR-02 fail-closed：未注册 key（含 main）段头归主仓', () => {
  for (const h of ['## other 仓变更', '## main 仓变更']) {
    const { root, entries } = fixture(`${TABLE_MAIN}\n\n${h}\n\n${TABLE_ROW('src/c.js')}\n`)
    assert.deepEqual(entries.map((e) => [e.path, e.repo]), [['work.txt', null], ['src/c.js', null]], `「${h}」归主仓`)
    rmSync(root, { recursive: true, force: true })
  }
})

test('FR-02 零回归：非段头的 ## 章节标题仍截断「文件变更清单」节', () => {
  const { root, entries } = fixture(`${TABLE_MAIN}\n\n## 接口契约\n\n${TABLE_ROW('evil.js')}\n`)
  assert.deepEqual(entries.map((e) => e.path), ['work.txt'], `非段头章节截断节: ${JSON.stringify(entries)}`)
  rmSync(root, { recursive: true, force: true })
})

test('共存：h3 段头（### <key> 仓变更）与既有 ### token 子段 / cross-repo: 前缀行为不变', () => {
  const { root, entries } = fixture([
    '### libx 仓变更', '', TABLE_MAIN, '',
    '### 其他子段（标题不含注册 key——回主仓）', '', TABLE_ROW('src/tok.js'), '',
  ].join('\n'))
  // ### libx 仓变更：RE 段头与 token 子段两路径等价 → repo=libx，不叠加不冲突（表格模式 operation 取操作列）
  assert.deepEqual(entries.find((e) => e.path === 'work.txt'), { path: 'work.txt', operation: '修改', incidental: false, repo: 'libx' }, `h3 段头带 repo: ${JSON.stringify(entries)}`)
  assert.equal(entries.find((e) => e.path === 'src/tok.js')?.repo ?? null, null, '不含 key 的子段回主仓')
  rmSync(root, { recursive: true, force: true })
  const r2 = fixture(`| 操作 | 路径 | 说明 |\n|---|---|---|\n| 修改 | cross-repo:libx:src/pref.js | 交付 |\n`)
  assert.deepEqual(r2.entries.map((e) => [e.path, e.repo]), [['src/pref.js', 'libx']], `cross-repo: 前缀不变: ${JSON.stringify(r2.entries)}`)
  rmSync(r2.root, { recursive: true, force: true })
})
