// X2 pullSpecBundle 验收测试（task-14 / design §7.1 §7.3 §7.4 / FR-07 / FR-08 / D-004@v1）。
//
// 验收点（task-14.md acceptance）：
// 1. pullSpecBundle 以 shpsync token 打 GET /api/changes/-/spec-bundle（请求头/端点正确）
//    流式下载 tar 并解压到 specDir（.sillyspec 内容根）
// 2. specDir 为空目录直接解压；非空且无 --force 拒绝并明确提示；--force 整树覆盖
//    （rm + 解包，对齐 daemon pullSpecBundle 语义；local.yaml 连接凭据例外保留——
//    rm 前读出、解包后原样恢复，凭据不断连）
// 3. tar 顶层 PLATFORM-BUNDLE.json 容忍落地（task-08 产物，多一个文件不影响）
// 4. tar-slip 路径穿越拒绝（对齐 daemon extractTar 双重校验）
// 5. PAX 长路径（>100 字符）容忍（平台 Python tarfile PAX 默认格式）
// 6. 404（平台工作区尚无 spec 内容）/ 未连接平台 → 明确 reason 不崩
// 7. 既有 SyncManager.pull（进度六表）零回归（pullSpecBundle 只新增不改写）
// 8. 顶层 `sillyspec pull --spec` 命令：帮助文案含快照语义（打包时刻快照非实时 /
//    无自动同步）；未连接平台明确提示不崩；非空无 --force 拒绝提示
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + mock globalThis.fetch（不发真实网络）。
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { SyncManager } from '../src/sync.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = resolve(__dirname, '..', 'bin', 'sillyspec.js')

const tmpRoots = []

function makeFixture({ platform = null, emptySpecDir = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'ss-pull-spec-'))
  tmpRoots.push(cwd)
  if (emptySpecDir || platform) mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  if (platform) {
    // 写 local.yaml platform 段，让 _getPlatform 返回非 null（已连接平台）
    writeFileSync(
      join(cwd, '.sillyspec', 'local.yaml'),
      `platform:\n  url: ${platform.url}\n  token: ${platform.token}\n`,
      'utf8',
    )
  }
  return cwd
}

let fetchCalls = []
function mockFetch(impl) {
  const saved = globalThis.fetch
  fetchCalls = [] // 每个 mock 安装即重置捕获，测试间不串台
  globalThis.fetch = (...a) => {
    fetchCalls.push({ url: a[0], headers: a[1]?.headers || null })
    return impl(...a)
  }
  return () => { globalThis.fetch = saved }
}

// 空目录场景的连接通道：local.yaml 写进 .sillyspec 会让目录非空（连接配置 ≠ spec 内容，
// 但守卫按字面 readdir 判非空），故用 _getPlatform 的 env 通道（daemon 注入同款）供凭据。
function withEnvPlatform(url, token, fn) {
  return async (...a) => {
    const saved = { u: process.env.SILLYHUB_PLATFORM_URL, t: process.env.SILLYHUB_PLATFORM_TOKEN }
    process.env.SILLYHUB_PLATFORM_URL = url
    process.env.SILLYHUB_PLATFORM_TOKEN = token
    try {
      await fn(...a)
    } finally {
      if (saved.u === undefined) delete process.env.SILLYHUB_PLATFORM_URL
      else process.env.SILLYHUB_PLATFORM_URL = saved.u
      if (saved.t === undefined) delete process.env.SILLYHUB_PLATFORM_TOKEN
      else process.env.SILLYHUB_PLATFORM_TOKEN = saved.t
    }
  }
}

// ── 测试侧极简 tar 构造器（ustar + PAX 长路径）──

function tarHeader(name, size, typeflag) {
  const h = Buffer.alloc(512)
  h.write(name.slice(0, 100), 0, 100, 'utf8')
  h.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
  h.write(typeflag, 156, 1, 'ascii')
  h.write('ustar\0', 257, 6, 'ascii')
  h.write('00', 263, 2, 'ascii')
  // checksum：先填 8 空格求和，再回写八进制
  h.write('        ', 148, 8, 'ascii')
  let sum = 0
  for (const b of h) sum += b
  h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')
  return h
}

function tarEntry(name, content, typeflag = '0') {
  const data = Buffer.from(content, 'utf8')
  const pad = (512 - (data.length % 512)) % 512
  return Buffer.concat([tarHeader(name, data.length, typeflag), data, Buffer.alloc(pad)])
}

/** PAX path 扩展头条目（长路径 >100 字符场景，平台 Python tarfile PAX 格式产物） */
function paxPathEntry(longName) {
  const rec = `path=${longName}\n`
  // 记录总长 = 十进制位数 + 1（空格）+ 记录体（含结尾 \n），位数含自身 → 不动点迭代收敛
  let total = rec.length + 2
  for (let i = 0; i < 8; i++) total = rec.length + 1 + String(total).length
  const payload = `${total} ${rec}`
  assert.equal(payload.length, total, '测试侧 PAX 记录长度自洽')
  return tarEntry('PaxHeader', payload, 'x')
}

function buildTar(entries) {
  const parts = entries.map((e) =>
    e.type === 'dir' ? tarEntry(e.name, '', '5') : tarEntry(e.name, e.content, '0'),
  )
  return Buffer.concat([...parts, Buffer.alloc(1024)]) // 两个结尾 zero block
}

/** 平台 bundle 形态：顶层 PLATFORM-BUNDLE.json（task-08 / design §7.3）+ spec 树 */
function sampleBundle() {
  return buildTar([
    { name: 'PLATFORM-BUNDLE.json', content: JSON.stringify({ spec_version: 42, strategy: 'platform-managed', generated_at: '2026-08-29T12:00:00Z', server: 'mock' }) },
    { name: 'changes/', type: 'dir' },
    { name: 'changes/2026-08-29-demo-change/', type: 'dir' },
    { name: 'changes/2026-08-29-demo-change/design.md', content: '# design\nX2 拉取验收\n' },
    { name: 'docs/', type: 'dir' },
    { name: 'docs/ROADMAP.md', content: '# roadmap\n' },
  ])
}

function okTarResponse(tarBuf, specVersion = '42') {
  return new Response(tarBuf, {
    status: 200,
    headers: { 'Content-Type': 'application/x-tar', 'X-Spec-Version': specVersion },
  })
}

after(() => {
  for (const t of tmpRoots) {
    try { rmSync(t, { recursive: true, force: true }) } catch { /* best effort */ }
  }
})

// ─────────────────────────────────────────
// 1. 空目录直接解压 + 端点/鉴权头正确 + PLATFORM-BUNDLE.json 容忍
// ─────────────────────────────────────────
test('1. 空目录直接解压：GET /api/changes/-/spec-bundle + Bearer token，文件落地，PLATFORM-BUNDLE.json 容忍', async () => {
  const cwd = makeFixture({ emptySpecDir: true }) // env 通道供凭据，specDir 保持真空
  const restore = mockFetch(async () => okTarResponse(sampleBundle()))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-1', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle()
      assert.equal(r.ok, true, `ok（实际 reason=${r.reason}）`)
      assert.equal(r.pulled, true)
      assert.equal(r.specDir, join(cwd, '.sillyspec'))
      // 端点 + 鉴权头（acceptance：请求头/端点正确）
      assert.equal(fetchCalls.length, 1, '恰好一次请求')
      assert.equal(fetchCalls[0].url, 'http://hub.example.com/api/changes/-/spec-bundle')
      assert.equal(fetchCalls[0].headers?.Authorization, 'Bearer shpsync_tok-1')
      // 解压落地
      assert.equal(readFileSync(join(cwd, '.sillyspec', 'changes', '2026-08-29-demo-change', 'design.md'), 'utf8'), '# design\nX2 拉取验收\n')
      assert.equal(readFileSync(join(cwd, '.sillyspec', 'docs', 'ROADMAP.md'), 'utf8'), '# roadmap\n')
      // tar 顶层 PLATFORM-BUNDLE.json 容忍落地（多一个文件不影响）
      assert.ok(existsSync(join(cwd, '.sillyspec', 'PLATFORM-BUNDLE.json')), 'PLATFORM-BUNDLE.json 容忍落地')
      // X-Spec-Version 响应头透出（design §7.3）
      assert.equal(r.specVersion, '42')
    })
  } finally { restore() }
})

test('2. specDir 不存在 → 直接解压（自动 mkdir）', async () => {
  const cwd = makeFixture()
  const restore = mockFetch(async () => okTarResponse(sampleBundle(), '7'))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-2', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle()
      assert.equal(r.ok, true, `ok（实际 reason=${r.reason}）`)
      assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-29-demo-change', 'design.md')))
      assert.equal(r.specVersion, '7')
    })
  } finally { restore() }
})

// ─────────────────────────────────────────
// 3. 非空无 --force 拒绝（fail-fast，不发网络请求）
// ─────────────────────────────────────────
test('3. specDir 非空且无 --force → 拒绝并明确提示，fetch 不发（fail-fast）', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'shpsync_tok-3' }, emptySpecDir: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'old-change'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'old-change', 'design.md'), '旧内容', 'utf8')
  const restore = mockFetch(async () => { throw new Error('不应发请求') })
  try {
    const r = await new SyncManager(cwd).pullSpecBundle()
    assert.equal(r.ok, false)
    assert.equal(r.pulled, false)
    assert.match(r.reason || '', /非空/, 'reason 提示非空拒绝')
    assert.match(r.reason || '', /--force/, 'reason 引导 --force')
    assert.equal(fetchCalls.length, 0, '拒绝路径不发网络请求')
    // 本地内容未被触碰
    assert.equal(readFileSync(join(cwd, '.sillyspec', 'changes', 'old-change', 'design.md'), 'utf8'), '旧内容')
  } finally { restore() }
})

// ─────────────────────────────────────────
// 4. --force 整树覆盖（rm + 解包，对齐 daemon 语义）
// ─────────────────────────────────────────
test('4. --force → rm 整树 + 解包：旧文件/旧嵌套目录消失，新树落地', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'shpsync_tok-4' }, emptySpecDir: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'stale-nested', 'deep'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'stale-nested', 'deep', 'old.md'), 'stale')
  writeFileSync(join(cwd, '.sillyspec', 'stale-root.md'), 'stale root')
  const restore = mockFetch(async () => okTarResponse(sampleBundle()))
  try {
    const r = await new SyncManager(cwd).pullSpecBundle({ force: true })
    assert.equal(r.ok, true, `ok（实际 reason=${r.reason}）`)
    // rm 语义：本地旧内容整树消失
    assert.equal(existsSync(join(cwd, '.sillyspec', 'stale-root.md')), false, '顶层旧文件被 rm')
    assert.equal(existsSync(join(cwd, '.sillyspec', 'changes', 'stale-nested')), false, '旧嵌套目录被 rm')
    // 新树落地
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-29-demo-change', 'design.md')))
  } finally { restore() }
})

// ─────────────────────────────────────────
// 5. 未连接平台 → 静默跳过不崩（方法层 best-effort，CLI 层另测明确提示）
// ─────────────────────────────────────────
test('5. 未连接平台 → { ok:false, pulled:false, reason:未连接平台 }，fetch 不发不抛', async () => {
  const cwd = makeFixture() // 无 platform 段
  const restore = mockFetch(async () => { throw new Error('不应发请求') })
  try {
    const r = await new SyncManager(cwd).pullSpecBundle()
    assert.equal(r.ok, false)
    assert.equal(r.pulled, false)
    assert.match(r.reason || '', /未连接平台/)
    assert.equal(fetchCalls.length, 0)
  } finally { restore() }
})

// ─────────────────────────────────────────
// 6. tar-slip 路径穿越拒绝（对齐 daemon extractTar 双重校验）
// ─────────────────────────────────────────
test('6. tar 含 ../ 路径 → 拒绝解压且不写穿目标目录', async () => {
  const cwd = makeFixture({ emptySpecDir: true })
  const evil = buildTar([{ name: '../evil.txt', content: 'pwn' }])
  const restore = mockFetch(async () => okTarResponse(evil))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-6', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle()
      assert.equal(r.ok, false)
      assert.equal(r.pulled, false)
      assert.match(r.reason || '', /路径越界|blocked|traversal/, `reason 标注越界（实际 ${r.reason}）`)
      assert.equal(existsSync(join(cwd, 'evil.txt')), false, '未写穿到 specDir 上级')
    })
  } finally { restore() }
})

// ─────────────────────────────────────────
// 7. PAX 长路径容忍（平台 tarfile PAX 格式，>100 字符走 x 扩展头）
// ─────────────────────────────────────────
test('7. PAX 长路径条目 → 按 path 扩展头落地正确位置', async () => {
  const cwd = makeFixture({ emptySpecDir: true })
  const longName = 'changes/archive/2026-08-29-change-delete-closure-and-spec-pull-with-a-very-long-suffix-appended/design.md'
  assert.ok(longName.length > 100, '测试路径确超 ustar 100 字符上限')
  const tarBuf = Buffer.concat([
    paxPathEntry(longName),
    tarEntry('TRUNCATED', '长路径内容'),
    Buffer.alloc(1024),
  ])
  const restore = mockFetch(async () => okTarResponse(tarBuf, '1'))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-7', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle()
      assert.equal(r.ok, true, `ok（实际 reason=${r.reason}）`)
      assert.equal(readFileSync(join(cwd, '.sillyspec', ...longName.split('/')), 'utf8'), '长路径内容')
      assert.equal(existsSync(join(cwd, '.sillyspec', 'TRUNCATED')), false, '被 PAX 覆盖的截断名不落双份')
    })
  } finally { restore() }
})

// ─────────────────────────────────────────
// 8. 404（平台工作区尚无 spec 内容）→ 明确 reason 不崩
// ─────────────────────────────────────────
test('8. HTTP 404 → ok:false 明确提示不崩', async () => {
  const cwd = makeFixture({ emptySpecDir: true })
  const restore = mockFetch(async () => new Response('not found', { status: 404 }))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-8', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle()
      assert.equal(r.ok, false)
      assert.equal(r.pulled, false)
      assert.match(r.reason || '', /404|无 spec/, `reason 标注 404 语义（实际 ${r.reason}）`)
    })
  } finally { restore() }
})

// ─────────────────────────────────────────
// 9. 既有 SyncManager.pull（进度六表）零回归
// ─────────────────────────────────────────
test('9. 既有 pull() 行为零回归：未连接返回既有 PullResult 契约', async () => {
  const cwd = makeFixture() // 无 platform 段
  const r = await new SyncManager(cwd).pull('rt-change')
  assert.equal(r.ok, false)
  assert.equal(r.imported, false)
  assert.equal(r.conflict, false)
  assert.equal(r.reason, '未连接平台')
  // pullList 同契约
  const list = await new SyncManager(cwd).pullList()
  assert.equal(list.ok, false)
  assert.equal(list.reason, '未连接平台')
})

// ─────────────────────────────────────────
// 10. 顶层 CLI 命令：帮助文案 + 未连接 + 非空拒绝（均不发网络，可子进程实测）
// ─────────────────────────────────────────
const runCLI = (args, cwd) => {
  const res = spawnSync(process.execPath, [cliBin, 'pull', ...args], {
    cwd, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}

test('10. sillyspec pull --help → 帮助文案含快照语义（打包时刻快照非实时 / 无自动同步）与 platform pull 区分提示', () => {
  const cwd = makeFixture({ emptySpecDir: true })
  const r = runCLI(['--help'], cwd)
  assert.equal(r.status, 0, `帮助退出码 0（实际 ${r.status}）`)
  assert.match(r.combined, /pull --spec/, '用法行含 pull --spec')
  assert.match(r.combined, /快照/, '文案明示快照语义')
  assert.match(r.combined, /非实时/, '文案明示非实时')
  assert.match(r.combined, /不自动同步|无自动同步/, '文案明示无自动同步')
  assert.match(r.combined, /platform pull/, '文案与 platform pull（进度六表）语义区分')
  assert.match(r.combined, /--force 保留连接凭据 local\.yaml/, '文案明示 --force 保留 local.yaml 连接凭据')
})

test('11. sillyspec pull --spec 未连接平台 → 明确提示不崩（对齐 platform pull 先例）', () => {
  const cwd = makeFixture({ emptySpecDir: true }) // 无 platform 段
  const r = runCLI(['--spec'], cwd)
  assert.notEqual(r.status, 0, '退出码非 0')
  assert.match(r.combined, /未连接平台/, '明确提示未连接平台')
  assert.doesNotMatch(r.combined, /TypeError|ReferenceError|Cannot read/, '不崩（无未捕获异常栈）')
})

test('12. sillyspec pull --spec 非空无 --force → 拒绝提示 --force，本地内容不动', () => {
  // local.yaml 提供连接 + 令 .sillyspec 非空；拒绝路径 fail-fast 在网络请求之前，子进程可安全实测
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'shpsync_tok-cli' } })
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'local-only'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'local-only', 'tasks.md'), '本地未推送内容')
  const r = runCLI(['--spec'], cwd)
  assert.notEqual(r.status, 0, '退出码非 0')
  assert.match(r.combined, /--force/, '提示 --force')
  assert.equal(readFileSync(join(cwd, '.sillyspec', 'changes', 'local-only', 'tasks.md'), 'utf8'), '本地未推送内容', '本地内容不动')
})

// ─────────────────────────────────────────
// 13. --force 保留 local.yaml 连接凭据（rm 整树唯一豁免）
// ─────────────────────────────────────────
test('13. --force 后 local.yaml 存活且内容不变（其余整树覆盖语义不变，连接不断）', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'shpsync_tok-13' } })
  const originalYaml = readFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'utf8')
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'stale-force'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'stale-force', 'old.md'), 'stale')
  const restore = mockFetch(async () => okTarResponse(sampleBundle()))
  try {
    const r = await new SyncManager(cwd).pullSpecBundle({ force: true })
    assert.equal(r.ok, true, `ok（实际 reason=${r.reason}）`)
    // local.yaml 存活 + 字节级内容不变（注释/换行原样，服务端 bundle 恒不含它，无覆盖来源）
    assert.ok(existsSync(join(cwd, '.sillyspec', 'local.yaml')), '--force 整树清理后 local.yaml 存活')
    assert.equal(readFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'utf8'), originalYaml, 'local.yaml 内容不变')
    // 凭据仍可解析（覆盖后无需重新 connect）
    assert.ok(new SyncManager(cwd)._getPlatform(), '_getPlatform 仍能读到凭据（连接不断）')
    // 其余整树覆盖语义不变：旧内容消失、新树落地
    assert.equal(existsSync(join(cwd, '.sillyspec', 'changes', 'stale-force')), false, '其余旧内容照常被 rm')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-29-demo-change', 'design.md')), '新树照常落地')
  } finally { restore() }
})
