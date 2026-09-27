// spec-sync 冲突回执 platform_deleted 消费（runbook spec-push-conflict-recovery 待修①）
//
// 实证形态（2026-09-25 生产）：平台 apply_ops 对带 platform_deleted 墓碑的路径无条件拒收
// （与版本无关，update base=version 完全匹配仍拒）。此前 CLI 只消费 server_versions →
// 墓碑拒收被译成「版本冲突/又有更新」，resolve --keep-local 重推永远无效（转圈）。
//
// 修复断言（src/spec-sync.js）：
// ① 纯墓碑形态（版本冲突面为空、拒收全是墓碑）→ 专用横幅（删除墓碑 + manifest-heal
//    恢复指引，不给 resolve 处置线）+ 冲突文件记 platform_deleted；
// ② 混合形态（真版本冲突 + 墓碑拒收并存）→ 版本冲突照常全幅横幅，墓碑路径从待裁决
//    集分离、单独一行提示 + 冲突文件附带 platform_deleted 字段。
//
// 隔离：tmpdir fixture + mock globalThis.fetch + 捕获 console.warn，不碰真实 .sillyspec。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { syncSpecTree } from '../src/spec-sync.js'

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-tombreceipt-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function mockFetch({ manifest = {}, postResponse }) {
  const impl = async (url, options = {}) => {
    if (String(url).endsWith('/spec-manifest')) {
      return { ok: true, status: 200, json: async () => ({ files: manifest }) }
    }
    if (String(url).endsWith('/spec-sync') && (options.method || '') === 'POST') {
      return { ok: true, status: 200, json: async () => postResponse }
    }
    return { ok: true, status: 200, json: async () => ({}) }
  }
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return { restore: () => { globalThis.fetch = saved } }
}

async function captureWarn(fn) {
  const lines = []
  const saved = console.warn
  console.warn = (...a) => { lines.push(a.map(String).join(' ')) }
  try { return { result: await fn(), lines } } finally { console.warn = saved }
}

const CN = 'tomb-receipt-chg'

function makeTwoFileFixture() {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes', CN), { recursive: true })
  const manifest = {}
  for (const f of ['real.md', 'tomb.md']) {
    writeFileSync(join(specRoot, 'changes', CN, f), 'local v2\n', 'utf8')
    manifest[`changes/${CN}/${f}`] = { hash: `SRV-${f}`, version: 2, exists: true }
  }
  return { specRoot, manifest, paths: Object.keys(manifest) }
}

test('① 纯墓碑形态：专用横幅（非版本冲突 + manifest-heal 指引），不给 resolve 处置线', async () => {
  const { specRoot, manifest, paths } = makeTwoFileFixture()
  const [realP, tombP] = paths
  const m = mockFetch({
    manifest,
    postResponse: { ok: true, new_versions: {}, conflict: true, server_versions: { [realP]: 2, [tombP]: 2 }, platform_deleted: [realP, tombP] },
  })
  try {
    const { result, lines } = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(result.conflict, true, '仍报 conflict（需人工恢复）')
    assert.deepEqual(result.tombstoned, [realP, tombP], '墓碑路径清单透传')
    const banner = lines.find((l) => l.includes('删除墓碑拒收'))
    assert.ok(banner, '有墓碑专用横幅')
    assert.ok(banner.includes('非版本冲突') && banner.includes('resolve --keep-local 重推无效'), '明示 resolve 无效')
    assert.ok(lines.some((l) => l.includes('manifest-heal')), '恢复指引指向 manifest-heal')
    assert.ok(!lines.some((l) => l.includes('--keep-local | --take-platform')), '不落版本冲突三态处置线')
    const cf = JSON.parse(readFileSync(join(specRoot, '.runtime', `spec-sync-conflict-${CN}.json`), 'utf8'))
    assert.deepEqual(cf.platform_deleted, [realP, tombP], '冲突文件记墓碑路径')
    assert.equal(cf.conflicting_paths.length, 0, '版本冲突面为空（不误导 resolve）')
  } finally { m.restore() }
})

test('② 混合形态：真冲突照常全幅横幅，墓碑路径分离单独提示 + 冲突文件附带字段', async () => {
  const { specRoot, manifest, paths } = makeTwoFileFixture()
  const [realP, tombP] = paths
  const m = mockFetch({
    manifest,
    postResponse: { ok: true, new_versions: {}, conflict: true, server_versions: { [realP]: 2, [tombP]: 2 }, platform_deleted: [tombP] },
  })
  try {
    const { result, lines } = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(result.conflict, true)
    const banner = lines.find((l) => l.includes('检测到 spec 树冲突'))
    assert.ok(banner, '版本冲突全幅横幅在场')
    assert.ok(banner.includes('1 个文件'), '待裁决只剩 1 个（墓碑路径已分离）')
    assert.ok(!banner.includes('tomb.md'), '墓碑路径不进版本冲突横幅')
    const tombLine = lines.find((l) => l.includes('删除墓碑拒收'))
    assert.ok(tombLine && tombLine.includes('tomb.md'), '墓碑路径单独一行提示')
    const cf = JSON.parse(readFileSync(join(specRoot, '.runtime', `spec-sync-conflict-${CN}.json`), 'utf8'))
    assert.deepEqual(cf.platform_deleted, [tombP], '冲突文件附带 platform_deleted')
    assert.deepEqual(cf.conflicting_paths, [realP], '待裁决面只有真冲突路径')
  } finally { m.restore() }
})
