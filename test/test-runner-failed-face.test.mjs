/**
 * test-runner-failed-face.test.mjs — 失败面机制与自验口径（2026-10-20-scoped-verify-policy）
 *
 * 锁：①runner-failure-face 纯函数三件（parse 去空去重 / filter 交集+dropped / persist 全绿自清）；
 *   ②--failed flag E2E（env 指临时清单，含不存在项 → warn + 空交集 No test files found）；
 *   ③AGENTS.md 与 templates/agents-instruction.md 自验口径句逐字一致（模板随 init 传播）。
 * 本测试自身按新口径运行：变更测试面+lint 即收口证据，全量归 pre-push。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFailureList, filterToFailedFace, persistFailureList, readFailureList } from './runner-failure-face.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RUNNER = join(ROOT, 'test', 'run-tests.mjs')

test('① parseFailureList：trim/去空行/去重保序', () => {
  const r = parseFailureList('a.test.mjs\n\n  b.test.mjs  \r\na.test.mjs\n\n')
  assert.deepEqual(r, ['a.test.mjs', 'b.test.mjs'])
  assert.deepEqual(parseFailureList(''), [])
  assert.deepEqual(parseFailureList(null), [])
})

test('① filterToFailedFace：交集保序 + dropped 显式', () => {
  const files = ['/x/run-a.test.mjs', '/x/other.test.mjs', '/x/run-b.test.mjs']
  const { face, dropped } = filterToFailedFace(files, ['run-b.test.mjs', 'zzz-gone.test.mjs', 'run-a.test.mjs'])
  assert.deepEqual(face.map(f => f.split(/[\\/]/).pop()), ['run-a.test.mjs', 'run-b.test.mjs'], '按 files 顺序')
  assert.deepEqual(dropped, ['zzz-gone.test.mjs'], '缺失项不静默')
})

test('① persist/read：全绿自清 + 落盘可读', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rff-'))
  const p = join(dir, 'sub', 'list.txt')
  const r1 = persistFailureList(p, ['a.test.mjs', 'b.test.mjs'])
  assert.equal(r1.cleared, false)
  assert.deepEqual(readFailureList(p), ['a.test.mjs', 'b.test.mjs'], '落盘后可读')
  const r2 = persistFailureList(p, [])
  assert.equal(r2.cleared, true)
  assert.ok(!existsSync(p), '全绿自清')
  assert.equal(readFailureList(p), null, '清后读为 null')
  rmSync(dir, { recursive: true, force: true })
})

test('② --failed flag E2E：env 临时清单 + 不存在项 → warn + No test files found', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rff-e2e-'))
  const listPath = join(dir, 'failures.txt')
  writeFileSync(listPath, 'zzz-not-exist.test.mjs\n', 'utf8')
  const r = spawnSync(process.execPath, [RUNNER, '--failed'], {
    cwd: ROOT, encoding: 'utf8', timeout: 60_000,
    env: { ...process.env, SILLYSPEC_TEST_FAILURE_LIST: listPath },
  })
  const out = r.stdout + r.stderr
  assert.equal(r.status, 0, `runner 退出码应 0：\n${out.slice(0, 500)}`)
  assert.match(out, /--failed：仅重跑上次失败面/, '失败面提示在场')
  assert.match(out, /清单项不在当前测试集（改名\/已删，跳过）：zzz-not-exist\.test\.mjs/, '缺失项 warn')
  assert.match(out, /No test files found/, '空交集走 No test files found')
  assert.ok(!existsSync(listPath), '0 文件 0 失败 → 清单自清')
  rmSync(dir, { recursive: true, force: true })
})

test('③ AGENTS 双文件自验口径句逐字一致', () => {
  const read = (p) => readFileSync(join(ROOT, p), 'utf8')
  const a = read('AGENTS.md')
  const tpl = read('templates/agents-instruction.md')
  const KEY = '自验口径＝变更测试面（新增测试+受影响既有面）+ lint 即收口证据'
  for (const [name, text] of [['AGENTS.md', a], ['templates/agents-instruction.md', tpl]]) {
    assert.ok(text.includes(KEY), `${name} 含口径句`)
    assert.ok(text.includes('全量套件归 pre-push 门，勿每变更重复手跑'), `${name} 全量归属句`)
    assert.ok(text.includes('跑批输出落 `.sillyspec/.runtime/logs/` 日志回看尾部'), `${name} 日志落盘句`)
  }
  // 两文件口径段逐字一致（提取规则4整行比对）
  const rule4 = (t) => t.split('\n').find(l => l.startsWith('4. **实证核验再收口**'))
  assert.equal(rule4(a), rule4(tpl), '规则4两文件逐字一致')
})
