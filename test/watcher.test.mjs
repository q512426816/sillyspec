/**
 * watcher.test.mjs — watcher 观测旁路（R7 切片一 / D-001 / FR-01 FR-02）
 *
 * 覆盖验收面：
 *   ① inferEvents 纯函数：文件首现（阶段推断）/内容变更/checkbox 翻格（task-done 计数）/
 *      新提交/质量扫描记录出现与更新/archived 终态；全部事件恒带 provisional:true；
 *   ② aggregateStageTiming：阶段拆账聚合单调、按首事件时序输出；
 *   ③ 租约判死：心跳新鲜+pid 活→live；心跳过期→死（pid 复用假活兜底）；pid 死→死；
 *   ④ spawnWatcher 三态：SILLYSPEC_WATCHER=0→disabled；活租约→coalesced；正常→spawned
 *      （注入 spawnImpl 断言 detached/windowsHide/env 传参，不真起子进程）；
 *   ⑤ buildSnapshot：临时 change 子树快照（已知产物 hash+checkbox 计数+任务卡；gitHead
 *      注入；scan 记录 stat）；harness 解耦钉=事件源三源皆纯盘面/纯函数可驱动（无 CLI 调用）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const {
  inferEvents, createSentinelState, applySentinelRules, aggregateStageTiming, isWatcherLeaseLive, readWatcherLock,
  spawnWatcher, buildSnapshot, runWatcherFromEnv, WATCHER_LOCK_FILENAME,
  toPlatformChangeEvents, pushEventsToPlatform,
} = await import('../src/watcher.js')

// 子侧入口经 node -e bootstrap 动态 import 消费（静态零引用属预期），此处锚定存在性
assert.equal(typeof runWatcherFromEnv, 'function')

function snap(over = {}) {
  return { ts: 1700000000000, archived: false, head: null, files: {}, scan: null, ...over }
}

test('watcher-signal-widen: gate-run 与 config-change 事件', () => {
  const base = { ts: 1, archived: false, head: 'a', files: {}, scan: null, commits: [], dirtyCode: [], scanStatus: null, reviews: {}, gateRun: null, localConfig: null };
  const mk = (over) => ({ ...base, ...over });
  let ev = inferEvents(mk({}), mk({ ts: 2, gateRun: { dir: '20260928120000', status: 'failed', durationMs: 30000 } }));
  assert.ok(ev.some((e) => e.kind === 'gate-run' && e.detail.includes('failed')), JSON.stringify(ev));
  ev = inferEvents(mk({ gateRun: { dir: '20260928120000', status: 'failed', durationMs: 30000 } }), mk({ ts: 3, gateRun: { dir: '20260928120000', status: 'failed', durationMs: 30000 } }));
  assert.ok(!ev.some((e) => e.kind === 'gate-run'));
  ev = inferEvents(mk({ localConfig: { mtimeMs: 1 } }), mk({ ts: 4, localConfig: { mtimeMs: 99 } }));
  assert.ok(ev.some((e) => e.kind === 'config-change' && e.detail.includes('有变更')));
})

test('fake-check 生成器已退役（2026-09-29-watcher-fakecheck-retire）：勾选零证据不产嫌疑警告', () => {
  const st = createSentinelState(1000)
  const filesWith = (ids) => ({ 'tasks.md': { hash: 'h', stage: 'tasks', checked: ids.length, total: 4, checkedTasks: ids } })
  const snapWith = (ids, commits = []) => ({ ts: 2, archived: false, head: 'a', files: filesWith(ids), scan: null, commits, dirtyCode: [], scanStatus: null, reviews: {} })
  const r = applySentinelRules({ prev: snapWith([]), next: snapWith(['task-01']), state: st, now: 2000 })
  assert.ok(!r.warnings.some((w) => w.rule && w.rule.startsWith('fake-check')), JSON.stringify(r.warnings))
  assert.ok(st.fakeCheckPending === undefined, 'pending 状态面一并退役')
})

test('inferEvents: 文件首现带阶段推断 + provisional:true', () => {
  const next = snap({ files: { 'proposal.md': { hash: 'a', stage: 'proposal', checked: 0, total: 0 } } })
  const ev = inferEvents(snap(), next)
  assert.equal(ev.length, 1)
  assert.equal(ev[0].kind, 'file')
  assert.equal(ev[0].stage, 'proposal')
  assert.equal(ev[0].provisional, true)
})

test('inferEvents: 内容变更→file-update；checkbox 勾选数增加→task-done', () => {
  const prev = snap({ files: { 'tasks.md': { hash: 'a', stage: 'tasks', checked: 1, total: 3 } } })
  const next = snap({ files: { 'tasks.md': { hash: 'b', stage: 'tasks', checked: 2, total: 3 } } })
  const ev = inferEvents(prev, next)
  const kinds = ev.map((e) => e.kind).sort()
  assert.deepEqual(kinds, ['file-update', 'task-done'])
  const td = ev.find((e) => e.kind === 'task-done')
  assert.match(td.detail, /checked 1→2/)
  assert.ok(ev.every((e) => e.provisional === true))
})

test('inferEvents: git 新提交→commit 事件带短哈希', () => {
  const prev = snap({ head: 'abc1234' })
  const next = snap({ head: 'def5678' })
  const ev = inferEvents(prev, next)
  assert.equal(ev.length, 1)
  assert.equal(ev[0].kind, 'commit')
  assert.equal(ev[0].detail, 'def5678')
})

test('inferEvents: 质量扫描记录出现与更新→verify 事件', () => {
  const appear = inferEvents(snap(), snap({ scan: { mtimeMs: 1, size: 10 } }))
  assert.equal(appear.length, 1)
  assert.equal(appear[0].kind, 'verify')
  assert.equal(appear[0].stage, 'verify')
  const update = inferEvents(snap({ scan: { mtimeMs: 1, size: 10 } }), snap({ scan: { mtimeMs: 2, size: 12 } }))
  assert.equal(update.length, 1)
  assert.equal(update[0].kind, 'verify')
})

test('inferEvents: archived 终态唯一事件（change 目录移入 archive）', () => {
  const ev = inferEvents(snap(), snap({ archived: true }))
  assert.equal(ev.length, 1)
  assert.equal(ev[0].kind, 'archived')
})

test('inferEvents: 无变化零事件', () => {
  const s = snap({ head: 'a', files: { 'proposal.md': { hash: 'x', stage: 'proposal', checked: 0, total: 0 } } })
  assert.equal(inferEvents(s, snap({ ...s, ts: s.ts + 3000 })).length, 0)
})

test('aggregateStageTiming: 阶段聚合按首事件时序、时长单调', () => {
  const events = [
    { ts: 1000, kind: 'file', stage: 'proposal', provisional: true },
    { ts: 2500, kind: 'file', stage: 'proposal', provisional: true },
    { ts: 5000, kind: 'file', stage: 'design', provisional: true },
    { ts: 9000, kind: 'verify', stage: 'verify', provisional: true },
    { ts: 200, kind: 'commit', stage: null, provisional: true }, // 无 stage 不计入
  ]
  const timing = aggregateStageTiming(events)
  assert.deepEqual(timing.map((t) => t.stage), ['proposal', 'design', 'verify'])
  assert.equal(timing[0].durationMs, 1500)
  assert.equal(timing[0].events, 2)
})

test('租约判死: 心跳新鲜+pid 活→live；心跳过期→死（pid 复用假活兜底）', () => {
  const now = Date.now()
  const live = { pid: process.pid, heartbeatAt: now - 10_000 }
  assert.equal(isWatcherLeaseLive(live, now), true)
  const staleHb = { pid: process.pid, heartbeatAt: now - 6 * 60_000 }
  assert.equal(isWatcherLeaseLive(staleHb, now), false)
  const deadPid = { pid: -1, heartbeatAt: now }
  assert.equal(isWatcherLeaseLive(deadPid, now), false)
  const noHb = { pid: process.pid }
  assert.equal(isWatcherLeaseLive(noHb, now), false)
})

test('spawnWatcher: SILLYSPEC_WATCHER=0 → disabled（不 spawn）', async () => {
  const r = await spawnWatcher(process.cwd(), 'c1', {
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
    runtimeRoot: mkdtempSync(join(tmpdir(), 'wt-')),
  })
  assert.equal(r.status, 'disabled')
})

test('spawnWatcher: 活租约 → coalesced；正常 → spawned（detached+windowsHide+env 传参）', async () => {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'wt-'))
  // 活租约：本进程 pid + 新鲜心跳
  writeFileSync(join(runtimeRoot, WATCHER_LOCK_FILENAME), JSON.stringify({ pid: process.pid, change: 'c1', heartbeatAt: Date.now() }) + '\n')
  assert.equal(readWatcherLock(runtimeRoot).pid, process.pid)
  const coalesced = await spawnWatcher(process.cwd(), 'c1', {
    runtimeRoot,
    env: (() => { const e = { ...process.env }; delete e.NODE_TEST_CONTEXT; delete e.SILLYSPEC_WATCHER; return e })(),
  })
  assert.equal(coalesced.status, 'coalesced')

  // 判死后正常 spawn：注入 spawnImpl 断言参数，不真起子进程
  rmSync(join(runtimeRoot, WATCHER_LOCK_FILENAME))
  let spawnArgs = null
  const fakeSpawn = (cmd, args, opts) => {
    spawnArgs = { cmd, args, opts }
    return { unref() {} }
  }
  const spawned = await spawnWatcher(process.cwd(), 'c1', {
    runtimeRoot,
    env: (() => { const e = { ...process.env }; delete e.NODE_TEST_CONTEXT; delete e.SILLYSPEC_WATCHER; return e })(),
    spawnImpl: fakeSpawn,
  })
  assert.equal(spawned.status, 'spawned')
  assert.equal(spawnArgs.cmd, process.execPath)
  assert.equal(spawnArgs.opts.detached, true)
  assert.equal(spawnArgs.opts.windowsHide, true)
  assert.equal(spawnArgs.opts.env.SILLYSPEC_WATCHER_CHANGE, 'c1')
  assert.equal(existsSync(spawned.logPath), true)
  rmSync(runtimeRoot, { recursive: true, force: true })
})

test('buildSnapshot: 已知产物 hash+checkbox 计数+任务卡+scan stat（三源皆盘面，无 CLI 依赖）', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-'))
  const changeDir = join(root, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), '# P\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] t1\n- [ ] t2\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '- [x] a\n- [x] b\n- [ ] c\n')
  writeFileSync(join(changeDir, 'notes-unknown.md'), 'noise') // 未映射文件不入快照
  const runtimeRoot = join(root, '.runtime')
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(runtimeRoot, 'verify-quality-scan-c1.json'), '{}')

  const s = buildSnapshot({
    changeDir,
    cwd: root,
    runtimeRoot,
    changeName: 'c1',
    gitHeadImpl: () => 'abc1234',
  })
  assert.equal(s.archived, false)
  assert.equal(s.head, 'abc1234')
  assert.ok(s.files['proposal.md'].hash)
  assert.equal(s.files['tasks.md'].checked, 1)
  assert.equal(s.files['tasks.md'].total, 2)
  assert.equal(s.files['tasks/task-01.md'].checked, 2)
  assert.equal(s.files['tasks/task-01.md'].stage, 'tasks')
  assert.equal(s.files['notes-unknown.md'], undefined)
  assert.ok(s.scan && s.scan.size > 0)

  // 目录消失 → archived 快照（终态判定输入）
  const archivedSnap = buildSnapshot({
    changeDir: join(root, 'changes', 'moved-away'),
    cwd: root,
    runtimeRoot,
    changeName: 'c1',
    gitHeadImpl: () => null,
  })
  assert.equal(archivedSnap.archived, true)
  rmSync(root, { recursive: true, force: true })
})

test('孤儿自愈：首拍 archived 立即退出（真子进程，泄漏回归钉）', async () => {
  const { spawn } = await import('node:child_process')
  const root = mkdtempSync(join(tmpdir(), 'wt-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true }) // changes/c1 不建 → 首拍即 archived
  const r = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e',
      `import(${JSON.stringify(new URL('../src/watcher.js', import.meta.url).href)}).then(m => m.runWatcherFromEnv({
        SILLYSPEC_WATCHER_CHANGE: 'c1',
        SILLYSPEC_WATCHER_CWD: ${JSON.stringify(root)},
        SILLYSPEC_WATCHER_SPEC_BASE: ${JSON.stringify(specBase)},
        SILLYSPEC_WATCHER_RUNTIME_ROOT: ${JSON.stringify(join(specBase, '.runtime'))},
      }))`], { stdio: 'pipe' })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.on('exit', (code) => resolve({ code, out }))
    setTimeout(() => { try { child.kill() } catch {} }, 10_000)
  })
  assert.equal(r.code, 0)
  assert.match(r.out, /首拍即 archived/)
  rmSync(root, { recursive: true, force: true })
})

test('孤儿自愈：正常路径真子进程起跑（锁落盘+存活）——常量缺失类缺陷回归钉', async () => {
  const { spawn } = await import('node:child_process')
  const root = mkdtempSync(join(tmpdir(), 'wt-'))
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  const runtimeRoot = join(specBase, '.runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), '# p\n')
  const child = spawn(process.execPath, ['--input-type=module', '-e',
    `import(${JSON.stringify(new URL('../src/watcher.js', import.meta.url).href)}).then(m => m.runWatcherFromEnv({
      SILLYSPEC_WATCHER_CHANGE: 'c1',
      SILLYSPEC_WATCHER_CWD: ${JSON.stringify(root)},
      SILLYSPEC_WATCHER_SPEC_BASE: ${JSON.stringify(specBase)},
      SILLYSPEC_WATCHER_RUNTIME_ROOT: ${JSON.stringify(runtimeRoot)},
    })).catch((e) => { console.error('CHILD-DIED', e && e.message); process.exit(3) })`], { stdio: 'pipe' })
  let err = ''
  child.stderr.on('data', (d) => { err += d })
  // 轮询锁文件至 8s（正常路径应写锁并存活——常量缺失/启动崩类缺陷在此暴露）
  const lockPath = join(runtimeRoot, 'watcher.lock')
  let ok = false
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 100))
    if (existsSync(lockPath)) { ok = true; break }
    if (child.exitCode !== null) break
  }
  try { child.kill() } catch {}
  assert.ok(ok, `正常路径子进程应在 8s 内落锁存活（exitCode=${child.exitCode} stderr=${err.slice(0, 300)}）`)
  // Windows 清理竞态（2026-09-25 推送门实证：kill 异步，子进程未退时 rmSync 撞开着的锁文件 EPERM）：
  // 等退出再删；清理失败不连坐（残留交 tmpdir/suiteTmp 清理——stage-burst test.after 同款前例）
  await new Promise((r) => { if (child.exitCode !== null) return r(); child.once('exit', r); setTimeout(r, 2000) })
  try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄延迟残留，不阻断 */ }
})

// ── 平台事件上行对接（2026-09-27-watcher-push-endpoint：POST /api/changes/{name}/events 单条契约）──

test('toPlatformChangeEvents: 单事件契约映射——七键含稳定内容 id/stage 并入 detail 前缀/告警带 rule+severity/ts ISO UTC', () => {
  const ts = 1_740_000_000_000
  const [stageEv, warnEv] = toPlatformChangeEvents([
    { ts, kind: 'file', stage: 'proposal', detail: 'proposal.md 出现', provisional: true },
    { ts: ts + 5, kind: 'warning', stage: null, rule: 'fake-check', severity: 'warning', detail: 'tasks 勾选 task-01 无对应提交', provisional: true },
  ])
  // 顶层恰好七键（ChangeEventPushRequest + 铸的稳定 id，评审 P1：同拍多事件防去重吞）
  assert.deepEqual(Object.keys(stageEv).sort(), ['detail', 'id', 'kind', 'provisional', 'rule', 'severity', 'ts'])
  assert.equal(stageEv.kind, 'file')
  assert.equal(stageEv.rule, 'watcher')
  assert.equal(stageEv.severity, 'info')
  assert.equal(stageEv.detail, 'proposal · proposal.md 出现')
  assert.equal(stageEv.ts, new Date(ts).toISOString())
  assert.equal(stageEv.provisional, true)
  assert.ok(stageEv.id.length <= 512 && stageEv.id.includes('|'))
  // 告警：kind=warning（平台前端自动展开判定口径）+ rule/severity 顶层透传
  assert.equal(warnEv.kind, 'warning')
  assert.equal(warnEv.rule, 'fake-check')
  assert.equal(warnEv.severity, 'warning')
  assert.equal(warnEv.detail, 'tasks 勾选 task-01 无对应提交')
})

test('toPlatformChangeEvents: 同拍多事件（同 ts 同 rule）内容 id 互异——平台去重不吞拍（评审 P1 钉子）', () => {
  const ts = 1_740_000_000_000
  // watcher 一轮 diff 常见形态：tasks.md 出现（file）+ 首批勾选（task-done）同拍
  const [fileEv, doneEv] = toPlatformChangeEvents([
    { ts, kind: 'file', stage: 'tasks', detail: 'tasks.md 出现', provisional: true },
    { ts, kind: 'task-done', stage: 'tasks', detail: 'checked 0→3', provisional: true },
  ])
  assert.equal(fileEv.ts, doneEv.ts)
  assert.equal(fileEv.rule, doneEv.rule)
  assert.notEqual(fileEv.id, doneEv.id)  // 内容键分野——回退键 ts|watcher 会碰撞被吞
})

test('pushEventsToPlatform: 打点 /api/changes/{name}/events + Bearer 凭据 + 单条映射体逐条 POST', async () => {
  const calls = []
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true } }
  const events = [
    { ts: 1_740_000_000_000, kind: 'file', stage: 'proposal', detail: 'e0', provisional: true },
    { ts: 1_740_000_000_001, kind: 'task-done', stage: 'tasks', detail: 'checked 0→1', provisional: true },
  ]
  const r = await pushEventsToPlatform({
    specBase: join(tmpdir(), 'no-such-spec-base'),
    changeName: 'flow-chunk',
    events,
    env: { SILLYHUB_PLATFORM_URL: 'http://hub.test/', SILLYHUB_PLATFORM_TOKEN: 'shpsync_t' },
    fetchImpl,
  })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'http://hub.test/api/changes/flow-chunk/events')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer shpsync_t')
  const body0 = JSON.parse(calls[0].init.body)
  assert.equal(body0.kind, 'file')
  assert.deepEqual(Object.keys(body0).sort(), ['detail', 'id', 'kind', 'provisional', 'rule', 'severity', 'ts'])
  assert.equal(JSON.parse(calls[1].init.body).kind, 'task-done')
  assert.deepEqual(r, { pushed: true, count: 2 })
})

test('pushEventsToPlatform: local.yaml platform 段凭据通道（env 缺省时回落）', async () => {
  const specBase = mkdtempSync(join(tmpdir(), 'watcher-push-yaml-'))
  try {
    writeFileSync(join(specBase, 'local.yaml'), 'platform:\n  url: "http://yaml-hub.test"\n  token: shpsync_yaml\n', 'utf8')
    const calls = []
    const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true } }
    const r = await pushEventsToPlatform({
      specBase, changeName: 'c-yaml',
      events: [{ ts: 1_740_000_000_000, kind: 'commit', stage: null, detail: 'abc1234', provisional: true }],
      env: {}, fetchImpl,
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'http://yaml-hub.test/api/changes/c-yaml/events')
    assert.equal(calls[0].init.headers.Authorization, 'Bearer shpsync_yaml')
    assert.equal(JSON.parse(calls[0].init.body).kind, 'commit')
    assert.deepEqual(r, { pushed: true, count: 1 })
  } finally {
    rmSync(specBase, { recursive: true, force: true })
  }
})

test('pushEventsToPlatform: best-effort 降级三态——非 2xx / 无配置 / 逃生阀，均不抛', async () => {
  const events = [{ ts: 1_740_000_000_000, kind: 'file', stage: 'plan', detail: 'x', provisional: true }]
  const envCfg = { SILLYHUB_PLATFORM_URL: 'http://hub.test', SILLYHUB_PLATFORM_TOKEN: 'shpsync_t' }
  // ① 非 2xx（含 404 端点漂移/401 坏凭据）→ {pushed:false, reason:http-*}，不抛
  let calls = 0
  const r422 = await pushEventsToPlatform({
    specBase: join(tmpdir(), 'no-such'), changeName: 'c', events, env: envCfg,
    fetchImpl: async () => { calls += 1; return { ok: false, status: 422 } },
  })
  assert.deepEqual(r422, { pushed: false, reason: 'http-422' })
  assert.equal(calls, 1)
  // ② 无配置（env 与 local.yaml 双缺）→ {pushed:null, reason:no-config}，零网络
  const rNone = await pushEventsToPlatform({
    specBase: join(tmpdir(), 'no-such'), changeName: 'c', events, env: {},
    fetchImpl: async () => { throw new Error('should not fetch') },
  })
  assert.deepEqual(rNone, { pushed: null, reason: 'no-config' })
  // ③ 逃生阀 SILLYSPEC_WATCHER_PUSH=0 → {pushed:null}，零网络
  const rOff = await pushEventsToPlatform({
    specBase: join(tmpdir(), 'no-such'), changeName: 'c', events,
    env: { ...envCfg, SILLYSPEC_WATCHER_PUSH: '0' },
    fetchImpl: async () => { throw new Error('should not fetch') },
  })
  assert.deepEqual(rOff, { pushed: null })
})
