/**
 * review-inline-dispatch.test.mjs — 薄道评审平台单调用通道（2026-10-23-review-inline-dispatch）
 *
 * runThinReviewInline（probe→create→dispatch→有界轮询→三通道提取→validateReviewJson→落盘）：
 *   ① fake client 成功：回收落盘+reviewer=platform-inline+validateReviewJson 同一源通过（FR-01）
 *   ② probe 不可用：ok:false 零落盘（FR-02）
 *   ③ 超时：ok:false 零落盘、reason 含在途 mission 指引（FR-02）
 *   ④ 坏 JSON（schema 违规）：落盘即删件回退——validateReviewJson 同一源拒收（FR-03）
 *   ⑤ e2e 键未配置：评审缺席分支行为与改前一致（任务书+exit 1，无 inline 尝试行）（FR-02 零回归锚）
 *   ⑥ readFlowConfig reviewInlineWaitSeconds 三态（未配置 0/合法值/坏值 0）（FR-04）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runThinReviewInline } from '../src/review-dispatch.js'
import { readFlowConfig } from '../src/flow.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

const CHANGE = '2026-09-01-rid-1'
const HEAD_SHA = 'a'.repeat(40)

function fakeClient({ status = 'completed', result } = {}) {
  return {
    createMission: async () => ({ missionId: 'mission-abc12345' }),
    dispatchWorker: async () => ({ workerId: 'worker-xyz98765' }),
    listWorkers: async () => [{ id: 'worker-xyz98765', status }],
    getWorkerResult: async () => result,
  }
}
const okProbe = async () => ({ available: true })
const badProbe = async () => ({ available: false, reason: 'daemon-unreachable' })
const goodReview = (over = {}) => JSON.stringify({
  schemaVersion: 1, change: CHANGE, reviewer: 'subagent', verdict: 'PASS',
  reviewedAgainst: HEAD_SHA, findings: [],
  dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' },
  reviewedAt: '2026-10-23T00:00:00.000Z', ...over,
})

function tmpChangeDir() {
  const specBase = mkdtempSync(join(tmpdir(), 'rid-'))
  mkdirSync(join(specBase, 'local.yaml') ? specBase : specBase, { recursive: true })
  const changeDir = join(specBase, 'changes', CHANGE)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'project:\n  type: generic\n')
  return { specBase, changeDir }
}

test('① fake client 成功：回收落盘+reviewer=platform-inline+同一源校验通过', async () => {
  const { specBase, changeDir } = tmpChangeDir()
  try {
    const r = await runThinReviewInline({
      cwd: specBase, specBase, change: CHANGE, changeDir,
      taskbookText: '⚖️ 任务书正文（夹具）',
      waitMs: 3_000, pollIntervalMs: 10,
      client: fakeClient({ result: { answer: goodReview() } }),
      probe: okProbe,
    })
    assert.equal(r.ok, true, `应回收成功（实际 ${JSON.stringify(r).slice(0, 300)}）`)
    const p = join(changeDir, 'review.json')
    assert.ok(existsSync(p), 'review.json 落盘')
    const j = JSON.parse(readFileSync(p, 'utf8'))
    assert.equal(j.reviewer, 'platform-inline', 'reviewer 如实标注')
    assert.equal(j.verdict, 'PASS')
    assert.equal(j.reviewedAgainst, HEAD_SHA, '锚原样保留')
    assert.ok(String(r.missionId).includes('abc12345'), 'missionId 留痕')
  } finally { rmSync(specBase, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② probe 不可用：ok:false 零落盘', async () => {
  const { specBase, changeDir } = tmpChangeDir()
  try {
    const r = await runThinReviewInline({
      cwd: specBase, specBase, change: CHANGE, changeDir, taskbookText: 'taskbook',
      waitMs: 1_000, pollIntervalMs: 10,
      client: fakeClient(), probe: badProbe,
    })
    assert.equal(r.ok, false)
    assert.match(r.reason, /平台通道不可用/)
    assert.ok(!existsSync(join(changeDir, 'review.json')), '零落盘')
  } finally { rmSync(specBase, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 超时：ok:false 零落盘，reason 含在途 mission 指引', async () => {
  const { specBase, changeDir } = tmpChangeDir()
  try {
    const r = await runThinReviewInline({
      cwd: specBase, specBase, change: CHANGE, changeDir, taskbookText: 'taskbook',
      waitMs: 1_200, pollIntervalMs: 100,
      client: fakeClient({ status: 'running' }), probe: okProbe,
    })
    assert.equal(r.ok, false)
    assert.match(r.reason, /未完成.*mission.*平台 UI/, `超时留痕（实际：${r.reason}）`)
    assert.ok(!existsSync(join(changeDir, 'review.json')), '零落盘')
  } finally { rmSync(specBase, { recursive: true, force: true, maxRetries: 3 }) }
})

test('④ 坏 JSON（schema 违规）：落盘即删件回退——validateReviewJson 同一源拒收', async () => {
  const { specBase, changeDir } = tmpChangeDir()
  try {
    // 4a：answer 不是 JSON → 三通道提取不到
    const ra = await runThinReviewInline({
      cwd: specBase, specBase, change: CHANGE, changeDir, taskbookText: 't',
      waitMs: 2_000, pollIntervalMs: 10,
      client: fakeClient({ result: { answer: '我看过了没问题' } }), probe: okProbe,
    })
    assert.equal(ra.ok, false)
    assert.match(ra.reason, /提取不到 review JSON/)
    assert.ok(!existsSync(join(changeDir, 'review.json')), '4a 零落盘')
    // 4b：JSON 在场但 verdict 非法 → 落盘校验不过即删件
    const rb = await runThinReviewInline({
      cwd: specBase, specBase, change: CHANGE, changeDir, taskbookText: 't',
      waitMs: 2_000, pollIntervalMs: 10,
      client: fakeClient({ result: { answer: goodReview({ verdict: '看起来没问题' }) } }), probe: okProbe,
    })
    assert.equal(rb.ok, false)
    assert.match(rb.reason, /不符薄道 schema/, `schema 拒收留痕（实际：${rb.reason}）`)
    assert.ok(!existsSync(join(changeDir, 'review.json')), '4b 违规件已删（同一源把关，坏产物进不了登记）')
  } finally { rmSync(specBase, { recursive: true, force: true, maxRetries: 3 }) }
})

test('⑤ e2e 键未配置：评审缺席分支与改前一致（任务书+exit 1，无 inline 尝试）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'rid-e-'))
  const cn = '2026-09-01-rid-e2e'
  try {
    const run = (() => { const g = (a) => execFileSync('git', a, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim(); g(['init', '-q', '-b', 'main']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't']); return g })()
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
    writeFileSync(join(cwd, 'base.txt'), 'base\n')
    run(['add', '.']); run(['commit', '-q', '-m', 'base'])
    const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
    const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--input', 'inline 派发 e2e 夹具面\n\n成功标准：\n- 回退行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    const base = join(cwd, '.sillyspec', 'changes', cn)
    writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
      .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n夹具实质作答——触发盲维必评信号。')
      + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 新增 | docs/note.md | 交付 |\n')
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
    writeFileSync(join(base, 'tasks.md'), '---\nauthor: fixture\n---\n\n# 任务注册表（Tasks）\n\n- [x] task-01: 交付文档面（e2e 夹具）\n')
    mkdirSync(join(cwd, 'docs'), { recursive: true }); writeFileSync(join(cwd, 'docs', 'note.md'), '# n\n')
    writeFileSync(join(cwd, 'ev.txt'), 'ev\n')
    run(['add', 'ev.txt', 'docs/note.md']); run(['commit', '-q', '-m', `docs (${cn}) (task-01)`])
    const s = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn], { cwd, encoding: 'utf8', timeout: 300_000, env })
    const out = s.stdout + s.stderr
    assert.ok(s.status !== 0, '必评面停评审 exit 1')
    assert.match(out, /评审任务书如下，任务书原样复制给子代理/, '原版派发纪律横幅（逐字一致）')
    assert.match(out, /独立评审任务书/, '任务书在场')
    assert.ok(!out.includes('平台单调用'), '键未配置零 inline 尝试（零回归）')
    assert.ok(!out.includes('🛰️'), '无平台心跳输出')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('⑥ readFlowConfig reviewInlineWaitSeconds 三态', () => {
  const d = mkdtempSync(join(tmpdir(), 'rid-u-'))
  try {
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    const specBase = join(d, '.sillyspec')
    const p = join(specBase, 'local.yaml')
    writeFileSync(p, 'project:\n  type: generic\n')
    assert.equal(readFlowConfig(specBase).reviewInlineWaitSeconds, 0, '未配置 0=off')
    writeFileSync(p, 'project:\n  type: generic\nreview_inline_wait: 120\n')
    assert.equal(readFlowConfig(specBase).reviewInlineWaitSeconds, 120, '合法值 120')
    writeFileSync(p, 'project:\n  type: generic\nreview_inline_wait: 99999\n')
    assert.equal(readFlowConfig(specBase).reviewInlineWaitSeconds, 600, '超界钳到 600 帽')
    writeFileSync(p, 'project:\n  type: generic\nreview_inline_wait: abc\n')
    assert.equal(readFlowConfig(specBase).reviewInlineWaitSeconds, 0, '坏值 fail-soft 0')
    rmSync(p, { force: true })
    assert.equal(readFlowConfig(specBase).reviewInlineWaitSeconds, 0, '不可读 fail-soft 0')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})
