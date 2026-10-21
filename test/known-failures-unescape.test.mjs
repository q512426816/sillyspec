/**
 * known_failures 三读侧 YAML 反转义对称回归（2026-10-21-known-failures-unescape）。
 *
 * 实战转写（2026-10-21-verify-reuse-large-repo 收口）：config known-failures add 写侧按
 * YAML 规范把 `doc-ref-check\.test\.mjs$` 写成 `"doc-ref-check\\.test\\.mjs$"`，三个读侧
 * （verify 判账 / docs-check / CLI 管理面）只剥引号不反转义——模式带着字面双反斜杠进
 * buildExemptPats，正则语义漂移为「字面反斜杠+任意字符」，豁免静默永不命中；CLI remove
 * 同因必未命中且文案恒称已移除。本文件锁死：round-trip 原样、三读侧一致、remove 诚实文案。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const u = (p) => new URL('file:///' + p.replace(/\\/g, '/').replace(/^\/*/, '')).href
const load = async (rel) => await import(u(join(ROOT, rel).replace(/\\/g, '/')))

const { unquoteYamlScalar, unescapeYamlDoubleQuoted } = await load('src/yaml-scalar-unquote.js')
const { parseKnownFailureKeys, applyKnownFailureEdit, runKnownFailuresCommand } = await load('src/config-known-failures.js')
const { extractKnownFailures, judgeTapOutput } = await load('src/verify-postcheck.js')
const { extractKnownFailureKeys } = await load('src/docs-check.js')

// ── 叶子单点矩阵 ───────────────────────────────────────────────────────────
test('unquoteYamlScalar / unescapeYamlDoubleQuoted：双引号转义集/单引号引号/裸值矩阵', () => {
  assert.equal(unescapeYamlDoubleQuoted('a\\\\.b$'), 'a\\.b$', '双引号内文 \\\\→\\（其余原样）')
  assert.equal(unescapeYamlDoubleQuoted('x\\"y\\n\\t'), 'x"y\n\t', '\\"→" / \\n→换行 / \\t→制表')
  assert.equal(unescapeYamlDoubleQuoted('q\\dz'), 'qdz', '未知转义回落字面')
  assert.equal(unquoteYamlScalar('"doc-ref-check\\\\.test\\\\.mjs$"'), 'doc-ref-check\\.test\\.mjs$', '双引号 token 反转义')
  assert.equal(unquoteYamlScalar("'it''s'"), "it's", "单引号 ''→'")
  assert.equal(unquoteYamlScalar('  bare.key  '), 'bare.key', '裸值 trim 原样')
  assert.equal(unquoteYamlScalar('"'), '"', '奇形引号不剥')
})

// ── round-trip：add 写入 → 三读侧原样 → 豁免真实命中 ────────────────────────
test('round-trip：含反斜杠锚定模式 add→三读侧解析原样→judgeTapOutput 豁免命中', () => {
  const pattern = 'doc-ref-check\\.test\\.mjs$' // 用户原样（单反斜杠）
  const r = applyKnownFailureEdit('known_failures: []\n', { add: [pattern] })
  assert.ok(r.ok, 'add 成功')
  assert.match(r.next, /"doc-ref-check\\\\\.test\\\\\.mjs\$"/, '文件里是规范 YAML 双引号转义形态')
  // 三读侧都拿到用户原样模式
  assert.deepEqual(parseKnownFailureKeys(r.next), [pattern], 'CLI 管理面读侧原样')
  assert.deepEqual(extractKnownFailures(r.next), [pattern], 'verify 判账读侧原样')
  assert.deepEqual(extractKnownFailureKeys(r.next), [pattern], 'docs-check 读侧原样')
  // 判账链终点：豁免真实命中 TAP not ok 行（修复前：正则里 \\\\. 语义=字面反斜杠+任意字符 → 永不命中）
  const tapOut = 'TAP version 13\nok 1 - a\nnot ok 12 - test\\doc-ref-check.test.mjs\n1..30'
  const judged = judgeTapOutput(1, tapOut, 'reason', [pattern])
  assert.equal(judged.status, 'passed', '锚定豁免真实生效')
  assert.equal(judged.remainingLines.length, 0)
})

test('三读侧一致性：块式×双引/单引/裸键混合 fixture 结果逐项相等', () => {
  const yamlBlock = [
    'known_failures:',
    '  - "anchor\\\\.escaped\\\\.key$"',
    "  - 'single''quote'",
    '  - bare.key',
    '  # 归因注释',
    'other_key: 1',
  ].join('\n')
  const expected = ['anchor\\.escaped\\.key$', "single'quote", 'bare.key']
  assert.deepEqual(parseKnownFailureKeys(yamlBlock), expected, 'CLI 侧（块式双引反转义）')
  assert.deepEqual(extractKnownFailures(yamlBlock), expected, 'verify 侧与 CLI 一致')
  assert.deepEqual(extractKnownFailureKeys(yamlBlock), expected, 'docs-check 侧与 CLI 一致')
})

// ── remove 诚实文案 + 原样键匹配 ───────────────────────────────────────────
test('remove 诚实文案：全命中无未命中括记 / 部分未命中仅注记未命中键 + 原样键匹配', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kfu-'))
  const logs = []
  const origLog = console.log
  const origErr = console.error
  console.log = (...a) => logs.push(a.join(' '))
  console.error = () => {}
  try {
    const yamlPath = join(dir, 'local.yaml')
    const pattern = 'some\\.flake\\.test\\.mjs$'
    writeFileSync(yamlPath, 'known_failures: []\n')
    // ① 全命中：remove 传入的键刚 add 过（原样键匹配存储转义键）
    runKnownFailuresCommand({ yamlPath, exists: true, verb: 'add', keys: [pattern] })
    const code = runKnownFailuresCommand({ yamlPath, exists: true, verb: 'remove', keys: [pattern] })
    assert.equal(code, 0)
    const removeMsg = logs.filter((l) => l.includes('已移除')).pop()
    assert.ok(removeMsg.includes('已移除：' + pattern), '移除消息含原样键')
    assert.ok(!removeMsg.includes('未命中'), '全命中不得打印未命中括注（旧文案恒打）')
    assert.deepEqual(parseKnownFailureKeys(readFileSync(yamlPath, 'utf8')), [], '键已移除')
    // ② 部分未命中：仅对未命中键注记
    writeFileSync(yamlPath, 'known_failures: ["keep\\\\.me$"]\n')
    runKnownFailuresCommand({ yamlPath, exists: true, verb: 'remove', keys: ['keep\\.me$', 'not\\.there$'] })
    const partial = logs.filter((l) => l.includes('已移除')).pop()
    assert.ok(partial.includes('已移除：keep\\.me$'), '命中键移除（原样键匹配存储转义键）')
    assert.match(partial, /未命中键静默忽略：not\\\.there\$/, '仅未命中键注记')
  } finally {
    console.log = origLog
    console.error = origErr
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})
