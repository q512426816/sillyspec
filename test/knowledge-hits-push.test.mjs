/**
 * knowledge-hits 写后直报测试（2026-10-28-knowledge-hits-cli-push）。
 *
 * 覆盖（FR-01~03/05）：
 * 1. specBaseFromRuntimeDir 反推：Windows 反斜杠/尾分隔符/POSIX 形态/非 .runtime
 *    尾段容错原样返回。
 * 2. pushKnowledgeHitToPlatform：local.yaml platform 段触发 POST（URL/方法/Bearer
 *    头/请求体 lines+daemon_local_id:'cli' 断言）；env 两键优先；未配置静默
 *    pushed:null 零 fetch；SILLYSPEC_HITS_PUSH=0 关闭零 fetch；非 2xx/网络错
 *    warn 一行不抛 pushed:false。
 * 3. appendKnowledgeHit 集成（FR-01/02）：有配置目录写一行 → 本地行完好 +
 *    fetch 被触发且请求体即该行；fetch pending 时 append 同步立即返回（不阻塞）。
 *
 * fetch 以 globalThis 替身注入（网络零依赖，Windows 安全）。
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'

import {
  appendKnowledgeHit,
  pushKnowledgeHitToPlatform,
  specBaseFromRuntimeDir,
} from '../src/knowledge-hits.js'

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

/** 装一个 local.yaml platform 段到 specBase。 */
function writePlatformYaml(specBase, url, token) {
  writeFileSync(join(specBase, 'local.yaml'),
    `platform:\n  url: "${url}"\n  token: "${token}"\n`, 'utf8')
}

const realFetch = globalThis.fetch

// ── specBaseFromRuntimeDir（FR-05 跨平台反推）────────────────────────────────

{
  console.log('▶ specBaseFromRuntimeDir 路径反推')
  const posix = specBaseFromRuntimeDir('/repo/proj/.sillyspec/.runtime')
  assert(posix === ['/repo/proj/.sillyspec'].join(sep) || posix === '/repo/proj/.sillyspec',
    `POSIX 形态反推 specBase（实际 ${posix}）`)
  const win = specBaseFromRuntimeDir('C:\\repo\\proj\\.sillyspec\\.runtime\\')
  assert(win === 'C:\\repo\\proj\\.sillyspec' || win === join('C:\\repo\\proj\\.sillyspec'),
    `Windows 反斜杠+尾分隔符反推（实际 ${win}）`)
  const notRt = specBaseFromRuntimeDir('/repo/proj/someother')
  assert(notRt === '/repo/proj/someother', '末段非 .runtime 时原样返回（容错面）')
}

// ── pushKnowledgeHitToPlatform（FR-01/03）────────────────────────────────────

{
  console.log('▶ pushKnowledgeHitToPlatform 直报四路')
  let calls = []
  let warnCount = 0
  const realWarn = console.warn
  console.warn = () => { warnCount++ }
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts })
    return { ok: true, status: 200 }
  }

  // ① local.yaml platform 段触发 POST。
  const specBase = makeTmpDir('hits-push-spec-')
  writePlatformYaml(specBase, 'https://hub.example.com/', 'shpsync_test_token')
  const line = JSON.stringify({ type: 'inject', change: 'demo', matchedFiles: [] })
  const r1 = await pushKnowledgeHitToPlatform({ specBase, env: {}, line })
  assert(r1.pushed === true, '有配置 → pushed:true')
  assert(calls.length === 1, `fetch 恰好一次（实际 ${calls.length}）`)
  const c = calls[0]
  assert(c.url === 'https://hub.example.com/api/changes/-/hits-sync', `URL 正确（尾斜杠归一，实际 ${c.url}）`)
  assert(c.opts.method === 'POST', '方法 POST')
  assert(c.opts.headers.Authorization === 'Bearer shpsync_test_token', 'Bearer 令牌头')
  const body = JSON.parse(c.opts.body)
  assert(Array.isArray(body.lines) && body.lines[0] === line, '请求体 lines 即该行 JSON')
  assert(body.daemon_local_id === 'cli', "通道标识 daemon_local_id='cli'")

  // ② env 两键优先于 local.yaml。
  calls = []
  await pushKnowledgeHitToPlatform({
    specBase,
    env: { SILLYHUB_PLATFORM_URL: 'https://env.example.com', SILLYHUB_PLATFORM_TOKEN: 'shpsync_env' },
    line,
  })
  assert(calls.length === 1 && calls[0].url === 'https://env.example.com/api/changes/-/hits-sync',
    'env 两键齐全优先于 local.yaml')

  // ③ 未配置静默跳过（FR-03 零 fetch 且零日志——评审 P3 补：warnCount 断言）。
  calls = []
  const warnAt3 = warnCount
  const bareBase = makeTmpDir('hits-push-bare-')
  const r3 = await pushKnowledgeHitToPlatform({ specBase: bareBase, env: {}, line })
  assert(r3.pushed === null && r3.reason === 'no-config', '未配置 → pushed:null / no-config')
  assert(calls.length === 0, '未配置零 fetch')
  assert(warnCount === warnAt3, '未配置零日志')

  // ④ SILLYSPEC_HITS_PUSH=0 关闭。
  const r4 = await pushKnowledgeHitToPlatform({ specBase, env: { SILLYSPEC_HITS_PUSH: '0' }, line })
  assert(r4.pushed === null && r4.reason === 'disabled', '开关关闭 → pushed:null / disabled')
  assert(calls.length === 0, '关闭态零 fetch')

  // ⑤ 非 2xx 静默不抛 + warn 一行。
  calls = []
  globalThis.fetch = async () => ({ ok: false, status: 503 })
  const warnBefore = warnCount
  const r5 = await pushKnowledgeHitToPlatform({ specBase, env: {}, line })
  assert(r5.pushed === false && r5.reason === 'http-503', '非 2xx → pushed:false / http-503')
  assert(warnCount === warnBefore + 1, `非 2xx warn 恰一行（实际 +${warnCount - warnBefore}）`)

  // ⑥ 网络错不抛。
  globalThis.fetch = async () => { throw new Error('ECONNREFUSED') }
  const r6 = await pushKnowledgeHitToPlatform({ specBase, env: {}, line })
  assert(r6.pushed === false && r6.reason === 'network', '网络错 → pushed:false / network 不抛')

  console.warn = realWarn
  globalThis.fetch = realFetch
}

// ── appendKnowledgeHit 集成（FR-01 写后触发 / FR-02 不阻塞）─────────────────

{
  console.log('▶ appendKnowledgeHit 写后直报集成')
  const specBase = makeTmpDir('hits-append-spec-')
  writePlatformYaml(specBase, 'https://hub.example.com', 'shpsync_t')
  const runtimeDir = join(specBase, '.runtime')

  let fetchStarted = 0
  let resolveFetch
  const pending = new Promise((r) => { resolveFetch = r })
  globalThis.fetch = async () => { fetchStarted++; await pending; return { ok: true, status: 200 } }
  const realWarn = console.warn
  console.warn = () => {}

  // FR-02：fetch pending 期间 append 同步立即返回（不阻塞主流程）。
  const t0 = Date.now()
  const rec = appendKnowledgeHit(runtimeDir, { type: 'inject', change: 'demo2', matchedFiles: ['fr/x.md#锚'] })
  const elapsed = Date.now() - t0
  assert(elapsed < 100, `append 同步返回不等 fetch（耗时 ${elapsed}ms）`)
  assert(rec.type === 'inject' && typeof rec.at === 'string', '返回记录语义不变（at 补全）')

  // FR-01：本地行完好 + fetch 被触发且请求体即该行。
  const raw = readFileSync(join(runtimeDir, 'state', 'knowledge-hits.jsonl'), 'utf8')
  assert(raw.trimEnd().endsWith(JSON.stringify(rec)), '本地行完好（state/ 新布局落点）')

  // 等 void fire 的 fetch 启动（微任务链，短轮询上限 2s）。
  for (let i = 0; i < 100 && fetchStarted === 0; i++) {
    await new Promise((r) => setTimeout(r, 20))
  }
  assert(fetchStarted === 1, `写后直报 fetch 被触发一次（实际 ${fetchStarted}）`)
  resolveFetch(undefined)

  // 未配置目录：零 fetch 零差异。
  fetchStarted = 0
  const bareBase = makeTmpDir('hits-append-bare-')
  appendKnowledgeHit(join(bareBase, '.runtime'), { type: 'classify', change: 'x' })
  for (let i = 0; i < 25 && fetchStarted === 0; i++) {
    await new Promise((r) => setTimeout(r, 20))
  }
  assert(fetchStarted === 0, '未配置目录写后零 fetch')
  assert(existsSync(join(bareBase, '.runtime', 'state', 'knowledge-hits.jsonl')), '未配置目录本地行照写')

  console.warn = realWarn
  globalThis.fetch = realFetch
}

// ── 收尾 ─────────────────────────────────────────────────────────────────────

import { rmSync } from 'node:fs'
for (const d of tmpRoots) {
  try { rmSync(d, { recursive: true, force: true }) } catch { /* 尽力清理 */ }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
