/**
 * backlog 批 C 五项修复回归（ql-20260912-004）。
 *
 * 锁行为：
 *  1. renameChange 三态（missing/conflict/ok）+ 单事务收口（stolen 分支为并发窗口内路径，
 *     无注入缝不单测——由 changes!==1 校验的存在性 + 事务收口结构保证）
 *  2. registerRepoInLocalYaml 尊重 .local.yaml.lock（外部持有者期间等待）+ 双进程并发注册不丢条目
 *  3. extractModules bare 值含逗号不截断（pytest -k a,b 完整保留）
 *  4. extractKnownFailures 流式形态值含 ] 不清空（verify-postcheck + docs-check 双口径）
 *  5. _readActiveQuiet 只读打开零副作用（探测后不产生 -wal/-shm、不改 schema 戳）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { makeRepo, initChange, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'
import { withFileLock } from '../src/quicklog.js'
import { registerRepoInLocalYaml as regLocal } from '../src/local-register.js'
import { extractModules, extractKnownFailures } from '../src/verify-postcheck.js'
import { extractKnownFailureKeys } from '../src/docs-check.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const root = fileURLToPath(new URL('.', import.meta.url))

console.log('=== ① renameChange 三态 ===')
{
  const { cwd, specBase } = makeRepo('bc-rename-')
  const cn = '2026-09-12-rename-a'
  const pm = await initChange(cwd, specBase, cn)
  pm.renameChange(cwd, '2026-09-12-no-such', '2026-09-12-rename-b')
  // missing 早退：不建空目录
  assert(!existsSync(join(specBase, 'changes', '2026-09-12-rename-b')), 'missing 早退不建空目录')
  pm.renameChange(cwd, cn, cn) // conflict（同名即冲突）
  pm.renameChange(cwd, cn, '2026-09-12-rename-b')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, '2026-09-12-rename-b')
  assert(Boolean(after), '正常重命名后新名可读')
  assert(existsSync(join(specBase, 'changes', '2026-09-12-rename-b')), '目录随迁')
}

console.log('\n=== ② local-register 尊重文件锁 + 双进程不丢条目 ===')
console.log('--- ②a 外部持锁期间等待 ---')
{
  const dir = mkdtempSync(join(tmpdir(), 'bc-reg-'))
  const yamlPath = join(dir, 'local.yaml')
  writeFileSync(yamlPath, 'repos:\n  pre: C:/pre\n')
  const lockPath = join(dir, '.local.yaml.lock')
  const t0 = Date.now()
  const holder = withFileLock(lockPath, async () => { await sleep(400) })
  const regPromise = regLocal(yamlPath, 'shared-lib', 'C:/x/shared-lib')
  await holder
  await regPromise
  const elapsed = Date.now() - t0
  assert(elapsed >= 350, `等待外部锁持有者后才写入（${elapsed}ms ≥ 400ms 持锁窗）`)
  const text = readFileSync(yamlPath, 'utf8')
  assert(text.includes('pre:') && text.includes('shared-lib:'), '外部持有者与本次注册的条目都在（无覆盖丢条目）')
  rmSync(dir, { recursive: true, force: true })
}
console.log('--- ②b 双进程并发注册不同 key 都存活 ---')
{
  const dir = mkdtempSync(join(tmpdir(), 'bc-reg2-'))
  const yamlPath = join(dir, 'local.yaml')
  writeFileSync(yamlPath, 'repos:\n')
  // 4 个子进程同时注册不同 key（真跨进程并发 RMW）
  const { spawn } = await import('node:child_process')
  const jobs = ['alpha', 'beta', 'gamma', 'delta'].map(k => new Promise((res, rej) => {
    const p = spawn(process.execPath, ['--input-type=module', '-e',
      `import { registerRepoInLocalYaml } from ${JSON.stringify('file:///' + join(root, '..', 'src', 'local-register.js').replace(/\\/g, '/'))}\nawait registerRepoInLocalYaml(${JSON.stringify(yamlPath.replace(/\\/g, '/'))}, ${JSON.stringify(k)}, ${JSON.stringify('C:/x/' + k)})`],
      { stdio: 'ignore' })
    p.on('close', c => c === 0 ? res() : rej(new Error('child exit ' + c)))
    p.on('error', rej)
  }))
  await Promise.all(jobs)
  const text = readFileSync(yamlPath, 'utf8')
  const allIn = ['alpha', 'beta', 'gamma', 'delta'].every(k => text.includes(`${k}: C:/x/${k}`))
  assert(allIn, `4 进程并发注册全存活（${text.split('\n').filter(l => l.trim().startsWith(('alph')) || /:\s+C:\/x\//.test(l)).length} 条）`)
  rmSync(dir, { recursive: true, force: true })
}

console.log('\n=== ③ extractModules bare 值逗号不截断 ===')
{
  const yaml = [
    'commands:',
    '  test: npm test',
    'modules:',
    '  b: { path: b/, test: pytest -k a,b }',
  ].join('\n')
  const mods = extractModules(yaml)
  assert(mods && mods.b && mods.b.test === 'pytest -k a,b',
    `含逗号命令完整保留（实得 ${JSON.stringify(mods?.b?.test)}——旧版截成 "pytest -k a"）`)
  assert(mods && mods.b && mods.b.path === 'b/', 'path 键终止语义不变')
  // 多模块流式 + 引号形态回归
  const yaml2 = [
    'modules:',
    '  a: { path: a/, test: npm run "build" && npm test }',
    '  b: { path: b/, test: pytest -v }',
  ].join('\n')
  const m2 = extractModules(yaml2)
  assert(m2 && m2.a && m2.a.test === 'npm run "build" && npm test', `含引号命令保留（实得 ${JSON.stringify(m2?.a?.test)}）`)
  assert(m2 && m2.b && m2.b.test === 'pytest -v' && m2.b.path === 'b/', '第二模块解析不受第一模块逗号影响')
}

console.log('\n=== ④ known_failures 流式嵌套 ] 不清空（双口径）===')
{
  const yaml = 'known_failures: [tests/\\[x\\]::case, other::id]\n'
  const a = extractKnownFailures(yaml)
  assert(Array.isArray(a) && a.length === 2 && a[0].includes('x') && a[1] === 'other::id',
    `verify-postcheck：两项豁免全保留（实得 ${JSON.stringify(a)}——旧版整表清空）`)
  const b = extractKnownFailureKeys(yaml)
  assert(Array.isArray(b) && b.length === 2, `docs-check 复刻同口径（实得 ${JSON.stringify(b)}）`)
  // 普通形态回归
  const c = extractKnownFailures('known_failures: [a, b] # 注释\n')
  assert(c.length === 2 && c[0] === 'a', `普通流式 + 注释回归（实得 ${JSON.stringify(c)}）`)
}

console.log('\n=== ⑤ _readActiveQuiet 只读零副作用 ===')
{
  const { cwd, specBase } = makeRepo('bc-quiet-')
  const cn = '2026-09-12-quiet'
  const pm = await initChange(cwd, specBase, cn)
  // 改造为老格式（journal_mode=DELETE）再干净关闭——模拟「旧库只读挂载」探测场景
  const { DB } = await import('../src/db.js')
  const dbPath = join(specBase, '.runtime', 'sillyspec.db')
  try { pm._ensureDB(cwd).close() } catch { /* 连接已被 pm 内部管理 */ }
  const wdb = new DB(dbPath)
  wdb.init()
  wdb.getDb().exec('PRAGMA journal_mode=DELETE')
  wdb.close()
  const { createHash } = await import('node:crypto')
  const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
  const before = hash(dbPath)
  const beforeFiles = readdirSync(join(specBase, '.runtime')).sort().join(',')

  const cd = new (await import('../src/progress/consistency-doctor.js')).ConsistencyDoctor(new ProgressManager({ specDir: specBase }))
  const r = cd._readActiveQuiet(specBase, cwd)
  assert(Array.isArray(r.activeChanges) && r.activeChanges.includes(cn), `只读读出活跃变更（${r.activeChanges.join(',')}）`)
  // SQLite 只读连接对 WAL 库可能合法建 -shm（wal-index 需要），但绝不改库内容/不转 journal
  // 模式/不跑 DDL——锁这三点（旧版 new DB().init() 会把 DELETE 老库转成 WAL + 可能跑迁移）
  assert(hash(dbPath) === before, '库文件字节不变（不转 journal 模式、不跑 DDL 迁移）')
  assert(!existsSync(dbPath + '-wal'), '不产生 -wal（老格式库未被转 WAL）')
  const afterFiles = readdirSync(join(specBase, '.runtime')).sort().join(',')
  assert(afterFiles === beforeFiles, `目录清单不变（${afterFiles}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
