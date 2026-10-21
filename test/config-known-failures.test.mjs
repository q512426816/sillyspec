/**
 * config-known-failures（2026-10-21-p0-p1-hardening FR-07）
 *
 * dsh z2 实证：known_failures 无 CLI 管理面 → agent PS5.1 手改 local.yaml 写成 mojibake
 * （等用户 2h13m）。锁死契约：
 *   P1 parse：块式/流式/无段三形态键提取
 *   P2 行级手术：块式增删（其余行含注释逐字节保留）/ 流式增删 / 无段追加 / 删空归 []
 *   P3 坏 YAML 拒改（解析失败 → { ok:false }，文件不动）
 *   P4 文件级 roundtrip：mutateKnownFailuresFile + listKnownFailures（原子写、无 BOM）
 *   P5 CLI 薄壳：list 缺文件 exit 1 / 未知动作 exit 2 / add 空键 exit 2
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  parseKnownFailureKeys,
  applyKnownFailureEdit,
  listKnownFailures,
  mutateKnownFailuresFile,
  runKnownFailuresCommand,
} from '../src/config-known-failures.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('P1 parse：块式/流式/无段三形态', () => {
  const block = '# 顶部注释\nplatform:\n  url: x\nknown_failures:\n  - change-name.foo\n  - "decisions.behind_threshold"\nreview:\n  x: 1\n'
  assert.deepEqual(parseKnownFailureKeys(block), ['change-name.foo', 'decisions.behind_threshold'], '块式（含引号形态）')
  const inline = 'known_failures: [a.b, c-d] # 尾注释\n'
  assert.deepEqual(parseKnownFailureKeys(inline), ['a.b', 'c-d'], '流式含尾注释')
  const none = 'platform:\n  url: x\n'
  assert.deepEqual(parseKnownFailureKeys(none), [], '无段 → 空')
  const emptyInline = 'known_failures: []\n'
  assert.deepEqual(parseKnownFailureKeys(emptyInline), [], '流式空 → 空')
})

test('P2 行级手术：块式增删且其余行逐字节保留；无段追加；删空归 []', () => {
  const orig = [
    '# 用户注释：门禁豁免清单',
    'platform:',
    '  url: https://x',
    'known_failures:',
    '  - change-name.foo',
    'review:',
    '  enabled: true',
    '',
  ].join('\n')
  // 增
  const addR = applyKnownFailureEdit(orig, { add: ['change-name.bar'] })
  assert.equal(addR.ok, true)
  assert.deepEqual(addR.keys, ['change-name.foo', 'change-name.bar'])
  const addLines = addR.next.split('\n')
  assert.ok(addLines.includes('  - change-name.bar'), '新键条目行在场')
  assert.equal(addLines[0], '# 用户注释：门禁豁免清单', '顶部注释保留')
  assert.equal(addLines.indexOf('review:'), addLines.indexOf('  - change-name.bar') + 1, '后续段落位置保持')
  assert.ok(!addR.next.includes('change-name.foo#'), '原键行未被改写')
  // 删
  const rmR = applyKnownFailureEdit(addR.next, { remove: ['change-name.foo'] })
  assert.equal(rmR.ok, true)
  assert.deepEqual(rmR.keys, ['change-name.bar'])
  assert.ok(!rmR.next.split('\n').includes('  - change-name.foo'), '命中键行已删')
  assert.ok(rmR.next.includes('# 用户注释：门禁豁免清单'), '注释仍保留')
  // 删空
  const emptyR = applyKnownFailureEdit(rmR.next, { remove: ['change-name.bar'] })
  assert.equal(emptyR.ok, true)
  assert.deepEqual(emptyR.keys, [])
  assert.ok(emptyR.next.split('\n').includes('known_failures: []'), '删空归流式空形态（两种 reader 都认）')
  // 无段追加
  const noSection = 'platform:\n  url: x\n'
  const appR = applyKnownFailureEdit(noSection, { add: ['k1', 'k1', 'k2'] })
  assert.equal(appR.ok, true)
  assert.deepEqual(appR.keys, ['k1', 'k2'], '追加去重')
  assert.ok(appR.next.endsWith('known_failures:\n  - k1\n  - k2\n'), '文件尾整段追加')
  // 流式增删
  const inline = 'known_failures: [a, b] # 豁免\n'
  const inAdd = applyKnownFailureEdit(inline, { add: ['c'] })
  assert.ok(inAdd.ok && inAdd.next.includes('known_failures: [a, b, c] # 豁免'), `流式追加保尾注释：${inAdd.next.trim()}`)
  const inRm = applyKnownFailureEdit(inline, { remove: ['a'] })
  assert.ok(inRm.ok && inRm.next.includes('known_failures: [b] # 豁免'), '流式删除')
})

test('P3 坏 YAML 拒改：解析失败 → ok:false 且原文件不动', () => {
  const broken = 'platform:\n  url: [unclosed\n\xef\xbf\xbd mojibake ???'
  const r = applyKnownFailureEdit(broken, { add: ['k'] })
  assert.equal(r.ok, false, '拒改')
  assert.match(r.error, /解析失败/, `错误含修复指引方向：${r.error}`)
  // 顶层非映射同样拒（YAML 合法但形态异常）
  const scalar = 'just a string\n'
  const r2 = applyKnownFailureEdit(scalar, { add: ['k'] })
  assert.equal(r2.ok, false, '顶层标量拒改')
})

test('P4 文件级 roundtrip：add → list → remove；无 BOM；注释保留', () => {
  const d = mk('kf-')
  const p = join(d, 'local.yaml')
  writeFileSync(p, '# 项目本地配置\ncommands:\n  lint: npm run lint\n')
  const a = mutateKnownFailuresFile(p, { add: ['change-name.x1'] })
  assert.equal(a.ok, true)
  const buf = readFileSync(p)
  assert.notEqual(buf[0], 0xef, '无 BOM')
  const text = buf.toString('utf8')
  assert.ok(text.includes('# 项目本地配置'), '注释保留')
  assert.ok(text.includes('lint: npm run lint'), '其余段落保留')
  const l = listKnownFailures(p)
  assert.equal(l.ok, true)
  assert.deepEqual(l.keys, ['change-name.x1'])
  const r = mutateKnownFailuresFile(p, { remove: ['change-name.x1', 'not-there'] })
  assert.equal(r.ok, true, '未命中键静默忽略')
  assert.deepEqual(listKnownFailures(p).keys, [])
  // 坏 YAML 文件级拒改（文件保持原样）
  writeFileSync(p, 'bad: [unclosed\n')
  const before = readFileSync(p, 'utf8')
  const bad = mutateKnownFailuresFile(p, { add: ['k'] })
  assert.equal(bad.ok, false, '坏文件拒改')
  assert.equal(readFileSync(p, 'utf8'), before, '文件未被改动')
})

test('P5 CLI 薄壳退出码', () => {
  assert.equal(runKnownFailuresCommand({ yamlPath: 'x', exists: false, verb: 'list' }), 1, '缺文件 list → 1')
  assert.equal(runKnownFailuresCommand({ yamlPath: 'x', exists: true, verb: 'nonsense' }), 2, '未知动作 → 2')
  assert.equal(runKnownFailuresCommand({ yamlPath: 'x', exists: true, verb: 'add', keys: [] }), 2, 'add 空键 → 2')
  assert.equal(runKnownFailuresCommand({ yamlPath: 'x', exists: false, verb: 'add', keys: ['k'] }), 1, '缺文件 add → 1')
  const d = mk('kfcli-')
  const p = join(d, 'local.yaml')
  writeFileSync(p, 'known_failures: []\n')
  assert.equal(runKnownFailuresCommand({ yamlPath: p, exists: true, verb: 'list', json: true }), 0, 'list json → 0')
})
