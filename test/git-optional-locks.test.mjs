/**
 * 坑 git-optional-locks 回归（2026-10-06-module-map-list-leak 收口 add 静默失效根因收口）：
 * CLI 全仓 git 子进程从不设 GIT_OPTIONAL_LOCKS，而 watcher 每 ~3s 轮询 git status——
 * 读命令的机会性 index 刷新会短暂持 index.lock，并发 git add 落进窗口即
 * "Unable to create index.lock" 失败（archive-stage-claim 已修诚实告警，本变更为上游根治：
 * 公共入口 git-helper 两 exec 点统一注入 GIT_OPTIONAL_LOCKS=0，机会性锁全灭、真写不受影响）。
 *
 * 锁窗口消失的代理断言：stat 缓存脏（tracked 文件 mtime 前进、index stat 过期）时，裸
 * git status 会刷新写回 .git/index（字节变化）；经 git-helper 的读调用必须不改写 index 字节。
 * 机制双向证明：对照组（裸 execFileSync）必须改写——证明实验前提在场，防环境差异假绿。
 */
import { writeFileSync, mkdtempSync, rmSync, readFileSync, utimesSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { safeGit, git, gitQuiet } from '../src/git-helper.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; console.log(`  ❌ FAIL: ${msg}`) }
}
function rawGit(dir, args, env) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...(env ? { env } : {}), windowsHide: true })
}
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

function freshRepo(prefix) {
  const cwd = mkdtempSync(join(tmpdir(), prefix))
  rawGit(cwd, ['init', '-q'])
  rawGit(cwd, ['config', 'user.email', 't@t']); rawGit(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'f.txt'), 'a\n')
  rawGit(cwd, ['add', 'f.txt']); rawGit(cwd, ['commit', '-q', '-m', 'init'])
  return cwd
}
let dirtySeq = 0
/**
 * 让 stat 缓存脏并返回 index 基线哈希：commit 后把 tracked 文件 mtime 拨到「未来 + N 小时」
 *（N 每次调用递增——两次调用间恒差 ≥1h，index 序列化的 stat 字节必可区分，防同秒精度毛刺；
 * utimesSync 纯 Node 跨平台，不依赖 touch）。
 */
function dirtyStatCache(cwd) {
  const idx = join(cwd, '.git', 'index')
  const t = new Date(Date.now() + 3600_000 * (1 + ++dirtySeq))
  utimesSync(join(cwd, 'f.txt'), t, t)
  return { idx, before: sha(idx) }
}

console.log('=== git-helper GIT_OPTIONAL_LOCKS 注入（坑 git-optional-locks）===\n')

console.log('--- Test 1: safeGit/git/gitQuiet 读调用无锁窗口（index 字节不变）+ 对照组机制在场 ---')
{
  const cwd = freshRepo('olock-1-')
  try {
    {
      const { idx, before } = dirtyStatCache(cwd)
      safeGit(cwd, ['status', '--porcelain'])
      assert(sha(idx) === before, 'safeGit status 后 .git/index 字节不变（无机会性刷新）')
    }
    {
      const { idx, before } = dirtyStatCache(cwd)
      git(cwd, ['status', '--porcelain'])
      assert(sha(idx) === before, 'git status 后 .git/index 字节不变')
    }
    {
      const { idx, before } = dirtyStatCache(cwd)
      gitQuiet(cwd, ['status', '--porcelain'])
      assert(sha(idx) === before, 'gitQuiet status 后 .git/index 字节不变（watcher 轮询路径）')
    }
    // 对照组：裸 execFileSync git status 必须改写 index——机制在场证明（前提不满足则上面的
    // 「不变」断言失去意义，须红）
    {
      const { idx, before } = dirtyStatCache(cwd)
      rawGit(cwd, ['status', '--porcelain'])
      assert(sha(idx) !== before, '对照组：裸 git status 改写 index（机会性刷新机制在场）')
    }
  } finally { rmSync(cwd, { recursive: true, force: true }) }
}

console.log('--- Test 2: 写命令不受影响——经 git-helper 的 add/commit 照常 ---')
{
  const cwd = freshRepo('olock-2-')
  try {
    writeFileSync(join(cwd, 'g.txt'), 'new\n')
    safeGit(cwd, ['add', '--', 'g.txt'])
    const staged = gitQuiet(cwd, ['diff', '--cached', '--name-only'])
    assert(staged === 'g.txt', `safeGit add 暂存成功（实际 ${JSON.stringify(staged)}）`)
    git(cwd, ['commit', '-q', '-m', 'second'])
    assert(gitQuiet(cwd, ['log', '--oneline']).includes('second'), 'git commit 照常提交（必需锁不受影响）')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
}

console.log('--- Test 3: 调用方 env 透传 + 注入权威式（统一不变量） ---')
{
  const cwd = freshRepo('olock-3-')
  try {
    // 调用方 env 键透传：GIT_AUTHOR_NAME 经 env 注入 → git var GIT_AUTHOR_IDENT 应含调用方值
    const ident = git(cwd, ['var', 'GIT_AUTHOR_IDENT'], { env: { ...process.env, GIT_AUTHOR_NAME: 'env-probe' } })
    assert(String(ident).includes('env-probe'), `调用方 env 键透传生效（实际 ${JSON.stringify(ident)}）`)
    // 注入权威式：调用方显式给 GIT_OPTIONAL_LOCKS=1 也不破统一不变量（CLI 子进程恒不机会性抢锁）
    const { idx, before } = dirtyStatCache(cwd)
    safeGit(cwd, ['status', '--porcelain'], { env: { ...process.env, GIT_OPTIONAL_LOCKS: '1' } })
    assert(sha(idx) === before, '注入权威：调用方 GIT_OPTIONAL_LOCKS=1 时 status 仍不写 index')
    // Windows 系统变量保留（裸替换丢 SystemRoot → git.exe 起不来，以上子进程全部成功即在场证明）
    assert(gitQuiet(cwd, ['rev-parse', '--is-inside-work-tree']) === 'true', 'process.env 展开合并在场（子进程正常启动）')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
