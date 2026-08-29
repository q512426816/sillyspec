// task-13（2026-08-29-change-delete-closure-and-spec-pull，跨仓 sillyspec）：
// X1 墓碑上报 + X3 步骤开始上报 + X4 execute 任务边界上报（design §5.5 / §8.2）。
//
// X1：删除/归档（unregisterChange 链、实体目录删除）后，progress 上行载荷含
//     changes[].status='deleted'（对齐既有 archived 语义；平台写路径由服务端 task-04 落地）。
//     兼容契约：常规终态推送保持原语义（archived/active 原值照推，platform-sync-archive-final-state
//     钉死），墓碑作为同端点同结构的追加 POST——顺序在常规推送之后。
// X3：步骤启动补推一次 progress（steps[].status=in-progress；仅载荷投影不写 DB；
//     无 --done 也推——经 triggerStepStartSync 钩子）。
// X4：execute Wave prompt 含每任务完成后的 triggerSync 等效上报指引
//     （sillyspec platform sync --change，per-task 粒度刷新 last_pushed_at）。
// 回归：既有每步 --done 推送路径行为不变（活跃变更载荷不含 deleted / pending 步不被误标）；
//     未连接平台静默跳过不崩；409 change_deleted 不落冲突文件不打横幅。
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + mock globalThis.fetch，绝不碰真实 .sillyspec/.runtime。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { SyncManager } from '../src/sync.js'
import { triggerStepStartSync } from '../src/run/shared.js'
import { buildWavePrompt } from '../src/stages/execute.js'

// env 通道优先于 local.yaml（daemon 注入）——清掉防宿主机环境污染 mock
delete process.env.SILLYHUB_PLATFORM_URL
delete process.env.SILLYHUB_PLATFORM_TOKEN
delete process.env.SILLYSPEC_DEBUG_SYNC

const tmpRoots = []
const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-tombstone-activity-${process.pid}-`))
tmpRoots.push(tmpRoot)

const { ProgressManager } = await import('../src/progress.js')

/** 建临时项目根：.sillyspec/ + local.yaml platform 段（connected=false 时只建目录） */
function makeFixture({ connected = true, mockUrl = 'http://127.0.0.1:9' } = {}) {
  const cwd = mkdtempSync(join(tmpRoot, `fx-`))
  tmpRoots.push(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  if (connected) {
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
      `platform:\n  url: ${mockUrl}\n  token: test-token\n`, 'utf8')
  }
  return cwd
}

/** mock fetch：记录调用 + 可编程 progress POST 响应（默认 200 {ok:true}） */
function mockFetch({ progressStatus = 200, progressBody = { ok: true } } = {}) {
  const calls = []
  const progressBodies = []
  const impl = async (url, options = {}) => {
    calls.push(`${options.method || 'GET'} ${url}`)
    if (/\/api\/changes\/[^/]+\/progress$/.test(url) && (options.method || 'GET') === 'POST') {
      progressBodies.push(JSON.parse(options.body))
      return {
        ok: progressStatus >= 200 && progressStatus < 300,
        status: progressStatus,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(progressBody),
      }
    }
    if (url.includes('/api/changes/-/spec-manifest')) {
      return {
        ok: true, status: 200, headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ files: {} }),
      }
    }
    if (url.includes('/api/changes/-/spec-sync')) {
      return {
        ok: true, status: 200, headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ ok: true, new_versions: {}, conflict: false }),
      }
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ ok: true }),
    }
  }
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return {
    calls, progressBodies,
    restore: () => { globalThis.fetch = saved },
  }
}

/** 种一个 change：plan 阶段两步（步1 completed / 步2 pending），DB 行 active */
function seedChange(cwd, name) {
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.init(cwd)
  pm.initChange(cwd, name)
  writeFileSync(join(cwd, '.sillyspec', 'changes', name, 'plan.md'), '# 计划\n', 'utf8')
  pm._write(cwd, {
    currentStage: 'plan',
    stages: {
      plan: {
        status: 'in-progress',
        steps: [
          { name: '拆解任务', status: 'completed', completedAt: '2026/08/29 10:00:00' },
          { name: '生成计划', status: 'pending' },
        ],
      },
    },
  }, name)
  return pm
}

// ─────────────────────────────────────────
// X1
// ─────────────────────────────────────────

test('X1-1 归档后（unregisterChange 链）→ 常规终态照推 + 追加墓碑 changes[].status=deleted', async () => {
  const cwd = makeFixture()
  const name = 'archived-change'
  const pm = seedChange(cwd, name)
  // 复刻归档收尾确定性副作用：目录移 archive/ + DB 行注销（unregisterChange）
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive', name), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'archive', name, 'plan.md'), '# 计划\n', 'utf8')
  rmSync(join(cwd, '.sillyspec', 'changes', name), { recursive: true, force: true })
  pm.unregisterChange(cwd, name)

  const m = mockFetch()
  try {
    const r = await new SyncManager(cwd).sync(name)
    assert.equal(r.synced, 1, '主推送成功')
    // 兼容契约：常规终态推送保持原语义（archived 原值）
    assert.ok(m.progressBodies.length >= 1, 'progress POST 到达')
    assert.equal(m.progressBodies[0].changes[0].status, 'archived', '首推保持 archived 原语义（既有回归）')
    // X1：墓碑载荷存在且形状正确
    const tombstones = m.progressBodies.filter(b => b.changes[0].status === 'deleted')
    assert.ok(tombstones.length >= 1, `墓碑上行到达（共 ${m.progressBodies.length} 次 POST）`)
    assert.equal(tombstones[0].changes[0].name, name, '墓碑载荷 changes[0].name 对应本变更')
  } finally { m.restore() }
})

test('X1-2 裸删（实体目录双失，DB 行仍 active）→ 常规推送照旧 + 追加墓碑 deleted', async () => {
  const cwd = makeFixture()
  const name = 'bare-deleted-change'
  seedChange(cwd, name)
  rmSync(join(cwd, '.sillyspec', 'changes', name), { recursive: true, force: true })

  const m = mockFetch()
  try {
    const r = await new SyncManager(cwd).sync(name)
    assert.equal(r.synced, 1, '主推送成功（DB 是进度真相源）')
    assert.equal(m.progressBodies[0].changes[0].status, 'active', '首推保持 active 原语义（既有回归）')
    assert.ok(
      m.progressBodies.some(b => b.changes[0].status === 'deleted'),
      '墓碑上行到达（目录双失 = 裸删收敛加速）',
    )
  } finally { m.restore() }
})

test('X1-3 活跃变更（目录在 + DB active）→ 不产生墓碑（既有 --done 推送路径回归）', async () => {
  const cwd = makeFixture()
  const name = 'active-change'
  seedChange(cwd, name)

  const m = mockFetch()
  try {
    const r = await new SyncManager(cwd).sync(name)
    assert.equal(r.synced, 1)
    assert.ok(m.progressBodies.length >= 1)
    for (const b of m.progressBodies) {
      assert.equal(b.changes[0].status, 'active', '活跃变更载荷恒 active，不误发墓碑')
    }
  } finally { m.restore() }
})

test('X1-4 平台 409 code=change_deleted → 拒收非冲突：不落冲突文件、不打横幅、单次往返', async () => {
  const cwd = makeFixture()
  const name = 'platform-deleted-change'
  seedChange(cwd, name)

  const m = mockFetch({
    progressStatus: 409,
    progressBody: { code: 'change_deleted', message: '该变更已在平台删除', change_name: name },
  })
  try {
    const r = await new SyncManager(cwd).sync(name)
    assert.equal(r.platformDeleted, true, '返回 platformDeleted 标记')
    assert.deepEqual(r.errors, [], 'errors 为空（非失败语义）')
    assert.equal(r.conflict, undefined, '不进入冲突路径')
    const progressPosts = m.calls.filter(c => c.startsWith('POST') && c.includes('/progress'))
    assert.equal(progressPosts.length, 1, '无重试风暴（单次往返即收敛）')
    const { existsSync } = await import('fs')
    assert.equal(
      existsSync(join(cwd, '.sillyspec', '.runtime', `sync-conflict-${name}.json`)), false,
      '不落 sync-conflict 文件（change_deleted ≠ base_ts 冲突）',
    )
  } finally { m.restore() }
})

test('X1-5 quick 会话名直调 sync → 不墓碑（quick 无平台 change 实体）', async () => {
  const cwd = makeFixture()
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.init(cwd)
  pm.initChange(cwd, 'quick-abcd1234') // quick 会话行（progress.js 对 quick 跳过实体目录）
  pm._write(cwd, { currentStage: 'quick', stages: { quick: { status: 'in-progress', steps: [{ name: '执行', status: 'pending' }] } } }, 'quick-abcd1234')
  pm.unregisterChange(cwd, 'quick-abcd1234') // quick --done 收尾也走 unregister

  const m = mockFetch()
  try {
    await new SyncManager(cwd).sync('quick-abcd1234')
    for (const b of m.progressBodies) {
      assert.notEqual(b.changes[0].status, 'deleted', 'quick 会话不产生墓碑载荷')
    }
  } finally { m.restore() }
})

// ─────────────────────────────────────────
// X3
// ─────────────────────────────────────────

test('X3-1 sync({stepStart:true}) → 载荷 current 步 steps[].status=in-progress（不写 DB）', async () => {
  const cwd = makeFixture()
  const name = 'step-start-change'
  const pm = seedChange(cwd, name)

  const m = mockFetch()
  try {
    const r = await new SyncManager(cwd).sync(name, { stepStart: true })
    assert.equal(r.synced, 1)
    const body = m.progressBodies[0]
    const genStep = body.steps.find(s => s.stage === 'plan' && s.name === '生成计划')
    const doneStep = body.steps.find(s => s.stage === 'plan' && s.name === '拆解任务')
    assert.equal(genStep.status, 'in-progress', '当前 pending 步投影为 in-progress')
    assert.equal(doneStep.status, 'completed', '已完成步不受影响')
    // 载荷投影不写 DB：重读 DB 步骤状态仍 pending
    const fresh = pm.serializeForSync(cwd, name)
    assert.equal(
      fresh.steps.find(s => s.stage === 'plan' && s.name === '生成计划').status, 'pending',
      'DB 步骤状态不被 stepStart 投影污染',
    )
  } finally { m.restore() }
})

test('X3-2 常规 sync（无 stepStart）→ pending 步保持 pending（--done 推送路径回归）', async () => {
  const cwd = makeFixture()
  const name = 'plain-sync-change'
  seedChange(cwd, name)

  const m = mockFetch()
  try {
    await new SyncManager(cwd).sync(name)
    const genStep = m.progressBodies[0].steps.find(s => s.stage === 'plan' && s.name === '生成计划')
    assert.equal(genStep.status, 'pending', '常规推送不误标 in-progress')
  } finally { m.restore() }
})

test('X3-3 triggerStepStartSync 钩子 → 无 --done 也推一次 progress（shared.js 步骤开始钩子）', async () => {
  const cwd = makeFixture()
  const name = 'hook-change'
  seedChange(cwd, name)

  const m = mockFetch()
  try {
    await triggerStepStartSync(cwd, name)
    const progressPosts = m.calls.filter(c => c.startsWith('POST') && c.includes(`/api/changes/${name}/progress`))
    assert.ok(progressPosts.length >= 1, '步骤开始即有一次 progress POST（无需 --done）')
    const genStep = m.progressBodies[0].steps.find(s => s.stage === 'plan' && s.name === '生成计划')
    assert.equal(genStep.status, 'in-progress', '钩子推送载荷含 steps[].status=in-progress')
  } finally { m.restore() }
})

// ─────────────────────────────────────────
// X4
// ─────────────────────────────────────────

test('X4-1 execute Wave prompt → 每任务完成后各触发一次上报指引（per-task 粒度）', () => {
  const wave = { index: 1, tasks: [{ index: 1, name: '做甲', file: 'src/a.js' }, { index: 2, name: '做乙', file: 'src/b.js' }] }
  const out = buildWavePrompt(wave, 1, null, 'C:/wt/fake', {})
  assert.match(out, /sillyspec platform sync --change <change-name>/, '含每任务 platform sync 上报命令')
  assert.match(out, /每任务一次|任务边界/, '明确每任务粒度语义')
})

// ─────────────────────────────────────────
// 回归：未连接平台静默
// ─────────────────────────────────────────

test('REG-1 未连接平台 → 静默跳过不崩（墓碑/步骤开始均不触发网络）', async () => {
  const cwd = makeFixture({ connected: false })
  const name = 'offline-change'
  seedChange(cwd, name)
  pmUnregisterArchive(cwd, name)

  const m = mockFetch()
  try {
    const r = await new SyncManager(cwd).sync(name)
    assert.equal(r.synced, 0)
    assert.match((r.errors[0] || ''), /未连接平台/)
    assert.equal(m.calls.length, 0, '无任何请求发出')
    await triggerStepStartSync(cwd, name)
    assert.equal(m.calls.length, 0, '步骤开始钩子同样静默')
  } finally { m.restore() }
})

/** offline 场景辅助：归档注销（不依赖 mock） */
function pmUnregisterArchive(cwd, name) {
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.unregisterChange(cwd, name)
}

process.on('exit', () => {
  for (const p of tmpRoots) { try { rmSync(p, { recursive: true, force: true }) } catch {} }
})
