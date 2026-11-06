// 2026-11-07-sync-proposed-no-revive——平台已审候选不再回推复活
// 平台侧核查实证：平台 merge/reject 待审候选后服务器软删（manifest exists=false 不置墓碑），
// 本地 knowledge/proposed/ 残留在下次 sync 按「本地有服务器无→add」推回平台走复活分支。
// 本文件锁 FR-01~04：exists=false 残留不生成 add / 清理段删除+提示+幂等 / 新提议照常
// add / 非 proposed 路径既有语义零变化。

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const { computeSpecOps, cleanupPlatformDisposedProposed } = await import(
  pathToFileURL(join(root, 'src', 'spec-sync.js')).href
)

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const LF = (path, hash = 'h1') => ({ path, hash, mtime: 100, absPath: '', buf: Buffer.from(`content-${path}`) })

// ── T1: exists=false 残留不生成 add（FR-01）──
console.log('\n=== T1: exists=false 残留不生成 add ===')
{
  const manifest = {
    'knowledge/proposed/foo.md': { hash: 'old', version: 3, exists: false },
    'knowledge/INDEX.md': { hash: 'idx', version: 1, exists: true },
  }
  const local = [LF('knowledge/proposed/foo.md', 'new'), LF('knowledge/INDEX.md', 'idx')]
  const ops = computeSpecOps(manifest, local)
  const addFoo = ops.find((o) => o.path === 'knowledge/proposed/foo.md')
  ok(addFoo === undefined, `已处置候选无任何 op（实得 ${JSON.stringify(addFoo)}）`)
  ok(Array.isArray(ops), '返回仍为 FileOp 数组（签名不变）')
}

// ── T2: 清理段删除本地残留 + 提示 + 幂等（FR-02）──
console.log('\n=== T2: 清理段删除+提示+幂等 ===')
{
  const dir = join(tmpdir(), `psr-t2-${Date.now()}`)
  const propDir = join(dir, '.sillyspec', 'knowledge', 'proposed')
  mkdirSync(propDir, { recursive: true })
  writeFileSync(join(propDir, 'foo.md'), 'body', 'utf8')
  const manifest = {
    'knowledge/proposed/foo.md': { hash: 'old', version: 3, exists: false },
    'knowledge/proposed/bar.md': { hash: 'old2', version: 4, exists: false },
  }
  const lines = []
  const origLog = console.log
  console.log = (...a) => lines.push(a.join(' '))
  let cleaned
  try {
    cleaned = cleanupPlatformDisposedProposed(join(dir, '.sillyspec'), manifest)
  } finally { console.log = origLog }
  ok(cleaned && cleaned.length === 1, `清理 1 个在场残留（实得 ${JSON.stringify(cleaned)}）`)
  ok(!existsSync(join(propDir, 'foo.md')), '本地残留文件已删除')
  ok(lines.some((l) => l.includes('foo.md') && l.includes('平台已审核')), `提示行含路径与平台已审核语义（实得 ${JSON.stringify(lines)}）`)

  // 幂等：再跑一次零输出零动作
  const lines2 = []
  console.log = (...a) => lines2.push(a.join(' '))
  let cleaned2
  try {
    cleaned2 = cleanupPlatformDisposedProposed(join(dir, '.sillyspec'), manifest)
  } finally { console.log = origLog }
  ok(cleaned2.length === 0 && lines2.length === 0, '二次清理零残留零提示（幂等）')
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── T3: 新提议（manifest 无行）照常 add（FR-03）──
console.log('\n=== T3: 新提议照常 add ===')
{
  const manifest = {
    'knowledge/proposed/foo.md': { hash: 'old', version: 3, exists: false },
  }
  const local = [LF('knowledge/proposed/foo.md'), LF('knowledge/proposed/new-one.md')]
  const ops = computeSpecOps(manifest, local)
  const addNew = ops.find((o) => o.op === 'add' && o.path === 'knowledge/proposed/new-one.md')
  ok(addNew !== undefined, 'manifest 无行的新提议照常生成 add')
  ok(ops.find((o) => o.path === 'knowledge/proposed/foo.md') === undefined, '同时刻已处置残留仍被拦截（判定互不干扰）')
}

// ── T4: 非 proposed 路径 exists=false 行为不变（FR-04）──
console.log('\n=== T4: 非 proposed exists=false 行为不变 ===')
{
  const manifest = {
    'docs/foo.md': { hash: 'old', version: 2, exists: false },
  }
  const local = [LF('docs/foo.md', 'new')]
  const ops = computeSpecOps(manifest, local)
  const addDoc = ops.find((o) => o.op === 'add' && o.path === 'docs/foo.md')
  ok(addDoc !== undefined, '非 proposed 路径 exists=false 照常 add（本地为真相源语义保持）')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
