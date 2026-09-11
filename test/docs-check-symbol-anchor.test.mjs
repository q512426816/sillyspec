/**
 * 符号锚（P1-2，noai-ir-roadmap §4）：`file.js::symbol` 引用形态——校验时解析符号定义行，
 * 行漂移天然免疫（重锚从「每次代码移动」降为「仅改名时」）。锁定语义：
 *   - 命中：候选文件内存在 function/const/let/var/class/def 定义行（export/async 前缀兼容）；
 *     仅「使用」未「定义」（import 消费/注释提及）不算命中；
 *   - 失效：符号拼错/文件不存在/符号删改名——fix 显式不可自动（非重锚能修）；
 *   - 免疫：定义行上方插 N 行后复检仍通过（与行号锚的行为对照即本特性存在的理由）；
 *   - 互斥：中文/自然语言 `::` 括注（QUICKLOG file-notes 约定）不触发符号式。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { collectDocRefs, findSymbolDefLine, runDocsCheck } from '../src/docs-check.js'

test('findSymbolDefLine：function/const/class/def/export/async 形态命中；仅使用不命中；非法符号名 null', () => {
  const lines = [
    "import { usedElsewhere } from './x.js'",
    'export async function runStage(args) {',
    'const MAX_OUTPUT = 200',
    'export class WorktreeManager {',
    'def parse_decsions(dir):',
    '  // runStage 被注释提及',
    '  return usedElsewhere(runStage)',
  ]
  assert.equal(findSymbolDefLine(lines, 'runStage'), 2, 'export async function 命中')
  assert.equal(findSymbolDefLine(lines, 'MAX_OUTPUT'), 3, 'const 命中')
  assert.equal(findSymbolDefLine(lines, 'WorktreeManager'), 4, 'export class 命中')
  assert.equal(findSymbolDefLine(lines, 'parse_decsions'), 5, 'Python def 命中')
  assert.equal(findSymbolDefLine(lines, 'usedElsewhere'), null, '仅 import 使用不命中')
  assert.equal(findSymbolDefLine(lines, '不合法-名'), null, '非法标识符 null')
  assert.equal(findSymbolDefLine(null, 'x'), null, '空行数组防御')
})

test('collectDocRefs：符号式与行号式并存互斥，kind 标注；中文括注不触发', () => {
  const md = [
    '看 `src/run/stage.js::runStage` 与 src/foo.js:12 两处。',
    'QUICKLOG 括注约定 src/a.js::登录端点串限流 不触发符号式（非 ASCII 标识符）。',
  ].join('\n')
  const refs = collectDocRefs(md)
  const sym = refs.find(r => r.kind === 'symbol')
  assert.ok(sym, '符号式被提取')
  assert.equal(sym.symbol, 'runStage')
  assert.equal(sym.file, 'src/run/stage.js')
  assert.equal(sym.start, null)
  assert.equal(sym.docLine, 1)
  const lineRef = refs.find(r => r.kind !== 'symbol')
  assert.ok(lineRef, '行号式仍被提取')
  assert.equal(lineRef.file, 'src/foo.js')
  assert.equal(lineRef.start, 12)
  assert.ok(!refs.some(r => r.kind === 'symbol' && r.file === 'src/a.js'), '中文括注不触发')
})

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'symref-'))
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(join(root, 'src', 'foo.js'), [
    'export function runStage(args) {',
    '  return args',
    '}',
    '',
  ].join('\n'))
  return root
}

test('runDocsCheck：符号锚命中；上方插行后复检仍过（行漂移免疫）；坏符号/坏文件失效', () => {
  const root = makeFixture()
  try {
    writeFileSync(join(root, 'docs', 'd.md'), '锚 `src/foo.js::runStage`。\n')
    let r = runDocsCheck({ projectRoot: root })
    assert.equal(r.ok, true, '命中通过')
    assert.equal(r.symbolChecked, 1)
    assert.equal(r.total, 1)

    // 行漂移免疫：定义行上方插 50 行，行号锚会失效、符号锚不受影响
    writeFileSync(join(root, 'src', 'foo.js'), '// pad\n'.repeat(50) + 'export function runStage(args) {\n  return args\n}\n')
    r = runDocsCheck({ projectRoot: root })
    assert.equal(r.ok, true, '插行后符号锚仍过（漂移免疫）')
    assert.equal(r.symbolChecked, 1)

    // 坏符号：未定义 → 失效且 fix 不可自动
    writeFileSync(join(root, 'docs', 'd.md'), '锚 `src/foo.js::notDefinedHere`。\n')
    r = runDocsCheck({ projectRoot: root })
    assert.equal(r.ok, false)
    assert.ok(r.invalid[0].reason.includes('符号锚未命中'))
    assert.equal(r.invalid[0].fix.fixable, false)

    // 坏文件：文件不存在 → 失效（与行号式同因）
    writeFileSync(join(root, 'docs', 'd.md'), '锚 `src/gone.js::runStage`。\n')
    r = runDocsCheck({ projectRoot: root })
    assert.equal(r.ok, false)
    assert.ok(r.invalid[0].reason.includes('文件不存在'))
  } finally {
    try { rmSync(root, { recursive: true, force: true }) } catch {}
  }
})
