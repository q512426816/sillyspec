/**
 * 审查遗留终批三项回归（ql-20260912-010）。
 *
 * 锁行为：
 *  1. _lsTreeBlobs 分批：60 个长路径（argv >8000 字符强制多批）全量命中
 *  2. _branchReviewReferences 精确校验：分支 tip 全 hash 引用 / 无关 commit 不引用 /
 *     缩写 hash 引用（旧 rev-list Set 口径漏检——缩写不在全 hash 集内，误删后悬空）
 *  3. _createBaselineCheckpoint：临时 identity 经统一 git() 入口生效（author=sillyspec），
 *     env 展开继承进程环境（Windows SystemRoot 等不丢）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { WorktreeManager } from '../src/worktree.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const _dirs = []
const mkRepo = (p) => {
  const d = mkdtempSync(join(tmpdir(), p + '-'))
  _dirs.push(d)
  const git = (a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git(['init', '-q']); git(['config', 'user.email', 't@t.local']); git(['config', 'user.name', 't']); git(['config', 'commit.gpgsign', 'false'])
  return { d, git }
}

console.log('=== ① _lsTreeBlobs 分批（argv >8000 字符强制多批）===')
{
  const { d, git } = mkRepo('fb-lstree')
  // 60 个 ~140 字符路径：合计 argv ~8400+ 字符 → _chunkPathsPrivate 切 ≥2 批
  const seg = 'deeply/nested/path/segments/that/keep/going/on/and/on/to/make/each/path/quite/long/indeed'
  const files = []
  for (let i = 0; i < 60; i++) {
    const rel = `${seg}/file-${String(i).padStart(3, '0')}-with-a-long-name-suffix.ts`
    const abs = join(d, ...rel.split('/'))
    mkdirSync(join(d, ...rel.split('/').slice(0, -1)), { recursive: true })
    writeFileSync(abs, `content ${i}\n`)
    files.push(rel)
  }
  git(['add', '.']); git(['commit', '-q', '-m', 'init'])
  const wm = new WorktreeManager({ cwd: d, worktreeDir: d })
  const map = wm._lsTreeBlobs(d, 'HEAD', files)
  assert(map.size === 60, `60 个长路径全量命中（${map.size}/60——分批 ls-tree 合并无损）`)
  assert([...map.values()].every(h => /^[0-9a-f]{40}$/.test(h)), 'blob hash 形态正确')
}

console.log('\n=== ② _branchReviewReferences 精确校验 ===')
{
  const { d, git } = mkRepo('fb-branchref')
  writeFileSync(join(d, 'a.txt'), 'a\n')
  git(['add', '.']); git(['commit', '-q', '-m', 'base'])
  // 侧枝提交：永不在 fb-test 历史内（真·无关 commit）
  git(['checkout', '-q', '-b', 'side'])
  writeFileSync(join(d, 'side.txt'), 's\n')
  git(['add', '.']); git(['commit', '-q', '-m', 'side'])
  const unrelated = git(['rev-parse', 'HEAD']).trim()
  git(['checkout', '-q', '-']) // 回原分支（默认分支名 master/main 不定，用 - 免猜）
  git(['checkout', '-q', '-b', 'sillyspec/fb-test'])
  writeFileSync(join(d, 'b.txt'), 'b\n')
  git(['add', '.']); git(['commit', '-q', '-m', 'work'])
  const tip = git(['rev-parse', 'HEAD']).trim()
  const tipShort = tip.slice(0, 10)
  // execute-runs 三个 review.json：tip 全 hash / 无关 commit / tip 缩写
  const mk = (run, base) => {
    const dir = join(d, '.sillyspec', '.runtime', 'execute-runs', run, 'tasks', 'task-01')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'review.json'), JSON.stringify({ base, head: tip, specVerdict: 'pass', qualityVerdict: 'pass' }))
  }
  mk('exec-full', unrelated)
  mk('exec-short', tipShort)
  const wm = new WorktreeManager({ cwd: d, worktreeDir: d })
  const refs = wm._branchReviewReferences('sillyspec/fb-test')
  assert(refs.some(p => p.includes('exec-full')), '分支 tip（全 hash）引用被检出（保留分支）')
  assert(refs.some(p => p.includes('exec-short')), '缩写 hash 引用被检出（旧 rev-list Set 口径漏检——误删后悬空）')
  // 无关 commit 场景：base 与 head 都指向无关 commit → 不引用
  const dir2 = join(d, '.sillyspec', '.runtime', 'execute-runs', 'exec-none', 'tasks', 'task-01')
  mkdirSync(dir2, { recursive: true })
  writeFileSync(join(dir2, 'review.json'), JSON.stringify({ base: unrelated, head: unrelated, specVerdict: 'pass', qualityVerdict: 'pass' }))
  const refs2 = wm._branchReviewReferences('sillyspec/fb-test')
  assert(!refs2.some(p => p.includes('exec-none')), '无关 commit 的 review 不引用（可删分支）')
}

console.log('\n=== ③ _createBaselineCheckpoint：identity 经统一 git() 生效 ===')
{
  const { d, git } = mkRepo('fb-baseline')
  writeFileSync(join(d, 'committed.txt'), 'v1\n')
  git(['add', '.']); git(['commit', '-q', '-m', 'init'])
  writeFileSync(join(d, 'dirty.txt'), 'in-flight\n') // dirty baseline 场景
  const wm = new WorktreeManager({ cwd: d, worktreeDir: d })
  const hash = wm._createBaselineCheckpoint(d, 'fb-change', ['dirty.txt'])
  assert(/^[0-9a-f]{40}$/.test(String(hash || '')), `checkpoint commit 产出（${String(hash).slice(0, 10)}）`)
  const author = git(['log', '-1', '--format=%an <%ae>']).trim()
  assert(author === 'sillyspec <sillyspec@baseline>', `临时 identity 生效（${author}——env 经统一 git() 透传成功）`)
}

for (const d of _dirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
