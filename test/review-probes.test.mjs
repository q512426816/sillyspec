/**
 * review-probes.test.mjs — 项目评审探针：解析/装载/行解析 + 双面任务书注入（2026-10-12-review-probe-injection）
 *
 * 验收面：
 *   ① parseReviewProbes：null/非数组容错、坏条目跳过+告警（fail-soft 零抛出）、scope 非法归 all、
 *      容量帽（条目 16/行 12/单行 300）截断留痕；
 *   ② loadReviewProbes：无 local.yaml/无段/坏 YAML → 空探针零阻断；
 *   ③ resolveProbeLines：scope 过滤（thin/thick/all）、lines 前缀、命令行源（真实 spawn echo +
 *      注入式失败/超时/超帽 fail-soft）；
 *   ④ renderReviewerTaskbook（thin 面）：probeLines 注入【项目评审探针】段在场 / 缺省零注入；
 *   ⑤ buildReviewerTaskBook（thick 面）：probeLines 注入「## 项目评审探针」段在场 / 缺省零变化；
 *   ⑥ config-schema 登记 review_probes 段在场。
 * 开放世界红线：用例内容刻意跨栈（文本行 + node 命令），不预设任何语言/框架。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseReviewProbes, loadReviewProbes, resolveProbeLines, assembleProbeLinesForScope, PROBE_LIMITS } from '../src/review-probes.js'
import { renderReviewerTaskbook } from '../src/flow-review.js'
import { buildReviewerTaskBook } from '../src/review-dispatch.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('parseReviewProbes：容错三态 + 坏条目 fail-soft + scope 非法归 all', () => {
  assert.deepEqual(parseReviewProbes(null), { probes: [], warnings: [] })
  const na = parseReviewProbes('not-array')
  assert.equal(na.probes.length, 0)
  assert.equal(na.warnings.length, 1)
  const r = parseReviewProbes([
    { id: 'good', lines: ['必查行'] },
    { lines: ['缺 id'] },                      // 坏条目：跳过
    { id: 'both-empty', lines: [], command: '' }, // lines 与 command 均空：跳过
    'string-entry',                              // 非对象：跳过
    { id: 'bad-scope', scope: 'whatever', lines: ['x'] }, // scope 非法 → all + 告警
  ])
  assert.equal(r.probes.length, 2)
  assert.equal(r.probes[0].id, 'good')
  assert.equal(r.probes[1].scope, 'all')
  assert.equal(r.warnings.filter((w) => w.includes('跳过')).length, 3)
  assert.ok(r.warnings.some((w) => w.includes('scope 非法')))
})

test('parseReviewProbes：容量帽截断留痕（条目/行/单行）', () => {
  const many = Array.from({ length: PROBE_LIMITS.MAX_PROBES + 2 }, (_, i) => ({ id: `p${i}`, lines: ['x'] }))
  const r1 = parseReviewProbes(many)
  assert.equal(r1.probes.length, PROBE_LIMITS.MAX_PROBES)
  assert.ok(r1.warnings.some((w) => w.includes('超帽')))
  const r2 = parseReviewProbes([{ id: 'p', lines: Array.from({ length: PROBE_LIMITS.MAX_LINES_PER_PROBE + 1 }, () => 'x') }])
  assert.equal(r2.probes[0].lines.length, PROBE_LIMITS.MAX_LINES_PER_PROBE)
  assert.ok(r2.warnings.some((w) => w.includes('lines') && w.includes('截断')))
  const long = 'x'.repeat(PROBE_LIMITS.MAX_LINE_CHARS + 10)
  const r3 = parseReviewProbes([{ id: 'p', lines: [long] }])
  assert.equal(r3.probes[0].lines[0].length, PROBE_LIMITS.MAX_LINE_CHARS)
  assert.ok(r3.warnings.some((w) => w.includes('单行超')))
})

test('loadReviewProbes：无文件/无段/坏 YAML 均空探针零阻断', () => {
  const base = mkdtempSync(join(tmpdir(), 'rp-'))
  try {
    assert.deepEqual(loadReviewProbes(base), { probes: [], warnings: [] }) // 无 local.yaml
    mkdirSync(base, { recursive: true })
    writeFileSync(join(base, 'local.yaml'), 'commands:\n  test: "node -e 0"\n')
    assert.deepEqual(loadReviewProbes(base), { probes: [], warnings: [] }) // 有文件无段
    writeFileSync(join(base, 'local.yaml'), 'review_probes: [::::bad yaml\n')
    const bad = loadReviewProbes(base)
    assert.equal(bad.probes.length, 0)
    assert.ok(bad.warnings.length >= 1)
    writeFileSync(join(base, 'local.yaml'), 'review_probes:\n  - id: smoke\n    lines:\n      - 启动冒烟必查\n')
    const ok = loadReviewProbes(base)
    assert.equal(ok.probes.length, 1)
    assert.equal(ok.probes[0].id, 'smoke')
  } finally { rmSync(base, { recursive: true, force: true }) }
})

test('resolveProbeLines：scope 过滤 + id 前缀 + 真实命令行源（跨平台 echo）', () => {
  const probes = parseReviewProbes([
    { id: 'thin-only', scope: 'thin', lines: ['A1'] },
    { id: 'thick-only', scope: 'thick', lines: ['B1'] },
    { id: 'both', lines: ['C1'], command: 'echo C-cmd' },
  ]).probes
  const thin = resolveProbeLines({ probes, scope: 'thin' })
  assert.deepEqual(thin.lines, ['thin-only｜A1', 'both｜C1', 'both｜C-cmd'])
  const thick = resolveProbeLines({ probes, scope: 'thick' })
  assert.deepEqual(thick.lines, ['thick-only｜B1', 'both｜C1', 'both｜C-cmd'])
  assert.deepEqual(thick.provenance, [])
})

test('resolveProbeLines：命令失败/超时/超帽 fail-soft（注入式 runCommand）', () => {
  const probes = parseReviewProbes([{ id: 'p', command: 'boom' }, { id: 'q', command: 'slow' }]).probes
  const r = resolveProbeLines({
    probes, scope: 'thin',
    runCommand: (cmd) => cmd === 'boom'
      ? { ok: false, warning: '命令失败（退出码 1）', lines: [] }
      : { ok: true, lines: ['l1', 'l2'], provenance: ['命令输出超 20 行截断'] },
  })
  assert.deepEqual(r.lines, ['q｜l1', 'q｜l2'])
  assert.ok(r.provenance.some((p) => p.includes('p') && p.includes('跳过')))
  assert.ok(r.provenance.some((p) => p.includes('q') && p.includes('截断')))
})

test('renderReviewerTaskbook（thin 面）：注入段在场 / 缺省零注入', () => {
  const args = { change: 'c1', changeDir: '/tmp/c1', head: 'a'.repeat(40) }
  const withProbe = renderReviewerTaskbook({ ...args, probeLines: ['smoke｜启动冒烟必查'] })
  assert.match(withProbe, /【项目评审探针（local\.yaml review_probes 注入/);
  assert.match(withProbe, /smoke｜启动冒烟必查/)
  assert.match(withProbe, /未答=未审/)
  const plain = renderReviewerTaskbook(args)
  assert.ok(!plain.includes('项目评审探针'))
  assert.ok(!plain.includes('smoke'))
  // 空数组同样零注入
  const emptyArr = renderReviewerTaskbook({ ...args, probeLines: [] })
  assert.ok(!emptyArr.includes('项目评审探针'))
})

test('buildReviewerTaskBook（thick 面）：注入段在场 / 缺省零变化', () => {
  const args = { stage: 'brainstorm', changeDir: '/tmp/c1', reviewRunId: 'run-1' }
  const withProbe = buildReviewerTaskBook({ ...args, probeLines: ['alias｜新增类名与既有别名扫描面冲突核对'] })
  assert.match(withProbe.workerPrompt, /## 项目评审探针（local\.yaml 注入/)
  assert.match(withProbe.workerPrompt, /alias｜新增类名与既有别名扫描面冲突核对/)
  const plain = buildReviewerTaskBook(args)
  assert.ok(!plain.workerPrompt.includes('项目评审探针'))
  // 注入不破坏既有结构：审查清单与产出方式段仍在
  assert.match(plain.workerPrompt, /## 审查清单/)
  assert.match(plain.workerPrompt, /## 产出方式/)
})

test('assembleProbeLinesForScope：装配便捷面（含装载告警透出）', () => {
  const base = mkdtempSync(join(tmpdir(), 'rp2-'))
  try {
    mkdirSync(base, { recursive: true })
    writeFileSync(join(base, 'local.yaml'), [
      'review_probes:',
      '  - id: cross',
      '    lines:',
      '      - 跨栈面必查（内容任意）',
      '  - {}',
    ].join('\n'))
    const thin = assembleProbeLinesForScope(base, 'thin')
    assert.deepEqual(thin.lines, ['cross｜跨栈面必查（内容任意）'])
    assert.ok(thin.warnings.some((w) => w.includes('跳过')))
  } finally { rmSync(base, { recursive: true, force: true }) }
})

test('config-schema：review_probes 段登记在场（readers 指向 src/review-probes.js）', () => {
  const src = readFileSync(join(ROOT, 'src', 'config-schema.js'), 'utf8')
  assert.match(src, /id: 'review_probes'/)
  assert.match(src, /parseReviewProbes \(src\/review-probes\.js\)/)
  assert.match(src, /零内容枚举、零语言\/框架绑定/)
})
