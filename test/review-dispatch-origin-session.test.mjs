/**
 * review-dispatch-origin-session.test.mjs — 会话展示锚点接线（2026-11-13-review-dispatch-origin-session）
 *
 * 主仓跨仓契约（multi-agent-platform 2026-11-12-review-dispatch-session-display）：
 * 派发侧读 env SILLYHUB_SESSION_ID → create_mission 传 origin_session_id + origin_kind；
 * 回收成功后 best-effort 调 converge_mission 纯置位；影子链路不传；execute 路径A
 * 指令模板含 origin 指引但维持 D-004（不调 converge）。
 *
 * 覆盖：
 *   ① 厚道 create：env 非空 → createMission 收到 originSessionId/originKind='review'
 *   ② 厚道 create：env 缺失 → 不传两键（零回归）
 *   ③ 厚道 status 回收成功 → convergeMission 调用一次（参数 missionId）
 *   ④ 厚道 status 提取失败（completed-no-artifact）→ 不调 converge
 *   ⑤ 薄道 inline：传参 + 校验通过落盘后 converge
 *   ⑥ execute 路径A指令模板：env 非空含 origin 行 / env 空无该行
 *   ⑦ client：origin 成对透传 snake_case；单值不传；convergeMission 封装
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  runReviewDispatch,
  runThinReviewInline,
} from '../src/review-dispatch.js'
import { renderSillyHubInstruction } from '../src/dispatch/backends/sillyhub-mcp.js'
import { SillyHubMcpClient } from '../src/sillyhub-mcp/client.js'

const CHANGE = 'c1'

function makeSpecBase() {
  const d = mkdtempSync(join(tmpdir(), 'rvdo-'))
  mkdirSync(join(d, '.runtime'), { recursive: true })
  mkdirSync(join(d, 'changes', CHANGE), { recursive: true })
  writeFileSync(join(d, 'changes', CHANGE, 'design.md'), '# d\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n | --- | --- |\n| 新增 | src/a.js |\n| 新增 | src/b.js |\n| 新增 | src/c.js |\n| 新增 | src/d.js |\n')
  writeFileSync(join(d, 'changes', CHANGE, 'plan.md'), '---\nplan_level: full\n---\n# p\n')
  return d
}

const REVIEW_OBJ = {
  schemaVersion: 1, reviewType: 'design', specVerdict: 'pass', qualityVerdict: 'pass',
  reviewedFiles: [`changes/${CHANGE}/design.md`], docHash: 'PLACEHOLDER',
  checklist: [{ item: '定义层', result: 'pass', note: '可测试定义齐' }],
  reviewerNotes: '平台 worker 审查通过',
}

/** 厚道 mock client：记录 createMission/convergeMission 调用。 */
function mockThickClient({ finalStatus = 'completed', review = REVIEW_OBJ, reviewRaw } = {}) {
  const calls = { createMission: [], convergeMission: [] }
  return {
    calls,
    probeDaemon: async () => true,
    createMission: async (args) => { calls.createMission.push(args); return { missionId: 'm-1' } },
    dispatchWorker: async () => ({ workerId: 'w-1', status: 'queued' }),
    listWorkers: async () => [{ id: 'w-1', status: finalStatus }],
    getWorkerResult: async () => ({
      workerId: 'w-1', status: finalStatus,
      artifacts: [{ kind: 'review_json', content: reviewRaw ?? JSON.stringify(review) }],
    }),
    convergeMission: async (args) => { calls.convergeMission.push(args); return { ok: true } },
  }
}

/** 薄道 mock client（同 review-inline-dispatch 形态 + 调用记录）。 */
function mockThinClient(result) {
  const calls = { createMission: [], convergeMission: [] }
  return {
    calls,
    createMission: async (args) => { calls.createMission.push(args); return { missionId: 'mission-abc12345' } },
    dispatchWorker: async () => ({ workerId: 'worker-xyz98765' }),
    listWorkers: async () => [{ id: 'worker-xyz98765', status: 'completed' }],
    getWorkerResult: async () => result,
    convergeMission: async (args) => { calls.convergeMission.push(args); return { ok: true } },
  }
}
const OK_PROBE = async () => ({ available: true, daemonOnline: true })

const withEnv = (v, fn) => async () => {
  const prev = process.env.SILLYHUB_SESSION_ID
  try {
    if (v === undefined) delete process.env.SILLYHUB_SESSION_ID
    else process.env.SILLYHUB_SESSION_ID = v
    await fn()
  } finally {
    if (prev === undefined) delete process.env.SILLYHUB_SESSION_ID
    else process.env.SILLYHUB_SESSION_ID = prev
  }
}

test('① 厚道 create：env 非空 → originSessionId/originKind=review 透传', withEnv('sess-123', async () => {
  const sb = makeSpecBase()
  try {
    const client = mockThickClient()
    const r = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: CHANGE, stage: 'brainstorm', client, probe: OK_PROBE })
    assert.equal(r.ok, true, `应派发成功（${JSON.stringify(r).slice(0, 200)}）`)
    assert.equal(client.calls.createMission.length, 1)
    const args = client.calls.createMission[0]
    assert.equal(args.originSessionId, 'sess-123', 'originSessionId 透传')
    assert.equal(args.originKind, 'review', '厚道评审 kind=review')
    assert.equal(args.orchestrationMode, 'external')
  } finally { rmSync(sb, { recursive: true, force: true, maxRetries: 3 }) }
}))

test('② 厚道 create：env 缺失 → 不传两键（零回归）', withEnv(undefined, async () => {
  const sb = makeSpecBase()
  try {
    const client = mockThickClient()
    const r = await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: CHANGE, stage: 'brainstorm', client, probe: OK_PROBE })
    assert.equal(r.ok, true)
    const args = client.calls.createMission[0]
    assert.equal(args.originSessionId, undefined, 'env 缺失不传 originSessionId')
    assert.equal(args.originKind, undefined, 'env 缺失不传 originKind')
  } finally { rmSync(sb, { recursive: true, force: true, maxRetries: 3 }) }
}))

test('③ 厚道 status 回收成功 → convergeMission 收口一次', withEnv('sess-123', async () => {
  const sb = makeSpecBase()
  try {
    const client = mockThickClient()
    await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: CHANGE, stage: 'brainstorm', client, probe: OK_PROBE })
    const r = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: CHANGE, client })
    assert.equal(r.ok, true, `回收应成功（${JSON.stringify(r).slice(0, 200)}）`)
    assert.equal(client.calls.convergeMission.length, 1, '回收成功后 converge 一次')
    assert.equal(client.calls.convergeMission[0].missionId, 'm-1')
  } finally { rmSync(sb, { recursive: true, force: true, maxRetries: 3 }) }
}))

test('④ 厚道 status 提取失败（completed-no-artifact）→ 不调 converge', withEnv('sess-123', async () => {
  const sb = makeSpecBase()
  try {
    const client = mockThickClient({ reviewRaw: '前导噪声非 JSON' })
    await runReviewDispatch({ mode: 'create', cwd: sb, specBase: sb, changeName: CHANGE, stage: 'brainstorm', client, probe: OK_PROBE })
    const r = await runReviewDispatch({ mode: 'status', cwd: sb, specBase: sb, changeName: CHANGE, client })
    assert.equal(r.ok, false)
    assert.equal(r.state, 'completed-no-artifact')
    assert.equal(client.calls.convergeMission.length, 0, '提取失败不收口（mission 留在途供 salvage/人工）')
  } finally { rmSync(sb, { recursive: true, force: true, maxRetries: 3 }) }
}))

test('⑤ 薄道 inline：传参 + 校验通过落盘后 converge', withEnv('sess-456', async () => {
  const specBase = mkdtempSync(join(tmpdir(), 'rvdo-t-'))
  mkdirSync(specBase, { recursive: true })
  const changeDir = join(specBase, 'changes', CHANGE)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'project:\n  type: generic\n')
  const goodReview = JSON.stringify({
    schemaVersion: 1, change: CHANGE, reviewer: 'subagent', verdict: 'PASS',
    reviewedAgainst: 'a'.repeat(40), findings: [],
    dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' },
    reviewedAt: '2026-11-13T00:00:00.000Z',
  })
  try {
    const client = mockThinClient({ answer: goodReview })
    const r = await runThinReviewInline({
      cwd: specBase, specBase, change: CHANGE, changeDir,
      taskbookText: '⚖️ 任务书正文（夹具）',
      waitMs: 3_000, pollIntervalMs: 10,
      client, probe: OK_PROBE,
    })
    assert.equal(r.ok, true, `薄道应成功（${JSON.stringify(r).slice(0, 300)}）`)
    const args = client.calls.createMission[0]
    assert.equal(args.originSessionId, 'sess-456')
    assert.equal(args.originKind, 'review')
    assert.equal(client.calls.convergeMission.length, 1, '落盘成功后 converge 一次')
    assert.equal(client.calls.convergeMission[0].missionId, 'mission-abc12345')
  } finally { rmSync(specBase, { recursive: true, force: true, maxRetries: 3 }) }
}))

test('⑥ execute 路径A指令模板：env 非空含 origin 行 / env 空无该行', async () => {
  const contract = { brief: 'b', worktreePath: 'C:/w', branch: 'sillyspec/x', runId: 'r1' }
  const prev = process.env.SILLYHUB_SESSION_ID
  try {
    process.env.SILLYHUB_SESSION_ID = 'sess-exec-9'
    const withAnchor = renderSillyHubInstruction(contract)
    assert.ok(withAnchor.includes('origin_session_id'), 'env 非空 → 指令含 origin_session_id 指引')
    assert.ok(withAnchor.includes('`sess-exec-9`'), '指令内嵌 env 值')
    assert.ok(withAnchor.includes("'execute'") || withAnchor.includes('`execute`'), 'kind=execute 指引')
    assert.ok(!withAnchor.includes('converge_mission'), '指令模板维持 D-004：不出现 converge 调用指引')
    delete process.env.SILLYHUB_SESSION_ID
    const withoutAnchor = renderSillyHubInstruction(contract)
    assert.ok(!withoutAnchor.includes('origin_session_id'), 'env 缺失 → 无 origin 行（零回归）')
  } finally {
    if (prev === undefined) delete process.env.SILLYHUB_SESSION_ID
    else process.env.SILLYHUB_SESSION_ID = prev
  }
})

test('⑦ client：origin 成对透传 snake_case / 单值不传 / convergeMission 封装', async () => {
  const cli = new SillyHubMcpClient({ url: 'http://127.0.0.1:9999', token: 'shmcp_t' })
  const seen = []
  cli._callTool = async (toolName, args) => {
    seen.push([toolName, args])
    return { content: [{ type: 'text', text: JSON.stringify({ mission_id: 'm-9', ok: true }) }] }
  }
  // 成对 → snake_case 两键
  await cli.createMission({ objective: 'o', orchestrationMode: 'external', originSessionId: 's1', originKind: 'review' })
  let [, args] = seen[0]
  assert.equal(args.origin_session_id, 's1')
  assert.equal(args.origin_kind, 'review')
  // 单值（缺 kind）→ 整体不传（平台参数对约束）
  await cli.createMission({ objective: 'o', orchestrationMode: 'external', originSessionId: 's2' })
  ;[, args] = seen[1]
  assert.equal(args.origin_session_id, undefined, '单值不传')
  assert.equal(args.origin_kind, undefined)
  // convergeMission 封装
  const r = await cli.convergeMission({ missionId: 'm-9' })
  assert.equal(r.ok, true)
  const [toolName, cArgs] = seen[2]
  assert.equal(toolName, 'converge_mission')
  assert.equal(cArgs.mission_id, 'm-9')
})
