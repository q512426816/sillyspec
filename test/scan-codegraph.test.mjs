/**
 * scan-codegraph 单测（change: 2026-11-14-scan-incremental / task-01）。
 * 纯 mock 注入（execFile / env 可替换），不真 spawn codegraph——探测三态×降级路径、
 * 形状映射防御式（污染输出/缺字段）、cmd-shim 解析、env 注入断言、截断标记。
 * 形状夹具 = 2026-11-14 本机实测 codegraph 1.6.2 发布包输出（design.md Phase 1 实测口径）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  probeCodegraph, listIndexFiles, affectedTests, resolveCodegraphCommand,
  parseCmdShim, CODEGRAPH_ENV, CODEGRAPH_TIMEOUTS_MS, AFFECTED_TESTS_LIMIT,
  _resetCodegraphCommandCache,
} from '../src/scan-codegraph.js'

// ── 夹具 ─────────────────────────────────────────────────────────────────────

/** 实测 status -j 形状（2026-11-14 multi-agent-platform 仓真实输出裁剪） */
const STATUS_OK = JSON.stringify({
  initialized: true, version: '1.6.2', projectPath: 'C:\\repo',
  fileCount: 4099, nodeCount: 75484, edgeCount: 236603,
  pendingChanges: { added: 0, modified: 0, removed: 0 },
  index: { builtWithVersion: '1.6.2', state: 'complete', reindexRecommended: false, pendingRefs: 0 },
})

const STATUS_NOT_INIT = JSON.stringify({ initialized: false, fileCount: 0, index: null })
const STATUS_INCOMPLETE = JSON.stringify({ initialized: true, fileCount: 100, index: { state: 'indexing', reindexRecommended: false } })

/** mock execFile 工厂：按序返回/抛错，并记录调用参数 */
function mockExecFile(results) {
  const calls = []
  const fn = async (cmd, args, opts) => {
    calls.push({ cmd, args, opts })
    const r = results.shift()
    if (r instanceof Error) throw r
    return { stdout: r, stderr: '' }
  }
  fn.calls = calls
  return fn
}

const ROOT = 'C:\\proj'

// ── probeCodegraph 探测三态 × 降级路径（fail-soft 零 throw）──────────────────

test('probeCodegraph：索引就绪 → available:true 且 status 保留', async () => {
  const ex = mockExecFile([STATUS_OK])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, true)
  assert.equal(r.status.fileCount, 4099)
  // cmd 可能是裸名（fallback）或 Windows cmd-shim 解析出的 node 入口（真机环境 where 命中）——
  // 不锁裸名，断言用户参数完整追加在 baseArgs 之后（末 3 项恒为 status/-j 形态）
  assert.ok(typeof ex.calls[0].cmd === 'string' && ex.calls[0].cmd.length > 0)
  assert.deepEqual(ex.calls[0].args.slice(-3), ['status', ROOT, '-j'])
})

test('probeCodegraph：命令不存在（ENOENT）→ available:false 中文原因', async () => {
  const ex = mockExecFile([Object.assign(new Error('spawn codegraph ENOENT'), { code: 'ENOENT' })])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, false)
  assert.match(r.reason, /未安装 codegraph/)
})

test('probeCodegraph：未初始化（initialized=false）→ available:false', async () => {
  const ex = mockExecFile([STATUS_NOT_INIT])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, false)
  assert.match(r.reason, /未初始化/)
  assert.equal(r.status.initialized, false)
})

test('probeCodegraph：索引未完成（state!=complete）→ available:false', async () => {
  const ex = mockExecFile([STATUS_INCOMPLETE])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, false)
  assert.match(r.reason, /未完成/)
})

test('probeCodegraph：超时（ETIMEDOUT）→ available:false 不抛', async () => {
  const ex = mockExecFile([Object.assign(new Error('execution timed out ETIMEDOUT'), { code: 'ETIMEDOUT' })])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, false)
  assert.match(r.reason, /超时/)
})

test('probeCodegraph：纯非 JSON 输出 → available:false（不可解析），不 throw', async () => {
  const ex = mockExecFile(['npm warn config global `--global`\nno json here'])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, false)
  assert.match(r.reason, /不可解析/)
})

test('probeCodegraph：输出混 npm 噪声前缀行但含完整 JSON → 仍解析成功（Review Focus #1）', async () => {
  const ex = mockExecFile([`npm warn something\n${STATUS_OK}\nnpm notice tail`])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, true)
})

test('probeCodegraph：JSON 缺 index 字段 → available:false（防御式不崩）', async () => {
  const ex = mockExecFile([JSON.stringify({ initialized: true, fileCount: 1 })])
  const r = await probeCodegraph(ROOT, { execFile: ex })
  assert.equal(r.available, false)
  assert.match(r.reason, /未完成/)
})

// ── 形状映射：files flat / affected ─────────────────────────────────────────

test('listIndexFiles：实测 flat 形状映射 + 反斜杠归一 + 缺 path 项跳过', async () => {
  const raw = JSON.stringify([
    { path: 'src\\a.js', language: 'javascript', nodeCount: 5, size: 100 },
    { path: 'b.py', language: 'python', nodeCount: 0, size: 50 },
    { nodeCount: 3 }, // 缺 path → 跳过
  ])
  const ex = mockExecFile([raw])
  const files = await listIndexFiles(ROOT, { execFile: ex })
  assert.equal(files.length, 2)
  assert.equal(files[0].path, 'src/a.js') // POSIX 归一
  assert.deepEqual(ex.calls[0].args.slice(-5), ['files', '-p', ROOT, '--format', 'flat', '-j'].slice(-5))
})

test('listIndexFiles：失败/非数组 → null 不抛', async () => {
  assert.equal(await listIndexFiles(ROOT, { execFile: mockExecFile([new Error('boom ENOENT')]) }), null)
  assert.equal(await listIndexFiles(ROOT, { execFile: mockExecFile(['{"not":"array"}']) }), null)
})

test('affectedTests：超限截断 200 + truncated 标记', async () => {
  const list = Array.from({ length: 250 }, (_, i) => `t${i}.test.ts`)
  const ex = mockExecFile([JSON.stringify({ changedFiles: ['a.ts'], affectedTests: list })])
  const r = await affectedTests(ROOT, ['a.ts'], { execFile: ex })
  assert.equal(r.affectedTests.length, AFFECTED_TESTS_LIMIT)
  assert.equal(r.truncated, true)
  // 同上：baseArgs 前缀不定（真机解析/裸名 fallback），断言用户参数尾部
  assert.deepEqual(ex.calls[0].args.slice(-4), ['affected', '-p', ROOT, '-j', 'a.ts'].slice(-4))
})

test('affectedTests：空文件清单 → 空结果零调用', async () => {
  const ex = mockExecFile([])
  const r = await affectedTests(ROOT, [], { execFile: ex })
  assert.deepEqual(r, { affectedTests: [], truncated: false })
  assert.equal(ex.calls.length, 0)
})

// ── env 注入 / 超时分级 / 禁携带参数（exec 选项断言）────────────────────────

test('exec 选项：env 三键恒定覆盖 + cwd=root + status 5s 超时 + 32MB buffer + 无禁携带参数', async () => {
  const ex = mockExecFile([STATUS_OK])
  await probeCodegraph(ROOT, { execFile: ex, env: { PATH: 'x', CODEGRAPH_DIR: 'should-be-overridden' } })
  const o = ex.calls[0].opts
  assert.equal(o.cwd, ROOT)
  assert.equal(o.env.CODEGRAPH_DIR, CODEGRAPH_ENV.CODEGRAPH_DIR)
  assert.equal(o.env.CODEGRAPH_TELEMETRY, '0')
  assert.equal(o.env.DO_NOT_TRACK, '1')
  assert.equal(o.env.PATH, 'x') // 基底 env 保留
  assert.equal(o.timeout, CODEGRAPH_TIMEOUTS_MS.status)
  assert.equal(o.maxBuffer, 32 * 1024 * 1024)
  assert.ok(!ex.calls[0].args.includes('--local-only'))
  assert.ok(!ex.calls[0].args.includes('--no-telemetry'))
})

test('exec 选项：affected 命令走 15s 档超时', async () => {
  const ex = mockExecFile([JSON.stringify({ changedFiles: [], affectedTests: [] })])
  await affectedTests(ROOT, ['x.ts'], { execFile: ex })
  assert.equal(ex.calls[0].opts.timeout, CODEGRAPH_TIMEOUTS_MS.affected)
})

// ── cmd-shim 解析（parseCmdShim 直接单测，mock 文件内容经 cmdPath 读不到 → 用真实临时文件）──

test('parseCmdShim：不存在路径 → null', () => {
  assert.equal(parseCmdShim('C:\\definitely\\not\\exist\\codegraph.cmd'), null)
})

test('resolveCodegraphCommand：返回形状恒合法（裸名 fallback 或解析成功），不依赖环境', () => {
  _resetCodegraphCommandCache()
  const r = resolveCodegraphCommand()
  assert.equal(typeof r.command, 'string')
  assert.ok(r.command.length > 0)
  assert.ok(Array.isArray(r.baseArgs))
})
