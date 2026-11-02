/**
 * eval-knowledge-isolation.test.mjs — 快照指纹与隔离测试（FR-04 绑定）
 */
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { gitHead, hashKnowledgeTree, snapshotFingerprint } = await import(
  pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'snapshot.mjs')).href
)

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `ek-snap-${process.pid}-${name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

// ── 1: 树哈希稳定且与创建顺序无关 ──
console.log('\n=== Test 1: hash 稳定性 ===')
{
  const d1 = setup('a')
  const d2 = setup('b')
  try {
    mkdirSync(join(d1, 'decisions'), { recursive: true })
    writeFileSync(join(d1, 'INDEX.md'), '# Index\n')
    writeFileSync(join(d1, 'decisions', 'x.md'), '## D-001@v1 标题\n')
    mkdirSync(join(d2, 'decisions'), { recursive: true })
    writeFileSync(join(d2, 'decisions', 'x.md'), '## D-001@v1 标题\n')
    writeFileSync(join(d2, 'INDEX.md'), '# Index\n')
    const h1 = hashKnowledgeTree(d1)
    const h2 = hashKnowledgeTree(d2)
    assert(/^[0-9a-f]{64}$/.test(h1), '64 位 hex')
    assert(h1 === h2, '同内容不同创建序 → 同哈希')
    assert(hashKnowledgeTree(d1) === h1, '同目录重复计算稳定')
  } finally { rmSync(d1, { recursive: true, force: true }); rmSync(d2, { recursive: true, force: true }) }
}

// ── 2: 内容/增删文件改变哈希 ──
console.log('\n=== Test 2: 内容变化可检出 ===')
{
  const d = setup('c')
  try {
    writeFileSync(join(d, 'INDEX.md'), '# A\n')
    const h1 = hashKnowledgeTree(d)
    writeFileSync(join(d, 'INDEX.md'), '# B\n')
    const h2 = hashKnowledgeTree(d)
    writeFileSync(join(d, 'new.md'), 'x\n')
    const h3 = hashKnowledgeTree(d)
    assert(h1 !== h2, '内容变化 → 哈希变')
    assert(h2 !== h3, '新增文件 → 哈希变')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 3: 目录缺失 = 空树哈希 ──
console.log('\n=== Test 3: 缺失目录 ===')
{
  const missing = join(tmpdir(), `ek-snap-missing-${process.pid}`)
  assert(/^[0-9a-f]{64}$/.test(hashKnowledgeTree(missing)), '缺失目录返回空树 sha256 不抛')
}

// ── 4: snapshotFingerprint 结构 ──
console.log('\n=== Test 4: snapshotFingerprint ===')
{
  const d = setup('fp')
  try {
    mkdirSync(join(d, '.sillyspec', 'knowledge'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'INDEX.md'), '# I\n')
    const fp = snapshotFingerprint(d)
    assert(JSON.stringify(Object.keys(fp)) === '["head","knowledge_hash","knowledge_files"]', '键序固定')
    assert(fp.knowledge_files === 1, '文件计数')
    assert(fp.head === '', '非 git 目录 head 空串不抛')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 5: gitHead 真实仓可读 ──
console.log('\n=== Test 5: gitHead 真实仓 ===')
{
  const head = gitHead(root)
  assert(/^[0-9a-f]{40}$/.test(head), '本仓 HEAD 为 40 位 hex')
}

// ── 6: 零遥测副作用（FR-04：源码级 + 运行时） ──
console.log('\n=== Test 6: 零遥测副作用 ===')
{
  const fs = await import('node:fs')
  const libDir = join(root, 'eval', 'knowledge', 'lib')
  const src = [
    fs.readFileSync(join(root, 'eval', 'knowledge', 'run.mjs'), 'utf8'),
    ...fs.readdirSync(libDir).filter((f) => f.endsWith('.mjs')).map((f) => fs.readFileSync(join(libDir, f), 'utf8')),
  ].join('\n')
  assert(!/appendKnowledgeHit/.test(src), '工具不调用遥测写入 appendKnowledgeHit')
  assert(!/pushKnowledgeHitToPlatform/.test(src), '工具不调用平台直报')
  assert(!/\bfetch\s*\(/.test(src), '工具代码不发网络请求')
  assert(!/knowledge-hits\.jsonl/.test(src), '工具不引用 knowledge-hits.jsonl')
  const d = setup('side')
  try {
    mkdirSync(join(d, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'INDEX.md'), '# I\n\n## Decisions\n- alpha → [d](decisions/x.md)\n')
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'decisions', 'x.md'), '## D-0001@v1 alpha\n状态：implemented\n')
    const { runEntries, runDecisions } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'engine.mjs')).href)
    await runEntries(d, 'alpha')
    await runDecisions(d, 'alpha')
    assert(!existsSync(join(d, '.sillyspec', '.runtime', 'state', 'knowledge-hits.jsonl')), '跑引擎后零遥测文件产生')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`eval-knowledge-isolation tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
