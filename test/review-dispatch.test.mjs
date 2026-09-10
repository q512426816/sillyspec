// review-dispatch 核心单测（task-03 / FR-01~04 / D-001~003@1）——全 mock 零网络。
// 覆盖：任务书四要素 / 在途记录幂等与 O_EXCL / detectStall 三态（queued 不计时）/
// artifacts 双通道提取 / persistStageReview（schema 校验 + reviewer 落款 + docHash 机械重算）/
// create-status-kill 三链 / 中断分支。端到端全链路（task-07）同文件追加。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildReviewerTaskBook, readDispatchRecord, createDispatchRecord, clearDispatchRecord,
  detectStall, extractReviewFromArtifacts, persistStageReview, renderFallbackGuidance,
  runReviewDispatch, readReviewDispatchConfig,
} from '../src/review-dispatch.js'
import { validateStageReview } from '../src/stage-review.js'

function makeSpecBase() {
  const d = mkdtempSync(join(tmpdir(), 'rvd-'))
  mkdirSync(join(d, '.runtime'), { recursive: true })
  mkdirSync(join(d, 'changes', 'c1'), { recursive: true })
  writeFileSync(join(d, 'changes', 'c1', 'design.md'), '# d\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n| --- | --- |\n| 新增 | src/a.js |\n| 新增 | src/b.js |\n| 新增 | src/c.js |\n| 新增 | src/d.js |\n')
  writeFileSync(join(d, 'changes', 'c1', 'plan.md'), '---\nplan_level: full\n---\n# p\n')
  return d
}

const REVIEW_OBJ = {
  schemaVersion: 1, reviewType: 'design', specVerdict: 'pass', qualityVerdict: 'pass',
  reviewedFiles: ['changes/c1/design.md'], docHash: 'PLACEHOLDER',
  checklist: [{ item: '定义层', result: 'pass', note: '可测试定义齐' }],
  reviewerNotes: '平台 worker 审查通过',
}

function makeMockClient({ finalStatus = 'completed', review = REVIEW_OBJ } = {}) {
  const calls = { createMission: [], dispatchWorker: [], listWorkers: 0, getWorkerResult: 0 }
  return {
    calls,
    probeDaemon: async () => true,
    listToolsWithMeta: async () => ({ tools: [{ name: 'dispatch_worker', inputSchema: { properties: { worktree_path: {}, worker_prompt: {} } } }] }),
    getDaemonStatus: async () => ({ online: true }),
    createMission: async (args) => { calls.createMission.push(args); return { missionId: 'm-1' } },
    dispatchWorker: async (args) => { calls.dispatchWorker.push(args); return { workerId: 'w-1', status: 'queued' } },
    listWorkers: async () => { calls.listWorkers++; return [{ id: 'w-1', status: finalStatus }] },
    getWorkerResult: async () => { calls.getWorkerResult++; return { workerId: 'w-1', status: finalStatus, artifacts: [{ kind: 'review_json', content: JSON.stringify(review) }] } },
  }
}
const OK_PROBE = async () => ({ available: true, daemonOnline: true })

test('任务书四要素：清单/契约/产出方式/铁律', () => {
  const sb = makeSpecBase()
  try {
    const book = buildReviewerTaskBook({ stage: 'plan', changeDir: join(sb, 'changes', 'c1'), reviewRunId: 'review-t1' })
    assert.ok(book.workerPrompt.includes('task 编号与 Wave checkbox 格式正确'), '① 单源清单条目字面在任务书')
    assert.ok(book.workerPrompt.includes('review.json 产物契约'), '② 契约段在任务书')
    assert.ok(book.workerPrompt.includes('禁止修改任何文件、禁止 git commit、禁止写盘'), '④ 铁律段在任务书')
    assert.ok(book.workerPrompt.includes('artifacts'), '③ 产出方式（经 artifacts 返回）在任务书')
    assert.ok(book.objective.includes('plan'), 'objective 摘要含 stage')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('在途记录：O_EXCL 幂等拒双开；清记录即删文件', () => {
  const sb = makeSpecBase()
  try {
    const r1 = createDispatchRecord(sb, 'c1', { change: 'c1', stage: 'plan', missionId: 'm-1', workerId: null, state: 'dispatching', createdAt: 't', lastState: 'dispatching', lastStateAt: 1 })
    assert.equal(r1.created, true, '首建成功')
    const r2 = createDispatchRecord(sb, 'c1', { change: 'c1', missionId: 'm-2' })
    assert.equal(r2.created, false, '重复创建被拒（O_EXCL）')
    assert.equal(r2.existing.missionId, 'm-1', '带出既有记录供指引')
    assert.ok(readDispatchRecord(sb, 'c1').missionId === 'm-1')
    clearDispatchRecord(sb, 'c1')
    assert.equal(readDispatchRecord(sb, 'c1'), null, '清记录后无在途')
    assert.equal(clearDispatchRecord(sb, 'c1'), false, '再清 no-op')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('detectStall 三态：queued 不计时 / 超窗 stalled / 未超窗通过', () => {
  const base = { lastState: 'queued', lastStateAt: 1 }
  assert.deepEqual(detectStall(base, 9_999_999, 60_000), { stalled: false, queuedWait: true, hint: '' }, 'queued 不计时')
  assert.equal(detectStall({ lastState: 'running', lastStateAt: 0 }, 120_000, 60_000).stalled, true, 'running 超窗 → stalled')
  const r = detectStall({ lastState: 'running', lastStateAt: 100_000 }, 120_000, 60_000)
  assert.equal(r.stalled, false, '未超窗通过')
  assert.ok(detectStall({ lastState: 'running', lastStateAt: 0 }, 120_000, 60_000).hint.includes('--kill'), '停滞 hint 含三选项')
})

test('artifacts 双通道提取：kind 命中 / 文本兜底 / 全失败 null', () => {
  const obj = { schemaVersion: 1, specVerdict: 'pass' }
  assert.deepEqual(extractReviewFromArtifacts([{ kind: 'review_json', content: JSON.stringify(obj) }]), obj, 'kind 命中通道')
  assert.deepEqual(extractReviewFromArtifacts([{ kind: 'summary', text: `前置噪声 {\"schemaVersion\":1,\"specVerdict\":\"pass\"} 后置` }]), obj, '文本兜底提取首个平衡对象')
  assert.equal(extractReviewFromArtifacts([{ kind: 'other', text: 'no json here' }]), null, '无 JSON → null')
  assert.equal(extractReviewFromArtifacts(null), null, '非数组 → null')
  // 字符串内假 } 不截断
  const tricky = { note: 'a } b', specVerdict: 'pass' }
  assert.deepEqual(extractReviewFromArtifacts([{ kind: 'review', content: JSON.stringify(tricky) }]), tricky, '字符串字面量内 } 不误判')
})

test('persistStageReview：schema 校验 + reviewer 落款 + docHash 机械重算 + 产物过 validateStageReview', () => {
  const sb = makeSpecBase()
  try {
    const r = persistStageReview({
      runtimeRoot: join(sb, '.runtime'), stage: 'brainstorm', changeName: 'c1',
      reviewRunId: 'review-p1', reviewObj: { ...REVIEW_OBJ }, missionId: 'm-9',
      mainDocPath: join(sb, 'changes', 'c1', 'design.md'),
    })
    assert.equal(r.ok, true, '落盘成功')
    const onDisk = JSON.parse(readFileSync(r.reviewPath, 'utf8'))
    assert.deepEqual(onDisk.reviewer, { channel: 'platform', missionId: 'm-9', model: null }, 'reviewer 落款')
    assert.notEqual(onDisk.docHash, 'PLACEHOLDER', 'docHash 已按主文档机械重算')
    const v = validateStageReview({ stage: 'brainstorm', reviewType: 'design', runtimeRoot: join(sb, '.runtime'), reviewRunId: 'review-p1', searchDirs: [sb], verifyDocHash: true })
    assert.equal(v.ok, true, `落盘产物过 gate 同款校验（errors: ${JSON.stringify(v.errors)}）`)
    // 坏 review（缺 verdict）不落盘
    const bad = persistStageReview({
      runtimeRoot: join(sb, '.runtime'), stage: 'plan', changeName: 'c1',
      reviewRunId: 'review-p2', reviewObj: { schemaVersion: 1, reviewType: 'plan' }, missionId: 'm',
      mainDocPath: join(sb, 'changes', 'c1', 'design.md'),
    })
    assert.equal(bad.ok, false, 'schema 不过 → 拒落盘')
    assert.ok(Array.isArray(bad.errors) && bad.errors.length > 0)
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('create 链：probe 前置/external 参数/read_only+workerPrompt 派发/在途记录/异步返回', async () => {
  const sb = makeSpecBase()
  try {
    const cli = makeMockClient()
    const r = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'brainstorm', client: cli, probe: OK_PROBE })
    assert.equal(r.ok, true, 'create 成功')
    assert.equal(r.missionId, 'm-1')
    assert.ok(r.nextStep.includes('--status'), '返回值带 --status 指引（异步不阻塞）')
    assert.equal(cli.calls.createMission[0].orchestrationMode, 'external', 'orchestration_mode=external（关 orchestrator）')
    assert.equal(cli.calls.createMission[0].budgetUsd, 1.0, '预算上限默认')
    assert.equal(cli.calls.dispatchWorker[0].readOnly, true, 'read_only 派发')
    assert.ok(cli.calls.dispatchWorker[0].workerPrompt.includes('review.json 产物契约'), 'workerPrompt 含契约')
    const rec = readDispatchRecord(sb, 'c1')
    assert.equal(rec.state, 'in-flight', '在途记录 in-flight')
    assert.equal(rec.workerId, 'w-1')
    // 幂等：in-flight 重复 create 拒
    const r2 = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'brainstorm', client: cli, probe: OK_PROBE })
    assert.equal(r2.ok, false)
    assert.ok(r2.reason.includes('已有在途'))
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('create 链：probe 不可用 → 非零语义 + 降级指引（channel_priority 去 platform）', async () => {
  const sb = makeSpecBase()
  try {
    const r = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'plan', client: makeMockClient(), probe: async () => ({ available: false, reason: 'daemon-offline' }) })
    assert.equal(r.ok, false)
    assert.ok(r.reason.includes('daemon-offline'), 'reason 透传')
    assert.ok(r.guidance.includes('agent-tool') && !r.guidance.includes('platform ——'), '指引为剩余通道（无 platform 项）')
    assert.ok(r.guidance.includes('self'), '兜底 self 在指引内')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('create 链中断分支：dispatch_worker 抛错/无 workerId → abandoned + 处置文案', async () => {
  const sb = makeSpecBase()
  try {
    const cli = makeMockClient()
    cli.dispatchWorker = async () => { throw new Error('daemon rpc down') }
    const r = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'plan', client: cli, probe: OK_PROBE })
    assert.equal(r.ok, false)
    assert.ok(r.reason.includes('dispatch_worker 异常'), '异常转结果不抛')
    assert.ok(r.guidance.includes('abandoned') || r.reason.includes('abandoned') || r.guidance.includes('重派'), '处置文案')
    // 无 workerId 形态
    clearDispatchRecord(sb, 'c1')
    const cli2 = makeMockClient()
    cli2.dispatchWorker = async () => ({ workerId: null, status: 'failed' })
    const r2 = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'plan', client: cli2, probe: OK_PROBE })
    assert.equal(r2.ok, false)
    assert.ok(r2.reason.includes('workerId'), '无 workerId 报错')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('status 链：completed → 回收落盘 + 清记录 + verdict；failed → 清记录 + 降级指引', async () => {
  const sb = makeSpecBase()
  try {
    const cli = makeMockClient({ finalStatus: 'completed' })
    await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'brainstorm', client: cli, probe: OK_PROBE })
    const st = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: 'c1', client: cli, stallMs: 60_000_000 })
    assert.equal(st.ok, true, 'status completed 回收成功')
    assert.equal(st.state, 'completed')
    assert.ok(st.reviewPath && st.reviewPath.includes('stage-reviews'), 'review.json 落既有路径')
    assert.equal(st.verdict, 'pass/pass')
    assert.equal(readDispatchRecord(sb, 'c1'), null, '终态清记录（设计口径）')
    // failed 形态
    const cli2 = makeMockClient({ finalStatus: 'failed' })
    await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'plan', client: cli2, probe: OK_PROBE })
    const st2 = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: 'c1', client: cli2 })
    assert.equal(st2.ok, false)
    assert.equal(st2.state, 'failed')
    assert.ok(st2.guidance.includes('self'), '失败降级指引')
    assert.equal(readDispatchRecord(sb, 'c1'), null, '失败终态清记录')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('kill 链：清本地记录 + 平台处置指引（不自动 kill）', async () => {
  const sb = makeSpecBase()
  try {
    const cli = makeMockClient()
    await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'plan', client: cli, probe: OK_PROBE })
    const k = await runReviewDispatch({ mode: 'kill', cwd: sb, specBase: sb, changeName: 'c1' })
    assert.equal(k.ok, true)
    assert.ok(k.platformHint.includes('平台 UI'), '平台侧处置指引（人处置，不自动 kill）')
    assert.equal(readDispatchRecord(sb, 'c1'), null)
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('readReviewDispatchConfig：缺省/合法/坏 YAML 三态（task-06 契约预验）', () => {
  const d1 = mkdtempSync(join(tmpdir(), 'rvd-cfg-'))
  try {
    assert.deepEqual(readReviewDispatchConfig(d1), { budget_usd: 1.0, stall_ms: 900_000, timeout_ms: 0 }, '无配置 → 缺省')
    mkdirSync(join(d1, '.sillyspec'), { recursive: true })
    writeFileSync(join(d1, '.sillyspec', 'local.yaml'), 'review_dispatch:\n  budget_usd: 0.5\n  stall_ms: 300000\n  timeout_ms: 0\n')
    assert.deepEqual(readReviewDispatchConfig(d1), { budget_usd: 0.5, stall_ms: 300_000, timeout_ms: 0 }, '合法配置生效')
    writeFileSync(join(d1, '.sillyspec', 'local.yaml'), ':\n  broken: [\n')
    assert.deepEqual(readReviewDispatchConfig(d1), { budget_usd: 1.0, stall_ms: 900_000, timeout_ms: 0 }, '坏 YAML → 缺省不抛')
  } finally { rmSync(d1, { recursive: true, force: true }) }
})

// ── task-07：端到端全链路补充形态（生命周期契约表逐条对齐；全 mock 零网络）──

test('e2e：状态迁移序列 queued→running→completed + 停滞注入（lastStateAt 回拨）', async () => {
  const sb = makeSpecBase()
  try {
    // 演进型 mock：listWorkers 每次调用推进一态
    const seq = ['running', 'running', 'completed']
    let i = 0
    const cli = makeMockClient()
    cli.listWorkers = async () => { const st = seq[Math.min(i++, seq.length - 1)]; return [{ id: 'w-1', status: st }] }
    await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'brainstorm', client: cli, probe: OK_PROBE })
    const s1 = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: 'c1', client: cli, stallMs: 60_000_000 })
    assert.equal(s1.state, 'running', '第一次轮询：queued→running（迁移更新记录）')
    const rec = readDispatchRecord(sb, 'c1')
    assert.equal(rec.lastState, 'running', '状态迁移已写入在途记录')
    // 停滞注入：回拨 lastStateAt 超窗 → stalled 提示三选项
    const { writeFileSync: wf } = await import('node:fs')
    wf(join(sb, '.runtime', 'review-dispatch-c1.json'), JSON.stringify({ ...rec, lastStateAt: Date.now() - 16 * 60_000 }))
    const s2 = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: 'c1', client: cli, stallMs: 15 * 60_000 })
    assert.equal(s2.stalled, true, 'running 超 15 分钟无迁移 → stalled')
    assert.ok(s2.stallHint.includes('--kill') && s2.stallHint.includes('继续等'), '停滞提示三选项（继续等/kill/降级）')
    const s3 = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: 'c1', client: cli, stallMs: 60_000_000 })
    assert.equal(s3.state, 'completed', '第三次轮询：completed → 回收')
    assert.ok(s3.reviewPath, 'review.json 落盘')
    assert.equal(readDispatchRecord(sb, 'c1'), null, '终态清记录')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})

test('e2e：dispatching 中断恢复——status 对中断记录给处置指引', async () => {
  const sb = makeSpecBase()
  try {
    createDispatchRecord(sb, 'c1', {
      change: 'c1', stage: 'plan', missionId: 'm-x', workerId: null, state: 'dispatching',
      createdAt: new Date().toISOString(), lastState: 'dispatching', lastStateAt: Date.now(), reviewRunId: 'review-r9',
    })
    const cli = makeMockClient()
    cli.listWorkers = async () => []  // 无 workerId 可查（dispatch 中断形态）
    const st = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: 'c1', client: cli, stallMs: 60_000_000 })
    assert.equal(st.ok, true, '不抛不阻断')
    assert.equal(st.state, 'unknown', '无 worker 状态 unknown')
    // 中断处置出口：--kill 清记录后可重派
    await runReviewDispatch({ mode: 'kill', cwd: sb, specBase: sb, changeName: 'c1' })
    assert.equal(readDispatchRecord(sb, 'c1'), null)
    const r2 = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: 'c1', stage: 'plan', client: cli, probe: OK_PROBE })
    assert.equal(r2.ok, true, 'kill 后重派成功（abandoned 不阻塞新派发）')
  } finally { rmSync(sb, { recursive: true, force: true }) }
})
